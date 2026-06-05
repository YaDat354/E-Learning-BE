const asyncHandler = require('../utils/async-handler');
const assignmentService = require('../services/assignment.service');

const getAssignments = asyncHandler(async (req, res) => {
  const data = await assignmentService.getAssignments(req.params.courseId, req.user || null);
  res.json({ success: true, data });
});

const getAssignmentById = asyncHandler(async (req, res) => {
  const data = await assignmentService.getAssignmentById(req.params.courseId, req.params.assignmentId, req.user || null);
  res.json({ success: true, data });
});

const createAssignment = asyncHandler(async (req, res) => {
  const data = await assignmentService.createAssignment(req.params.courseId, req.body, req.user);
  res.status(201).json({ success: true, data });
});

const updateAssignment = asyncHandler(async (req, res) => {
  const data = await assignmentService.updateAssignment(req.params.courseId, req.params.assignmentId, req.body, req.user);
  res.json({ success: true, data });
});

const deleteAssignment = asyncHandler(async (req, res) => {
  await assignmentService.deleteAssignment(req.params.courseId, req.params.assignmentId, req.user);
  res.json({ success: true, message: 'Assignment deleted' });
});

const submitAssignment = asyncHandler(async (req, res) => {
  const data = await assignmentService.submitAssignment(req.params.courseId, req.params.assignmentId, req.body, req.user);
  res.status(201).json({ success: true, data });
});

const getSubmissions = asyncHandler(async (req, res) => {
  const data = await assignmentService.getSubmissions(req.params.courseId, req.params.assignmentId, req.user);
  res.json({ success: true, data });
});

const getMySubmissions = asyncHandler(async (req, res) => {
  const data = await assignmentService.getMySubmissions(req.user);
  res.json({ success: true, data });
});

const gradeSubmission = asyncHandler(async (req, res) => {
  const data = await assignmentService.gradeSubmission(
    req.params.courseId,
    req.params.assignmentId,
    req.params.submissionId,
    req.body,
    req.user
  );
  res.json({ success: true, data });
});

module.exports = {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getSubmissions,
  getMySubmissions,
  gradeSubmission,
};
