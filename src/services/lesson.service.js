const lessonModel = require('../models/lesson.model');
const courseModel = require('../models/course.model');
const HttpError = require('../utils/http-error');
const { toMediaPayload } = require('../utils/media-source');

const mapLesson = (lesson) => {
  const mediaState = toMediaPayload(lesson.video_url);

  return {
    ...lesson,
    sourceType: mediaState.sourceType,
    isPlayable: mediaState.isPlayable,
    media: mediaState.media,
  };
};

const getLessons = async (courseId) => {
  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  const lessons = await lessonModel.findByCourseId(courseId);
  return lessons.map(mapLesson);
};

const getLessonById = async (courseId, lessonId) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson || lesson.course_id !== courseId) throw new HttpError(404, 'Lesson not found');
  return mapLesson(lesson);
};

const createLesson = async (courseId, body, user) => {
  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');

  // teacher can only add lessons to their own courses
  if (user.role === 'teacher' && course.teacher_id !== user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  const { title, content, videoUrl, orderIndex, duration } = body;
  return lessonModel.create({ courseId, title, content, videoUrl, orderIndex, duration });
};

const updateLesson = async (courseId, lessonId, body, user) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson || lesson.course_id !== courseId) throw new HttpError(404, 'Lesson not found');

  if (user.role === 'teacher') {
    const course = await courseModel.findById(courseId);
    if (course.teacher_id !== user.id) throw new HttpError(403, 'Forbidden');
  }

  return lessonModel.update(lessonId, body);
};

const deleteLesson = async (courseId, lessonId, user) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson || lesson.course_id !== courseId) throw new HttpError(404, 'Lesson not found');

  if (user.role === 'teacher') {
    const course = await courseModel.findById(courseId);
    if (course.teacher_id !== user.id) throw new HttpError(403, 'Forbidden');
  }

  await lessonModel.remove(lessonId);
};

module.exports = { getLessons, getLessonById, createLesson, updateLesson, deleteLesson };
