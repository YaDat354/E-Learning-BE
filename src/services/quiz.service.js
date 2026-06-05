const quizModel = require('../models/quiz.model');
const courseModel = require('../models/course.model');
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
  return quizModel.findResultsByStudent(user.id);
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
};
