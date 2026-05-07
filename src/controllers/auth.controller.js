const asyncHandler = require('../utils/async-handler');
const authService = require('../services/auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    message: 'Register successfully',
    data: result,
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  res.json({
    success: true,
    message: 'Login successfully',
    data: result,
  });
});

module.exports = {
  register,
  login,
};
