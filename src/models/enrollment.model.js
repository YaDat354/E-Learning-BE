const { query } = require('../config/database');

const findByStudentAndCourse = async (studentId, courseId) => {
  const result = await query(
    `
      SELECT id, student_id, course_id, progress, enrolled_at
      FROM enrollments
      WHERE student_id = $1 AND course_id = $2
      LIMIT 1
    `,
    [studentId, courseId]
  );

  return result.rows[0] || null;
};

const create = async ({ studentId, courseId }) => {
  const result = await query(
    `
      INSERT INTO enrollments (student_id, course_id)
      VALUES ($1, $2)
      RETURNING id, student_id, course_id, progress, enrolled_at
    `,
    [studentId, courseId]
  );

  return result.rows[0] || null;
};

const findByStudentId = async (studentId) => {
  const result = await query(
    `
      SELECT
        e.id,
        e.progress,
        e.enrolled_at,
        c.id AS course_id,
        c.title,
        c.description,
        c.thumbnail,
        c.price,
        c.original_price,
        (
          SELECT COUNT(*)::int
          FROM enrollments e2
          WHERE e2.course_id = c.id
        ) AS total_students,
        (
          SELECT COUNT(*)::int
          FROM lessons l
          WHERE l.course_id = c.id
        ) AS lesson_count
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = $1
      ORDER BY e.enrolled_at DESC
    `,
    [studentId]
  );

  return result.rows;
};

const findById = async (enrollmentId) => {
  const result = await query(
    `
      SELECT id, student_id, course_id, progress, enrolled_at
      FROM enrollments
      WHERE id = $1
      LIMIT 1
    `,
    [enrollmentId]
  );

  return result.rows[0] || null;
};

const countByCourseId = async (courseId) => {
  const result = await query(
    `
      SELECT COUNT(*)::int AS total_students
      FROM enrollments
      WHERE course_id = $1
    `,
    [courseId]
  );

  return result.rows[0]?.total_students || 0;
};

const updateProgress = async (enrollmentId, progress) => {
  const result = await query(
    `
      UPDATE enrollments
      SET progress = $1
      WHERE id = $2
      RETURNING id, student_id, course_id, progress, enrolled_at
    `,
    [progress, enrollmentId]
  );

  return result.rows[0] || null;
};

module.exports = {
  findByStudentAndCourse,
  create,
  findByStudentId,
  findById,
  countByCourseId,
  updateProgress,
};
