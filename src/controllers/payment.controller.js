const asyncHandler = require('../utils/async-handler');
const paymentService = require('../services/payment.service');

const createVnpayCheckout = asyncHandler(async (req, res) => {
  const data = await paymentService.createVnpayCheckout({
    user: req.user,
    courseId: req.body.courseId,
    courseTitle: req.body.courseTitle,
    amount: req.body.amount,
    customerName: req.body.customerName,
    customerEmail: req.body.customerEmail,
    gateway: req.body.gateway,
    returnUrl: req.body.returnUrl,
    callbackUrl: req.body.callbackUrl,
    ipnUrl: req.body.ipnUrl,
    ipAddr: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
    serverBaseUrl: `${req.protocol}://${req.get('host')}`,
  });

  res.status(201).json(data);
});

const handleVnpayIpn = asyncHandler(async (req, res) => {
  const payload = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const data = await paymentService.handleVnpayIpn(payload);
  res.json(data);
});

const handleVnpayReturn = asyncHandler(async (req, res) => {
  const { redirectUrl } = await paymentService.handleVnpayReturn(req.query || {});
  res.redirect(302, redirectUrl);
});

const getPaymentStatus = asyncHandler(async (req, res) => {
  const data = await paymentService.getPaymentStatus({
    orderId: req.params.orderId,
    currentUser: req.user || null,
  });

  res.json(data);
});

module.exports = {
  createVnpayCheckout,
  handleVnpayIpn,
  handleVnpayReturn,
  getPaymentStatus,
};
