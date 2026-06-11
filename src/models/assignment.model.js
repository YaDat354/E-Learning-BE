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

const findByLessonId = async (lessonId) => {
  const result = await query(
    `SELECT id, course_id, lesson_id, title, description, due_date, max_score, created_at, updated_at
     FROM assignments WHERE lesson_id = $1 LIMIT 1`,
    [lessonId]
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
    `SELECT
            s.id,
            s.assignment_id,
            s.student_id,
            s.content,
            s.file_url,
            s.score,
            s.feedback,
            s.submitted_at,
            s.graded_at,
            a.title AS assignment_title,
            a.course_id,
            c.title AS course_title,
            COALESCE(
              a.lesson_id,
              (
                SELECT l2.id
                FROM lessons l2
                WHERE l2.course_id = a.course_id
                ORDER BY l2.order_index ASC, l2.created_at ASC
                LIMIT 1
              )
            ) AS lesson_id,
            COALESCE(
              l.title,
              (
                SELECT l2.title
                FROM lessons l2
                WHERE l2.course_id = a.course_id
                ORDER BY l2.order_index ASC, l2.created_at ASC
                LIMIT 1
              )
            ) AS lesson_title
     FROM submissions s
     JOIN assignments a ON a.id = s.assignment_id
     LEFT JOIN courses c ON c.id = a.course_id
     LEFT JOIN lessons l ON l.id = a.lesson_id
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

const findTeachingOverviewByTeacher = async (teacherId = null) => {
  const params = [];
  let whereSql = '';

  if (teacherId) {
    params.push(teacherId);
    whereSql = `WHERE c.teacher_id = $${params.length}`;
  }

  const result = await query(
    `
      SELECT
        a.id AS assignment_id,
        a.title AS assignment_title,
        a.due_date,
        a.max_score,
        c.id AS course_id,
        c.title AS course_title,
        COUNT(DISTINCT e.student_id)::int AS total_students,
        COUNT(DISTINCT s.id)::int AS submitted_count,
        COUNT(DISTINCT CASE WHEN s.graded_at IS NOT NULL THEN s.id END)::int AS graded_count
      FROM assignments a
      JOIN courses c ON c.id = a.course_id
      LEFT JOIN enrollments e ON e.course_id = c.id
      LEFT JOIN submissions s ON s.assignment_id = a.id
      ${whereSql}
      GROUP BY a.id, a.title, a.due_date, a.max_score, c.id, c.title
      ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
    `,
    params
  );

  return result.rows;
};

module.exports = {
  findByCourseId, findById, create, update, remove,
  findSubmission, findSubmissionsByAssignment, findSubmissionsByStudent,
  createSubmission, gradeSubmission,
  findTeachingOverviewByTeacher,
};
