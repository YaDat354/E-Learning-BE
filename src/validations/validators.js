const HttpError = require('../utils/http-error');
const { classifyMediaSource } = require('../utils/media-source');

const ensureBodyObject = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const validateUuidLike = (value, fieldName) => {
  if (!isNonEmptyString(value)) {
    throw new HttpError(400, `${fieldName} is required`);
  }
};

const validateRegister = (req, res, next) => {
  ensureBodyObject(req.body);
  const { fullName, email, password, role } = req.body;

  if (!isNonEmptyString(fullName)) throw new HttpError(400, 'fullName is required');
  if (!isNonEmptyString(email)) throw new HttpError(400, 'email is required');
  if (!email.includes('@')) throw new HttpError(400, 'email is invalid');
  if (!isNonEmptyString(password) || password.length < 6) {
    throw new HttpError(400, 'password must be at least 6 characters');
  }

  if (role !== undefined) {
    const allowed = ['student', 'teacher', 'admin'];
    if (!allowed.includes(role)) throw new HttpError(400, 'role is invalid');
  }

  next();
};

const validateLogin = (req, res, next) => {
  ensureBodyObject(req.body);
  const { email, password } = req.body;

  if (!isNonEmptyString(email)) throw new HttpError(400, 'email is required');
  if (!isNonEmptyString(password)) throw new HttpError(400, 'password is required');

  next();
};

const validateCreateCourse = (req, res, next) => {
  ensureBodyObject(req.body);
  const { title, level, description, thumbnail } = req.body;
  const allowedLevels = ['co_ban', 'trung_cap', 'cao_cap'];

  if (!isNonEmptyString(title)) throw new HttpError(400, 'title is required');
  if (!isNonEmptyString(level) || !allowedLevels.includes(level)) {
    throw new HttpError(400, 'level must be one of: co_ban, trung_cap, cao_cap');
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new HttpError(400, 'description must be a string');
  }
  if (thumbnail !== undefined && typeof thumbnail !== 'string') {
    throw new HttpError(400, 'thumbnail must be a string');
  }

  next();
};

const validateUpdateCourse = (req, res, next) => {
  ensureBodyObject(req.body);
  const { title, level, description, thumbnail } = req.body;
  const allowedLevels = ['co_ban', 'trung_cap', 'cao_cap'];

  if (level !== undefined && (!isNonEmptyString(level) || !allowedLevels.includes(level))) {
    throw new HttpError(400, 'level must be one of: co_ban, trung_cap, cao_cap');
  }

  if (title === undefined && level === undefined && description === undefined && thumbnail === undefined) {
    throw new HttpError(400, 'At least one field (title, level, description, thumbnail) is required');
  }

  next();
};

const validateCreateLesson = (req, res, next) => {
  ensureBodyObject(req.body);
  const { title, orderIndex, duration, videoUrl } = req.body;

  if (!isNonEmptyString(title)) throw new HttpError(400, 'title is required');
  if (videoUrl !== undefined) {
    const sourceType = classifyMediaSource(videoUrl);
    if (!['audio', 'video', 'youtube'].includes(sourceType)) {
      throw new HttpError(400, 'videoUrl must be a direct media URL or a valid YouTube URL');
    }
  }
  if (orderIndex !== undefined && (!Number.isInteger(orderIndex) || orderIndex < 0)) {
    throw new HttpError(400, 'orderIndex must be an integer >= 0');
  }
  if (duration !== undefined && (Number.isNaN(Number(duration)) || Number(duration) < 0)) {
    throw new HttpError(400, 'duration must be a number >= 0');
  }

  next();
};

const validateUpdateLesson = (req, res, next) => {
  ensureBodyObject(req.body);
  if (Object.keys(req.body).length === 0) {
    throw new HttpError(400, 'At least one field is required');
  }

  if (req.body.videoUrl !== undefined) {
    const sourceType = classifyMediaSource(req.body.videoUrl);
    if (!['audio', 'video', 'youtube'].includes(sourceType)) {
      throw new HttpError(400, 'videoUrl must be a direct media URL or a valid YouTube URL');
    }
  }

  next();
};

const validateCreateAssignment = (req, res, next) => {
  ensureBodyObject(req.body);
  const { title, maxScore } = req.body;

  if (!isNonEmptyString(title)) throw new HttpError(400, 'title is required');
  if (maxScore !== undefined && (Number.isNaN(Number(maxScore)) || Number(maxScore) < 0)) {
    throw new HttpError(400, 'maxScore must be a number >= 0');
  }

  next();
};

const validateUpdateAssignment = (req, res, next) => {
  ensureBodyObject(req.body);
  if (Object.keys(req.body).length === 0) {
    throw new HttpError(400, 'At least one field is required');
  }
  next();
};

const validateSubmitAssignment = (req, res, next) => {
  ensureBodyObject(req.body);
  const { content, fileUrl } = req.body;
  if (!isNonEmptyString(content) && !isNonEmptyString(fileUrl)) {
    throw new HttpError(400, 'content or fileUrl is required');
  }
  next();
};

const validateGradeSubmission = (req, res, next) => {
  ensureBodyObject(req.body);
  const { score } = req.body;
  if (score === undefined || Number.isNaN(Number(score))) {
    throw new HttpError(400, 'score must be a valid number');
  }
  next();
};

const validateCreateQuiz = (req, res, next) => {
  ensureBodyObject(req.body);
  const { title, timeLimit } = req.body;

  if (!isNonEmptyString(title)) throw new HttpError(400, 'title is required');
  if (timeLimit !== undefined && (Number.isNaN(Number(timeLimit)) || Number(timeLimit) <= 0)) {
    throw new HttpError(400, 'timeLimit must be a number > 0');
  }

  next();
};

const validateAddQuestion = (req, res, next) => {
  ensureBodyObject(req.body);
  const { content, type, answers } = req.body;
  const allowed = ['single_choice', 'multiple_choice', 'text'];

  if (!isNonEmptyString(content)) throw new HttpError(400, 'content is required');
  if (!allowed.includes(type)) throw new HttpError(400, 'type is invalid');

  if (type !== 'text') {
    if (!Array.isArray(answers) || answers.length < 2) {
      throw new HttpError(400, 'answers must contain at least 2 items for choice questions');
    }

    const hasCorrect = answers.some((item) => item && item.isCorrect === true);
    if (!hasCorrect) throw new HttpError(400, 'at least one answer must be correct');
  }

  next();
};

const validateSubmitQuiz = (req, res, next) => {
  ensureBodyObject(req.body);
  if (!Array.isArray(req.body.answers)) {
    throw new HttpError(400, 'answers must be an array');
  }
  next();
};

const validateEnrollCourse = (req, res, next) => {
  ensureBodyObject(req.body);
  validateUuidLike(req.body.courseId, 'courseId');
  next();
};

const validateUpdateEnrollmentProgress = (req, res, next) => {
  ensureBodyObject(req.body);
  const numeric = Number(req.body.progress);
  if (Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
    throw new HttpError(400, 'progress must be a number between 0 and 100');
  }
  next();
};

const validateUpdateProfile = (req, res, next) => {
  ensureBodyObject(req.body);
  const { fullName, avatar } = req.body;
  if (fullName === undefined && avatar === undefined) {
    throw new HttpError(400, 'At least one field (fullName or avatar) is required');
  }
  next();
};

const validateCreateStudent = (req, res, next) => {
  ensureBodyObject(req.body);
  const { fullName, email, password } = req.body;

  if (!isNonEmptyString(fullName)) throw new HttpError(400, 'fullName is required');
  if (!isNonEmptyString(email)) throw new HttpError(400, 'email is required');
  if (!email.includes('@')) throw new HttpError(400, 'email is invalid');
  if (!isNonEmptyString(password) || password.length < 6) {
    throw new HttpError(400, 'password must be at least 6 characters');
  }

  next();
};

const validateUpdateStudent = (req, res, next) => {
  ensureBodyObject(req.body);
  const { fullName, email, password, avatar } = req.body;

  if (fullName === undefined && email === undefined && password === undefined && avatar === undefined) {
    throw new HttpError(400, 'At least one field (fullName, email, password, avatar) is required');
  }

  if (email !== undefined && (!isNonEmptyString(email) || !email.includes('@'))) {
    throw new HttpError(400, 'email is invalid');
  }

  if (password !== undefined && (!isNonEmptyString(password) || password.length < 6)) {
    throw new HttpError(400, 'password must be at least 6 characters');
  }

  next();
};

const validateCreateLessonFile = (req, res, next) => {
  ensureBodyObject(req.body);
  const { fileName, fileUrl } = req.body;
  if (!isNonEmptyString(fileName)) throw new HttpError(400, 'fileName is required');
  if (!isNonEmptyString(fileUrl)) throw new HttpError(400, 'fileUrl is required');
  next();
};

const validateUpsertLearningLog = (req, res, next) => {
  ensureBodyObject(req.body);
  const { learningTime } = req.body;
  if (learningTime !== undefined && (Number.isNaN(Number(learningTime)) || Number(learningTime) < 0)) {
    throw new HttpError(400, 'learningTime must be a number >= 0');
  }
  next();
};

const validateCreateDiscussion = (req, res, next) => {
  ensureBodyObject(req.body);
  if (!isNonEmptyString(req.body.content)) {
    throw new HttpError(400, 'content is required');
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateCourse,
  validateUpdateCourse,
  validateCreateLesson,
  validateUpdateLesson,
  validateCreateAssignment,
  validateUpdateAssignment,
  validateSubmitAssignment,
  validateGradeSubmission,
  validateCreateQuiz,
  validateAddQuestion,
  validateSubmitQuiz,
  validateEnrollCourse,
  validateUpdateEnrollmentProgress,
  validateUpdateProfile,
  validateCreateStudent,
  validateUpdateStudent,
  validateCreateLessonFile,
  validateUpsertLearningLog,
  validateCreateDiscussion,
};