const asyncHandler = require('../utils/async-handler');
const { publicUser } = require('../services/auth.service');
const userService = require('../services/user.service');

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = publicUser(req.user);

  res.json({
    success: true,
    message: 'Current user fetched successfully',
    data: {
      id: String(user.id),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

const updateCurrentUser = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateMyProfile(req.user.id, {
    fullName: req.body.fullName,
    avatar: req.body.avatar,
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: publicUser(updatedUser),
  });
});

const listStudents = asyncHandler(async (req, res) => {
  const students = await userService.listStudents();

  res.json({
    success: true,
    message: 'Students fetched successfully',
    data: students.map(publicUser),
  });
});

const createStudent = asyncHandler(async (req, res) => {
  const student = await userService.createStudent({
    fullName: req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    avatar: req.body.avatar,
  });

  res.status(201).json({
    success: true,
    message: 'Student created successfully',
    data: publicUser(student),
  });
});

const updateStudent = asyncHandler(async (req, res) => {
  const student = await userService.updateStudent(req.params.userId, {
    fullName: req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    avatar: req.body.avatar,
  });

  res.json({
    success: true,
    message: 'Student updated successfully',
    data: publicUser(student),
  });
});

const deleteStudent = asyncHandler(async (req, res) => {
  await userService.deleteStudent(req.params.userId);

  res.json({
    success: true,
    message: 'Student deleted successfully',
  });
});

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
};
