const lessonModel = require('../models/lesson.model');
const courseModel = require('../models/course.model');
const quizModel = require('../models/quiz.model');
const enrollmentModel = require('../models/enrollment.model');
const HttpError = require('../utils/http-error');
const { toMediaPayload } = require('../utils/media-source');
const { sanitizeTranscript, sanitizeTasks } = require('../utils/lesson-content');
const { attachLessonQuizzes } = require('../utils/lesson-quiz');
const { assertTeacherOwnsCourse, OWNERSHIP_ERROR_CODE } = require('../utils/ownership');

const mapLesson = (lesson, courseQuizzes = []) => {
  const mediaState = toMediaPayload(lesson.video_url);
  const normalizedTasks = sanitizeTasks(lesson.tasks);

  return attachLessonQuizzes({
    id: lesson.id,
    courseId: lesson.course_id,
    course_id: lesson.course_id,
    title: lesson.title,
    content: lesson.content,
    videoUrl: lesson.video_url,
    video_url: lesson.video_url,
    transcript: sanitizeTranscript(lesson.transcript),
    tasks: normalizedTasks,
    orderIndex: lesson.order_index,
    order_index: lesson.order_index,
    duration: lesson.duration,
    createdAt: lesson.created_at,
    created_at: lesson.created_at,
    updatedAt: lesson.updated_at,
    updated_at: lesson.updated_at,
    sourceType: mediaState.sourceType,
    isPlayable: mediaState.isPlayable,
    media: mediaState.media,
  }, courseQuizzes);
};

const getLessons = async (courseId) => {
  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  const lessons = await lessonModel.findByCourseId(courseId);
  const courseQuizzes = await quizModel.findByCourseId(courseId);
  return lessons.map((lesson) => mapLesson(lesson, courseQuizzes));
};

const getLessonById = async (courseId, lessonId) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson || lesson.course_id !== courseId) throw new HttpError(404, 'Lesson not found');
  const courseQuizzes = await quizModel.findByCourseId(courseId);
  return mapLesson(lesson, courseQuizzes);
};

const getLessonByIdStandalone = async (lessonId, user) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson) throw new HttpError(404, 'Lesson not found');

  if (!user) {
    throw new HttpError(401, 'Authentication token is required');
  }

  if (user.role === 'student') {
    const enrollment = await enrollmentModel.findByStudentAndCourse(user.id, lesson.course_id);
    if (!enrollment) throw new HttpError(403, 'You are not enrolled in this course', 'RESOURCE_NOT_OWNED');
  }

  if (user.role === 'teacher') {
    const course = await courseModel.findById(lesson.course_id);
    if (!course) throw new HttpError(404, 'Course not found');
    assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);
  }

  const courseQuizzes = await quizModel.findByCourseId(lesson.course_id);
  return mapLesson(lesson, courseQuizzes);
};

const createLesson = async (courseId, body, user) => {
  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');

  assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);

  const { title, content, videoUrl, transcript, tasks, orderIndex, duration } = body;
  const createdLesson = await lessonModel.create({ courseId, title, content, videoUrl, transcript, tasks, orderIndex, duration });
  return mapLesson(createdLesson);
};

const updateLesson = async (courseId, lessonId, body, user) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson || lesson.course_id !== courseId) throw new HttpError(404, 'Lesson not found');

  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);

  const updatedLesson = await lessonModel.update(lessonId, body);
  return mapLesson(updatedLesson);
};

const updateLessonByIdStandalone = async (lessonId, body, user) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson) throw new HttpError(404, 'Lesson not found');

  const course = await courseModel.findById(lesson.course_id);
  if (!course) throw new HttpError(404, 'Course not found');
  assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);

  const updatedLesson = await lessonModel.update(lessonId, body);
  return mapLesson(updatedLesson);
};

const deleteLesson = async (courseId, lessonId, user) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson || lesson.course_id !== courseId) throw new HttpError(404, 'Lesson not found');

  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);

  await lessonModel.remove(lessonId);
};

const deleteLessonByIdStandalone = async (lessonId, user) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson) throw new HttpError(404, 'Lesson not found');

  const course = await courseModel.findById(lesson.course_id);
  if (!course) throw new HttpError(404, 'Course not found');
  assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);

  await lessonModel.remove(lessonId);
};

module.exports = {
  getLessons,
  getLessonById,
  getLessonByIdStandalone,
  createLesson,
  updateLesson,
  updateLessonByIdStandalone,
  deleteLesson,
  deleteLessonByIdStandalone,
};
