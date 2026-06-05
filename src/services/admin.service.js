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

const getDashboard = async () => {
  const [totals, coursesByLevel, topCoursesByStudents, usersSummary] = await Promise.all([
    adminModel.getDashboardTotals(),
    adminModel.getCoursesByLevel(),
    adminModel.getTopCoursesByStudents(5),
    adminModel.getUsersSummary(),
  ]);

  const mappedCoursesByLevel = coursesByLevel.map((row) => ({
    level: row.level,
    total: row.total,
  }));

  const mappedTopCourses = topCoursesByStudents.map((row) => ({
    id: String(row.id),
    title: row.title,
    level: row.level,
    teacherId: String(row.teacher_id),
    teacherEmail: row.teacher_email,
    totalStudents: row.total_students,
    lessonCount: row.lesson_count,
    lesson_count: row.lesson_count,
  }));

  return {
    totalCourses: totals.total_courses,
    totalLessons: totals.total_lessons,
    totalStudents: totals.total_students,
    totalUsers: usersSummary.total_users,
    usersByRole: {
      admin: usersSummary.total_admins,
      teacher: usersSummary.total_teachers,
      student: usersSummary.total_students,
    },
    coursesByLevel: mappedCoursesByLevel,
    topCoursesByStudents: mappedTopCourses,
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
          usersSummary.total_admins,
          usersSummary.total_teachers,
          usersSummary.total_students,
        ],
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
