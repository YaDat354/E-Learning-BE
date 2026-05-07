const express = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const courseRoutes = require('./course.routes');
const enrollmentRoutes = require('./enrollment.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/enrollments', enrollmentRoutes);

module.exports = router;
