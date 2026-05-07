const { query } = require('../config/database');

const hasLegacyRoleColumn = async () => {
  const result = await query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'role'
      LIMIT 1
    `
  );

  return result.rowCount > 0;
};

const baseSelect = `
  SELECT
    u.id,
    u.full_name,
    u.email,
    u.password,
    u.avatar,
    u.created_at,
    u.updated_at,
    r.name AS role
  FROM users u
  JOIN roles r ON r.id = u.role_id
`;

const findByEmail = async (email) => {
  const result = await query(`${baseSelect} WHERE u.email = $1`, [email]);
  return result.rows[0] || null;
};

const findById = async (id) => {
  const result = await query(`${baseSelect} WHERE u.id = $1`, [id]);
  return result.rows[0] || null;
};

const create = async ({ fullName, email, password, role }) => {
  const useLegacyRoleColumn = await hasLegacyRoleColumn();

  const result = useLegacyRoleColumn
    ? await query(
        `
          INSERT INTO users (full_name, email, password, role_id, role)
          SELECT $1, $2, $3, r.id, $5
          FROM roles r
          WHERE r.name = $4
          RETURNING id, full_name, email, avatar, created_at, updated_at
        `,
        [fullName, email, password, role, role]
      )
    : await query(
        `
          INSERT INTO users (full_name, email, password, role_id)
          SELECT $1, $2, $3, r.id
          FROM roles r
          WHERE r.name = $4
          RETURNING id, full_name, email, avatar, created_at, updated_at
        `,
        [fullName, email, password, role]
      );

  return result.rows[0] || null;
};

module.exports = {
  findByEmail,
  findById,
  create,
};
