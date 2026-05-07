const assignmentModel = require('../models/assignment.model');
const courseModel = require('../models/course.model');
const HttpError = require('../utils/http-error');

// ── Helpers ───────────────────────────────────────────────────

const requireCourse = async (courseId) => {
  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  return course;
};

const requireAssignment = async (courseId, assignmentId) => {
  const assignment = await assignmentModel.findById(assignmentId);
  if (!assignment || assignment.course_id !== courseId) throw new HttpError(404, 'Assignment not found');
  return assignment;
};

const assertTeacherOwns = (course, user) => {
  if (user.role === 'teacher' && course.teacher_id !== user.id) throw new HttpError(403, 'Forbidden');
};

// ── Assignment CRUD ───────────────────────────────────────────

const getAssignments = async (courseId) => {
  await requireCourse(courseId);
  return assignmentModel.findByCourseId(courseId);
};

const getAssignmentById = async (courseId, assignmentId) => {
  await requireCourse(courseId);
  return requireAssignment(courseId, assignmentId);
};

const createAssignment = async (courseId, body, user) => {
  const course = await requireCourse(courseId);
  assertTeacherOwns(course, user);
  const { title, description, dueDate, maxScore } = body;
  return assignmentModel.create({ courseId, title, description, dueDate, maxScore });
};

const updateAssignment = async (courseId, assignmentId, body, user) => {
  const course = await requireCourse(courseId);
  assertTeacherOwns(course, user);
  await requireAssignment(courseId, assignmentId);
  return assignmentModel.update(assignmentId, body);
};

const deleteAssignment = async (courseId, assignmentId, user) => {
  const course = await requireCourse(courseId);
  assertTeacherOwns(course, user);
  await requireAssignment(courseId, assignmentId);
  await assignmentModel.remove(assignmentId);
};

// ── Submissions ───────────────────────────────────────────────

const submitAssignment = async (courseId, assignmentId, body, user) => {
  await requireCourse(courseId);
  await requireAssignment(courseId, assignmentId);

  const existing = await assignmentModel.findSubmission(assignmentId, user.id);
  if (existing) throw new HttpError(409, 'Already submitted this assignment');

  const { content, fileUrl } = body;
  return assignmentModel.createSubmission({ assignmentId, studentId: user.id, content, fileUrl });
};

const getSubmissions = async (courseId, assignmentId, user) => {
  const course = await requireCourse(courseId);
  assertTeacherOwns(course, user);
  await requireAssignment(courseId, assignmentId);
  return assignmentModel.findSubmissionsByAssignment(assignmentId);
};

const getMySubmissions = async (user) => {
  return assignmentModel.findSubmissionsByStudent(user.id);
};

const gradeSubmission = async (courseId, assignmentId, submissionId, body, user) => {
  const course = await requireCourse(courseId);
  assertTeacherOwns(course, user);
  await requireAssignment(courseId, assignmentId);

  const result = await assignmentModel.gradeSubmission(submissionId, body);
  if (!result) throw new HttpError(404, 'Submission not found');
  return result;
};

module.exports = {
  getAssignments, getAssignmentById, createAssignment, updateAssignment, deleteAssignment,
  submitAssignment, getSubmissions, getMySubmissions, gradeSubmission,
};
