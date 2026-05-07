const userModel = require('../models/user.model');
const HttpError = require('../utils/http-error');

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

module.exports = {
  updateMyProfile,
};
