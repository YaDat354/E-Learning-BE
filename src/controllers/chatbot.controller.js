const { randomUUID } = require('crypto');

const asyncHandler = require('../utils/async-handler');
const chatbotService = require('../services/chatbot.service');

const chat = asyncHandler(async (req, res) => {
  const requestId = (req.headers['x-request-id'] && String(req.headers['x-request-id']).trim()) || randomUUID();
  const start = Date.now();

  console.info(`[chatbot:${requestId}] request`, {
    hasConversationId: Boolean(req.body?.conversationId),
    historyCount: Array.isArray(req.body?.history) ? req.body.history.length : 0,
    messageLength: String(req.body?.message || '').length,
  });

  const data = await chatbotService.chat({
    message: req.body.message,
    history: req.body.history,
    conversationId: req.body.conversationId,
    requestId,
  });

  console.info(`[chatbot:${requestId}] durationMs=${Date.now() - start}`);

  res.json({
    success: true,
    message: 'Chat response generated',
    reply: data.reply,
    conversationId: data.conversationId,
    data,
  });
});

module.exports = {
  chat,
};
