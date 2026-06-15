const db = require('../config/db');
const { sendError } = require('../middleware/error');

exports.listUsers = async (req, res, next) => {
  try {
    const { search, role } = req.query;
    let query = 'SELECT id, email, role, full_name, is_suspended, status, created_at FROM users';
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(email ILIKE $${params.length} OR full_name ILIKE $${params.length})`);
    }

    if (role && role !== 'all') {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleSuspension = async (req, res, next) => {
  const { id } = req.params;
  const { isSuspended } = req.body;

  if (isSuspended === undefined) {
    return res.status(400).json({ success: false, error: { message: "isSuspended field is required" } });
  }

  try {
    const userCheck = await db.query('SELECT role, status FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: "User not found" } });
    }

    if (userCheck.rows[0].status === 'deleted') {
      return res.status(400).json({ success: false, error: { message: "Deleted users cannot be suspended or activated." } });
    }

    if (userCheck.rows[0].role === 'admin') {
      return res.status(403).json({ success: false, error: { message: "Admin users cannot be suspended." } });
    }

    const statusVal = isSuspended ? 'suspended' : 'active';
    await db.query('UPDATE users SET is_suspended = $1, status = $2, updated_at = NOW() WHERE id = $3', [isSuspended, statusVal, id]);
    
    // Force disconnect user by deleting refresh tokens
    if (isSuspended) {
      await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
    }

    res.json({
      success: true,
      message: `User account ${isSuspended ? 'suspended' : 'activated'} successfully.`
    });
  } catch (err) {
    next(err);
  }
};

exports.listAllUrls = async (req, res, next) => {
  const { search } = req.query;
  try {
    let query = `
      SELECT u.id, u.original_url, u.short_code, u.click_count, u.is_active, u.created_at, usr.email as user_email
      FROM urls u
      JOIN users usr ON u.user_id = usr.id
    `;
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` WHERE (u.original_url ILIKE $1 OR u.short_code ILIKE $1 OR usr.email ILIKE $1)`;
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await db.query(query, params);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

exports.getPlatformAnalytics = async (req, res, next) => {
  try {
    const [
      usersCount,
      urlsCount,
      clicksSum,
      visitorsCount,
      activeCount,
      expiredCount,
      topUrlsRes,
      trendRes
    ] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM urls'),
      db.query('SELECT COALESCE(SUM(click_count), 0) as count FROM urls'),
      db.query('SELECT COUNT(DISTINCT visitor_id) as count FROM url_visits'),
      db.query('SELECT COUNT(*) FROM urls WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())'),
      db.query('SELECT COUNT(*) FROM urls WHERE expires_at <= NOW()'),
      db.query(
        `SELECT u.id, u.short_code, u.original_url, u.click_count, usr.email as owner_email 
         FROM urls u JOIN users usr ON u.user_id = usr.id 
         ORDER BY u.click_count DESC LIMIT 5`
      ),
      db.query(
        `SELECT DATE_TRUNC('day', v.visited_at)::date as date, COUNT(*) as count 
         FROM url_visits v 
         WHERE v.visited_at > NOW() - INTERVAL '14 days'
         GROUP BY date ORDER BY date ASC`
      )
    ]);

    const totalUsers = parseInt(usersCount.rows[0].count || 0);
    const totalUrls = parseInt(urlsCount.rows[0].count || 0);
    const totalClicks = parseInt(clicksSum.rows[0].count || 0);
    const uniqueVisitors = parseInt(visitorsCount.rows[0].count || 0);
    const activeUrls = parseInt(activeCount.rows[0].count || 0);
    const expiredUrls = parseInt(expiredCount.rows[0].count || 0);
    const returningVisitors = Math.max(0, totalClicks - uniqueVisitors);

    // Fetch platform-wide AI insights
    const { generateInsights } = require('./analytics');
    const insights = await generateInsights(null, true);

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalClicks,
          uniqueVisitors,
          returningVisitors,
          totalUrls,
          activeUrls,
          expiredUrls
        },
        topUrls: topUrlsRes.rows,
        trends: trendRes.rows,
        aiInsights: insights
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteUrl = async (req, res, next) => {
  const { id } = req.params;

  try {
    const check = await db.query(
      `SELECT u.*, usr.role as owner_role 
       FROM urls u 
       JOIN users usr ON u.user_id = usr.id 
       WHERE u.id = $1`,
      [id]
    );
    if (check.rows.length === 0) {
      return sendError(res, 'URL_003', 404);
    }

    const url = check.rows[0];

    await db.query('DELETE FROM urls WHERE id = $1', [id]);
    
    // Evict cache using the exported redirectCache from url controller
    const { redirectCache } = require('./url');
    if (redirectCache) {
      redirectCache.del(url.short_code);
    }

    res.json({
      success: true,
      message: "URL deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const userCheck = await db.query('SELECT role, email, full_name, status FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: "User not found" } });
    }

    const user = userCheck.rows[0];

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, error: { message: "Admin users cannot be deleted." } });
    }

    if (user.status === 'deleted') {
      return res.status(400).json({ success: false, error: { message: "User is already deleted." } });
    }

    // Begin transaction
    await db.query('BEGIN');

    // 1. Insert into deleted_users audit log
    await db.query(
      'INSERT INTO deleted_users (user_id, email, full_name) VALUES ($1, $2, $3)',
      [id, user.email, user.full_name]
    );

    // 2. Set status to 'deleted', is_suspended to true, and scrub personal details
    await db.query(
      `UPDATE users 
       SET status = 'deleted', 
           is_suspended = true, 
           password_hash = NULL, 
           full_name = NULL, 
           profile_image = NULL, 
           google_profile_image = NULL, 
           mobile_number = NULL, 
           otp_code = NULL, 
           otp_expires_at = NULL, 
           updated_at = NOW() 
       WHERE id = $1`,
      [id]
    );

    // 3. Delete all of their refresh tokens (disconnect sessions)
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);

    // 4. Delete all password reset tokens
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [id]);

    // 5. Delete all URLs they created (which cascades to visits)
    // First, find codes to evict from cache
    const urls = await db.query('SELECT short_code FROM urls WHERE user_id = $1', [id]);
    await db.query('DELETE FROM urls WHERE user_id = $1', [id]);

    // Commit transaction
    await db.query('COMMIT');

    // Evict codes from Node Cache
    const { redirectCache } = require('./url');
    if (redirectCache && urls.rows.length > 0) {
      urls.rows.forEach(u => {
        redirectCache.del(u.short_code);
      });
    }

    res.json({
      success: true,
      message: "User account and all associated data deleted successfully."
    });
  } catch (err) {
    await db.query('ROLLBACK');
    next(err);
  }
};

exports.getUserDetail = async (req, res, next) => {
  const { id } = req.params;

  try {
    const userRes = await db.query(
      'SELECT id, email, role, is_suspended, status, created_at, updated_at, full_name, mobile_number, auth_provider FROM users WHERE id = $1',
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: "User not found" } });
    }

    const user = userRes.rows[0];

    // Fetch user URLs
    const urlsRes = await db.query(
      'SELECT id, original_url, short_code, click_count, is_active, expires_at, created_at FROM urls WHERE user_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        user,
        urls: urlsRes.rows
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.listDeletedUsers = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, user_id, email, full_name, deleted_at FROM deleted_users ORDER BY deleted_at DESC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

