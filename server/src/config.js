require('dotenv').config({ quiet: true });

const required = ['DATABASE_URL', 'JWT_SECRET', 'CODE_PEPPER'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  isProd,
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  codePepper: process.env.CODE_PEPPER,
  cookieName: 'cv_token',
  sessionDays: 7,
  code: { ttlMinutes: 10, maxAttempts: 5, resendCooldownSeconds: 60 },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Provenly <no-reply@example.com>',
  },
};