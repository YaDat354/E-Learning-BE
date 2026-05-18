const { query } = require('../config/database');

const hasTitleAndMessageColumns = async () => {
  const result = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'notifications'
       AND column_name IN ('title', 'message')`
  );

  const columns = new Set(result.rows.map((row) => row.column_name));
  return columns.has('title') && columns.has('message');
};

const findByUser = async (userId) => {
  const useNewSchema = await hasTitleAndMessageColumns();

  if (!useNewSchema) {
    const result = await query(
      `SELECT id, user_id,
              'Notification'::text AS title,
              content AS message,
              is_read,
              created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  const result = await query(
    `SELECT id, user_id, title, message, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

const markRead = async (notificationId, userId) => {
  const useNewSchema = await hasTitleAndMessageColumns();

  if (!useNewSchema) {
    const result = await query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id,
                 'Notification'::text AS title,
                 content AS message,
                 is_read,
                 created_at`,
      [notificationId, userId]
    );
    return result.rows[0] || null;
  }

  const result = await query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, title, message, is_read, created_at`,
    [notificationId, userId]
  );
  return result.rows[0] || null;
};

module.exports = {
  findByUser,
  markRead,
};