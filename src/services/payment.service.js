const crypto = require('crypto');

const env = require('../config/env');
const HttpError = require('../utils/http-error');
const courseModel = require('../models/course.model');
const paymentModel = require('../models/payment.model');
const enrollmentModel = require('../models/enrollment.model');

const VNPAY_GATEWAY = 'vnpay';
const VNPAY_EXPIRE_MINUTES = 15;

const signHmacSha512 = (data, secretKey) => crypto
  .createHmac('sha512', secretKey)
  .update(data)
  .digest('hex');

const ensureVnpayConfig = () => {
  if (!env.vnpayTmnCode || !env.vnpayHashSecret) {
    throw new HttpError(500, 'VNPAY integration is not configured on server');
  }
};

const generateVnpTxnRef = () => `vnp${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

const parsePositiveAmount = (value) => {
  const amount = Number(value);

  if (Number.isNaN(amount) || amount <= 0) {
    throw new HttpError(400, 'amount must be a number > 0');
  }

  return Math.round(amount);
};

const pad2 = (value) => String(value).padStart(2, '0');

const formatVnpDate = (date = new Date()) => {
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);

  return [
    vnDate.getUTCFullYear(),
    pad2(vnDate.getUTCMonth() + 1),
    pad2(vnDate.getUTCDate()),
    pad2(vnDate.getUTCHours()),
    pad2(vnDate.getUTCMinutes()),
    pad2(vnDate.getUTCSeconds()),
  ].join('');
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const normalizeVnpValue = (value) => encodeURIComponent(String(value)).replace(/%20/g, '+');

const buildVnpSignData = (payload) => Object.keys(payload)
  .sort()
  .map((key) => `${key}=${normalizeVnpValue(payload[key])}`)
  .join('&');

const appendQueryToUrl = (baseUrl, params) => {
  const target = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      target.searchParams.set(key, String(value));
    }
  });
  return target.toString();
};

const normalizeIpAddress = (value) => {
  const raw = String(value || '').split(',')[0].trim();

  if (!raw || raw === '::1' || raw === '::') {
    return '127.0.0.1';
  }

  if (raw.startsWith('::ffff:')) {
    return raw.replace('::ffff:', '');
  }

  return raw;
};

const getCourseAndAmountOrThrow = async ({ userId, courseId, amount }) => {
  const course = await courseModel.findById(courseId);

  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  const existingEnrollment = await enrollmentModel.findByStudentAndCourse(userId, courseId);
  if (existingEnrollment) {
    throw new HttpError(409, 'You already enrolled this course');
  }

  const payloadAmount = parsePositiveAmount(amount);
  const coursePrice = Number(course.price);

  if (!Number.isNaN(coursePrice) && coursePrice > 0 && Math.round(coursePrice) !== payloadAmount) {
    throw new HttpError(400, 'amount does not match current course price');
  }

  const finalAmount = !Number.isNaN(coursePrice) && coursePrice > 0 ? Math.round(coursePrice) : payloadAmount;
  return { course, finalAmount };
};

const createVnpayCheckout = async ({
  user,
  courseId,
  courseTitle,
  amount,
  customerName,
  customerEmail,
  gateway,
  returnUrl,
  callbackUrl,
  ipnUrl,
  ipAddr,
  serverBaseUrl,
}) => {
  ensureVnpayConfig();

  if (gateway !== undefined && String(gateway).toLowerCase() !== VNPAY_GATEWAY) {
    throw new HttpError(400, 'Unsupported gateway');
  }

  const finalCallbackUrl = callbackUrl || ipnUrl || null;
  const backendReturnUrl = serverBaseUrl
    ? `${serverBaseUrl}/api/v1/payments/vnpay/return`
    : returnUrl;

  console.log('[payment][vnpay][checkout] request', {
    userId: user.id,
    courseId,
    amount,
    returnUrl,
    callbackUrl: finalCallbackUrl,
  });

  const { course, finalAmount } = await getCourseAndAmountOrThrow({
    userId: user.id,
    courseId,
    amount,
  });

  const orderId = generateVnpTxnRef();
  const now = new Date();
  const createDate = formatVnpDate(now);
  const expireDate = formatVnpDate(addMinutes(now, VNPAY_EXPIRE_MINUTES));
  const orderInfo = `Thanh toan khoa hoc ${course.title}`;

  const vnpPayload = {
    vnp_Version: env.vnpayVersion,
    vnp_Command: env.vnpayCommand,
    vnp_TmnCode: env.vnpayTmnCode,
    vnp_Amount: String(finalAmount * 100),
    vnp_CurrCode: env.vnpayCurrCode,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: env.vnpayLocale,
    vnp_ReturnUrl: backendReturnUrl,
    vnp_IpAddr: normalizeIpAddress(ipAddr),
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  const signData = buildVnpSignData(vnpPayload);
  const secureHash = signHmacSha512(signData, env.vnpayHashSecret);
  const paymentUrl = `${env.vnpayUrl}?${signData}&vnp_SecureHash=${secureHash}`;

  await paymentModel.create({
    orderId,
    userId: user.id,
    courseId,
    courseTitle: courseTitle || course.title,
    amount: finalAmount,
    gateway: VNPAY_GATEWAY,
    status: 'pending',
    customerName,
    customerEmail,
    returnUrl,
    callbackUrl: finalCallbackUrl,
    requestId: orderId,
    partnerCode: env.vnpayTmnCode,
    paymentUrl,
    rawResponse: vnpPayload,
  });

  console.log('[payment][vnpay][checkout] response', {
    orderId,
    amount: finalAmount,
    paymentUrl,
  });

  return {
    orderId,
    requestId: orderId,
    paymentUrl,
    vnpUrl: paymentUrl,
    redirectUrl: paymentUrl,
    qrCodeUrl: null,
    deeplink: null,
    status: 'pending',
  };
};

const verifyAndLoadVnpOrder = async (payload) => {
  const inputData = { ...payload };
  const secureHash = inputData.vnp_SecureHash;

  if (!secureHash) {
    return { ok: false, rsp: { RspCode: '97', Message: 'Invalid signature' } };
  }

  delete inputData.vnp_SecureHash;
  delete inputData.vnp_SecureHashType;

  const signData = buildVnpSignData(inputData);
  const expectedHash = signHmacSha512(signData, env.vnpayHashSecret);

  if (expectedHash !== secureHash) {
    console.log('[payment][vnpay] invalid-signature');
    return { ok: false, rsp: { RspCode: '97', Message: 'Invalid signature' } };
  }

  const orderId = inputData.vnp_TxnRef;
  if (!orderId) {
    return { ok: false, rsp: { RspCode: '01', Message: 'Order not found' } };
  }

  if (inputData.vnp_TmnCode && inputData.vnp_TmnCode !== env.vnpayTmnCode) {
    return { ok: false, rsp: { RspCode: '97', Message: 'Invalid signature' } };
  }

  const order = await paymentModel.findByOrderId(orderId);
  if (!order) {
    return { ok: false, rsp: { RspCode: '01', Message: 'Order not found' } };
  }

  const paidAmountFromGateway = Number(inputData.vnp_Amount) / 100;
  const orderAmount = Number(order.amount);
  if (Number.isNaN(paidAmountFromGateway) || Math.round(paidAmountFromGateway) !== Math.round(orderAmount)) {
    console.log('[payment][vnpay] amount-mismatch', {
      orderId,
      gatewayAmount: paidAmountFromGateway,
      orderAmount,
    });
    return { ok: false, rsp: { RspCode: '04', Message: 'Invalid amount' }, order, inputData };
  }

  return { ok: true, order, inputData };
};

const applyVnpPaymentResult = async ({ order, inputData }) => {
  if (order.status === 'paid') {
    console.log('[payment][vnpay] idempotent-paid', { orderId: order.order_id });
    return;
  }

  const isPaid = inputData.vnp_ResponseCode === '00' && inputData.vnp_TransactionStatus === '00';

  if (isPaid) {
    await paymentModel.updateStatusByOrderId({
      orderId: order.order_id,
      status: 'paid',
      gatewayTransId: inputData.vnp_TransactionNo ? String(inputData.vnp_TransactionNo) : null,
      rawResponse: inputData,
      paidAt: new Date().toISOString(),
    });

    console.log('[payment][vnpay] order-updated', { orderId: order.order_id, status: 'paid' });

    const existingEnrollment = await enrollmentModel.findByStudentAndCourse(order.user_id, order.course_id);
    if (!existingEnrollment) {
      await enrollmentModel.create({ studentId: order.user_id, courseId: order.course_id });
      console.log('[payment][vnpay] enrollment-created', {
        orderId: order.order_id,
        userId: order.user_id,
        courseId: order.course_id,
      });
    }
    return;
  }

  await paymentModel.updateStatusByOrderId({
    orderId: order.order_id,
    status: 'failed',
    gatewayTransId: inputData.vnp_TransactionNo ? String(inputData.vnp_TransactionNo) : null,
    rawResponse: inputData,
  });

  console.log('[payment][vnpay] order-updated', { orderId: order.order_id, status: 'failed' });
};


const handleVnpayIpn = async (payload) => {
  ensureVnpayConfig();

  console.log('[payment][vnpay][ipn] raw', payload);

  const verified = await verifyAndLoadVnpOrder(payload);
  if (!verified.ok) {
    return verified.rsp;
  }

  console.log('[payment][vnpay][ipn] signature-verified');

  await applyVnpPaymentResult({ order: verified.order, inputData: verified.inputData });

  return { RspCode: '00', Message: 'Confirm Success' };
};

const handleVnpayReturn = async (payload) => {
  ensureVnpayConfig();

  console.log('[payment][vnpay][return] raw', payload);

  const verified = await verifyAndLoadVnpOrder(payload);

  if (verified.ok) {
    await applyVnpPaymentResult({ order: verified.order, inputData: verified.inputData });

    const redirectUrl = appendQueryToUrl(verified.order.return_url || 'http://localhost:5174/payment-return', {
      vnp_TxnRef: verified.inputData.vnp_TxnRef,
      vnp_ResponseCode: verified.inputData.vnp_ResponseCode,
      vnp_TransactionStatus: verified.inputData.vnp_TransactionStatus,
    });

    return { redirectUrl };
  }

  const fallbackRedirect = appendQueryToUrl(payload.returnUrl || 'http://localhost:5174/payment-return', {
    vnp_TxnRef: payload.vnp_TxnRef,
    vnp_ResponseCode: payload.vnp_ResponseCode || verified.rsp?.RspCode || '99',
  });

  return { redirectUrl: fallbackRedirect };
};

const getPaymentStatus = async ({ orderId, currentUser }) => {
  const order = await paymentModel.findByOrderId(orderId);

  if (!order) {
    throw new HttpError(404, 'Payment order not found');
  }

  if (currentUser && order.user_id !== currentUser.id) {
    throw new HttpError(403, 'Forbidden');
  }

  return {
    orderId: order.order_id,
    status: order.status,
    amount: Number(order.amount),
    gateway: order.gateway,
    courseId: order.course_id,
  };
};

module.exports = {
  createVnpayCheckout,
  handleVnpayIpn,
  handleVnpayReturn,
  getPaymentStatus,
};
