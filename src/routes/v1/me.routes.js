const express = require('express');
const meController = require('../../controllers/me.controller');
const discussionController = require('../../controllers/discussion.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

// All /me routes require authentication
router.use(authenticate);

// GET /me/courses — list enrolled courses
router.get('/courses', meController.getMyCourses);

// GET /me/teaching-courses — list courses owned by current teacher
router.get('/teaching-courses', meController.getMyTeachingCourses);

// GET /me/teaching-assignments/overview — teacher dashboard aggregate
router.get('/teaching-assignments/overview', meController.getTeachingAssignmentsOverview);

// GET /me/dashboard/student — student dashboard media and highlights
router.get('/dashboard/student', meController.getStudentDashboard);

// GET /me/dashboard/teacher — teacher dashboard media and highlights
router.get('/dashboard/teacher', meController.getTeacherDashboard);

// GET /me/discussion-notifications — unread lesson discussion notifications
router.get('/discussion-notifications', discussionController.getDiscussionNotifications);

// GET /me/continue-learning?limit=3 — last active lessons per course
router.get('/continue-learning', meController.getContinueLearning);

// PATCH /me/lessons/:lessonId/progress — update lesson video position / completion
router.patch('/lessons/:lessonId/progress', meController.updateLessonProgress);

module.exports = router;
