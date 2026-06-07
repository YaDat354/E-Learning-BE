const { query } = require('../config/database');

const create = async ({
  orderId,
  userId,
  courseId,
  courseTitle,
  amount,
  gateway,
  status,
  customerName,
  customerEmail,
  returnUrl,
  callbackUrl,
  requestId,
  partnerCode,
  paymentUrl,
  rawResponse,
}) => {
  const result = await query(
    `
      INSERT INTO payment_orders (
        order_id,
        user_id,
        course_id,
        course_title,
        amount,
        gateway,
        status,
        customer_name,
        customer_email,
        return_url,
        callback_url,
        request_id,
        partner_code,
        payment_url,
        raw_response
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb)
      RETURNING *
    `,
    [
      orderId,
      userId,
      courseId,
      courseTitle,
      amount,
      gateway,
      status,
      customerName,
      customerEmail,
      returnUrl,
      callbackUrl,
      requestId || null,
      partnerCode || null,
      paymentUrl || null,
      JSON.stringify(rawResponse || {}),
    ]
  );

  return result.rows[0] || null;
};

const findByOrderId = async (orderId) => {
  const result = await query(
    `
      SELECT *
      FROM payment_orders
      WHERE order_id = $1
      LIMIT 1
    `,
    [orderId]
  );

  return result.rows[0] || null;
};

const findLatestByUserAndCourse = async (userId, courseId) => {
  const result = await query(
    `
      SELECT *
      FROM payment_orders
      WHERE user_id = $1 AND course_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId, courseId]
  );

  return result.rows[0] || null;
};

const updateCheckoutInfo = async ({ orderId, paymentUrl, rawResponse, requestId }) => {
  const result = await query(
    `
      UPDATE payment_orders
      SET
        payment_url = COALESCE($1, payment_url),
        raw_response = COALESCE($2::jsonb, raw_response),
        request_id = COALESCE($3, request_id),
        updated_at = NOW()
      WHERE order_id = $4
      RETURNING *
    `,
    [
      paymentUrl || null,
      rawResponse ? JSON.stringify(rawResponse) : null,
      requestId || null,
      orderId,
    ]
  );

  return result.rows[0] || null;
};

const updateStatusByOrderId = async ({ orderId, status, gatewayTransId, rawResponse, paidAt }) => {
  const transId = gatewayTransId || null;

  const result = await query(
    `
      UPDATE payment_orders
      SET
        status = $1,
        gateway_trans_id = COALESCE($2, gateway_trans_id),
        raw_response = COALESCE($3::jsonb, raw_response),
        paid_at = CASE WHEN $4::timestamptz IS NULL THEN paid_at ELSE $4::timestamptz END,
        updated_at = NOW()
      WHERE order_id = $5
      RETURNING *
    `,
    [
      status,
      transId,
      rawResponse ? JSON.stringify(rawResponse) : null,
      paidAt || null,
      orderId,
    ]
  );

  return result.rows[0] || null;
};

module.exports = {
  create,
  findByOrderId,
  findLatestByUserAndCourse,
  updateCheckoutInfo,
  updateStatusByOrderId,
};
