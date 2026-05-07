const HttpError = require('../utils/http-error');

const notFoundHandler = (req, res, next) => {
  next(new HttpError(404, 'Route not found'));
};

const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
