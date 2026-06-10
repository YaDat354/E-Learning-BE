const roles = require('../constants/roles');
const courseModel = require('../models/course.model');
const enrollmentModel = require('../models/enrollment.model');
const HttpError = require('../utils/http-error');
const { assertTeacherOwnsCourse, OWNERSHIP_ERROR_CODE } = require('../utils/ownership');

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

const getCourseStudents = async (courseId, user) => {
  if (!user || user.role !== roles.TEACHER) {
    throw new HttpError(403, 'Only teachers can view enrolled students');
  }

  const course = await courseModel.findById(courseId);
  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);

  return enrollmentModel.findStudentsByCourseId(courseId);
};

const updateEnrollmentProgress = async ({ enrollmentId, progress, user }) => {
  if (progress === undefined || progress === null) {
    throw new HttpError(400, 'progress is required');
  }

  const numericProgress = Number(progress);

  if (Number.isNaN(numericProgress) || numericProgress < 0 || numericProgress > 100) {
    throw new HttpError(400, 'progress must be a number between 0 and 100');
  }

  const enrollment = await enrollmentModel.findById(enrollmentId);

  if (!enrollment) {
    throw new HttpError(404, 'Enrollment not found');
  }

  if (user.role === roles.STUDENT && enrollment.student_id !== user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  return enrollmentModel.updateProgress(enrollmentId, numericProgress);
};

module.exports = {
  enrollCourse,
  getMyEnrollments,
  getCourseStudents,
  updateEnrollmentProgress,
};
