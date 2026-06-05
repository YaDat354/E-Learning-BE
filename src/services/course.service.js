const courseModel = require('../models/course.model');
const lessonModel = require('../models/lesson.model');
const enrollmentModel = require('../models/enrollment.model');
const discussionModel = require('../models/discussion.model');
const quizModel = require('../models/quiz.model');
const HttpError = require('../utils/http-error');
const { toMediaPayload } = require('../utils/media-source');
const { sanitizeTranscript, sanitizeTasks } = require('../utils/lesson-content');
const { attachLessonQuizzes } = require('../utils/lesson-quiz');
const { assertTeacherOwnsCourse, OWNERSHIP_ERROR_CODE } = require('../utils/ownership');

const allowedLevels = ['co_ban', 'trung_cap', 'cao_cap'];

const listCourses = async ({ level, mine = false, currentUser = null } = {}) => {
  if (level && !allowedLevels.includes(level)) {
    throw new HttpError(400, 'level must be one of: co_ban, trung_cap, cao_cap');
  }

  if (mine) {
    if (!currentUser) {
      throw new HttpError(401, 'Authentication token is required');
    }

    if (currentUser.role !== 'teacher') {
      throw new HttpError(403, 'Only teacher can query mine=true', 'RESOURCE_NOT_OWNED');
    }
  }

  const isTeacherContext = currentUser && currentUser.role === 'teacher';

  return courseModel.listAll({
    level,
    // In teacher context, default to own courses to avoid leaking all courses on teacher pages.
    teacherId: (mine || isTeacherContext) ? currentUser.id : null,
  });
};

const formatDurationLabel = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) {
    return 'Dang cap nhat';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} phut`;
  }

  if (minutes === 0) {
    return `${hours} gio`;
  }

  return `${hours} gio ${minutes} phut`;
};

const mapLessonForDetail = (lesson, index, courseQuizzes = []) => {
  const mediaState = toMediaPayload(lesson.video_url);

  return attachLessonQuizzes({
    id: lesson.id,
    courseId: lesson.course_id,
    title: lesson.title,
    content: lesson.content,
    videoUrl: lesson.video_url,
    transcript: sanitizeTranscript(lesson.transcript),
    tasks: sanitizeTasks(lesson.tasks),
    orderIndex: lesson.order_index,
    duration: lesson.duration,
    durationLabel: lesson.duration ? `${lesson.duration} phut` : 'Dang cap nhat',
    isPreview: index === 0,
    sourceType: mediaState.sourceType,
    isPlayable: mediaState.isPlayable,
    media: mediaState.media,
    createdAt: lesson.created_at,
    updatedAt: lesson.updated_at,
  }, courseQuizzes);
};

const getCourseById = async (courseId, currentUser) => {
  const course = await courseModel.findById(courseId);

  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  const lessons = await lessonModel.findByCourseId(courseId);
  const courseQuizzes = await quizModel.findByCourseId(courseId);
  const mappedLessons = lessons.map((lesson, index) => mapLessonForDetail(lesson, index, courseQuizzes));

  const totalDurationMinutes = mappedLessons.reduce(
    (sum, lesson) => sum + (Number(lesson.duration) || 0),
    0
  );

  const totalStudents = await enrollmentModel.countByCourseId(courseId);
  const totalDiscussions = await discussionModel.countByCourseId(courseId);

  if (currentUser && currentUser.role === 'teacher') {
    assertTeacherOwnsCourse(course, currentUser, OWNERSHIP_ERROR_CODE);
  }

  let isEnrolled = false;
  if (currentUser && currentUser.role === 'student') {
    const enrollment = await enrollmentModel.findByStudentAndCourse(currentUser.id, courseId);
    isEnrolled = Boolean(enrollment);
  }

  return {
    ...course,
    thumbnailUrl: course.thumbnail,
    teacher: {
      id: course.teacher_id,
      fullName: course.teacher_name,
      email: course.teacher_email,
    },
    lessons: mappedLessons,
    stats: {
      totalLessons: mappedLessons.length,
      totalStudents,
      totalDurationMinutes,
      totalDurationLabel: formatDurationLabel(totalDurationMinutes),
      totalDiscussions,
    },
    isEnrolled,
  };
};

const createCourse = async ({
  title,
  level,
  description,
  thumbnail,
  teacherId,
  price,
  originalPrice,
  duration,
  category,
  tags,
}) => {
  if (!title) {
    throw new HttpError(400, 'title is required');
  }

  if (!level || !allowedLevels.includes(level)) {
    throw new HttpError(400, 'level must be one of: co_ban, trung_cap, cao_cap');
  }

  return courseModel.create({
    title,
    level,
    description,
    thumbnail,
    teacherId,
    price,
    originalPrice,
    duration,
    category,
    tags,
  });
};

const updateCourse = async (
  courseId,
  { title, level, description, thumbnail, price, originalPrice, duration, category, tags },
  user
) => {
  const course = await courseModel.findById(courseId);

  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);

  if (level && !allowedLevels.includes(level)) {
    throw new HttpError(400, 'level must be one of: co_ban, trung_cap, cao_cap');
  }

  if (
    title === undefined
    && level === undefined
    && description === undefined
    && thumbnail === undefined
    && price === undefined
    && originalPrice === undefined
    && duration === undefined
    && category === undefined
    && tags === undefined
  ) {
    throw new HttpError(
      400,
      'At least one field (title, level, description, thumbnail, price, originalPrice, duration, category, tags) is required'
    );
  }

  return courseModel.updateById(courseId, {
    title,
    level,
    description,
    thumbnail,
    price,
    originalPrice,
    duration,
    category,
    tags,
  });
};

const deleteCourse = async (courseId, user) => {
  const course = await courseModel.findById(courseId);

  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);

  await courseModel.deleteById(courseId);
};

module.exports = {
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
