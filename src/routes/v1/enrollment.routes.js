const express = require('express');

const enrollmentController = require('../../controllers/enrollment.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateEnrollCourse, validateUpdateEnrollmentProgress } = require('../../validations/validators');

const router = express.Router();

router.post('/', authenticate, validateEnrollCourse, enrollmentController.enrollCourse);
router.get('/me', authenticate, enrollmentController.getMyEnrollments);
router.patch('/:enrollmentId/progress', authenticate, validateUpdateEnrollmentProgress, enrollmentController.updateEnrollmentProgress);

module.exports = router;
