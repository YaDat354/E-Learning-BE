const express = require('express');

const quizController = require('../../controllers/quiz.controller');
const { authenticate, optionalAuthenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');
const {
  validateCreateQuiz,
  validateUpdateQuiz,
  validateAddQuestion,
  validateUpdateQuestion,
  validateSubmitQuiz,
} = require('../../validations/validators');

const router = express.Router({ mergeParams: true });

// Public (but teacher context is checked by ownership rules when logged in)
router.get('/', optionalAuthenticate, quizController.getQuizzes);
router.get('/:quizId', optionalAuthenticate, quizController.getQuizById);

// Teacher/Admin
router.post('/', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), validateCreateQuiz, quizController.createQuiz);
router.patch('/:quizId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), validateUpdateQuiz, quizController.updateQuiz);
router.delete('/:quizId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), quizController.deleteQuiz);
router.post(
  '/:quizId/questions',
  authenticate,
  authorizeRoles(roles.TEACHER, roles.ADMIN),
  validateAddQuestion,
  quizController.addQuestion
);
router.patch(
  '/:quizId/questions/:questionId',
  authenticate,
  authorizeRoles(roles.TEACHER, roles.ADMIN),
  validateUpdateQuestion,
  quizController.updateQuestion
);
router.delete(
  '/:quizId/questions/:questionId',
  authenticate,
  authorizeRoles(roles.TEACHER, roles.ADMIN),
  quizController.deleteQuestion
);

// Student
router.post('/:quizId/submit', authenticate, authorizeRoles(roles.STUDENT), validateSubmitQuiz, quizController.submitQuiz);

module.exports = router;
