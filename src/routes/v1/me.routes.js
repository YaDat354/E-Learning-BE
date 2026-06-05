const express = require('express');
const meController = require('../../controllers/me.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

// All /me routes require authentication
router.use(authenticate);

// GET /me/courses — list enrolled courses
router.get('/courses', meController.getMyCourses);

// GET /me/continue-learning?limit=3 — last active lessons per course
router.get('/continue-learning', meController.getContinueLearning);

// PATCH /me/lessons/:lessonId/progress — update lesson video position / completion
router.patch('/lessons/:lessonId/progress', meController.updateLessonProgress);

module.exports = router;
