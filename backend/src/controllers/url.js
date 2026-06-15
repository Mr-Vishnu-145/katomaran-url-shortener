const db = require('../config/db');
const { generateShortCode, isValidUrl, isValidAlias } = require('../utils/helpers');
const { sendError } = require('../middleware/error');
const NodeCache = require('node-cache');

// Standard node-cache for redirect mappings (TTL 60s)
const redirectCache = new NodeCache({ stdTTL: 60 });

exports.create = async (req, res, next) => {
  const { originalUrl, customAlias, expiresAt } = req.body;
  const userId = req.user.userId;

  if (!originalUrl || !isValidUrl(originalUrl)) {
    return sendError(res, 'URL_001', 400, 'originalUrl');
  }

  let code = '';
  if (customAlias) {
    if (!isValidAlias(customAlias)) {
      return sendError(res, 'URL_008', 400, 'customAlias');
    }
    
    // Check uniqueness of alias
    try {
      const existing = await db.query('SELECT id FROM urls WHERE short_code = $1', [customAlias]);
      if (existing.rows.length > 0) {
        return sendError(res, 'URL_002', 400, 'customAlias');
      }
      code = customAlias;
    } catch (err) {
      return next(err);
    }
  } else {
    // Generate unique random code
    let retries = 0;
    while (retries < 5) {
      const generated = generateShortCode();
      const check = await db.query('SELECT id FROM urls WHERE short_code = $1', [generated]);
      if (check.rows.length === 0) {
        code = generated;
        break;
      }
      retries++;
    }
    if (!code) {
      return sendError(res, 'SRV_001', 500);
    }
  }

  try {
    const expiryDate = expiresAt ? new Date(expiresAt) : null;
    
    const result = await db.query(
      'INSERT INTO urls (user_id, original_url, short_code, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, originalUrl, code, expiryDate]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  const userId = req.user.userId;
  const role = req.user.role;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let countQuery = 'SELECT COUNT(*) FROM urls WHERE user_id = $1';
    let listQuery = 'SELECT * FROM urls WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    let countParams = [userId];
    let listParams = [userId, limit, offset];

    if (role === 'admin') {
      countQuery = 'SELECT COUNT(*) FROM urls';
      listQuery = 'SELECT * FROM urls ORDER BY created_at DESC LIMIT $1 OFFSET $2';
      countParams = [];
      listParams = [limit, offset];
    }

    // Count total
    const countRes = await db.query(countQuery, countParams);
    const totalCount = parseInt(countRes.rows[0].count);

    // Fetch paginated URLs
    const listRes = await db.query(listQuery, listParams);

    res.json({
      success: true,
      data: listRes.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.edit = async (req, res, next) => {
  const { id } = req.params;
  const { originalUrl, expiresAt, isActive } = req.body;
  const userId = req.user.userId;
  const role = req.user.role;

  if (originalUrl && !isValidUrl(originalUrl)) {
    return sendError(res, 'URL_001', 400, 'originalUrl');
  }

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
    
    // Only owner or admin can edit
    if (url.user_id !== userId && role !== 'admin') {
      return sendError(res, 'URL_006', 403);
    }

    const updatedUrl = originalUrl || url.original_url;
    const updatedExpiry = expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : url.expires_at;
    const updatedActive = isActive !== undefined ? isActive : url.is_active;

    const result = await db.query(
      'UPDATE urls SET original_url = $1, expires_at = $2, is_active = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [updatedUrl, updatedExpiry, updatedActive, id]
    );

    // Evict cache to refresh redirect mappings
    redirectCache.del(url.short_code);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteUrl = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const role = req.user.role;

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
    
    // Only owner or admin can delete
    if (url.user_id !== userId && role !== 'admin') {
      return sendError(res, 'URL_006', 403);
    }

    await db.query('DELETE FROM urls WHERE id = $1', [id]);
    
    // Evict cache
    redirectCache.del(url.short_code);

    res.json({
      success: true,
      message: "URL deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};

exports.getQr = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const role = req.user.role;

  try {
    const result = await db.query(
      `SELECT u.*, usr.role as owner_role 
       FROM urls u 
       JOIN users usr ON u.user_id = usr.id 
       WHERE u.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'URL_003', 404);
    }
    
    const url = result.rows[0];
    
    // Check permission: only owner or admin can get QR
    if (url.user_id !== userId && role !== 'admin') {
      return sendError(res, 'URL_006', 403);
    }
    
    // Return QR code metadata
    res.json({
      success: true,
      data: {
        shortCode: url.short_code,
        qrUrl: `${req.protocol}://${req.get('host')}/${url.short_code}`
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports.redirectCache = redirectCache;
