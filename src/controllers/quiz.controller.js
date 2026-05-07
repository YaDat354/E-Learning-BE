const asyncHandler = require('../utils/async-handler');
const quizService = require('../services/quiz.service');

const getQuizzes = asyncHandler(async (req, res) => {
  const data = await quizService.getQuizzes(req.params.courseId);
  res.json({ success: true, data });
});

const getQuizById = asyncHandler(async (req, res) => {
  const data = await quizService.getQuizById(req.params.courseId, req.params.quizId);
  res.json({ success: true, data });
});

const createQuiz = asyncHandler(async (req, res) => {
  const data = await quizService.createQuiz(req.params.courseId, req.body, req.user);
  res.status(201).json({ success: true, data });
});

const addQuestion = asyncHandler(async (req, res) => {
  const data = await quizService.addQuestion(req.params.courseId, req.params.quizId, req.body, req.user);
  res.status(201).json({ success: true, data });
});

const submitQuiz = asyncHandler(async (req, res) => {
  const data = await quizService.submitQuiz(req.params.courseId, req.params.quizId, req.body, req.user);
  res.status(201).json({ success: true, data });
});

const getMyResults = asyncHandler(async (req, res) => {
  const data = await quizService.getMyResults(req.user);
  res.json({ success: true, data });
});

module.exports = {
  getQuizzes,
  getQuizById,
  createQuiz,
  addQuestion,
  submitQuiz,
  getMyResults,
};
