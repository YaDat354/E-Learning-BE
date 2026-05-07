const express = require('express');

const userController = require('../../controllers/user.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/me', authenticate, userController.getCurrentUser);
router.patch('/me', authenticate, userController.updateCurrentUser);

module.exports = router;
