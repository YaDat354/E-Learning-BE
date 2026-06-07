const adminModel = require('../models/admin.model');
const userModel = require('../models/user.model');
const HttpError = require('../utils/http-error');
const roles = require('../constants/roles');
const bcrypt = require('bcrypt');

const toPagination = (page, limit, totalItems) => ({
  page,
  limit,
  totalItems,
  totalPages: Math.max(1, Math.ceil(totalItems / limit)),
});

const parseListQuery = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    search: search || null,
  };
};

const parseRole = (role) => {
  if (!role) {
    return null;
  }

  const normalized = String(role).toLowerCase();
  const allowed = [roles.ADMIN, roles.TEACHER, roles.STUDENT];

  if (!allowed.includes(normalized)) {
    throw new HttpError(400, 'Invalid role filter', 'ADMIN_USER_QUERY_INVALID', {
      field: 'role',
      allowed,
    });
  }

  return normalized;
};

const mapUser = (user) => ({
  id: String(user.id),
  fullName: user.full_name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

const buildUserMutationError = (operation, statusCode, details) => {
  const operationMap = {
    create: 'CREATE',
    update: 'UPDATE',
    delete: 'DELETE',
  };
  const op = operationMap[operation] || 'UNKNOWN';

  return new HttpError(
    statusCode,
    `${operation.charAt(0).toUpperCase()}${operation.slice(1)} user failed`,
    `USER_${op}_FAILED`,
    details
  );
};

const levelLabelMap = {
  co_ban: 'Co ban',
  trung_cap: 'Trung cap',
  cao_cap: 'Nang cao',
};

const toLevelLabel = (value) => levelLabelMap[value] || value;

const toNumeric = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDashboard = async () => {
  const [
    totals,
    coursesByLevel,
    topCoursesByStudents,
    usersSummary,
    revenueByCategory,
    revenueByMonth,
    highScoreRateByCourse,
    completionRateByCourse,
  ] = await Promise.all([
    adminModel.getDashboardTotals(),
    adminModel.getCoursesByLevel(),
    adminModel.getTopCoursesByStudents(5),
    adminModel.getUsersSummary(),
    adminModel.getRevenueByCategory(),
    adminModel.getRevenueByMonth(),
    adminModel.getHighScoreRateByCourse(20),
    adminModel.getCompletionRateByCourse(20),
  ]);

  const mappedCoursesByLevel = coursesByLevel.map((row) => ({
    level: toLevelLabel(row.level),
    total: toNumeric(row.total),
  }));

  const mappedTopCourses = topCoursesByStudents.map((row) => ({
    id: String(row.id),
    title: row.title,
    level: row.level,
    teacherId: String(row.teacher_id),
    teacherEmail: row.teacher_email,
    totalStudents: toNumeric(row.total_students),
    lessonCount: toNumeric(row.lesson_count),
    lesson_count: toNumeric(row.lesson_count),
  }));

  const mappedRevenueByCategory = revenueByCategory.map((row) => ({
    category: row.category,
    revenue: toNumeric(row.revenue),
  }));

  const mappedRevenueByMonth = revenueByMonth.map((row) => ({
    month: row.month,
    revenue: toNumeric(row.revenue),
  }));

  const mappedHighScoreRateByCourse = highScoreRateByCourse.map((row) => ({
    courseId: String(row.course_id),
    courseTitle: row.course_title,
    highScoreRate: toNumeric(row.high_score_rate),
    totalStudentsAttempted: toNumeric(row.total_students_attempted),
    course_id: String(row.course_id),
    course_title: row.course_title,
    high_score_rate: toNumeric(row.high_score_rate),
  }));

  const mappedCompletionRateByCourse = completionRateByCourse.map((row) => ({
    courseId: String(row.course_id),
    courseTitle: row.course_title,
    completionRate: toNumeric(row.completion_rate),
    totalStudentsEnrolled: toNumeric(row.total_students_enrolled),
    totalLessons: toNumeric(row.total_lessons),
    course_id: String(row.course_id),
    course_title: row.course_title,
    completion_rate: toNumeric(row.completion_rate),
  }));

  return {
    totalCourses: toNumeric(totals.total_courses),
    totalLessons: toNumeric(totals.total_lessons),
    totalStudents: toNumeric(totals.total_students),
    totalUsers: toNumeric(usersSummary.total_users),
    usersByRole: {
      admin: toNumeric(usersSummary.total_admins),
      teacher: toNumeric(usersSummary.total_teachers),
      student: toNumeric(usersSummary.total_students),
    },
    coursesByLevel: mappedCoursesByLevel,
    topCoursesByStudents: mappedTopCourses,
    revenueByCategory: mappedRevenueByCategory,
    revenueByMonth: mappedRevenueByMonth,
    highScoreRateByCourse: mappedHighScoreRateByCourse,
    completionRateByCourse: mappedCompletionRateByCourse,
    chartData: {
      coursesByLevel: {
        labels: mappedCoursesByLevel.map((row) => row.level),
        series: mappedCoursesByLevel.map((row) => row.total),
      },
      topCoursesByStudents: {
        labels: mappedTopCourses.map((row) => row.title),
        series: mappedTopCourses.map((row) => row.totalStudents),
        lessonSeries: mappedTopCourses.map((row) => row.lessonCount),
      },
      usersByRole: {
        labels: ['admin', 'teacher', 'student'],
        series: [
          toNumeric(usersSummary.total_admins),
          toNumeric(usersSummary.total_teachers),
          toNumeric(usersSummary.total_students),
        ],
      },
      revenueByCategory: {
        labels: mappedRevenueByCategory.map((row) => row.category),
        series: mappedRevenueByCategory.map((row) => row.revenue),
      },
      revenueByMonth: {
        labels: mappedRevenueByMonth.map((row) => row.month),
        series: mappedRevenueByMonth.map((row) => row.revenue),
      },
      highScoreRateByCourse: {
        labels: mappedHighScoreRateByCourse.map((row) => row.courseTitle),
        series: mappedHighScoreRateByCourse.map((row) => row.highScoreRate),
      },
      completionRateByCourse: {
        labels: mappedCompletionRateByCourse.map((row) => row.courseTitle),
        series: mappedCompletionRateByCourse.map((row) => row.completionRate),
      },
    },
  };
};

const listUsers = async (query) => {
  const parsed = parseListQuery(query);
  const role = parseRole(query.role);

  const [result, summary] = await Promise.all([
    adminModel.listUsers({
      ...parsed,
      role,
    }),
    adminModel.getUsersSummary(),
  ]);

  return {
    summary: {
      totalUsers: summary.total_users,
      byRole: {
        admin: summary.total_admins,
        teacher: summary.total_teachers,
        student: summary.total_students,
      },
    },
    items: result.items.map(mapUser),
    pagination: toPagination(parsed.page, parsed.limit, result.totalItems),
  };
};

const getUserById = async (userId) => {
  const user = await adminModel.findUserById(userId);

  if (!user) {
    throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return mapUser(user);
};

const createUser = async ({ fullName, email, password, avatar, role }) => {
  const normalizedRole = parseRole(role);

  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw buildUserMutationError('create', 409, 'Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const created = await userModel.create({
    fullName,
    email,
    password: hashedPassword,
    role: normalizedRole,
  });

  if (!created) {
    throw buildUserMutationError('create', 500, 'Unable to create user record');
  }

  if (avatar) {
    await adminModel.updateUserById(created.id, { avatar });
  }

  const user = await adminModel.findUserById(created.id);
  if (!user) {
    throw buildUserMutationError('create', 500, 'Unable to read created user');
  }

  return mapUser(user);
};

const updateUser = async (userId, {
  fullName,
  email,
  password,
  avatar,
  role,
}) => {
  const current = await adminModel.findUserById(userId);
  if (!current) {
    throw buildUserMutationError('update', 404, 'User not found');
  }

  if (email && email !== current.email) {
    const existing = await userModel.findByEmail(email);
    if (existing && existing.id !== userId) {
      throw buildUserMutationError('update', 409, 'Email already exists');
    }
  }

  let normalizedRole = null;
  if (role !== undefined) {
    normalizedRole = parseRole(role);
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
  const updated = await adminModel.updateUserById(userId, {
    fullName,
    email,
    password: hashedPassword,
    avatar,
    role: normalizedRole,
  });

  if (!updated) {
    throw buildUserMutationError('update', 500, 'Unable to update user record');
  }

  const user = await adminModel.findUserById(userId);
  if (!user) {
    throw buildUserMutationError('update', 500, 'Unable to read updated user');
  }

  return mapUser(user);
};

const deleteUser = async (userId, currentAdmin) => {
  const user = await adminModel.findUserById(userId);

  if (!user) {
    throw buildUserMutationError('delete', 404, 'User not found');
  }

  if (String(user.id) === String(currentAdmin.id)) {
    throw buildUserMutationError('delete', 400, 'Cannot delete current admin account');
  }

  const deleted = await adminModel.deleteUserById(userId);
  if (!deleted) {
    throw buildUserMutationError('delete', 500, 'Unable to delete user record');
  }

  return {
    id: String(user.id),
  };
};

const listCourses = async (query) => {
  const parsed = parseListQuery(query);

  const result = await adminModel.listCourses({
    ...parsed,
    level: query.level ? String(query.level) : null,
    teacherId: query.teacherId ? String(query.teacherId) : null,
  });

  return {
    items: result.items.map((course) => ({
      id: String(course.id),
      title: course.title,
      level: course.level,
      description: course.description,
      thumbnail: course.thumbnail,
      price: course.price !== null && course.price !== undefined ? Number(course.price) : 0,
      originalPrice: course.original_price !== null && course.original_price !== undefined
        ? Number(course.original_price)
        : null,
      duration: course.duration,
      category: course.category,
      tags: Array.isArray(course.tags) ? course.tags : [],
      teacherId: String(course.teacher_id),
      teacherEmail: course.teacher_email,
      teacherName: course.teacher_name,
      lessonCount: course.lesson_count,
      lesson_count: course.lesson_count,
      totalStudents: course.total_students,
      createdAt: course.created_at,
      updatedAt: course.updated_at,
    })),
    pagination: toPagination(parsed.page, parsed.limit, result.totalItems),
  };
};

module.exports = {
  getDashboard,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  listCourses,
};
