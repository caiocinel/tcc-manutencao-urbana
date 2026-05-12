const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
});

const globalLimiter = createRateLimiter(15 * 60 * 1000, 200);
const authLimiter = createRateLimiter(15 * 60 * 1000, 20);
const apiLimiter = createRateLimiter(60 * 60 * 1000, 200);

module.exports = { globalLimiter, authLimiter, apiLimiter };
