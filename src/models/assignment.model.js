const { query } = require('../config/database');

const findByCourseId = async (courseId) => {
  const result = await query(
    `SELECT id, course_id, title, description, due_date, max_score, created_at, updated_at
     FROM assignments WHERE course_id = $1 ORDER BY created_at ASC`,
    [courseId]
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `SELECT id, course_id, title, description, due_date, max_score, created_at, updated_at
     FROM assignments WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async ({ courseId, title, description, dueDate, maxScore }) => {
  const result = await query(
    `INSERT INTO assignments (course_id, title, description, due_date, max_score)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, course_id, title, description, due_date, max_score, created_at, updated_at`,
    [courseId, title, description || null, dueDate || null, maxScore ?? 100]
  );
  return result.rows[0];
};

const update = async (id, { title, description, dueDate, maxScore }) => {
  const result = await query(
    `UPDATE assignments
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         due_date = COALESCE($3, due_date),
         max_score = COALESCE($4, max_score),
         updated_at = NOW()
     WHERE id = $5
     RETURNING id, course_id, title, description, due_date, max_score, created_at, updated_at`,
    [title, description, dueDate, maxScore, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  await query('DELETE FROM assignments WHERE id = $1', [id]);
};

// ── Submissions ───────────────────────────────────────────────

const findSubmission = async (assignmentId, studentId) => {
  const result = await query(
    `SELECT id, assignment_id, student_id, content, file_url, score, feedback, submitted_at, graded_at
     FROM submissions WHERE assignment_id = $1 AND student_id = $2 LIMIT 1`,
    [assignmentId, studentId]
  );
  return result.rows[0] || null;
};

const findSubmissionsByAssignment = async (assignmentId) => {
  const result = await query(
    `SELECT s.id, s.assignment_id, s.student_id, s.content, s.file_url, s.score, s.feedback,
            s.submitted_at, s.graded_at, u.full_name AS student_name, u.email AS student_email
     FROM submissions s
     JOIN users u ON u.id = s.student_id
     WHERE s.assignment_id = $1
     ORDER BY s.submitted_at ASC`,
    [assignmentId]
  );
  return result.rows;
};

const findSubmissionsByStudent = async (studentId) => {
  const result = await query(
    `SELECT s.id, s.assignment_id, s.student_id, s.content, s.file_url, s.score, s.feedback,
            s.submitted_at, s.graded_at, a.title AS assignment_title
     FROM submissions s
     JOIN assignments a ON a.id = s.assignment_id
     WHERE s.student_id = $1
     ORDER BY s.submitted_at DESC`,
    [studentId]
  );
  return result.rows;
};

const createSubmission = async ({ assignmentId, studentId, content, fileUrl }) => {
  const result = await query(
    `INSERT INTO submissions (assignment_id, student_id, content, file_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, assignment_id, student_id, content, file_url, score, feedback, submitted_at, graded_at`,
    [assignmentId, studentId, content || null, fileUrl || null]
  );
  return result.rows[0];
};

const gradeSubmission = async (submissionId, { score, feedback }) => {
  const result = await query(
    `UPDATE submissions
     SET score = $1, feedback = $2, graded_at = NOW()
     WHERE id = $3
     RETURNING id, assignment_id, student_id, content, file_url, score, feedback, submitted_at, graded_at`,
    [score, feedback || null, submissionId]
  );
  return result.rows[0] || null;
};

module.exports = {
  findByCourseId, findById, create, update, remove,
  findSubmission, findSubmissionsByAssignment, findSubmissionsByStudent,
  createSubmission, gradeSubmission,
};
