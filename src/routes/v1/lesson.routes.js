const express = require('express');
const lessonController = require('../../controllers/lesson.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles, requireEnrollment } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');
const { validateCreateLesson, validateUpdateLesson } = require('../../validations/validators');
const lessonFileRoutes = require('./lesson-file.routes');

const router = express.Router({ mergeParams: true }); // mergeParams to access :courseId

// List and detail require authentication + enrollment check
router.get('/', authenticate, requireEnrollment, lessonController.getLessons);
router.get('/:lessonId', authenticate, requireEnrollment, lessonController.getLessonById);

// Teacher / Admin only
router.post('/', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), validateCreateLesson, lessonController.createLesson);
router.patch('/:lessonId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), validateUpdateLesson, lessonController.updateLesson);
router.put('/:lessonId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), validateUpdateLesson, lessonController.updateLesson);
router.delete('/:lessonId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), lessonController.deleteLesson);
router.use('/:lessonId/files', lessonFileRoutes);

module.exports = router;
