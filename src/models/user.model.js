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

const listByRole = async (role) => {
  const result = await query(`${baseSelect} WHERE r.name = $1 ORDER BY u.created_at DESC`, [role]);
  return result.rows;
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

const updateById = async (id, { fullName, avatar }) => {
  const result = await query(
    `
      UPDATE users
      SET
        full_name = COALESCE($1, full_name),
        avatar = COALESCE($2, avatar),
        updated_at = NOW()
      WHERE id = $3
      RETURNING id
    `,
    [fullName || null, avatar || null, id]
  );

  return result.rows[0] || null;
};

const adminUpdateById = async (id, { fullName, email, password, avatar }) => {
  const result = await query(
    `
      UPDATE users
      SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        password = COALESCE($3, password),
        avatar = COALESCE($4, avatar),
        updated_at = NOW()
      WHERE id = $5
      RETURNING id
    `,
    [fullName || null, email || null, password || null, avatar || null, id]
  );

  return result.rows[0] || null;
};

const deleteById = async (id) => {
  const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

module.exports = {
  findByEmail,
  findById,
  listByRole,
  create,
  updateById,
  adminUpdateById,
  deleteById,
};
