const bcrypt = require('bcrypt');

const userModel = require('../models/user.model');
const roles = require('../constants/roles');
const HttpError = require('../utils/http-error');
const { signAccessToken } = require('../utils/jwt');

const publicUser = (user) => ({
  id: user.id,
  fullName: user.full_name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

const register = async ({ fullName, email, password, role = roles.STUDENT }) => {
  if (!fullName || !email || !password) {
    throw new HttpError(400, 'fullName, email, and password are required');
  }

  if (!Object.values(roles).includes(role)) {
    throw new HttpError(400, 'Invalid role');
  }

  const existingUser = await userModel.findByEmail(email);

  if (existingUser) {
    throw new HttpError(409, 'Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const createdUser = await userModel.create({
    fullName,
    email,
    password: hashedPassword,
    role,
  });

  if (!createdUser) {
    throw new HttpError(500, 'Failed to create user');
  }

  const user = await userModel.findById(createdUser.id);
  const accessToken = signAccessToken({ userId: user.id, role: user.role });

  return {
    user: publicUser(user),
    accessToken,
  };
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new HttpError(400, 'email and password are required');
  }

  const user = await userModel.findByEmail(email);

  if (!user) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new HttpError(401, 'Invalid email or password');
  }

  return {
    user: publicUser(user),
    accessToken: signAccessToken({ userId: user.id, role: user.role }),
  };
};

module.exports = {
  register,
  login,
  publicUser,
};
