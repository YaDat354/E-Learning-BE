const { query } = require('../config/database');

const getDashboardTotals = async () => {
  const result = await query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM courses) AS total_courses,
        (SELECT COUNT(*)::int FROM lessons) AS total_lessons,
        (SELECT COUNT(*)::int
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.name = 'student') AS total_students
    `
  );

  return result.rows[0] || {
    total_courses: 0,
    total_lessons: 0,
    total_students: 0,
  };
};

const getCoursesByLevel = async () => {
  const result = await query(
    `
      SELECT level, COUNT(*)::int AS total
      FROM courses
      GROUP BY level
      ORDER BY level ASC
    `
  );

  return result.rows;
};

const getUsersSummary = async () => {
  const result = await query(
    `
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE r.name = 'admin')::int AS total_admins,
        COUNT(*) FILTER (WHERE r.name = 'teacher')::int AS total_teachers,
        COUNT(*) FILTER (WHERE r.name = 'student')::int AS total_students
      FROM users u
      JOIN roles r ON r.id = u.role_id
    `
  );

  return result.rows[0] || {
    total_users: 0,
    total_admins: 0,
    total_teachers: 0,
    total_students: 0,
  };
};

const findUserById = async (userId) => {
  const result = await query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.avatar,
        u.created_at,
        u.updated_at,
        r.name AS role
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

const updateUserById = async (userId, {
  fullName,
  email,
  password,
  avatar,
  role,
}) => {
  const result = await query(
    `
      UPDATE users
      SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        password = COALESCE($3, password),
        avatar = COALESCE($4, avatar),
        role_id = COALESCE((SELECT id FROM roles WHERE name = $5), role_id),
        updated_at = NOW()
      WHERE id = $6
      RETURNING id
    `,
    [
      fullName || null,
      email || null,
      password || null,
      avatar || null,
      role || null,
      userId,
    ]
  );

  return result.rows[0] || null;
};

const deleteUserById = async (userId) => {
  const result = await query(
    `
      DELETE FROM users
      WHERE id = $1
      RETURNING id
    `,
    [userId]
  );

  return result.rows[0] || null;
};

const getTopCoursesByStudents = async (limit = 5) => {
  const result = await query(
    `
      SELECT
        c.id,
        c.title,
        c.level,
        c.teacher_id,
        u.email AS teacher_email,
        COUNT(e.student_id)::int AS total_students,
        (
          SELECT COUNT(*)::int
          FROM lessons l
          WHERE l.course_id = c.id
        ) AS lesson_count
      FROM courses c
      LEFT JOIN users u ON u.id = c.teacher_id
      LEFT JOIN enrollments e ON e.course_id = c.id
      GROUP BY c.id, c.title, c.level, c.teacher_id, u.email
      ORDER BY total_students DESC, c.created_at DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
};

const getRevenueByCategory = async () => {
  const result = await query(
    `
      SELECT
        COALESCE(NULLIF(TRIM(c.category), ''), 'Khac') AS category,
        COALESCE(SUM(po.amount), 0)::numeric AS revenue
      FROM payment_orders po
      JOIN courses c ON c.id = po.course_id
      WHERE po.status = 'paid'
      GROUP BY COALESCE(NULLIF(TRIM(c.category), ''), 'Khac')
      ORDER BY revenue DESC, category ASC
    `
  );

  return result.rows;
};

const getRevenueByMonth = async () => {
  const result = await query(
    `
      SELECT
        to_char(
          date_trunc('month', timezone('UTC', COALESCE(po.paid_at, po.updated_at, po.created_at))),
          'YYYY-MM'
        ) AS month,
        COALESCE(SUM(po.amount), 0)::numeric AS revenue
      FROM payment_orders po
      WHERE po.status = 'paid'
      GROUP BY 1
      ORDER BY month ASC
    `
  );

  return result.rows;
};

const getHighScoreRateByCourse = async (limit = 20) => {
  const result = await query(
    `
      WITH student_course_best_scores AS (
        SELECT
          q.course_id,
          qr.student_id,
          MAX(qr.score) AS best_score
        FROM quiz_results qr
        JOIN quizzes q ON q.id = qr.quiz_id
        GROUP BY q.course_id, qr.student_id
      )
      SELECT
        c.id AS course_id,
        c.title AS course_title,
        COUNT(s.student_id)::int AS total_students_attempted,
        COALESCE(
          ROUND(
            100.0 * COUNT(s.student_id) FILTER (WHERE s.best_score >= 80)
            / NULLIF(COUNT(s.student_id), 0),
            2
          ),
          0
        )::numeric AS high_score_rate
      FROM courses c
      LEFT JOIN student_course_best_scores s ON s.course_id = c.id
      GROUP BY c.id, c.title
      HAVING COUNT(s.student_id) > 0
      ORDER BY high_score_rate DESC, total_students_attempted DESC, c.title ASC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
};

const getCompletionRateByCourse = async (limit = 20) => {
  const result = await query(
    `
      WITH lesson_counts AS (
        SELECT c.id AS course_id, COUNT(l.id)::int AS total_lessons
        FROM courses c
        LEFT JOIN lessons l ON l.course_id = c.id
        GROUP BY c.id
      ),
      completed_lessons_by_student AS (
        SELECT
          lp.course_id,
          lp.user_id AS student_id,
          COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.is_completed = TRUE)::int AS completed_lessons
        FROM lesson_progress lp
        GROUP BY lp.course_id, lp.user_id
      )
      SELECT
        c.id AS course_id,
        c.title AS course_title,
        lc.total_lessons,
        COUNT(e.student_id)::int AS total_students_enrolled,
        COALESCE(
          ROUND(
            100.0 * COUNT(e.student_id) FILTER (
              WHERE lc.total_lessons > 0 AND COALESCE(cls.completed_lessons, 0) >= lc.total_lessons
            )
            / NULLIF(COUNT(e.student_id), 0),
            2
          ),
          0
        )::numeric AS completion_rate
      FROM courses c
      LEFT JOIN lesson_counts lc ON lc.course_id = c.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      LEFT JOIN completed_lessons_by_student cls
        ON cls.course_id = c.id
       AND cls.student_id = e.student_id
      GROUP BY c.id, c.title, lc.total_lessons
      HAVING COUNT(e.student_id) > 0
      ORDER BY completion_rate DESC, total_students_enrolled DESC, c.title ASC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
};

const listUsers = async ({
  page,
  limit,
  search,
  role,
  sortBy,
  sortOrder,
}) => {
  const where = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  if (role) {
    params.push(role);
    where.push(`r.name = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sortableColumns = {
    createdAt: 'u.created_at',
    fullName: 'u.full_name',
    email: 'u.email',
    role: 'r.name',
  };

  const orderColumn = sortableColumns[sortBy] || sortableColumns.createdAt;
  const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM users u
      JOIN roles r ON r.id = u.role_id
      ${whereSql}
    `,
    params
  );

  const totalItems = countResult.rows[0]?.total || 0;

  params.push(limit);
  const limitParam = params.length;
  params.push((page - 1) * limit);
  const offsetParam = params.length;

  const itemsResult = await query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.avatar,
        u.created_at,
        u.updated_at,
        r.name AS role
      FROM users u
      JOIN roles r ON r.id = u.role_id
      ${whereSql}
      ORDER BY ${orderColumn} ${orderDir}
      LIMIT $${limitParam}
      OFFSET $${offsetParam}
    `,
    params
  );

  return {
    items: itemsResult.rows,
    totalItems,
  };
};

const listCourses = async ({
  page,
  limit,
  search,
  level,
  teacherId,
  sortBy,
  sortOrder,
}) => {
  const where = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(c.title ILIKE $${params.length} OR c.description ILIKE $${params.length})`);
  }

  if (level) {
    params.push(level);
    where.push(`c.level = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    where.push(`c.teacher_id = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sortableColumns = {
    createdAt: 'c.created_at',
    title: 'c.title',
    level: 'c.level',
    lessonCount: 'lesson_count',
    totalStudents: 'total_students',
  };

  const orderColumn = sortableColumns[sortBy] || sortableColumns.createdAt;
  const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM courses c
      ${whereSql}
    `,
    params
  );

  const totalItems = countResult.rows[0]?.total || 0;

  params.push(limit);
  const limitParam = params.length;
  params.push((page - 1) * limit);
  const offsetParam = params.length;

  const itemsResult = await query(
    `
      SELECT
        c.id,
        c.title,
        c.level,
        c.description,
        c.thumbnail,
        c.price,
        c.original_price,
        c.duration,
        c.category,
        c.tags,
        c.created_at,
        c.updated_at,
        c.teacher_id,
        u.email AS teacher_email,
        u.full_name AS teacher_name,
        (
          SELECT COUNT(*)::int
          FROM lessons l
          WHERE l.course_id = c.id
        ) AS lesson_count,
        (
          SELECT COUNT(*)::int
          FROM enrollments e
          WHERE e.course_id = c.id
        ) AS total_students
      FROM courses c
      LEFT JOIN users u ON u.id = c.teacher_id
      ${whereSql}
      ORDER BY ${orderColumn} ${orderDir}
      LIMIT $${limitParam}
      OFFSET $${offsetParam}
    `,
    params
  );

  return {
    items: itemsResult.rows,
    totalItems,
  };
};

module.exports = {
  getDashboardTotals,
  getCoursesByLevel,
  getUsersSummary,
  findUserById,
  updateUserById,
  deleteUserById,
  getTopCoursesByStudents,
  getRevenueByCategory,
  getRevenueByMonth,
  getHighScoreRateByCourse,
  getCompletionRateByCourse,
  listUsers,
  listCourses,
};
