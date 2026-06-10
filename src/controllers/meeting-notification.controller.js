const asyncHandler = require('../utils/async-handler');
const meetingNotificationService = require('../services/meeting-notification.service');

const getMeetingNotifications = asyncHandler(async (req, res) => {
  const data = await meetingNotificationService.getMeetingNotifications(req.user);
  res.json({
    success: true,
    message: 'Meeting notifications fetched successfully',
    data,
  });
});

const createMeetingNotification = asyncHandler(async (req, res) => {
  const data = await meetingNotificationService.createMeetingNotification(
    req.params.courseId,
    req.body,
    req.user
  );
  res.status(201).json({
    success: true,
    message: 'Meeting notification created successfully',
    data,
  });
});

const acknowledgeMeetingNotification = asyncHandler(async (req, res) => {
  const data = await meetingNotificationService.acknowledgeMeetingNotification(
    req.params.notificationId,
    req.user
  );
  res.json({
    success: true,
    message: 'Meeting notification acknowledged successfully',
    data,
  });
});

module.exports = {
  getMeetingNotifications,
  createMeetingNotification,
  acknowledgeMeetingNotification,
};
