const asyncHandler = require('../utils/async-handler');
const meService = require('../services/me.service');
const assignmentService = require('../services/assignment.service');
const assignmentModel = require('../models/assignment.model');
const HttpError = require('../utils/http-error');

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

const getStudentDashboard = asyncHandler(async (req, res) => {
  const locale = req.query.locale || req.headers['accept-language'] || 'vi';
  const data = await meService.getStudentDashboard(req.user, locale);
  res.json({ success: true, data });
});

const getTeacherDashboard = asyncHandler(async (req, res) => {
  const locale = req.query.locale || req.headers['accept-language'] || 'vi';
  const data = await meService.getTeacherDashboard(req.user, locale);
  res.json({ success: true, data });
});

module.exports = {
  getMyCourses,
  getContinueLearning,
  updateLessonProgress,
  getMyTeachingCourses,
  getTeachingAssignmentsOverview,
  getStudentDashboard,
  getTeacherDashboard,
  // assignment helpers for /me
  submitAssignmentByLesson: asyncHandler(async (req, res) => {
    const assignment = await assignmentModel.findByLessonId(req.params.lessonId);
    if (!assignment) throw new HttpError(404, 'Assignment not found for this lesson');
    const data = await assignmentService.submitAssignment(assignment.course_id, assignment.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  }),

  getAssignmentSubmissions: asyncHandler(async (req, res) => {
    const assignment = await assignmentModel.findById(req.params.assignmentId);
    if (!assignment) throw new HttpError(404, 'Assignment not found');
    const data = await assignmentService.getSubmissions(assignment.course_id, req.params.assignmentId, req.user);
    res.json({ success: true, data });
  }),

  gradeAssignmentSubmission: asyncHandler(async (req, res) => {
    const assignment = await assignmentModel.findById(req.params.assignmentId);
    if (!assignment) throw new HttpError(404, 'Assignment not found');
    const data = await assignmentService.gradeSubmission(
      assignment.course_id,
      req.params.assignmentId,
      req.params.submissionId,
      req.body,
      req.user
    );
    res.json({ success: true, data });
  }),
};
