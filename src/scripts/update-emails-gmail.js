require('dotenv').config();

const { query } = require('../config/database');

const run = async () => {
  const usersResult = await query(
    `SELECT id, email
     FROM users
     WHERE email !~* '@gmail\\.com$'`
  );

  let updated = 0;

  for (const user of usersResult.rows) {
    const local = String(user.email).split('@')[0];
    let nextEmail = `${local}@gmail.com`;

    const conflict = await query(
      `SELECT id
       FROM users
       WHERE LOWER(email) = LOWER($1)
         AND id <> $2
       LIMIT 1`,
      [nextEmail, user.id]
    );

    if (conflict.rows[0]) {
      nextEmail = `${local}.${String(user.id).slice(0, 8)}@gmail.com`;
    }

    await query('UPDATE users SET email = $1 WHERE id = $2', [nextEmail, user.id]);
    updated += 1;
  }

  console.log('UPDATED_EMAIL_ROWS', updated);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
