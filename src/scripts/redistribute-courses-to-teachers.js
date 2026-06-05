require('dotenv').config();

const { query } = require('../config/database');

const getTeachers = async () => {
  const result = await query(
    `
      SELECT u.id, u.email, u.full_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE r.name = 'teacher'
      ORDER BY u.email ASC
    `
  );

  return result.rows;
};

const getCourses = async () => {
  const result = await query(
    `
      SELECT id, title, created_at
      FROM courses
      ORDER BY created_at ASC, id ASC
    `
  );

  return result.rows;
};

const getDistribution = async () => {
  const result = await query(
    `
      SELECT u.id, u.email, COUNT(c.id)::int AS total_courses
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN courses c ON c.teacher_id = u.id
      WHERE r.name = 'teacher'
      GROUP BY u.id, u.email
      ORDER BY u.email ASC
    `
  );

  return result.rows;
};

const run = async () => {
  const teachers = await getTeachers();
  const courses = await getCourses();

  console.log('TEACHER_COUNT', teachers.length);
  console.log('COURSE_COUNT', courses.length);

  if (teachers.length === 0) {
    throw new Error('No teacher users found to assign courses');
  }

  const before = await getDistribution();
  console.log('BEFORE', JSON.stringify(before));

  await query('BEGIN');

  try {
    for (let i = 0; i < courses.length; i += 1) {
      const teacher = teachers[i % teachers.length];
      const course = courses[i];

      await query(
        `
          UPDATE courses
          SET teacher_id = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [teacher.id, course.id]
      );
    }

    await query('COMMIT');
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }

  const after = await getDistribution();
  console.log('AFTER', JSON.stringify(after));
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
