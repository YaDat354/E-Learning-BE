require('dotenv').config();

const { query, pool } = require('../config/database');

const COMMENT_BANK = [
  'Khoa hoc de hieu, bai giang ro rang va de theo kip.',
  'Noi dung thuc te, minh ap dung duoc ngay vao luyen tap.',
  'Giang vien giai thich de hieu, bai tap vua suc.',
  'Tien do hoc hop ly, giao dien hoc cung kha on.',
  'Mong co them bai tap nang cao cho phan nghe noi.',
  'Khoa hoc huu ich cho nguoi moi bat dau hoc tieng Anh.',
];

const pickRating = (index) => {
  const ratings = [5, 4, 5, 4, 3, 5];
  return ratings[index % ratings.length];
};

const pickComment = (index) => COMMENT_BANK[index % COMMENT_BANK.length];

const run = async () => {
  const enrollmentsResult = await query(
    `
      SELECT e.course_id, e.student_id
      FROM enrollments e
      JOIN users u ON u.id = e.student_id
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN course_reviews cr
        ON cr.course_id = e.course_id
       AND cr.student_id = e.student_id
      WHERE r.name = 'student'
        AND cr.id IS NULL
      ORDER BY e.enrolled_at DESC
      LIMIT 30
    `
  );

  const enrollments = enrollmentsResult.rows;

  if (enrollments.length === 0) {
    console.log('No enrollment pairs available for seeding course reviews.');
    return;
  }

  let inserted = 0;

  for (let i = 0; i < enrollments.length; i += 1) {
    const row = enrollments[i];

    await query(
      `
        INSERT INTO course_reviews (course_id, student_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (course_id, student_id)
        DO NOTHING
      `,
      [row.course_id, row.student_id, pickRating(i), pickComment(i)]
    );

    inserted += 1;
  }

  console.log(`Seeded ${inserted} course review(s).`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
