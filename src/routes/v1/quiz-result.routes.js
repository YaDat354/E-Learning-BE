const express = require('express');

const quizController = require('../../controllers/quiz.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/me', authenticate, quizController.getMyResults);

module.exports = router;
