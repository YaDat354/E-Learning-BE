const { query } = require('../config/database');

const findNotificationsByStudent = async (studentId) => {
  const result = await query(
    `SELECT
        mn.id,
        mn.course_id,
        mn.teacher_id,
        mn.title,
        mn.description,
        mn.scheduled_at,
        mn.meeting_url,
        mn.status,
        mn.created_at,
        mn.updated_at,
        c.title AS course_title,
        u.full_name AS teacher_name,
        COALESCE(mnr.is_acknowledged, FALSE) AS is_acknowledged,
        mnr.acknowledged_at
     FROM meeting_notifications mn
     JOIN courses c ON c.id = mn.course_id
     JOIN users u ON u.id = mn.teacher_id
     LEFT JOIN meeting_notification_recipients mnr ON mnr.meeting_notification_id = mn.id AND mnr.student_id = $1
     WHERE EXISTS (
       SELECT 1 FROM enrollments e
       WHERE e.course_id = mn.course_id AND e.student_id = $1
     )
     ORDER BY mn.scheduled_at DESC NULLS LAST, mn.created_at DESC`,
    [studentId]
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `SELECT id, course_id, teacher_id, title, description, scheduled_at, meeting_url, status, created_at, updated_at
     FROM meeting_notifications
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async ({ courseId, teacherId, title, description, scheduledAt, meetingUrl }) => {
  const result = await query(
    `INSERT INTO meeting_notifications (course_id, teacher_id, title, description, scheduled_at, meeting_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, course_id, teacher_id, title, description, scheduled_at, meeting_url, status, created_at, updated_at`,
    [courseId, teacherId, title, description || null, scheduledAt || null, meetingUrl || null]
  );
  return result.rows[0] || null;
};

const createRecipients = async (notificationId, studentIds) => {
  if (!Array.isArray(studentIds) || studentIds.length === 0) return [];

  const values = [];
  const params = [];
  studentIds.forEach((studentId, index) => {
    const offset = index * 2;
    values.push(`($${offset + 1}, $${offset + 2})`);
    params.push(notificationId, studentId);
  });

  const result = await query(
    `INSERT INTO meeting_notification_recipients (meeting_notification_id, student_id)
     VALUES ${values.join(', ')}
     ON CONFLICT (meeting_notification_id, student_id) DO NOTHING
     RETURNING id, meeting_notification_id, student_id, is_acknowledged`,
    params
  );

  return result.rows;
};

const acknowledgeNotification = async (notificationId, studentId) => {
  const result = await query(
    `UPDATE meeting_notification_recipients
     SET is_acknowledged = TRUE, acknowledged_at = NOW()
     WHERE meeting_notification_id = $1 AND student_id = $2
     RETURNING id, is_acknowledged, acknowledged_at`,
    [notificationId, studentId]
  );
  return result.rows[0] || null;
};

const findCourseStudentIds = async (courseId) => {
  const result = await query(
    `SELECT DISTINCT student_id FROM enrollments WHERE course_id = $1`,
    [courseId]
  );
  return result.rows.map((r) => r.student_id);
};

module.exports = {
  findNotificationsByStudent,
  findById,
  create,
  createRecipients,
  acknowledgeNotification,
  findCourseStudentIds,
};
