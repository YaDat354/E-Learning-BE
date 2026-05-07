const asyncHandler = require('../utils/async-handler');
const { publicUser } = require('../services/auth.service');

const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Current user fetched successfully',
    data: publicUser(req.user),
  });
});

module.exports = {
  getCurrentUser,
};
