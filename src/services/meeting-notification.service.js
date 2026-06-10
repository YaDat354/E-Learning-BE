const meetingNotificationModel = require('../models/meeting-notification.model');
const courseModel = require('../models/course.model');
const HttpError = require('../utils/http-error');
const { assertTeacherOwnsCourse, OWNERSHIP_ERROR_CODE } = require('../utils/ownership');

const getMeetingNotifications = async (user) => {
  if (!user || user.role !== 'student') {
    throw new HttpError(403, 'Only students can view meeting notifications', 'FORBIDDEN_ROLE');
  }

  const rows = await meetingNotificationModel.findNotificationsByStudent(user.id);

  return rows.map((row) => ({
    ...row,
    courseId: row.course_id,
    teacherId: row.teacher_id,
    courseName: row.course_title,
    teacherName: row.teacher_name,
    scheduledAt: row.scheduled_at,
    meetingUrl: row.meeting_url,
    isAcknowledged: row.is_acknowledged,
    acknowledgedAt: row.acknowledged_at,
  }));
};

const createMeetingNotification = async (courseId, body, user) => {
  if (!user || user.role !== 'teacher') {
    throw new HttpError(403, 'Only teachers can create meeting notifications', 'FORBIDDEN_ROLE');
  }

  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');

  assertTeacherOwnsCourse(course, user, OWNERSHIP_ERROR_CODE);

  const { title, description, scheduledAt, meetingUrl } = body;
  if (!title) throw new HttpError(400, 'title is required');

  const notification = await meetingNotificationModel.create({
    courseId,
    teacherId: user.id,
    title,
    description,
    scheduledAt,
    meetingUrl,
  });

  // Get all enrolled students and create recipients
  const studentIds = await meetingNotificationModel.findCourseStudentIds(courseId);
  if (studentIds.length > 0) {
    await meetingNotificationModel.createRecipients(notification.id, studentIds);
  }

  return {
    ...notification,
    courseId: notification.course_id,
    teacherId: notification.teacher_id,
    scheduledAt: notification.scheduled_at,
    meetingUrl: notification.meeting_url,
  };
};

const acknowledgeMeetingNotification = async (notificationId, user) => {
  if (!user || user.role !== 'student') {
    throw new HttpError(403, 'Only students can acknowledge meeting notifications', 'FORBIDDEN_ROLE');
  }

  const notification = await meetingNotificationModel.findById(notificationId);
  if (!notification) throw new HttpError(404, 'Meeting notification not found');

  const result = await meetingNotificationModel.acknowledgeNotification(notificationId, user.id);
  if (!result) throw new HttpError(404, 'Meeting notification recipient not found');

  return result;
};

module.exports = {
  getMeetingNotifications,
  createMeetingNotification,
  acknowledgeMeetingNotification,
};
