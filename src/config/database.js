const { Pool } = require('pg');

const env = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl,
});

const query = (text, params) => pool.query(text, params);

const testConnection = async () => {
  await pool.query('SELECT 1');
};

module.exports = {
  pool,
  query,
  testConnection,
};
