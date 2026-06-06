const { query } = require('../config/database');

const findByCourseId = async (courseId) => {
  const result = await query(
    `SELECT d.id, d.course_id, d.user_id, d.parent_id, d.content, d.created_at,
            u.full_name AS user_name, u.email AS user_email
     FROM discussions d
     JOIN users u ON u.id = d.user_id
     WHERE d.course_id = $1
     ORDER BY d.created_at ASC`,
    [courseId]
  );
  return result.rows;
};

const create = async ({ courseId, userId, content, parentId }) => {
  const result = await query(
    `INSERT INTO discussions (course_id, user_id, content, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, course_id, user_id, parent_id, content, created_at`,
    [courseId, userId, content, parentId || null]
  );
  return result.rows[0] || null;
};

const createLessonComment = async ({ courseId, lessonId, userId, content, parentId }) => {
  const result = await query(
    `
      INSERT INTO discussions (course_id, lesson_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, course_id, lesson_id, user_id, parent_id, content, likes_count, created_at
    `,
    [courseId, lessonId, userId, content, parentId || null]
  );

  return result.rows[0] || null;
};

const findLessonCommentById = async (lessonId, commentId) => {
  const result = await query(
    `
      SELECT id, lesson_id, created_at
      FROM discussions
      WHERE lesson_id = $1 AND id = $2
      LIMIT 1
    `,
    [lessonId, commentId]
  );

  return result.rows[0] || null;
};

const findByLessonId = async (lessonId) => {
  const result = await query(
    `
      SELECT
        d.id AS comment_id,
        d.lesson_id,
        d.course_id,
        d.parent_id,
        d.content AS text,
        d.likes_count AS likes,
        d.created_at,
        u.id AS author_id,
        u.full_name AS author_name,
        u.email AS author_email,
        u.avatar AS author_avatar
      FROM discussions d
      JOIN users u ON u.id = d.user_id
      WHERE d.lesson_id = $1
      ORDER BY d.created_at DESC
    `,
    [lessonId]
  );

  return result.rows;
};

const upsertLessonReadState = async ({ userId, lessonId, lastSeenAt, lastSeenCommentId }) => {
  const result = await query(
    `
      INSERT INTO lesson_comment_reads (user_id, lesson_id, last_seen_at, last_seen_comment_id, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        last_seen_at = GREATEST(lesson_comment_reads.last_seen_at, EXCLUDED.last_seen_at),
        last_seen_comment_id = COALESCE(EXCLUDED.last_seen_comment_id, lesson_comment_reads.last_seen_comment_id),
        updated_at = NOW()
      RETURNING user_id, lesson_id, last_seen_at, last_seen_comment_id, updated_at
    `,
    [userId, lessonId, lastSeenAt, lastSeenCommentId || null]
  );

  return result.rows[0] || null;
};

const getUnreadLessonNotificationsByUser = async ({ userId, role }) => {
  const result = await query(
    `
      WITH accessible_lessons AS (
        SELECT l.id AS lesson_id, l.course_id
        FROM lessons l
        JOIN courses c ON c.id = l.course_id
        LEFT JOIN enrollments e
          ON e.course_id = l.course_id
         AND e.student_id = $1
        WHERE $2 = 'admin'
           OR c.teacher_id = $1
           OR e.student_id = $1
      )
      SELECT
        al.course_id,
        al.lesson_id,
        COUNT(d.id)::int AS unread_count,
        MAX(d.created_at) AS latest_comment_at
      FROM accessible_lessons al
      JOIN discussions d
        ON d.lesson_id = al.lesson_id
      LEFT JOIN lesson_comment_reads r
        ON r.lesson_id = al.lesson_id
       AND r.user_id = $1
      WHERE d.user_id <> $1
        AND d.created_at > COALESCE(r.last_seen_at, to_timestamp(0))
      GROUP BY al.course_id, al.lesson_id
      ORDER BY latest_comment_at DESC
    `,
    [userId, role || 'student']
  );

  return result.rows;
};

const countByCourseId = async (courseId) => {
  const result = await query(
    `SELECT COUNT(*)::int AS total_discussions FROM discussions WHERE course_id = $1`,
    [courseId]
  );

  return result.rows[0]?.total_discussions || 0;
};

module.exports = {
  findByCourseId,
  create,
  createLessonComment,
  findLessonCommentById,
  findByLessonId,
  upsertLessonReadState,
  getUnreadLessonNotificationsByUser,
  countByCourseId,
};