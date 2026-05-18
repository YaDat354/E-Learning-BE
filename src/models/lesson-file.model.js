const { query } = require('../config/database');

const findByLessonId = async (lessonId) => {
  const result = await query(
    `SELECT id, lesson_id, file_name, file_url, created_at
     FROM lesson_files
     WHERE lesson_id = $1
     ORDER BY created_at ASC`,
    [lessonId]
  );
  return result.rows;
};

const create = async ({ lessonId, fileName, fileUrl }) => {
  const result = await query(
    `INSERT INTO lesson_files (lesson_id, file_name, file_url)
     VALUES ($1, $2, $3)
     RETURNING id, lesson_id, file_name, file_url, created_at`,
    [lessonId, fileName, fileUrl]
  );
  return result.rows[0] || null;
};

const remove = async (fileId) => {
  const result = await query(
    'DELETE FROM lesson_files WHERE id = $1 RETURNING id, lesson_id',
    [fileId]
  );
  return result.rows[0] || null;
};

module.exports = {
  findByLessonId,
  create,
  remove,
};