const asyncHandler = require('../utils/async-handler');
const notificationService = require('../services/notification.service');

const getMyNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.getMyNotifications(req.user.id);
  res.json({ success: true, data });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markNotificationRead(req.params.notificationId, req.user.id);
  res.json({ success: true, data });
});

module.exports = {
  getMyNotifications,
  markNotificationRead,
};