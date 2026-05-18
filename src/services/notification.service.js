const notificationModel = require('../models/notification.model');
const HttpError = require('../utils/http-error');

const getMyNotifications = async (userId) => notificationModel.findByUser(userId);

const markNotificationRead = async (notificationId, userId) => {
  const updated = await notificationModel.markRead(notificationId, userId);
  if (!updated) throw new HttpError(404, 'Notification not found');
  return updated;
};

module.exports = {
  getMyNotifications,
  markNotificationRead,
};