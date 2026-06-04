const { query } = require('../config/database');

const findByCourseId = async (courseId) => {
  const result = await query(
    `SELECT d.id, d.course_id, d.user_id, d.parent_id, d.content, d.created_at,
            u.full_name AS user_name, u.email AS user_email
     FROM discussions d
     JOIN users u ON u.id = d.user_id
     WHERE d.course_id = $1
     ORDER BY d.created_at ASC`,
    [courseId]
  );
  return result.rows;
};

const create = async ({ courseId, userId, content, parentId }) => {
  const result = await query(
    `INSERT INTO discussions (course_id, user_id, content, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, course_id, user_id, parent_id, content, created_at`,
    [courseId, userId, content, parentId || null]
  );
  return result.rows[0] || null;
};

const countByCourseId = async (courseId) => {
  const result = await query(
    `SELECT COUNT(*)::int AS total_discussions FROM discussions WHERE course_id = $1`,
    [courseId]
  );

  return result.rows[0]?.total_discussions || 0;
};

module.exports = {
  findByCourseId,
  create,
  countByCourseId,
};