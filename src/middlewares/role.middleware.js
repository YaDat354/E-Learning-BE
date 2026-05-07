const HttpError = require('../utils/http-error');

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new HttpError(401, 'Authentication token is required'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new HttpError(403, 'Forbidden'));
  }

  return next();
};

module.exports = {
  authorizeRoles,
};
