const express = require('express');

const lessonFileController = require('../../controllers/lesson-file.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');
const { validateCreateLessonFile } = require('../../validations/validators');

const router = express.Router({ mergeParams: true });

router.get('/', lessonFileController.getLessonFiles);
router.post(
  '/',
  authenticate,
  authorizeRoles(roles.TEACHER, roles.ADMIN),
  validateCreateLessonFile,
  lessonFileController.createLessonFile
);
router.delete(
  '/:fileId',
  authenticate,
  authorizeRoles(roles.TEACHER, roles.ADMIN),
  lessonFileController.deleteLessonFile
);

module.exports = router;