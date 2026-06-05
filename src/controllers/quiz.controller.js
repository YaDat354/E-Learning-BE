const asyncHandler = require('../utils/async-handler');
const quizService = require('../services/quiz.service');

const getQuizzes = asyncHandler(async (req, res) => {
  const data = await quizService.getQuizzes(req.params.courseId, req.user || null);
  res.json({ success: true, data });
});

const getQuizById = asyncHandler(async (req, res) => {
  const data = await quizService.getQuizById(req.params.courseId, req.params.quizId, req.user || null);
  res.json({ success: true, data });
});

const createQuiz = asyncHandler(async (req, res) => {
  const data = await quizService.createQuiz(req.params.courseId, req.body, req.user);
  res.status(201).json({ success: true, data });
});

const updateQuiz = asyncHandler(async (req, res) => {
  const data = await quizService.updateQuiz(req.params.courseId, req.params.quizId, req.body, req.user);
  res.json({ success: true, data });
});

const deleteQuiz = asyncHandler(async (req, res) => {
  await quizService.deleteQuiz(req.params.courseId, req.params.quizId, req.user);
  res.json({ success: true, message: 'Quiz deleted' });
});

const addQuestion = asyncHandler(async (req, res) => {
  const data = await quizService.addQuestion(req.params.courseId, req.params.quizId, req.body, req.user);
  res.status(201).json({ success: true, data });
});

const updateQuestion = asyncHandler(async (req, res) => {
  const data = await quizService.updateQuestion(
    req.params.courseId,
    req.params.quizId,
    req.params.questionId,
    req.body,
    req.user
  );
  res.json({ success: true, data });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  await quizService.deleteQuestion(req.params.courseId, req.params.quizId, req.params.questionId, req.user);
  res.json({ success: true, message: 'Question deleted' });
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
  updateQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  submitQuiz,
  getMyResults,
};
