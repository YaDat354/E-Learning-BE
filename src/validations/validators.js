const HttpError = require('../utils/http-error');
const { classifyMediaSource } = require('../utils/media-source');

const ensureBodyObject = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

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
  if (!isValidEmail(email)) throw new HttpError(400, 'email is invalid');
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
  if (!isValidEmail(email)) throw new HttpError(400, 'email is invalid');
  if (!isNonEmptyString(password)) throw new HttpError(400, 'password is required');

  next();
};

const validateCreateCourse = (req, res, next) => {
  ensureBodyObject(req.body);
  const {
    title,
    level,
    description,
    thumbnail,
    price,
    originalPrice,
    duration,
    category,
    tags,
  } = req.body;
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
  if (price !== undefined && (Number.isNaN(Number(price)) || Number(price) < 0)) {
    throw new HttpError(400, 'price must be a number >= 0');
  }
  if (originalPrice !== undefined && (Number.isNaN(Number(originalPrice)) || Number(originalPrice) < 0)) {
    throw new HttpError(400, 'originalPrice must be a number >= 0');
  }
  if (duration !== undefined && (Number.isNaN(Number(duration)) || Number(duration) < 0)) {
    throw new HttpError(400, 'duration must be a number >= 0');
  }
  if (category !== undefined && typeof category !== 'string') {
    throw new HttpError(400, 'category must be a string');
  }
  if (tags !== undefined && !Array.isArray(tags)) {
    throw new HttpError(400, 'tags must be an array of strings');
  }

  next();
};

const validateUpdateCourse = (req, res, next) => {
  ensureBodyObject(req.body);
  const {
    title,
    level,
    description,
    thumbnail,
    price,
    originalPrice,
    duration,
    category,
    tags,
  } = req.body;
  const allowedLevels = ['co_ban', 'trung_cap', 'cao_cap'];

  if (level !== undefined && (!isNonEmptyString(level) || !allowedLevels.includes(level))) {
    throw new HttpError(400, 'level must be one of: co_ban, trung_cap, cao_cap');
  }

  if (price !== undefined && (Number.isNaN(Number(price)) || Number(price) < 0)) {
    throw new HttpError(400, 'price must be a number >= 0');
  }
  if (originalPrice !== undefined && (Number.isNaN(Number(originalPrice)) || Number(originalPrice) < 0)) {
    throw new HttpError(400, 'originalPrice must be a number >= 0');
  }
  if (duration !== undefined && (Number.isNaN(Number(duration)) || Number(duration) < 0)) {
    throw new HttpError(400, 'duration must be a number >= 0');
  }
  if (category !== undefined && typeof category !== 'string') {
    throw new HttpError(400, 'category must be a string');
  }
  if (tags !== undefined && !Array.isArray(tags)) {
    throw new HttpError(400, 'tags must be an array of strings');
  }

  if (
    title === undefined
    && level === undefined
    && description === undefined
    && thumbnail === undefined
    && price === undefined
    && originalPrice === undefined
    && duration === undefined
    && category === undefined
    && tags === undefined
  ) {
    throw new HttpError(
      400,
      'At least one field (title, level, description, thumbnail, price, originalPrice, duration, category, tags) is required'
    );
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

const validateUpdateQuiz = (req, res, next) => {
  ensureBodyObject(req.body);
  const { title, description, timeLimit } = req.body;

  if (title === undefined && description === undefined && timeLimit === undefined) {
    throw new HttpError(400, 'At least one field (title, description, timeLimit) is required');
  }

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

const validateUpdateQuestion = (req, res, next) => {
  ensureBodyObject(req.body);

  const { content, type, orderIndex, answers } = req.body;
  const allowed = ['single_choice', 'multiple_choice', 'text'];

  if (content === undefined && type === undefined && orderIndex === undefined && answers === undefined) {
    throw new HttpError(400, 'At least one field is required');
  }

  if (type !== undefined && !allowed.includes(type)) {
    throw new HttpError(400, 'type is invalid');
  }

  if (orderIndex !== undefined && (!Number.isInteger(orderIndex) || orderIndex < 0)) {
    throw new HttpError(400, 'orderIndex must be an integer >= 0');
  }

  if (answers !== undefined) {
    if (!Array.isArray(answers)) {
      throw new HttpError(400, 'answers must be an array');
    }

    const effectiveType = type || null;
    if (effectiveType !== 'text') {
      const hasCorrect = answers.some((item) => item && item.isCorrect === true);
      if (answers.length < 2 || !hasCorrect) {
        throw new HttpError(400, 'choice question answers must contain at least 2 items and one correct answer');
      }
    }
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

const validateVnpayCheckout = (req, res, next) => {
  ensureBodyObject(req.body);

  const {
    courseId,
    courseTitle,
    amount,
    customerName,
    customerEmail,
    gateway,
    returnUrl,
    callbackUrl,
    ipnUrl,
  } = req.body;

  if (!isNonEmptyString(courseId)) throw new HttpError(400, 'courseId is required');
  if (!isNonEmptyString(courseTitle)) throw new HttpError(400, 'courseTitle is required');

  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    throw new HttpError(400, 'amount must be a number > 0');
  }

  if (!isNonEmptyString(customerName)) throw new HttpError(400, 'customerName is required');
  if (!isNonEmptyString(customerEmail) || !customerEmail.includes('@')) {
    throw new HttpError(400, 'customerEmail is invalid');
  }

  if (gateway !== undefined && (!isNonEmptyString(gateway) || gateway.toLowerCase() !== 'vnpay')) {
    throw new HttpError(400, 'gateway must be vnpay');
  }

  if (!isNonEmptyString(returnUrl)) throw new HttpError(400, 'returnUrl is required');
  if (!isNonEmptyString(callbackUrl) && !isNonEmptyString(ipnUrl)) {
    throw new HttpError(400, 'callbackUrl or ipnUrl is required');
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
  if (!isValidEmail(email)) throw new HttpError(400, 'email is invalid');
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

  if (email !== undefined && (!isNonEmptyString(email) || !isValidEmail(email))) {
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
  if (!isNonEmptyString(req.body.content) && !isNonEmptyString(req.body.text)) {
    throw new HttpError(400, 'content or text is required');
  }
  next();
};

const validateMarkLessonCommentsRead = (req, res, next) => {
  ensureBodyObject(req.body);

  const hasCommentId = isNonEmptyString(req.body.lastSeenCommentId);
  const hasSeenAt = isNonEmptyString(req.body.lastSeenAt);

  if (!hasCommentId && !hasSeenAt) {
    throw new HttpError(400, 'lastSeenCommentId or lastSeenAt is required');
  }

  if (hasSeenAt && Number.isNaN(Date.parse(req.body.lastSeenAt))) {
    throw new HttpError(400, 'lastSeenAt must be a valid ISO datetime');
  }

  next();
};

const validateAdminCreateUser = (req, res, next) => {
  ensureBodyObject(req.body);

  const { fullName, email, password, role, avatar } = req.body;
  const allowed = ['student', 'teacher', 'admin'];

  if (!isNonEmptyString(fullName)) throw new HttpError(400, 'fullName is required');
  if (!isNonEmptyString(email)) throw new HttpError(400, 'email is required');
  if (!email.includes('@')) throw new HttpError(400, 'email is invalid');
  if (!isNonEmptyString(password) || password.length < 6) {
    throw new HttpError(400, 'password must be at least 6 characters');
  }
  if (!isNonEmptyString(role) || !allowed.includes(role)) {
    throw new HttpError(400, 'role must be one of: student, teacher, admin');
  }
  if (avatar !== undefined && typeof avatar !== 'string') {
    throw new HttpError(400, 'avatar must be a string');
  }

  next();
};

const validateAdminUpdateUser = (req, res, next) => {
  ensureBodyObject(req.body);

  const {
    fullName,
    email,
    password,
    role,
    avatar,
  } = req.body;
  const allowed = ['student', 'teacher', 'admin'];

  if (
    fullName === undefined
    && email === undefined
    && password === undefined
    && role === undefined
    && avatar === undefined
  ) {
    throw new HttpError(400, 'At least one field (fullName, email, password, role, avatar) is required');
  }

  if (email !== undefined && (!isNonEmptyString(email) || !email.includes('@'))) {
    throw new HttpError(400, 'email is invalid');
  }

  if (password !== undefined && (!isNonEmptyString(password) || password.length < 6)) {
    throw new HttpError(400, 'password must be at least 6 characters');
  }

  if (role !== undefined && (!isNonEmptyString(role) || !allowed.includes(role))) {
    throw new HttpError(400, 'role must be one of: student, teacher, admin');
  }

  if (avatar !== undefined && typeof avatar !== 'string') {
    throw new HttpError(400, 'avatar must be a string');
  }

  next();
};

const validateAdminUserIdParam = (req, res, next) => {
  const { userId } = req.params;

  if (!isNonEmptyString(userId) || !isUuid(userId)) {
    throw new HttpError(400, 'userId must be a valid UUID');
  }

  next();
};

const validateCourseIdParam = (req, res, next) => {
  const { courseId } = req.params;

  if (!isNonEmptyString(courseId) || !isUuid(courseId)) {
    throw new HttpError(400, 'courseId must be a valid UUID');
  }

  next();
};

const validateCreateCourseReview = (req, res, next) => {
  ensureBodyObject(req.body);

  const { rating, comment } = req.body;
  const normalizedRating = Number.parseInt(rating, 10);

  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw new HttpError(400, 'rating must be an integer between 1 and 5');
  }

  if (!isNonEmptyString(comment)) {
    throw new HttpError(400, 'comment is required');
  }

  if (comment.trim().length > 1000) {
    throw new HttpError(400, 'comment must be at most 1000 characters');
  }

  next();
};

const validateChatbotChat = (req, res, next) => {
  ensureBodyObject(req.body);

  const { message, conversationId, history } = req.body;

  if (!isNonEmptyString(message)) {
    throw new HttpError(400, 'message is required');
  }

  if (String(message).trim().length > 4000) {
    throw new HttpError(400, 'message must be at most 4000 characters');
  }

  if (conversationId !== undefined && !isNonEmptyString(conversationId)) {
    throw new HttpError(400, 'conversationId must be a non-empty string');
  }

  if (history !== undefined) {
    if (!Array.isArray(history)) {
      throw new HttpError(400, 'history must be an array');
    }

    if (history.length > 20) {
      throw new HttpError(400, 'history must contain at most 20 messages');
    }

    for (let i = 0; i < history.length; i += 1) {
      const item = history[i];
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new HttpError(400, `history[${i}] must be an object`);
      }

      const role = String(item.role || '').trim();
      if (!['user', 'assistant'].includes(role)) {
        throw new HttpError(400, `history[${i}].role must be user or assistant`);
      }

      if (!isNonEmptyString(item.content)) {
        throw new HttpError(400, `history[${i}].content is required`);
      }

      if (String(item.content).trim().length > 2000) {
        throw new HttpError(400, `history[${i}].content must be at most 2000 characters`);
      }
    }
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
  validateUpdateQuiz,
  validateAddQuestion,
  validateUpdateQuestion,
  validateSubmitQuiz,
  validateEnrollCourse,
  validateUpdateEnrollmentProgress,
  validateVnpayCheckout,
  validateUpdateProfile,
  validateCreateStudent,
  validateUpdateStudent,
  validateCreateLessonFile,
  validateUpsertLearningLog,
  validateCreateDiscussion,
  validateMarkLessonCommentsRead,
  validateChatbotChat,
  validateCourseIdParam,
  validateCreateCourseReview,
  validateAdminCreateUser,
  validateAdminUpdateUser,
  validateAdminUserIdParam,
};