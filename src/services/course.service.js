const courseModel = require('../models/course.model');
const HttpError = require('../utils/http-error');

const listCourses = async () => courseModel.listAll();

const getCourseById = async (courseId) => {
  const course = await courseModel.findById(courseId);

  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  return course;
};

const createCourse = async ({ title, description, thumbnail, teacherId }) => {
  if (!title) {
    throw new HttpError(400, 'title is required');
  }

  return courseModel.create({ title, description, thumbnail, teacherId });
};

const updateCourse = async (courseId, { title, description, thumbnail }, user) => {
  const course = await courseModel.findById(courseId);

  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  if (user.role === 'teacher' && course.teacher_id !== user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  if (!title && !description && !thumbnail) {
    throw new HttpError(400, 'At least one field (title, description, thumbnail) is required');
  }

  return courseModel.updateById(courseId, { title, description, thumbnail });
};

const deleteCourse = async (courseId, user) => {
  const course = await courseModel.findById(courseId);

  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  if (user.role === 'teacher' && course.teacher_id !== user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  await courseModel.deleteById(courseId);
};

module.exports = {
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
