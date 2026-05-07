const express = require('express');

const assignmentController = require('../../controllers/assignment.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/me', authenticate, assignmentController.getMySubmissions);

module.exports = router;
