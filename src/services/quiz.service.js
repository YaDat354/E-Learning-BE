const quizModel = require('../models/quiz.model');
const courseModel = require('../models/course.model');
const enrollmentModel = require('../models/enrollment.model');
const HttpError = require('../utils/http-error');
const { assertTeacherOwnsCourse, OWNERSHIP_ERROR_CODE } = require('../utils/ownership');

const requireCourse = async (courseId) => {
  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  return course;
};

const requireQuiz = async (courseId, quizId) => {
  const quiz = await quizModel.findById(quizId);
  if (!quiz || quiz.course_id !== courseId) throw new HttpError(404, 'Quiz not found');
  return quiz;
};

const assertTeacherOwns = (course, user) => {
  assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);
};

const getQuizzes = async (courseId, currentUser = null) => {
  const course = await requireCourse(courseId);
  if (currentUser && currentUser.role === 'teacher') {
    assertTeacherOwns(course, currentUser);
  }

  return quizModel.findByCourseId(courseId);
};

const getQuizById = async (courseId, quizId, currentUser = null) => {
  const course = await requireCourse(courseId);
  if (currentUser && currentUser.role === 'teacher') {
    assertTeacherOwns(course, currentUser);
  }

  const quiz = await requireQuiz(courseId, quizId);
  const questions = await quizModel.findQuestionsWithAnswers(quizId);
  return { ...quiz, questions };
};

const createQuiz = async (courseId, body, user) => {
  const course = await requireCourse(courseId);
  assertTeacherOwns(course, user);
  const { title, description, timeLimit } = body;
  if (!title) throw new HttpError(400, 'title is required');
  return quizModel.createQuiz({ courseId, title, description, timeLimit });
};

const updateQuiz = async (courseId, quizId, body, user) => {
  const course = await requireCourse(courseId);
  assertTeacherOwns(course, user);
  await requireQuiz(courseId, quizId);

  const { title, description, timeLimit } = body;
  if (title === undefined && description === undefined && timeLimit === undefined) {
    throw new HttpError(400, 'At least one field (title, description, timeLimit) is required');
  }

  const updated = await quizModel.updateQuiz(quizId, { title, description, timeLimit });
  if (!updated) throw new HttpError(404, 'Quiz not found');
  return updated;
};

const deleteQuiz = async (courseId, quizId, user) => {
  const course = await requireCourse(courseId);
  assertTeacherOwns(course, user);
  await requireQuiz(courseId, quizId);
  await quizModel.deleteQuiz(quizId);
};

const addQuestion = async (courseId, quizId, body, user) => {
  const course = await requireCourse(courseId);
  assertTeacherOwns(course, user);
  await requireQuiz(courseId, quizId);

  const { content, type, orderIndex, answers } = body;
  if (!content || !type) throw new HttpError(400, 'content and type are required');

  const question = await quizModel.createQuestion({ quizId, content, type, orderIndex });
  const createdAnswers = await quizModel.createAnswers(question.id, answers);

  return {
    ...question,
    answers: createdAnswers,
  };
};

const updateQuestion = async (courseId, quizId, questionId, body, user) => {
  const course = await requireCourse(courseId);
  assertTeacherOwns(course, user);
  await requireQuiz(courseId, quizId);

  const question = await quizModel.findQuestionById(questionId);
  if (!question || question.quiz_id !== quizId) {
    throw new HttpError(404, 'Question not found');
  }

  const { content, type, orderIndex, answers } = body;
  if (content === undefined && type === undefined && orderIndex === undefined && answers === undefined) {
    throw new HttpError(400, 'At least one field is required');
  }

  const updatedQuestion = await quizModel.updateQuestion(questionId, { content, type, orderIndex });

  let finalAnswers = await quizModel.findQuestionsWithAnswers(quizId);
  let selectedAnswers = finalAnswers.find((item) => item.id === questionId)?.answers || [];

  if (answers !== undefined) {
    await quizModel.deleteAnswersByQuestionId(questionId);
    selectedAnswers = await quizModel.createAnswers(questionId, answers);
  }

  return {
    ...updatedQuestion,
    answers: selectedAnswers,
  };
};

const deleteQuestion = async (courseId, quizId, questionId, user) => {
  const course = await requireCourse(courseId);
  assertTeacherOwns(course, user);
  await requireQuiz(courseId, quizId);

  const question = await quizModel.findQuestionById(questionId);
  if (!question || question.quiz_id !== quizId) {
    throw new HttpError(404, 'Question not found');
  }

  await quizModel.deleteQuestion(questionId);
};

const submitQuiz = async (courseId, quizId, body, user) => {
  await requireCourse(courseId);
  await requireQuiz(courseId, quizId);

  const enrollment = await enrollmentModel.findByStudentAndCourse(user.id, courseId);
  if (!enrollment) {
    throw new HttpError(403, 'You are not enrolled in this course', 'RESOURCE_NOT_OWNED');
  }

  try {
    return await quizModel.submitQuiz({
      quizId,
      studentId: user.id,
      answers: body.answers || [],
    });
  } catch (error) {
    if (error.code === 'ALREADY_SUBMITTED') {
      throw new HttpError(409, 'You already submitted this quiz');
    }
    throw error;
  }
};

const getMyResults = async (user) => {
  if (!user || user.role !== 'student') {
    throw new HttpError(403, 'Only users with student role can view quiz results', 'FORBIDDEN_ROLE');
  }

  const rows = await quizModel.findResultsByStudent(user.id);

  return rows.map((row) => ({
    ...row,
    quizId: row.quiz_id,
    studentId: row.student_id,
    submittedAt: row.submitted_at,
    quizTitle: row.quiz_title,
    courseId: row.course_id,
    courseTitle: row.course_title,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
  }));
};

const createQuizResult = async (body, user) => {
  if (!user || user.role !== 'student') {
    throw new HttpError(403, 'Only students can submit quiz results', 'FORBIDDEN_ROLE');
  }

  const { quizId, courseId, score, submittedAt } = body;
  if (!quizId || !courseId) {
    throw new HttpError(400, 'quizId and courseId are required');
  }

  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');

  const quiz = await quizModel.findById(quizId);
  if (!quiz || quiz.course_id !== courseId) throw new HttpError(404, 'Quiz not found');

  const enrollment = await enrollmentModel.findByStudentAndCourse(user.id, courseId);
  if (!enrollment) {
    throw new HttpError(403, 'You are not enrolled in this course', 'RESOURCE_NOT_OWNED');
  }

  const existing = await quizModel.findResultsByStudent(user.id).then((results) =>
    results.find((r) => r.quiz_id === quizId)
  );

  if (existing) {
    throw new HttpError(409, 'You already submitted this quiz');
  }

  return quizModel.createResult({
    quizId,
    studentId: user.id,
    score: score || 0,
    submittedAt: submittedAt || new Date().toISOString(),
  });
};

module.exports = {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  submitQuiz,
  getMyResults,
  createQuizResult,
};
