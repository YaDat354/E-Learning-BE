const express = require('express');

const meetingNotificationController = require('../../controllers/meeting-notification.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');

const router = express.Router();

// GET /api/v1/meetings/notifications - get meeting notifications for current student
router.get('/', authenticate, authorizeRoles(roles.STUDENT), meetingNotificationController.getMeetingNotifications);

// POST /api/v1/meetings/notifications/:notificationId/acknowledge - acknowledge notification
router.post('/:notificationId/acknowledge', authenticate, authorizeRoles(roles.STUDENT), meetingNotificationController.acknowledgeMeetingNotification);

module.exports = router;
