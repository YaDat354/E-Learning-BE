require('dotenv').config();

const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  vnpayTmnCode: process.env.VNPAY_TMN_CODE || '',
  vnpayHashSecret: process.env.VNPAY_HASH_SECRET || '',
  vnpayUrl: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnpayVersion: process.env.VNPAY_VERSION || '2.1.0',
  vnpayCommand: process.env.VNPAY_COMMAND || 'pay',
  vnpayCurrCode: process.env.VNPAY_CURR_CODE || 'VND',
  vnpayLocale: process.env.VNPAY_LOCALE || 'vn',
};

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

if (env.jwtSecret === 'change-me' || env.jwtSecret.length < 16) {
  throw new Error('JWT_SECRET must be at least 16 characters and not use the default value');
}

module.exports = env;
