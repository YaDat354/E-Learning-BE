const express = require('express');

const lessonController = require('../../controllers/lesson.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');
const { validateUpdateLesson } = require('../../validations/validators');

const router = express.Router();

router.get('/:lessonId', authenticate, lessonController.getLessonByIdStandalone);
router.patch(
  '/:lessonId',
  authenticate,
  authorizeRoles(roles.TEACHER, roles.ADMIN),
  validateUpdateLesson,
  lessonController.updateLessonByIdStandalone
);
router.put(
  '/:lessonId',
  authenticate,
  authorizeRoles(roles.TEACHER, roles.ADMIN),
  validateUpdateLesson,
  lessonController.updateLessonByIdStandalone
);
router.delete(
  '/:lessonId',
  authenticate,
  authorizeRoles(roles.TEACHER, roles.ADMIN),
  lessonController.deleteLessonByIdStandalone
);

module.exports = router;
