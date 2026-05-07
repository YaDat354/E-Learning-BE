const express = require('express');

const courseController = require('../../controllers/course.controller');
const lessonRoutes = require('./lesson.routes');
const assignmentRoutes = require('./assignment.routes');
const quizRoutes = require('./quiz.routes');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');

const router = express.Router();

router.get('/', courseController.listCourses);
router.get('/:courseId', courseController.getCourseById);
router.post('/', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), courseController.createCourse);
router.use('/:courseId/lessons', lessonRoutes);
router.use('/:courseId/assignments', assignmentRoutes);
router.use('/:courseId/quizzes', quizRoutes);

module.exports = router;
