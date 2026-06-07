const { query } = require('../config/database');

const listByCourseId = async (courseId, { limit, offset }) => {
  const result = await query(
    `
      SELECT
        cr.id,
        cr.course_id,
        cr.student_id,
        cr.rating,
        cr.comment,
        cr.created_at,
        cr.updated_at,
        u.full_name AS student_name,
        u.email AS student_email,
        u.avatar AS student_avatar
      FROM course_reviews cr
      JOIN users u ON u.id = cr.student_id
      WHERE cr.course_id = $1
      ORDER BY cr.updated_at DESC
      LIMIT $2
      OFFSET $3
    `,
    [courseId, limit, offset]
  );

  return result.rows;
};

const countByCourseId = async (courseId) => {
  const result = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM course_reviews
      WHERE course_id = $1
    `,
    [courseId]
  );

  return result.rows[0]?.total || 0;
};

const upsert = async ({ courseId, studentId, rating, comment }) => {
  const result = await query(
    `
      INSERT INTO course_reviews (course_id, student_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (course_id, student_id)
      DO UPDATE SET
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        updated_at = NOW()
      RETURNING id, course_id, student_id, rating, comment, created_at, updated_at
    `,
    [courseId, studentId, rating, comment]
  );

  return result.rows[0] || null;
};

const getSummaryByCourseId = async (courseId) => {
  const result = await query(
    `
      SELECT
        COUNT(*)::int AS total_reviews,
        COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating,
        COUNT(*) FILTER (WHERE rating = 1)::int AS star_1,
        COUNT(*) FILTER (WHERE rating = 2)::int AS star_2,
        COUNT(*) FILTER (WHERE rating = 3)::int AS star_3,
        COUNT(*) FILTER (WHERE rating = 4)::int AS star_4,
        COUNT(*) FILTER (WHERE rating = 5)::int AS star_5
      FROM course_reviews
      WHERE course_id = $1
    `,
    [courseId]
  );

  return result.rows[0] || {
    total_reviews: 0,
    average_rating: 0,
    star_1: 0,
    star_2: 0,
    star_3: 0,
    star_4: 0,
    star_5: 0,
  };
};

module.exports = {
  listByCourseId,
  countByCourseId,
  upsert,
  getSummaryByCourseId,
};
