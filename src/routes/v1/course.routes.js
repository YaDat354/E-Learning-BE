const express = require('express');

const courseController = require('../../controllers/course.controller');
const enrollmentController = require('../../controllers/enrollment.controller');
const lessonRoutes = require('./lesson.routes');
const assignmentRoutes = require('./assignment.routes');
const quizRoutes = require('./quiz.routes');
const { authenticate, optionalAuthenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');
const {
	validateCreateCourse,
	validateUpdateCourse,
	validateCourseIdParam,
	validateCreateCourseReview,
} = require('../../validations/validators');
const discussionRoutes = require('./discussion.routes');

const router = express.Router();

router.get('/', optionalAuthenticate, courseController.listCourses);
router.get('/:courseId', optionalAuthenticate, courseController.getCourseById);
router.post('/', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), validateCreateCourse, courseController.createCourse);
router.patch('/:courseId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), validateUpdateCourse, courseController.updateCourse);
router.delete('/:courseId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), courseController.deleteCourse);

// Student enroll via course URL: POST /courses/:courseId/enroll
router.post('/:courseId/enroll', authenticate, authorizeRoles(roles.STUDENT), enrollmentController.enrollByCourseId);

router.get('/:courseId/reviews', validateCourseIdParam, courseController.listCourseReviews);
router.get('/:courseId/reviews/summary', validateCourseIdParam, courseController.getCourseReviewSummary);
router.post(
	'/:courseId/reviews',
	authenticate,
	authorizeRoles(roles.STUDENT),
	validateCourseIdParam,
	validateCreateCourseReview,
	courseController.createCourseReview
);

router.use('/:courseId/lessons', lessonRoutes);
router.use('/:courseId/lesson', lessonRoutes);
router.use('/:courseId/assignments', assignmentRoutes);
router.use('/:courseId/quizzes', quizRoutes);
router.use('/:courseId/discussions', discussionRoutes);

module.exports = router;
