const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { sendError } = require('./error');
const db = require('../config/db');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'AUTH_003', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user is suspended
    const userResult = await db.query('SELECT is_suspended FROM users WHERE id = $1', [decoded.userId]);
    if (userResult.rows.length === 0) {
      return sendError(res, 'AUTH_003', 401);
    }
    
    if (userResult.rows[0].is_suspended) {
      return sendError(res, 'AUTH_006', 403);
    }

    req.user = decoded; // { userId, email, role }
    next();
  } catch (err) {
    return sendError(res, 'AUTH_003', 401);
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return sendError(res, 'AUTH_004', 403);
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
