const courseModel = require('../models/course.model');
const lessonModel = require('../models/lesson.model');
const enrollmentModel = require('../models/enrollment.model');
const discussionModel = require('../models/discussion.model');
const quizModel = require('../models/quiz.model');
const courseReviewModel = require('../models/course-review.model');
const HttpError = require('../utils/http-error');
const { toMediaPayload } = require('../utils/media-source');
const { sanitizeTranscript, sanitizeTasks } = require('../utils/lesson-content');
const { attachLessonQuizzes } = require('../utils/lesson-quiz');
const { assertTeacherOwnsCourse, OWNERSHIP_ERROR_CODE } = require('../utils/ownership');

const allowedLevels = ['co_ban', 'trung_cap', 'cao_cap'];

const mapPricingFields = (course) => {
  const numericPrice = Number(course.price ?? 0);
  const numericOriginalPrice = course.original_price === null || course.original_price === undefined
    ? null
    : Number(course.original_price);

  return {
    ...course,
    price: Number.isNaN(numericPrice) ? 0 : numericPrice,
    original_price: Number.isNaN(numericOriginalPrice) ? null : numericOriginalPrice,
    originalPrice: Number.isNaN(numericOriginalPrice) ? null : numericOriginalPrice,
  };
};

const mapCourseSummary = (course) => {
  const mapped = mapPricingFields(course);

  return {
    ...mapped,
    id: String(mapped.id),
    lessonCount: Number(mapped.lesson_count ?? 0),
    lesson_count: Number(mapped.lesson_count ?? 0),
    studentCount: Number(mapped.student_count ?? 0),
    student_count: Number(mapped.student_count ?? 0),
  };
};

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

  const courses = await courseModel.listAll({
    level,
    // In teacher context, default to own courses to avoid leaking all courses on teacher pages.
    teacherId: (mine || isTeacherContext) ? currentUser.id : null,
  });

  return courses.map(mapCourseSummary);
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
    ...mapPricingFields(course),
    lessonCount: Number(course.lesson_count ?? mappedLessons.length),
    lesson_count: Number(course.lesson_count ?? mappedLessons.length),
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
  lessons,
}) => {
  if (!title) {
    throw new HttpError(400, 'title is required');
  }

  if (!level || !allowedLevels.includes(level)) {
    throw new HttpError(400, 'level must be one of: co_ban, trung_cap, cao_cap');
  }

  const created = await courseModel.create({
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

  const courseData = {
    ...mapPricingFields(created),
    id: String(created.id),
    lessonCount: 0,
    lesson_count: 0,
  };

  // Create lessons with quizzes if provided
  if (Array.isArray(lessons) && lessons.length > 0) {
    const createdLessons = [];
    for (let i = 0; i < lessons.length; i++) {
      const lessonData = lessons[i];
      const lesson = await lessonModel.create({
        courseId: created.id,
        title: lessonData.title || `Lesson ${i + 1}`,
        content: lessonData.content,
        videoUrl: lessonData.audioUrl || lessonData.videoUrl,
        transcript: lessonData.transcript,
        orderIndex: i,
        duration: lessonData.duration,
      });

      // Create quiz for this lesson if provided
      if (lessonData.quiz) {
        const quiz = await quizModel.createQuiz({
          courseId: created.id,
          title: lessonData.quiz.title || `Quiz for ${lesson.title}`,
          description: lessonData.quiz.description,
          timeLimit: lessonData.quiz.timeLimit,
        });

        // Create questions for this quiz if provided
        if (Array.isArray(lessonData.quiz.questions)) {
          for (const question of lessonData.quiz.questions) {
            const createdQuestion = await quizModel.createQuestion({
              quizId: quiz.id,
              content: question.text || question.content,
              type: question.type || 'single_choice',
              orderIndex: question.orderIndex || 0,
            });

            // Create answers for this question if provided
            if (Array.isArray(question.options)) {
              const answers = question.options.map((option, optionIndex) => ({
                content: option.text || option.content || option,
                isCorrect:
                  optionIndex === question.correctIndex ||
                  (Array.isArray(question.correctIndex) && question.correctIndex.includes(optionIndex)),
              }));
              await quizModel.createAnswers(createdQuestion.id, answers);
            }
          }
        }

        createdLessons.push({
          ...lesson,
          quiz,
        });
      } else {
        createdLessons.push(lesson);
      }
    }

    courseData.lessonCount = createdLessons.length;
    courseData.lesson_count = createdLessons.length;
    courseData.lessons = createdLessons;
  }

  return courseData;
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

  const updated = await courseModel.updateById(courseId, {
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

  return {
    ...mapPricingFields(updated),
    id: String(updated.id),
    lessonCount: Number(course.lesson_count ?? 0),
    lesson_count: Number(course.lesson_count ?? 0),
  };
};

const deleteCourse = async (courseId, user) => {
  const course = await courseModel.findById(courseId);

  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);

  await courseModel.deleteById(courseId);
};

const toPagination = (page, limit, totalItems) => ({
  page,
  limit,
  totalItems,
  totalPages: Math.max(1, Math.ceil(totalItems / limit)),
});

const parsePaging = (query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));

  return { page, limit };
};

const listCourseReviews = async (courseId, query = {}) => {
  const course = await courseModel.findById(courseId);
  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  const { page, limit } = parsePaging(query);
  const offset = (page - 1) * limit;

  const [items, totalItems, summary] = await Promise.all([
    courseReviewModel.listByCourseId(courseId, { limit, offset }),
    courseReviewModel.countByCourseId(courseId),
    courseReviewModel.getSummaryByCourseId(courseId),
  ]);

  return {
    summary: {
      totalReviews: summary.total_reviews,
      averageRating: Number(summary.average_rating || 0),
      stars: {
        1: summary.star_1,
        2: summary.star_2,
        3: summary.star_3,
        4: summary.star_4,
        5: summary.star_5,
      },
    },
    items: items.map((review) => ({
      id: String(review.id),
      courseId: String(review.course_id),
      studentId: String(review.student_id),
      studentName: review.student_name,
      studentEmail: review.student_email,
      studentAvatar: review.student_avatar,
      rating: Number(review.rating),
      comment: review.comment,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    })),
    pagination: toPagination(page, limit, totalItems),
  };
};

const createCourseReview = async (courseId, { rating, comment, currentUser }) => {
  if (!currentUser) {
    throw new HttpError(401, 'Authentication token is required');
  }

  const course = await courseModel.findById(courseId);
  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  const enrollment = await enrollmentModel.findByStudentAndCourse(currentUser.id, courseId);
  if (!enrollment) {
    throw new HttpError(403, 'Only enrolled students can review this course', 'RESOURCE_NOT_OWNED');
  }

  const saved = await courseReviewModel.upsert({
    courseId,
    studentId: currentUser.id,
    rating: Number.parseInt(rating, 10),
    comment: comment.trim(),
  });

  return {
    id: String(saved.id),
    courseId: String(saved.course_id),
    studentId: String(saved.student_id),
    rating: Number(saved.rating),
    comment: saved.comment,
    createdAt: saved.created_at,
    updatedAt: saved.updated_at,
  };
};

const getCourseReviewSummary = async (courseId) => {
  const course = await courseModel.findById(courseId);
  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  const summary = await courseReviewModel.getSummaryByCourseId(courseId);

  return {
    courseId: String(courseId),
    totalReviews: summary.total_reviews,
    averageRating: Number(summary.average_rating || 0),
    stars: {
      1: summary.star_1,
      2: summary.star_2,
      3: summary.star_3,
      4: summary.star_4,
      5: summary.star_5,
    },
  };
};

module.exports = {
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  listCourseReviews,
  createCourseReview,
  getCourseReviewSummary,
};
