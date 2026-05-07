const asyncHandler = require('../utils/async-handler');
const HttpError = require('../utils/http-error');
const { verifyAccessToken } = require('../utils/jwt');
const userModel = require('../models/user.model');

const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication token is required');
  }

  const token = authorization.replace('Bearer ', '').trim();
  const payload = verifyAccessToken(token);
  const user = await userModel.findById(payload.userId);

  if (!user) {
    throw new HttpError(401, 'User not found');
  }

  req.user = user;
  next();
});

module.exports = {
  authenticate,
};
