const asyncHandler = require('../utils/async-handler');
const adminService = require('../services/admin.service');

const getDashboard = asyncHandler(async (req, res) => {
  const data = await adminService.getDashboard();

  res.json({
    success: true,
    message: 'Admin dashboard fetched successfully',
    data,
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const data = await adminService.listUsers(req.query);

  res.json({
    success: true,
    message: 'Admin users fetched successfully',
    data,
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const data = await adminService.getUserById(req.params.userId);

  res.json({
    success: true,
    message: 'Admin user fetched successfully',
    data,
  });
});

const createUser = asyncHandler(async (req, res) => {
  const data = await adminService.createUser({
    fullName: req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    avatar: req.body.avatar,
    role: req.body.role,
  });

  res.status(201).json({
    success: true,
    message: 'Admin user created successfully',
    data,
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const data = await adminService.updateUser(req.params.userId, {
    fullName: req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    avatar: req.body.avatar,
    role: req.body.role,
  });

  res.json({
    success: true,
    message: 'Admin user updated successfully',
    data,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const data = await adminService.deleteUser(req.params.userId, req.user);

  res.json({
    success: true,
    message: 'Admin user deleted successfully',
    data,
  });
});

const listCourses = asyncHandler(async (req, res) => {
  const data = await adminService.listCourses(req.query);

  res.json({
    success: true,
    message: 'Admin courses fetched successfully',
    data,
  });
});

module.exports = {
  getDashboard,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  listCourses,
};
