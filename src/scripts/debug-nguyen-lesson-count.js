require('dotenv').config();

const { query } = require('../config/database');
const userModel = require('../models/user.model');
const { signAccessToken } = require('../utils/jwt');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  const email = 'nguyenngoctrang01@gmail.com';
  const user = await userModel.findByEmail(email);

  if (!user) {
    throw new Error(`Teacher not found: ${email}`);
  }

  const direct = await query(
    `
      SELECT c.id, c.title, c.level, COUNT(l.id)::int AS lesson_count
      FROM courses c
      LEFT JOIN lessons l ON l.course_id = c.id
      WHERE c.teacher_id = $1
      GROUP BY c.id, c.title, c.level, c.created_at
      ORDER BY c.created_at DESC
    `,
    [user.id]
  );

  console.log('DB_COUNTS', JSON.stringify(direct.rows));

  const token = signAccessToken({ userId: user.id, role: user.role });
  require('../app');
  await delay(1200);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const mineRes = await fetch('http://localhost:3000/api/v1/courses?mine=true', { headers });
  const mineJson = await mineRes.json();

  const courses = Array.isArray(mineJson.data) ? mineJson.data : [];
  console.log('MINE_COURSES', JSON.stringify(courses.map((c) => ({ id: c.id, title: c.title, level: c.level }))));

  for (const c of courses) {
    const detailRes = await fetch(`http://localhost:3000/api/v1/courses/${c.id}`, { headers });
    const detailJson = await detailRes.json();
    console.log('DETAIL', JSON.stringify({
      courseId: c.id,
      title: c.title,
      status: detailRes.status,
      totalLessons: detailJson?.data?.stats?.totalLessons ?? null,
      lessonsLength: Array.isArray(detailJson?.data?.lessons) ? detailJson.data.lessons.length : null,
    }));
  }

  process.exit(0);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
