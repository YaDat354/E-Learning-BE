const HttpError = require('./http-error');
const roles = require('../constants/roles');

const OWNERSHIP_ERROR_CODE = 'TEACHER_COURSE_FORBIDDEN';

const assertTeacherOwnsCourse = (course, user, code = OWNERSHIP_ERROR_CODE) => {
  if (!user) {
    throw new HttpError(401, 'Authentication token is required');
  }

  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  if (user.role === roles.TEACHER && course.teacher_id !== user.id) {
    throw new HttpError(403, 'Resource is not owned by current teacher', code);
  }
};

module.exports = {
  OWNERSHIP_ERROR_CODE,
  assertTeacherOwnsCourse,
};
