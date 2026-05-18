const express = require('express');

const quizController = require('../../controllers/quiz.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');
const { validateCreateQuiz, validateAddQuestion, validateSubmitQuiz } = require('../../validations/validators');

const router = express.Router({ mergeParams: true });

// Public
router.get('/', quizController.getQuizzes);
router.get('/:quizId', quizController.getQuizById);

// Teacher/Admin
router.post('/', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), validateCreateQuiz, quizController.createQuiz);
router.post(
  '/:quizId/questions',
  authenticate,
  authorizeRoles(roles.TEACHER, roles.ADMIN),
  validateAddQuestion,
  quizController.addQuestion
);

// Student
router.post('/:quizId/submit', authenticate, authorizeRoles(roles.STUDENT), validateSubmitQuiz, quizController.submitQuiz);

module.exports = router;
