require('dotenv').config();

const { query } = require('../config/database');

const run = async () => {
  const result = await query(
    `
      SELECT
        u.email,
        COUNT(c.id)::int AS total_courses,
        ARRAY_AGG(c.title ORDER BY c.created_at DESC) FILTER (WHERE c.id IS NOT NULL) AS course_titles
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN courses c ON c.teacher_id = u.id
      WHERE r.name = 'teacher'
      GROUP BY u.email
      ORDER BY u.email ASC
    `
  );

  console.log(JSON.stringify(result.rows, null, 2));
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
