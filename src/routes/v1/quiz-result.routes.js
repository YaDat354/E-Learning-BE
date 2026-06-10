const express = require('express');

const quizController = require('../../controllers/quiz.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');

const router = express.Router();

router.get('/me', authenticate, quizController.getMyResults);
router.post('/', authenticate, authorizeRoles(roles.STUDENT), quizController.createQuizResult);

module.exports = router;
