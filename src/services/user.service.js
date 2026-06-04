const bcrypt = require('bcrypt');

const userModel = require('../models/user.model');
const HttpError = require('../utils/http-error');
const roles = require('../constants/roles');

const updateMyProfile = async (userId, { fullName, avatar }) => {
  if (!fullName && !avatar) {
    throw new HttpError(400, 'At least one field (fullName or avatar) is required');
  }

  const updated = await userModel.updateById(userId, { fullName, avatar });

  if (!updated) {
    throw new HttpError(404, 'User not found');
  }

  return userModel.findById(userId);
};

const listStudents = async () => {
  return userModel.listByRole(roles.STUDENT);
};

const createStudent = async ({ fullName, email, password, avatar }) => {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw new HttpError(409, 'Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const created = await userModel.create({
    fullName,
    email,
    password: hashedPassword,
    role: roles.STUDENT,
  });

  if (!created) {
    throw new HttpError(500, 'Failed to create student');
  }

  if (avatar) {
    await userModel.updateById(created.id, { avatar });
  }

  return userModel.findById(created.id);
};

const updateStudent = async (userId, { fullName, email, password, avatar }) => {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  if (user.role !== roles.STUDENT) {
    throw new HttpError(400, 'Only student accounts can be updated by this endpoint');
  }

  if (email && email !== user.email) {
    const existing = await userModel.findByEmail(email);
    if (existing && existing.id !== userId) {
      throw new HttpError(409, 'Email already exists');
    }
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const updated = await userModel.adminUpdateById(userId, {
    fullName,
    email,
    password: hashedPassword,
    avatar,
  });

  if (!updated) {
    throw new HttpError(404, 'User not found');
  }

  return userModel.findById(userId);
};

const deleteStudent = async (userId) => {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  if (user.role !== roles.STUDENT) {
    throw new HttpError(400, 'Only student accounts can be deleted by this endpoint');
  }

  await userModel.deleteById(userId);
};

module.exports = {
  updateMyProfile,
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
};
