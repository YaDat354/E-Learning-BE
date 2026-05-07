const express = require('express');

const enrollmentController = require('../../controllers/enrollment.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.post('/', authenticate, enrollmentController.enrollCourse);
router.get('/me', authenticate, enrollmentController.getMyEnrollments);

module.exports = router;
