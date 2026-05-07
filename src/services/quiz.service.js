const quizModel = require('../models/quiz.model');
const courseModel = require('../models/course.model');
const HttpError = require('../utils/http-error');

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
  if (user.role === 'teacher' && course.teacher_id !== user.id) {
    throw new HttpError(403, 'Forbidden');
  }
};

const getQuizzes = async (courseId) => {
  await requireCourse(courseId);
  return quizModel.findByCourseId(courseId);
};

const getQuizById = async (courseId, quizId) => {
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
  addQuestion,
  submitQuiz,
  getMyResults,
};
