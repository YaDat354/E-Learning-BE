require('dotenv').config();

const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
};

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

module.exports = env;
