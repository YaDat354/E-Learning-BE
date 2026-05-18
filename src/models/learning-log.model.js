const { query } = require('../config/database');

const upsert = async ({ studentId, lessonId, learningTime }) => {
  const result = await query(
    `INSERT INTO learning_logs (student_id, lesson_id, learning_time, last_access)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (student_id, lesson_id)
     DO UPDATE
     SET learning_time = learning_logs.learning_time + EXCLUDED.learning_time,
         last_access = NOW()
     RETURNING id, student_id, lesson_id, learning_time, last_access`,
    [studentId, lessonId, Number(learningTime) || 0]
  );
  return result.rows[0] || null;
};

const findByStudent = async (studentId) => {
  const result = await query(
    `SELECT ll.id, ll.student_id, ll.lesson_id, ll.learning_time, ll.last_access,
            l.title AS lesson_title, l.course_id
     FROM learning_logs ll
     JOIN lessons l ON l.id = ll.lesson_id
     WHERE ll.student_id = $1
     ORDER BY ll.last_access DESC`,
    [studentId]
  );
  return result.rows;
};

module.exports = {
  upsert,
  findByStudent,
};