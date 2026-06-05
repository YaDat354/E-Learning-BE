const HttpError = require('../utils/http-error');

const notFoundHandler = (req, res, next) => {
  next(new HttpError(404, 'Route not found', 'ROUTE_NOT_FOUND'));
};

const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  const payload = {
    success: false,
    message: error.message || 'Internal server error',
  };

  if (error.code) {
    payload.code = error.code;
  }

  if (error.details) {
    payload.details = error.details;
  }

  res.status(statusCode).json(payload);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
