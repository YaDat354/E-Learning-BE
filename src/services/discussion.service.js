const discussionModel = require('../models/discussion.model');
const courseModel = require('../models/course.model');
const lessonModel = require('../models/lesson.model');
const enrollmentModel = require('../models/enrollment.model');
const roles = require('../constants/roles');
const HttpError = require('../utils/http-error');

const requireCourse = async (courseId) => {
  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  return course;
};

const getDiscussions = async (courseId) => {
  await requireCourse(courseId);
  return discussionModel.findByCourseId(courseId);
};

const createDiscussion = async (courseId, body, user) => {
  await requireCourse(courseId);
  return discussionModel.create({
    courseId,
    userId: user.id,
    content: body.content || body.text,
    parentId: body.parentId,
  });
};

const requireLessonAndAccess = async (lessonId, user) => {
  const lesson = await lessonModel.findById(lessonId);
  if (!lesson) {
    throw new HttpError(404, 'Lesson not found');
  }

  const course = await requireCourse(lesson.course_id);

  if (user.role === roles.ADMIN) {
    return { lesson, course };
  }

  if (user.role === roles.TEACHER) {
    if (course.teacher_id !== user.id) {
      throw new HttpError(403, 'Forbidden');
    }
    return { lesson, course };
  }

  const enrollment = await enrollmentModel.findByStudentAndCourse(user.id, lesson.course_id);
  if (!enrollment) {
    throw new HttpError(403, 'You are not enrolled in this course');
  }

  return { lesson, course };
};

const getLessonComments = async (lessonId, user) => {
  await requireLessonAndAccess(lessonId, user);

  const rows = await discussionModel.findByLessonId(lessonId);
  return rows.map((row) => ({
    commentId: row.comment_id,
    lessonId: row.lesson_id,
    courseId: row.course_id,
    text: row.text,
    likes: Number(row.likes || 0),
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      name: row.author_name,
      email: row.author_email,
      avatar: row.author_avatar,
    },
  }));
};

const createLessonComment = async (lessonId, body, user) => {
  const { lesson } = await requireLessonAndAccess(lessonId, user);

  const created = await discussionModel.createLessonComment({
    courseId: lesson.course_id,
    lessonId,
    userId: user.id,
    content: body.content || body.text,
    parentId: body.parentId,
  });

  return {
    commentId: created.id,
    lessonId: created.lesson_id,
    courseId: created.course_id,
    text: created.content,
    likes: Number(created.likes_count || 0),
    createdAt: created.created_at,
    author: {
      id: user.id,
      name: user.full_name,
      email: user.email,
      avatar: user.avatar,
    },
  };
};

const markLessonCommentsRead = async (lessonId, body, user) => {
  await requireLessonAndAccess(lessonId, user);

  let effectiveSeenAt = null;
  let effectiveCommentId = null;

  if (body.lastSeenCommentId) {
    const comment = await discussionModel.findLessonCommentById(lessonId, body.lastSeenCommentId);
    if (!comment) {
      throw new HttpError(404, 'Comment not found in this lesson');
    }

    effectiveSeenAt = comment.created_at;
    effectiveCommentId = comment.id;
  } else if (body.lastSeenAt) {
    effectiveSeenAt = new Date(body.lastSeenAt).toISOString();
  } else {
    effectiveSeenAt = new Date().toISOString();
  }

  const state = await discussionModel.upsertLessonReadState({
    userId: user.id,
    lessonId,
    lastSeenAt: effectiveSeenAt,
    lastSeenCommentId: effectiveCommentId,
  });

  return {
    lessonId: state.lesson_id,
    userId: state.user_id,
    lastSeenAt: state.last_seen_at,
    lastSeenCommentId: state.last_seen_comment_id,
  };
};

const getDiscussionNotifications = async (user) => {
  const rows = await discussionModel.getUnreadLessonNotificationsByUser({
    userId: user.id,
    role: user.role,
  });

  return {
    totalUnread: rows.reduce((sum, row) => sum + Number(row.unread_count || 0), 0),
    items: rows.map((row) => ({
      courseId: row.course_id,
      lessonId: row.lesson_id,
      unreadCount: Number(row.unread_count || 0),
      latestCommentAt: row.latest_comment_at,
    })),
  };
};

module.exports = {
  getDiscussions,
  createDiscussion,
  getLessonComments,
  createLessonComment,
  markLessonCommentsRead,
  getDiscussionNotifications,
};