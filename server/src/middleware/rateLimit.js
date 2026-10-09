const rateLimit = require('express-rate-limit');

const make = (max, windowMinutes) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again later.' },
  });

module.exports = {
  authLimiter: make(20, 15),
  codeLimiter: make(10, 15),
};