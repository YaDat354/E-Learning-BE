const asyncHandler = require('../utils/async-handler');
const learningLogService = require('../services/learning-log.service');

const upsertLearningLog = asyncHandler(async (req, res) => {
  const data = await learningLogService.upsertLearningLog(req.user, req.body);
  res.json({ success: true, data });
});

const getMyLearningLogs = asyncHandler(async (req, res) => {
  const data = await learningLogService.getMyLearningLogs(req.user);
  res.json({ success: true, data });
});

module.exports = {
  upsertLearningLog,
  getMyLearningLogs,
};