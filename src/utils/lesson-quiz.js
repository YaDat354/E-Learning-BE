const toQuizSummary = (quiz) => ({
  id: quiz.id,
  quizId: quiz.id,
  quiz_id: quiz.id,
  courseId: quiz.course_id,
  course_id: quiz.course_id,
  title: quiz.title,
  description: quiz.description,
  timeLimit: quiz.time_limit,
  time_limit: quiz.time_limit,
  createdAt: quiz.created_at,
  created_at: quiz.created_at,
  updatedAt: quiz.updated_at,
  updated_at: quiz.updated_at,
});

const getLessonQuizPrefix = (lessonTitle) => `${String(lessonTitle || '').trim()} - `;

const getRelatedQuizzesForLesson = (lessonTitle, courseQuizzes = []) => {
  const prefix = getLessonQuizPrefix(lessonTitle);
  if (!prefix.trim()) return [];

  return courseQuizzes.filter((quiz) => String(quiz.title || '').startsWith(prefix));
};

const attachLessonQuizzes = (lessonPayload, courseQuizzes = []) => {
  const relatedQuizzes = getRelatedQuizzesForLesson(lessonPayload.title, courseQuizzes).map(toQuizSummary);
  const firstQuiz = relatedQuizzes[0] || null;

  return {
    ...lessonPayload,
    quizId: firstQuiz?.id || null,
    quiz_id: firstQuiz?.id || null,
    quizIds: relatedQuizzes.map((quiz) => quiz.id),
    quiz_ids: relatedQuizzes.map((quiz) => quiz.id),
    quiz: firstQuiz,
    quizzes: relatedQuizzes,
  };
};

module.exports = {
  toQuizSummary,
  getRelatedQuizzesForLesson,
  attachLessonQuizzes,
};