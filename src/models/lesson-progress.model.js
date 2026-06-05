const { query } = require('../config/database');

/**
 * Upsert lesson progress for a user.
 * Updates last_position_sec and/or is_completed.
 */
const upsert = async (userId, lessonId, courseId, { lastPositionSec, isCompleted }) => {
  const result = await query(
    `
      INSERT INTO lesson_progress (user_id, lesson_id, course_id, last_position_sec, is_completed, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, lesson_id) DO UPDATE
        SET last_position_sec = EXCLUDED.last_position_sec,
            is_completed      = EXCLUDED.is_completed,
            updated_at        = NOW()
      RETURNING id, user_id, lesson_id, course_id, last_position_sec, is_completed, updated_at
    `,
    [userId, lessonId, courseId, lastPositionSec ?? 0, isCompleted ?? false]
  );

  return result.rows[0];
};

/**
 * Get all lesson progress rows for a user in a specific course.
 */
const findByUserAndCourse = async (userId, courseId) => {
  const result = await query(
    `
      SELECT lp.id, lp.lesson_id, lp.last_position_sec, lp.is_completed, lp.updated_at,
             l.title AS lesson_title, l.order_index
      FROM lesson_progress lp
      JOIN lessons l ON l.id = lp.lesson_id
      WHERE lp.user_id = $1 AND lp.course_id = $2
      ORDER BY l.order_index ASC
    `,
    [userId, courseId]
  );

  return result.rows;
};

/**
 * Get the most recently active lessons across all courses for a user.
 * Used for "continue learning" suggestions.
 */
const findRecentlyActive = async (userId, limit = 3) => {
  const result = await query(
    `
      SELECT DISTINCT ON (lp.course_id)
        lp.course_id,
        lp.lesson_id,
        lp.last_position_sec,
        lp.is_completed,
        lp.updated_at,
        l.title  AS lesson_title,
        l.order_index,
        c.title  AS course_title,
        c.thumbnail AS course_thumbnail,
        c.level  AS course_level,
        e.progress AS course_progress
      FROM lesson_progress lp
      JOIN lessons     l  ON l.id = lp.lesson_id
      JOIN courses     c  ON c.id = lp.course_id
      JOIN enrollments e  ON e.student_id = lp.user_id AND e.course_id = lp.course_id
      WHERE lp.user_id = $1
      ORDER BY lp.course_id, lp.updated_at DESC
    `,
    [userId]
  );

  // sort outer result by most recently updated across courses
  return result.rows
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, limit);
};

/**
 * Get one progress row for a specific user + lesson.
 */
const findByUserAndLesson = async (userId, lessonId) => {
  const result = await query(
    `
      SELECT id, user_id, lesson_id, course_id, last_position_sec, is_completed, updated_at
      FROM lesson_progress
      WHERE user_id = $1 AND lesson_id = $2
      LIMIT 1
    `,
    [userId, lessonId]
  );

  return result.rows[0] || null;
};

module.exports = {
  upsert,
  findByUserAndCourse,
  findRecentlyActive,
  findByUserAndLesson,
};
