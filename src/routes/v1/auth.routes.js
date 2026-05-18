const express = require('express');
const rateLimit = require('express-rate-limit');

const authController = require('../../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../../validations/validators');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth requests, please try again later',
  },
});

router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);

module.exports = router;
