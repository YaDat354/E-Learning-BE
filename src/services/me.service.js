const enrollmentModel = require('../models/enrollment.model');
const lessonProgressModel = require('../models/lesson-progress.model');
const lessonModel = require('../models/lesson.model');
const learningLogModel = require('../models/learning-log.model');
const courseModel = require('../models/course.model');
const assignmentModel = require('../models/assignment.model');
const discussionModel = require('../models/discussion.model');
const roles = require('../constants/roles');
const HttpError = require('../utils/http-error');

const DASHBOARD_MEDIA = {
  vi: {
    student: {
      heroTitle: 'Hôm nay học gì?',
      heroSubtitle: 'Tiếp tục bài học đang dở',
      heroImageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80',
      labels: {
        weeklyHours: 'Số giờ học tuần này',
        completionRate: 'Tốc độ hoàn thành',
      },
    },
    teacher: {
      heroTitle: 'Phòng điều khiển giảng dạy',
      heroSubtitle: 'Theo dõi khóa học và thảo luận mới',
      heroImageUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1400&q=80',
      labels: {
        submitRate: 'Tỷ lệ nộp bài',
        unreadDiscussion: 'Phản hồi chưa đọc',
      },
    },
  },
  en: {
    student: {
      heroTitle: 'What to learn today?',
      heroSubtitle: 'Continue your in-progress lessons',
      heroImageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80',
      labels: {
        weeklyHours: 'Study hours this week',
        completionRate: 'Completion rate',
      },
    },
    teacher: {
      heroTitle: 'Teaching dashboard',
      heroSubtitle: 'Track courses and new discussions',
      heroImageUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1400&q=80',
      labels: {
        submitRate: 'Submission rate',
        unreadDiscussion: 'Unread responses',
      },
    },
  },
};

const resolveLocale = (locale) => (String(locale || 'vi').toLowerCase().startsWith('en') ? 'en' : 'vi');

const percent = (numerator, denominator) => {
  if (!denominator || denominator <= 0) {
    return 0;
  }

  return Math.round((Number(numerator || 0) / Number(denominator || 0)) * 100);
};

/**
 * GET /me/courses
 * Returns all courses the authenticated student is enrolled in.
 */
const getMyCourses = async (userId) => {
  const enrollments = await enrollmentModel.findByStudentId(userId);

  return enrollments.map((row) => ({
    ...row,
    price: row.price !== null && row.price !== undefined ? Number(row.price) : 0,
    originalPrice: row.original_price !== null && row.original_price !== undefined
      ? Number(row.original_price)
      : null,
    lessonCount: Number(row.lesson_count ?? 0),
    lesson_count: Number(row.lesson_count ?? 0),
  }));
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

const getMyTeachingCourses = async (user) => {
  if (user.role !== roles.TEACHER) {
    throw new HttpError(403, 'Only teacher can access teaching courses', 'RESOURCE_NOT_OWNED');
  }

  const courses = await courseModel.listAll({
    teacherId: user.id,
  });

  return courses.map((course) => ({
    id: String(course.id),
    title: course.title,
    level: course.level,
    description: course.description,
    thumbnail: course.thumbnail,
    price: course.price !== null && course.price !== undefined ? Number(course.price) : 0,
    originalPrice: course.original_price !== null && course.original_price !== undefined
      ? Number(course.original_price)
      : null,
    duration: course.duration,
    category: course.category,
    tags: Array.isArray(course.tags) ? course.tags : [],
    lessonCount: Number(course.lesson_count ?? 0),
    teacherId: String(course.teacher_id),
    teacherEmail: course.teacher_email,
    teacherName: course.teacher_name,
    createdAt: course.created_at,
    updatedAt: course.updated_at,
    // Backward compatibility for older FE fields.
    teacher_id: course.teacher_id,
    teacher_email: course.teacher_email,
    teacher_name: course.teacher_name,
    lesson_count: Number(course.lesson_count ?? 0),
  }));
};

const getTeachingAssignmentsOverview = async (user) => {
  if (user.role !== roles.TEACHER) {
    throw new HttpError(403, 'Only teacher can access teaching assignments overview', 'RESOURCE_NOT_OWNED');
  }

  const rows = await assignmentModel.findTeachingOverviewByTeacher(user.id);

  return rows.map((row) => ({
    assignmentId: row.assignment_id,
    assignmentTitle: row.assignment_title,
    dueDate: row.due_date,
    maxScore: row.max_score,
    courseId: row.course_id,
    courseTitle: row.course_title,
    totalStudents: row.total_students,
    submittedCount: row.submitted_count,
    gradedCount: row.graded_count,
  }));
};

const getStudentDashboard = async (user, locale = 'vi') => {
  if (user.role !== roles.STUDENT) {
    throw new HttpError(403, 'Only student can access student dashboard', 'RESOURCE_NOT_OWNED');
  }

  const resolved = resolveLocale(locale);
  const media = DASHBOARD_MEDIA[resolved].student;

  const [enrollments, learningLogs] = await Promise.all([
    enrollmentModel.findByStudentId(user.id),
    learningLogModel.findByStudent(user.id),
  ]);

  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const totalLearningTimeThisWeek = learningLogs
    .filter((log) => new Date(log.last_access).getTime() >= weekAgo)
    .reduce((sum, log) => sum + Number(log.learning_time || 0), 0);

  const weeklyHours = Math.round((totalLearningTimeThisWeek / 60) * 10) / 10;
  const avgCompletion = enrollments.length > 0
    ? Math.round(
      enrollments.reduce((sum, enr) => sum + Number(enr.progress || 0), 0) / enrollments.length
    )
    : 0;

  return {
    heroTitle: media.heroTitle,
    heroSubtitle: media.heroSubtitle,
    heroImageUrl: media.heroImageUrl,
    highlights: [
      { label: media.labels.weeklyHours, value: weeklyHours },
      { label: media.labels.completionRate, value: avgCompletion },
    ],
    updatedAt: new Date().toISOString(),
  };
};

const getTeacherDashboard = async (user, locale = 'vi') => {
  if (user.role !== roles.TEACHER && user.role !== roles.ADMIN) {
    throw new HttpError(403, 'Only teacher can access teacher dashboard', 'RESOURCE_NOT_OWNED');
  }

  const resolved = resolveLocale(locale);
  const media = DASHBOARD_MEDIA[resolved].teacher;

  const [overviewRows, unreadRows] = await Promise.all([
    assignmentModel.findTeachingOverviewByTeacher(user.role === roles.ADMIN ? null : user.id),
    discussionModel.getUnreadLessonNotificationsByUser({ userId: user.id, role: user.role }),
  ]);

  const totalStudents = overviewRows.reduce((sum, row) => sum + Number(row.total_students || 0), 0);
  const totalSubmitted = overviewRows.reduce((sum, row) => sum + Number(row.submitted_count || 0), 0);
  const submitRate = percent(totalSubmitted, totalStudents);
  const unreadDiscussion = unreadRows.reduce((sum, row) => sum + Number(row.unread_count || 0), 0);

  return {
    heroTitle: media.heroTitle,
    heroSubtitle: media.heroSubtitle,
    heroImageUrl: media.heroImageUrl,
    highlights: [
      { label: media.labels.submitRate, value: submitRate },
      { label: media.labels.unreadDiscussion, value: unreadDiscussion },
    ],
    updatedAt: new Date().toISOString(),
  };
};

module.exports = {
  getMyCourses,
  getContinueLearning,
  updateLessonProgress,
  getMyTeachingCourses,
  getTeachingAssignmentsOverview,
  getStudentDashboard,
  getTeacherDashboard,
};
