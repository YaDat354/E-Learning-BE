const asyncHandler = require('../utils/async-handler');
const courseService = require('../services/course.service');

const listCourses = asyncHandler(async (req, res) => {
  const data = await courseService.listCourses({
    level: req.query.level,
    mine: String(req.query.mine).toLowerCase() === 'true',
    currentUser: req.user || null,
  });

  res.json({
    success: true,
    message: 'Courses fetched successfully',
    data,
  });
});

const getCourseById = asyncHandler(async (req, res) => {
  const data = await courseService.getCourseById(req.params.courseId, req.user || null);

  res.json({
    success: true,
    message: 'Course fetched successfully',
    data,
  });
});

const createCourse = asyncHandler(async (req, res) => {
  const data = await courseService.createCourse({
    ...req.body,
    level: req.body.level,
    teacherId: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data,
  });
});

const updateCourse = asyncHandler(async (req, res) => {
  const data = await courseService.updateCourse(
    req.params.courseId,
    {
      title: req.body.title,
      level: req.body.level,
      description: req.body.description,
      thumbnail: req.body.thumbnail,
      price: req.body.price,
      originalPrice: req.body.originalPrice,
      duration: req.body.duration,
      category: req.body.category,
      tags: req.body.tags,
    },
    req.user
  );

  res.json({
    success: true,
    message: 'Course updated successfully',
    data,
  });
});

const deleteCourse = asyncHandler(async (req, res) => {
  await courseService.deleteCourse(req.params.courseId, req.user);

  res.json({
    success: true,
    message: 'Course deleted successfully',
  });
});

module.exports = {
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
