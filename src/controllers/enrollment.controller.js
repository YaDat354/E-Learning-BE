const asyncHandler = require('../utils/async-handler');
const enrollmentService = require('../services/enrollment.service');

const enrollCourse = asyncHandler(async (req, res) => {
  const data = await enrollmentService.enrollCourse({
    studentId: req.user.id,
    userRole: req.user.role,
    courseId: req.body.courseId,
  });

  res.status(201).json({
    success: true,
    message: 'Enrolled successfully',
    data,
  });
});

// POST /courses/:courseId/enroll — enroll via course URL param (FE-friendly)
const enrollByCourseId = asyncHandler(async (req, res) => {
  const data = await enrollmentService.enrollCourse({
    studentId: req.user.id,
    userRole: req.user.role,
    courseId: req.params.courseId,
  });

  res.status(201).json({
    success: true,
    message: 'Enrolled successfully',
    data,
  });
});

const getMyEnrollments = asyncHandler(async (req, res) => {
  const data = await enrollmentService.getMyEnrollments(req.user.id);

  res.json({
    success: true,
    message: 'Enrollments fetched successfully',
    data,
  });
});

const updateEnrollmentProgress = asyncHandler(async (req, res) => {
  const data = await enrollmentService.updateEnrollmentProgress({
    enrollmentId: req.params.enrollmentId,
    progress: req.body.progress,
    user: req.user,
  });

  res.json({
    success: true,
    message: 'Enrollment progress updated successfully',
    data,
  });
});

module.exports = {
  enrollCourse,
  enrollByCourseId,
  getMyEnrollments,
  updateEnrollmentProgress,
};
