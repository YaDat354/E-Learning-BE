const express = require('express');
const rateLimit = require('express-rate-limit');

const chatbotController = require('../../controllers/chatbot.controller');
const { validateChatbotChat } = require('../../validations/validators');

const router = express.Router();

const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many chatbot requests, please try again later',
  },
});

router.post('/chat', chatbotLimiter, validateChatbotChat, chatbotController.chat);

module.exports = router;
