const roles = require('../constants/roles');
const courseModel = require('../models/course.model');
const enrollmentModel = require('../models/enrollment.model');
const HttpError = require('../utils/http-error');

const enrollCourse = async ({ studentId, courseId, userRole }) => {
  if (userRole !== roles.STUDENT) {
    throw new HttpError(403, 'Only student can enroll courses');
  }

  if (!courseId) {
    throw new HttpError(400, 'courseId is required');
  }

  const course = await courseModel.findById(courseId);

  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  const existingEnrollment = await enrollmentModel.findByStudentAndCourse(studentId, courseId);

  if (existingEnrollment) {
    throw new HttpError(409, 'You already enrolled this course');
  }

  return enrollmentModel.create({ studentId, courseId });
};

const getMyEnrollments = async (studentId) => enrollmentModel.findByStudentId(studentId);

module.exports = {
  enrollCourse,
  getMyEnrollments,
};
