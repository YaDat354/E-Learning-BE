const { query } = require('../config/database');

const findByCourseId = async (courseId) => {
  const result = await query(
    `SELECT id, course_id, title, content, video_url, order_index, duration, created_at, updated_at
     FROM lessons
     WHERE course_id = $1
     ORDER BY order_index ASC`,
    [courseId]
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `SELECT id, course_id, title, content, video_url, order_index, duration, created_at, updated_at
     FROM lessons WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async ({ courseId, title, content, videoUrl, orderIndex, duration }) => {
  const result = await query(
    `INSERT INTO lessons (course_id, title, content, video_url, order_index, duration)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, course_id, title, content, video_url, order_index, duration, created_at, updated_at`,
    [courseId, title, content || null, videoUrl || null, orderIndex ?? 0, duration || null]
  );
  return result.rows[0];
};

const update = async (id, { title, content, videoUrl, orderIndex, duration }) => {
  const result = await query(
    `UPDATE lessons
     SET title = COALESCE($1, title),
         content = COALESCE($2, content),
         video_url = COALESCE($3, video_url),
         order_index = COALESCE($4, order_index),
         duration = COALESCE($5, duration),
         updated_at = NOW()
     WHERE id = $6
     RETURNING id, course_id, title, content, video_url, order_index, duration, created_at, updated_at`,
    [title, content, videoUrl, orderIndex, duration, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  await query('DELETE FROM lessons WHERE id = $1', [id]);
};

module.exports = { findByCourseId, findById, create, update, remove };
