const asyncHandler = require('../utils/async-handler');
const { publicUser } = require('../services/auth.service');
const userService = require('../services/user.service');

const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Current user fetched successfully',
    data: publicUser(req.user),
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

module.exports = {
  getCurrentUser,
  updateCurrentUser,
};
