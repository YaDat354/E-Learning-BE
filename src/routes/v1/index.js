const express = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const courseRoutes = require('./course.routes');
const enrollmentRoutes = require('./enrollment.routes');
const submissionRoutes = require('./submission.routes');
const quizResultRoutes = require('./quiz-result.routes');
const notificationRoutes = require('./notification.routes');
const learningLogRoutes = require('./learning-log.routes');
const meRoutes = require('./me.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/submissions', submissionRoutes);
router.use('/quiz-results', quizResultRoutes);
router.use('/notifications', notificationRoutes);
router.use('/learning-logs', learningLogRoutes);
router.use('/me', meRoutes);

module.exports = router;
