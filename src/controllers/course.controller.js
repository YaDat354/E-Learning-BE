const asyncHandler = require('../utils/async-handler');
const courseService = require('../services/course.service');

const listCourses = asyncHandler(async (req, res) => {
  const data = await courseService.listCourses();

  res.json({
    success: true,
    message: 'Courses fetched successfully',
    data,
  });
});

const getCourseById = asyncHandler(async (req, res) => {
  const data = await courseService.getCourseById(req.params.courseId);

  res.json({
    success: true,
    message: 'Course fetched successfully',
    data,
  });
});

const createCourse = asyncHandler(async (req, res) => {
  const data = await courseService.createCourse({
    ...req.body,
    teacherId: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data,
  });
});

module.exports = {
  listCourses,
  getCourseById,
  createCourse,
};
