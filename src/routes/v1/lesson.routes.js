const express = require('express');
const lessonController = require('../../controllers/lesson.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');

const router = express.Router({ mergeParams: true }); // mergeParams to access :courseId

// Public
router.get('/', lessonController.getLessons);
router.get('/:lessonId', lessonController.getLessonById);

// Teacher / Admin only
router.post('/', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), lessonController.createLesson);
router.patch('/:lessonId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), lessonController.updateLesson);
router.delete('/:lessonId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), lessonController.deleteLesson);

module.exports = router;
