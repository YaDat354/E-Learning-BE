const express = require('express');

const paymentController = require('../../controllers/payment.controller');
const { authenticate, optionalAuthenticate } = require('../../middlewares/auth.middleware');
const { validateVnpayCheckout } = require('../../validations/validators');

const router = express.Router();

router.post('/vnpay/checkout', authenticate, validateVnpayCheckout, paymentController.createVnpayCheckout);
router.get('/vnpay/ipn', paymentController.handleVnpayIpn);
router.post('/vnpay/ipn', paymentController.handleVnpayIpn);
router.get('/vnpay/return', paymentController.handleVnpayReturn);
router.get('/:orderId/status', optionalAuthenticate, paymentController.getPaymentStatus);

module.exports = router;
