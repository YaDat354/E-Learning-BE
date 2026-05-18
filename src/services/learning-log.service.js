const learningLogModel = require('../models/learning-log.model');
const lessonModel = require('../models/lesson.model');
const enrollmentModel = require('../models/enrollment.model');
const HttpError = require('../utils/http-error');

const upsertLearningLog = async (user, { lessonId, learningTime }) => {
  if (!lessonId) {
    throw new HttpError(400, 'lessonId is required');
  }

  const lesson = await lessonModel.findById(lessonId);
  if (!lesson) throw new HttpError(404, 'Lesson not found');

  if (user.role === 'student') {
    const enrollment = await enrollmentModel.findByStudentAndCourse(user.id, lesson.course_id);
    if (!enrollment) {
      throw new HttpError(403, 'You need to enroll in the course before logging progress');
    }
  }

  return learningLogModel.upsert({
    studentId: user.id,
    lessonId,
    learningTime,
  });
};

const getMyLearningLogs = async (user) => learningLogModel.findByStudent(user.id);

module.exports = {
  upsertLearningLog,
  getMyLearningLogs,
};