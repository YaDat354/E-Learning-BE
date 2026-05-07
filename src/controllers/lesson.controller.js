const asyncHandler = require('../utils/async-handler');
const lessonService = require('../services/lesson.service');

const getLessons = asyncHandler(async (req, res) => {
  const data = await lessonService.getLessons(req.params.courseId);
  res.json({ success: true, data });
});

const getLessonById = asyncHandler(async (req, res) => {
  const data = await lessonService.getLessonById(req.params.courseId, req.params.lessonId);
  res.json({ success: true, data });
});

const createLesson = asyncHandler(async (req, res) => {
  const data = await lessonService.createLesson(req.params.courseId, req.body, req.user);
  res.status(201).json({ success: true, data });
});

const updateLesson = asyncHandler(async (req, res) => {
  const data = await lessonService.updateLesson(req.params.courseId, req.params.lessonId, req.body, req.user);
  res.json({ success: true, data });
});

const deleteLesson = asyncHandler(async (req, res) => {
  await lessonService.deleteLesson(req.params.courseId, req.params.lessonId, req.user);
  res.json({ success: true, message: 'Lesson deleted' });
});

module.exports = { getLessons, getLessonById, createLesson, updateLesson, deleteLesson };
