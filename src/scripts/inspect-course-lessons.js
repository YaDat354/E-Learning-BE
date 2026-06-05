require('dotenv').config();

const { query } = require('../config/database');

const run = async () => {
  const totals = await query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM courses) AS total_courses,
        (SELECT COUNT(*)::int FROM lessons) AS total_lessons,
        (SELECT COUNT(*)::int FROM courses c LEFT JOIN lessons l ON l.course_id = c.id GROUP BY c.id HAVING COUNT(l.id) = 0) AS courses_without_lessons
    `
  );

  const perCourse = await query(
    `
      SELECT
        c.id,
        c.title,
        u.email AS teacher_email,
        COUNT(l.id)::int AS lesson_count
      FROM courses c
      LEFT JOIN lessons l ON l.course_id = c.id
      LEFT JOIN users u ON u.id = c.teacher_id
      GROUP BY c.id, c.title, u.email
      ORDER BY lesson_count ASC, c.created_at DESC
      LIMIT 40
    `
  );

  console.log('TOTALS', JSON.stringify(totals.rows[0]));
  console.log('COURSE_LESSON_COUNTS', JSON.stringify(perCourse.rows));
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
