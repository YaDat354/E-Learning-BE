const HttpError = require('../utils/http-error');
const enrollmentModel = require('../models/enrollment.model');
const courseModel = require('../models/course.model');
const roles = require('../constants/roles');
const { assertTeacherOwnsCourse, OWNERSHIP_ERROR_CODE } = require('../utils/ownership');

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new HttpError(401, 'Authentication token is required'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new HttpError(403, 'Forbidden', 'FORBIDDEN_ROLE'));
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

    const courseId = req.params.courseId;
    if (!courseId) {
      return next(new HttpError(400, 'courseId is missing from route'));
    }

    if (req.user.role === roles.ADMIN) {
      return next();
    }

    if (req.user.role === roles.TEACHER) {
      const course = await courseModel.findById(courseId);
      if (!course) {
        return next(new HttpError(404, 'Course not found'));
      }

      try {
        assertTeacherOwnsCourse(course, req.user, OWNERSHIP_ERROR_CODE);
      } catch (error) {
        return next(error);
      }

      return next();
    }

    const enrollment = await enrollmentModel.findByStudentAndCourse(req.user.id, courseId);
    if (!enrollment) {
      return next(new HttpError(403, 'You are not enrolled in this course', 'RESOURCE_NOT_OWNED'));
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
