const express = require('express');

const notificationController = require('../../controllers/notification.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/me', authenticate, notificationController.getMyNotifications);
router.patch('/:notificationId/read', authenticate, notificationController.markNotificationRead);

module.exports = router;