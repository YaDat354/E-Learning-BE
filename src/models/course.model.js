const { query } = require('../config/database');

const listAll = async () => {
  const result = await query(
    `
      SELECT
        c.id,
        c.title,
        c.description,
        c.thumbnail,
        c.created_at,
        c.updated_at,
        c.teacher_id,
        u.full_name AS teacher_name,
        u.email AS teacher_email
      FROM courses c
      LEFT JOIN users u ON u.id = c.teacher_id
      ORDER BY c.created_at DESC
    `
  );

  return result.rows;
};

const findById = async (courseId) => {
  const result = await query(
    `
      SELECT
        c.id,
        c.title,
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

const create = async ({ title, description, thumbnail, teacherId }) => {
  const result = await query(
    `
      INSERT INTO courses (title, description, thumbnail, teacher_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, description, thumbnail, teacher_id, created_at, updated_at
    `,
    [title, description || null, thumbnail || null, teacherId]
  );

  return result.rows[0] || null;
};

const updateById = async (courseId, { title, description, thumbnail }) => {
  const result = await query(
    `
      UPDATE courses
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        thumbnail = COALESCE($3, thumbnail),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, title, description, thumbnail, teacher_id, created_at, updated_at
    `,
    [title || null, description || null, thumbnail || null, courseId]
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
