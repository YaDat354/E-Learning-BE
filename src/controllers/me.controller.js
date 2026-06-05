const asyncHandler = require('../utils/async-handler');
const meService = require('../services/me.service');

const getMyCourses = asyncHandler(async (req, res) => {
  const data = await meService.getMyCourses(req.user.id);
  res.json({ success: true, data });
});

const getContinueLearning = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 3, 10);
  const data = await meService.getContinueLearning(req.user.id, limit);
  res.json({ success: true, data });
});

const updateLessonProgress = asyncHandler(async (req, res) => {
  const data = await meService.updateLessonProgress(req.user.id, req.params.lessonId, req.body);
  res.json({ success: true, data });
});

const getMyTeachingCourses = asyncHandler(async (req, res) => {
  const data = await meService.getMyTeachingCourses(req.user);
  res.json({ success: true, data });
});

const getTeachingAssignmentsOverview = asyncHandler(async (req, res) => {
  const data = await meService.getTeachingAssignmentsOverview(req.user);
  res.json({ success: true, data });
});

module.exports = {
  getMyCourses,
  getContinueLearning,
  updateLessonProgress,
  getMyTeachingCourses,
  getTeachingAssignmentsOverview,
};
