const HttpError = require('../utils/http-error');
const enrollmentModel = require('../models/enrollment.model');
const roles = require('../constants/roles');

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new HttpError(401, 'Authentication token is required'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new HttpError(403, 'Forbidden'));
  }

  return next();
};

/**
 * Middleware: require enrollment for students accessing a course's lessons.
 * Teachers and admins always pass.
 * Guest (no req.user) always gets 401.
 *
 * Expects :courseId in req.params (works with mergeParams on lesson router).
 */
const requireEnrollment = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication token is required'));
    }

    // Teachers and admins can access any course content
    if (req.user.role === roles.TEACHER || req.user.role === roles.ADMIN) {
      return next();
    }

    const courseId = req.params.courseId;
    if (!courseId) {
      return next(new HttpError(400, 'courseId is missing from route'));
    }

    const enrollment = await enrollmentModel.findByStudentAndCourse(req.user.id, courseId);
    if (!enrollment) {
      return next(new HttpError(403, 'You are not enrolled in this course'));
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  authorizeRoles,
  requireEnrollment,
};
