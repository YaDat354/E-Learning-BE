const { query } = require('../config/database');

const listAll = async ({ level } = {}) => {
  const clauses = [];
  const params = [];

  if (level) {
    params.push(level);
    clauses.push(`c.level = $${params.length}`);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await query(
    `
      SELECT
        c.id,
        c.title,
        c.level,
        c.description,
        c.thumbnail,
        c.created_at,
        c.updated_at,
        c.teacher_id,
        u.full_name AS teacher_name,
        u.email AS teacher_email
      FROM courses c
      LEFT JOIN users u ON u.id = c.teacher_id
      ${whereSql}
      ORDER BY
        CASE c.level
          WHEN 'co_ban' THEN 1
          WHEN 'trung_cap' THEN 2
          WHEN 'cao_cap' THEN 3
          ELSE 4
        END ASC,
        c.created_at DESC
    `,
    params
  );

  return result.rows;
};

const findById = async (courseId) => {
  const result = await query(
    `
      SELECT
        c.id,
        c.title,
        c.level,
        c.description,
        c.thumbnail,
        c.created_at,
        c.updated_at,
        c.teacher_id,
        u.full_name AS teacher_name,
        u.email AS teacher_email
      FROM courses c
      LEFT JOIN users u ON u.id = c.teacher_id
      WHERE c.id = $1
      LIMIT 1
    `,
    [courseId]
  );

  return result.rows[0] || null;
};

const create = async ({ title, level, description, thumbnail, teacherId }) => {
  const result = await query(
    `
      INSERT INTO courses (title, level, description, thumbnail, teacher_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, level, description, thumbnail, teacher_id, created_at, updated_at
    `,
    [title, level || 'co_ban', description || null, thumbnail || null, teacherId]
  );

  return result.rows[0] || null;
};

const updateById = async (courseId, { title, level, description, thumbnail }) => {
  const result = await query(
    `
      UPDATE courses
      SET
        title = COALESCE($1, title),
        level = COALESCE($2, level),
        description = COALESCE($3, description),
        thumbnail = COALESCE($4, thumbnail),
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, title, level, description, thumbnail, teacher_id, created_at, updated_at
    `,
    [title || null, level || null, description || null, thumbnail || null, courseId]
  );

  return result.rows[0] || null;
};

const deleteById = async (courseId) => {
  const result = await query('DELETE FROM courses WHERE id = $1 RETURNING id', [courseId]);
  return result.rows[0] || null;
};

module.exports = {
  listAll,
  findById,
  create,
  updateById,
  deleteById,
};
