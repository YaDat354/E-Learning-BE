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

const listCourseReviews = asyncHandler(async (req, res) => {
  const data = await courseService.listCourseReviews(req.params.courseId, req.query);

  res.json({
    success: true,
    message: 'Course reviews fetched successfully',
    data,
  });
});

const createCourseReview = asyncHandler(async (req, res) => {
  const data = await courseService.createCourseReview(req.params.courseId, {
    rating: req.body.rating,
    comment: req.body.comment,
    currentUser: req.user,
  });

  res.status(201).json({
    success: true,
    message: 'Course review saved successfully',
    data,
  });
});

const getCourseReviewSummary = asyncHandler(async (req, res) => {
  const data = await courseService.getCourseReviewSummary(req.params.courseId);

  res.json({
    success: true,
    message: 'Course review summary fetched successfully',
    data,
  });
});

module.exports = {
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  listCourseReviews,
  createCourseReview,
  getCourseReviewSummary,
};
