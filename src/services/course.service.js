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

module.exports = {
  listCourses,
  getCourseById,
  createCourse,
};
