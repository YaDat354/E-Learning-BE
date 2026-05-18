const asyncHandler = require('../utils/async-handler');
const lessonFileService = require('../services/lesson-file.service');

const getLessonFiles = asyncHandler(async (req, res) => {
  const data = await lessonFileService.getLessonFiles(req.params.courseId, req.params.lessonId);
  res.json({ success: true, data });
});

const createLessonFile = asyncHandler(async (req, res) => {
  const data = await lessonFileService.createLessonFile(req.params.courseId, req.params.lessonId, req.body, req.user);
  res.status(201).json({ success: true, data });
});

const deleteLessonFile = asyncHandler(async (req, res) => {
  await lessonFileService.deleteLessonFile(req.params.courseId, req.params.lessonId, req.params.fileId, req.user);
  res.json({ success: true, message: 'Lesson file deleted' });
});

module.exports = {
  getLessonFiles,
  createLessonFile,
  deleteLessonFile,
};