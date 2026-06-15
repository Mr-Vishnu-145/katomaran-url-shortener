const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { redirectCache } = require('../controllers/url');
const { errorMiddleware } = require('../middleware/error');
const { generateInsights } = require('../controllers/analytics');
const UAParser = require('ua-parser-js');

// Fast Redirect Handler: Zero Latency Gateway
// System paths to exclude from short-code lookup
const SYSTEM_PATHS = new Set(['favicon.ico', 'robots.txt', 'sitemap.xml', 'health', 'ping', 'apple-touch-icon.png']);

router.get('/:shortCode', async (req, res, next) => {
  const { shortCode } = req.params;

  // Skip system/static paths immediately — no DB lookup needed
  if (SYSTEM_PATHS.has(shortCode) || shortCode.startsWith('.')) {
    return res.status(404).send('Not found');
  }

  try {
    // 1. Look up mapping from Cache
    let urlData = redirectCache.get(shortCode);
    
    if (!urlData) {
      // 2. Fetch from database if cache miss
      const result = await db.query(
        `SELECT u.id, u.original_url, u.expires_at, u.is_active, u.user_id, usr.role as user_role 
         FROM urls u 
         JOIN users usr ON u.user_id = usr.id 
         WHERE u.short_code = $1`,
        [shortCode]
      );
      if (result.rows.length === 0) {
        return res.status(404).send(`
          <html>
            <head><title>Link Not Found - LinkSphere</title></head>
            <body style="font-family:sans-serif; text-align:center; padding:50px; background:#0b0f19; color:#f3f4f6;">
              <h1 style="color:#ef4444;">Link Not Found</h1>
              <p>The shortened link you are trying to visit does not exist or has been deleted.</p>
              <a href="/login" style="color:#6366f1; text-decoration:none;">Go to LinkSphere</a>
            </body>
          </html>
        `);
      }
      urlData = result.rows[0];
      // Store in Node Cache for 60 seconds
      redirectCache.set(shortCode, urlData);
    }

    // 3. Validation Check (Active / Expired)
    if (!urlData.is_active) {
      return res.status(410).send(`
        <html>
          <head><title>Link Inactive - LinkSphere</title></head>
          <body style="font-family:sans-serif; text-align:center; padding:50px; background:#0b0f19; color:#f3f4f6;">
            <h1 style="color:#f59e0b;">Link Inactive</h1>
            <p>This shortened link has been suspended or deactivated.</p>
          </body>
        </html>
      `);
    }

    if (urlData.expires_at && new Date(urlData.expires_at) < new Date()) {
      return res.status(410).send(`
        <html>
          <head><title>Link Expired - LinkSphere</title></head>
          <body style="font-family:sans-serif; text-align:center; padding:50px; background:#0b0f19; color:#f3f4f6;">
            <h1 style="color:#f59e0b;">Link Expired</h1>
            <p>This campaigns link has expired and is no longer accepting visits.</p>
          </body>
        </html>
      `);
    }

    // 4. Handle visitor session cookie (LinkSphere Style)
    let visitorId = req.cookies.linksphere_visitor_id;
    if (!visitorId) {
      visitorId = require('crypto').randomUUID();
      // Set HttpOnly, Lax cookie for 1 year
      res.cookie('linksphere_visitor_id', visitorId, {
        maxAge: 365 * 24 * 3600 * 1000,
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'lax'
      });
    }

    // 5. Perform 302 Redirect immediately (zero-latency redirect path)
    // 302 (Temporary) is used intentionally — 301 (Permanent) causes browsers
    // to cache the redirect client-side and bypass the server, breaking click analytics.
    res.redirect(302, urlData.original_url);

    // 6. Fire-and-Forget Asynchronous Visit Logging (NEVER await on redirect path)
    // Runs in background after client is redirected
    (async () => {
      try {
        let ipAddress = req.header('X-Forwarded-For') || req.socket.remoteAddress || '127.0.0.1';
        if (ipAddress.includes(',')) {
          ipAddress = ipAddress.split(',')[0].trim();
        }
        if (ipAddress.startsWith('::ffff:')) {
          ipAddress = ipAddress.substring(7);
        }
        if (ipAddress === '::1' || ipAddress === 'localhost') {
          ipAddress = '127.0.0.1';
        }

        const userAgent = req.headers['user-agent'] || '';
        const referer = req.headers['referer'] || 'Direct';
        
        // Parse user agent
        const parser = new UAParser(userAgent);
        const browser = parser.getBrowser().name || 'Unknown';
        const deviceType = parser.getDevice().type || 'Desktop';
        
        // Simple mock country lookup (or resolve header if available, otherwise mock country)
        const countries = ['India', 'United States', 'Singapore', 'Germany', 'United Kingdom', 'Canada', 'Australia'];
        const country = countries[Math.floor(Math.random() * countries.length)]; // Hackathon mock or GeoIP if integrated

        // Check unique visitor status for user-wide dashboard and url-specific analytics (LinkSphere Style)
        const userVisitCheck = await db.query(
          `SELECT 1 FROM url_visits v 
           JOIN urls u ON v.url_id = u.id 
           WHERE u.user_id = $1 AND v.visitor_id = $2 LIMIT 1`,
          [urlData.user_id, visitorId]
        );
        const isUniqueForUser = userVisitCheck.rows.length === 0;

        const urlVisitCheck = await db.query(
          'SELECT 1 FROM url_visits WHERE url_id = $1 AND visitor_id = $2 LIMIT 1',
          [urlData.id, visitorId]
        );
        const isUniqueForUrl = urlVisitCheck.rows.length === 0;

        // Atomic Click Increment
        await db.query('UPDATE urls SET click_count = click_count + 1 WHERE id = $1', [urlData.id]);
        
        // Record visit (including visitor_id)
        await db.query(
          'INSERT INTO url_visits (url_id, ip_address, user_agent, referer, country, device_type, browser, visitor_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [urlData.id, ipAddress, userAgent, referer, country, deviceType, browser, visitorId]
        );

        // Generate updated AI traffic insights on-the-fly
        const updatedInsights = await generateInsights(urlData.user_id);

        // Broadcast click via Socket.IO
        const io = req.app.get('io');
        if (io) {
          // Send to specific owner room to keep dashboards responsive
          io.to(`user_${urlData.user_id}`).emit('click-update', {
            urlId: urlData.id,
            shortCode: shortCode,
            clickCount: urlData.click_count + 1,
            isUniqueForUser,
            isUniqueForUrl,
            aiInsights: updatedInsights,
            newVisit: {
              visited_at: new Date(),
              ip_address: ipAddress,
              browser,
              device_type: deviceType,
              country,
              referer
            }
          });

          // Send to admin room for Live Activity Feed
          io.to('admin-room').emit('admin-click-update', {
            urlId: urlData.id,
            shortCode: shortCode,
            clickCount: urlData.click_count + 1,
            userId: urlData.user_id,
            isUniqueForUser,
            isUniqueForUrl,
            newVisit: {
              visited_at: new Date(),
              ip_address: ipAddress,
              browser,
              device_type: deviceType,
              country,
              referer
            }
          });
        }
      } catch (logErr) {
        console.error("Async Log Error:", logErr.message);
      }
    })();

  } catch (err) {
    console.error("Redirect handler failure:", err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
