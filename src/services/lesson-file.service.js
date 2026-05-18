const lessonFileModel = require('../models/lesson-file.model');
const lessonModel = require('../models/lesson.model');
const courseModel = require('../models/course.model');
const HttpError = require('../utils/http-error');

const requireLesson = async (courseId, lessonId) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson || lesson.course_id !== courseId) {
    throw new HttpError(404, 'Lesson not found');
  }
  return lesson;
};

const assertTeacherOwnsCourse = async (courseId, user) => {
  if (user.role !== 'teacher') return;
  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  if (course.teacher_id !== user.id) throw new HttpError(403, 'Forbidden');
};

const getLessonFiles = async (courseId, lessonId) => {
  await requireLesson(courseId, lessonId);
  return lessonFileModel.findByLessonId(lessonId);
};

const createLessonFile = async (courseId, lessonId, body, user) => {
  await requireLesson(courseId, lessonId);
  await assertTeacherOwnsCourse(courseId, user);

  return lessonFileModel.create({
    lessonId,
    fileName: body.fileName,
    fileUrl: body.fileUrl,
  });
};

const deleteLessonFile = async (courseId, lessonId, fileId, user) => {
  await requireLesson(courseId, lessonId);
  await assertTeacherOwnsCourse(courseId, user);

  const removed = await lessonFileModel.remove(fileId);
  if (!removed || removed.lesson_id !== lessonId) {
    throw new HttpError(404, 'File not found');
  }
};

module.exports = {
  getLessonFiles,
  createLessonFile,
  deleteLessonFile,
};