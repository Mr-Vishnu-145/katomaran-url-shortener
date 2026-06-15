const rateLimit = require('express-rate-limit');
const { sendError } = require('./error');

// Rate limit: 5 logins/IP/15min (express-rate-limit)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'AUTH_005', 429);
  }
});

module.exports = { loginLimiter };
