const enrollmentModel = require('../models/enrollment.model');
const lessonProgressModel = require('../models/lesson-progress.model');
const lessonModel = require('../models/lesson.model');
const HttpError = require('../utils/http-error');

/**
 * GET /me/courses
 * Returns all courses the authenticated student is enrolled in.
 */
const getMyCourses = async (userId) => {
  return enrollmentModel.findByStudentId(userId);
};

/**
 * GET /me/continue-learning?limit=3
 * Returns the most recently active lessons (one per course) for the user.
 * Falls back to enrolled courses with no progress if lesson_progress is empty.
 */
const getContinueLearning = async (userId, limit = 3) => {
  const recent = await lessonProgressModel.findRecentlyActive(userId, limit);

  if (recent.length > 0) {
    return recent.map((row) => ({
      courseId: row.course_id,
      courseTitle: row.course_title,
      courseThumbnail: row.course_thumbnail,
      courseLevel: row.course_level,
      courseProgress: Number(row.course_progress ?? 0),
      lessonId: row.lesson_id,
      lessonTitle: row.lesson_title,
      lessonOrderIndex: row.order_index,
      lastPositionSec: row.last_position_sec,
      isCompleted: row.is_completed,
      lastActiveAt: row.updated_at,
    }));
  }

  // No progress yet — return first lessons of most recently enrolled courses
  const enrollments = await enrollmentModel.findByStudentId(userId);
  const top = enrollments.slice(0, limit);

  const results = await Promise.all(
    top.map(async (enr) => {
      const lessons = await lessonModel.findByCourseId(enr.course_id);
      const firstLesson = lessons[0] || null;
      return {
        courseId: enr.course_id,
        courseTitle: enr.title,
        courseThumbnail: enr.thumbnail,
        courseLevel: enr.level || null,
        courseProgress: Number(enr.progress ?? 0),
        lessonId: firstLesson?.id ?? null,
        lessonTitle: firstLesson?.title ?? null,
        lessonOrderIndex: firstLesson?.order_index ?? 0,
        lastPositionSec: 0,
        isCompleted: false,
        lastActiveAt: enr.enrolled_at,
      };
    })
  );

  return results;
};

/**
 * PATCH /me/lessons/:lessonId/progress
 * Upsert lesson progress (video position, completion flag).
 * Requires lessonId param and body { lastPositionSec, isCompleted }.
 */
const updateLessonProgress = async (userId, lessonId, { lastPositionSec, isCompleted }) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson) throw new HttpError(404, 'Lesson not found');

  // Ensure the student is enrolled in the course this lesson belongs to
  const enrollment = await enrollmentModel.findByStudentAndCourse(userId, lesson.course_id);
  if (!enrollment) throw new HttpError(403, 'You are not enrolled in this course');

  return lessonProgressModel.upsert(userId, lessonId, lesson.course_id, {
    lastPositionSec: lastPositionSec ?? 0,
    isCompleted: isCompleted ?? false,
  });
};

module.exports = {
  getMyCourses,
  getContinueLearning,
  updateLessonProgress,
};
