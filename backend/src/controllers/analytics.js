const db = require('../config/db');
const { sendError } = require('../middleware/error');

exports.getUrlAnalytics = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const role = req.user.role;

  try {
    // Check ownership and owner role
    const urlCheck = await db.query(
      `SELECT u.*, usr.role as owner_role 
       FROM urls u 
       JOIN users usr ON u.user_id = usr.id 
       WHERE u.id = $1`,
      [id]
    );
    if (urlCheck.rows.length === 0) {
      return sendError(res, 'URL_003', 404);
    }

    const url = urlCheck.rows[0];
    
    // Only owner or admin can view analytics
    if (url.user_id !== userId && role !== 'admin') {
      return sendError(res, 'URL_006', 403);
    }

    // Fetch aggregated click analytics (No N+1 queries - JOINs only)
    // 1. Device breakdown
    const devicesRes = await db.query(
      "SELECT COALESCE(device_type, 'Unknown') as name, COUNT(*) as value FROM url_visits WHERE url_id = $1 GROUP BY device_type",
      [id]
    );

    // 2. Browser breakdown
    const browsersRes = await db.query(
      "SELECT COALESCE(browser, 'Unknown') as name, COUNT(*) as value FROM url_visits WHERE url_id = $1 GROUP BY browser ORDER BY value DESC LIMIT 5",
      [id]
    );

    // 3. Country breakdown
    const countriesRes = await db.query(
      "SELECT COALESCE(country, 'Unknown') as name, COUNT(*) as value FROM url_visits WHERE url_id = $1 GROUP BY country ORDER BY value DESC LIMIT 5",
      [id]
    );
    
    // 3b. Referrer (Traffic Source) breakdown
    const referersRes = await db.query(
      "SELECT COALESCE(referer, 'Direct') as name, COUNT(*) as value FROM url_visits WHERE url_id = $1 GROUP BY referer ORDER BY value DESC LIMIT 5",
      [id]
    );

    // 4. Daily Click Trend (Last 14 days)
    const trendsRes = await db.query(
      `SELECT DATE_TRUNC('day', visited_at)::date as date, COUNT(*) as count 
       FROM url_visits 
       WHERE url_id = $1 AND visited_at > NOW() - INTERVAL '14 days'
       GROUP BY date ORDER BY date ASC`,
      [id]
    );

    // 5. Recent Visits list
    const visitsRes = await db.query(
      "SELECT visited_at, ip_address, browser, device_type, country, referer FROM url_visits WHERE url_id = $1 ORDER BY visited_at DESC LIMIT 10",
      [id]
    );

    // Fetch unique visitors & returning clicks metrics (LinkSphere Style)
    const visitorStatsRes = await db.query(
      `SELECT 
         COUNT(*) as total_clicks,
         COUNT(DISTINCT visitor_id) as unique_visitors
       FROM url_visits 
       WHERE url_id = $1`,
      [id]
    );
    const totalClicks = Math.max(parseInt(url.click_count || 0), parseInt(visitorStatsRes.rows[0]?.total_clicks || 0));
    const uniqueVisitors = parseInt(visitorStatsRes.rows[0]?.unique_visitors || 0);
    const returningVisitors = Math.max(0, totalClicks - uniqueVisitors);

    res.json({
      success: true,
      data: {
        url,
        summary: {
          totalClicks,
          uniqueVisitors,
          returningVisitors
        },
        devices: devicesRes.rows,
        browsers: browsersRes.rows,
        countries: countriesRes.rows,
        referers: referersRes.rows,
        trends: trendsRes.rows,
        recentVisits: visitsRes.rows
      }
    });
  } catch (err) {
    next(err);
  }
};

const generateInsights = async (userId, isAdmin = false) => {
  const insights = [];

  // Single DB round trip query to load aggregates (total clicks, active links, total URLs)
  let statsQuery;
  if (isAdmin) {
    statsQuery = await db.query(
      `SELECT 
         COUNT(*) as total_urls,
         COALESCE(SUM(click_count), 0) as total_clicks,
         COUNT(*) FILTER (WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())) as active_urls
       FROM urls`
    );
  } else {
    statsQuery = await db.query(
      `SELECT 
         COUNT(*) as total_urls,
         COALESCE(SUM(click_count), 0) as total_clicks,
         COUNT(*) FILTER (WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())) as active_urls
       FROM urls 
       WHERE user_id = $1`,
      [userId]
    );
  }
  
  if (statsQuery.rows.length === 0) {
    return ["No click data recorded yet. Share your short links on LinkedIn, WhatsApp, or Twitter to collect analytics."];
  }

  const stats = statsQuery.rows[0];
  const totalClicks = parseInt(stats.total_clicks);
  const activeUrls = parseInt(stats.active_urls);

  if (activeUrls > 0 && totalClicks > 0) {
    // Find unique clickers to calculate return rate
    let uniqueQuery;
    if (isAdmin) {
      uniqueQuery = await db.query(
        `SELECT COUNT(DISTINCT visitor_id) as unique_count FROM url_visits`
      );
    } else {
      uniqueQuery = await db.query(
        `SELECT COUNT(DISTINCT v.visitor_id) as unique_count 
         FROM url_visits v JOIN urls u ON v.url_id = u.id 
         WHERE u.user_id = $1`,
        [userId]
      );
    }
    const uniqueCount = parseInt(uniqueQuery.rows[0]?.unique_count || 0);
    if (uniqueCount > 0) {
      const returnRate = ((totalClicks - uniqueCount) / totalClicks) * 100;
      if (returnRate > 35) {
        insights.push(`Strong audience retention: ${returnRate.toFixed(0)}% of your traffic are repeat visitors. Keep up the engaging content!`);
      } else {
        const uniqueRate = (uniqueCount / totalClicks) * 100;
        insights.push(`Broad audience reach: ${uniqueRate.toFixed(0)}% of your clicks are unique visitors. Great job driving brand new traffic!`);
      }
    }

    // Find top country across all links
    let topCountryQuery;
    if (isAdmin) {
      topCountryQuery = await db.query(
        `SELECT country, COUNT(*) as count FROM url_visits GROUP BY country ORDER BY count DESC LIMIT 1`
      );
    } else {
      topCountryQuery = await db.query(
        `SELECT country, COUNT(*) as count 
         FROM url_visits v JOIN urls u ON v.url_id = u.id 
         WHERE u.user_id = $1 GROUP BY country ORDER BY count DESC LIMIT 1`,
        [userId]
      );
    }
    if (topCountryQuery.rows.length > 0 && topCountryQuery.rows[0].country) {
      insights.push(`Most of your traffic originates from ${topCountryQuery.rows[0].country}. Focus your marketing efforts in this region!`);
    }

    // Find top device type
    let topDeviceQuery;
    if (isAdmin) {
      topDeviceQuery = await db.query(
        `SELECT device_type, COUNT(*) as count FROM url_visits GROUP BY device_type ORDER BY count DESC LIMIT 1`
      );
    } else {
      topDeviceQuery = await db.query(
        `SELECT device_type, COUNT(*) as count 
         FROM url_visits v JOIN urls u ON v.url_id = u.id 
         WHERE u.user_id = $1 GROUP BY device_type ORDER BY count DESC LIMIT 1`,
        [userId]
      );
    }
    if (topDeviceQuery.rows.length > 0 && topDeviceQuery.rows[0].device_type) {
      const devType = topDeviceQuery.rows[0].device_type.toLowerCase();
      insights.push(`Your audience is predominantly using ${devType} devices. Ensure your landing pages are mobile-responsive.`);
    }

    // Time breakdown - identify peak click hours
    let peakHourQuery;
    if (isAdmin) {
      peakHourQuery = await db.query(
        `SELECT EXTRACT(HOUR FROM visited_at) as hour, COUNT(*) as count FROM url_visits GROUP BY hour ORDER BY count DESC LIMIT 1`
      );
    } else {
      peakHourQuery = await db.query(
        `SELECT EXTRACT(HOUR FROM v.visited_at) as hour, COUNT(*) as count 
         FROM url_visits v JOIN urls u ON v.url_id = u.id 
         WHERE u.user_id = $1 GROUP BY hour ORDER BY count DESC LIMIT 1`,
        [userId]
      );
    }
    if (peakHourQuery.rows.length > 0) {
      const peakHour = parseInt(peakHourQuery.rows[0].hour);
      const ampm = peakHour >= 12 ? 'PM' : 'AM';
      const formattedHour = peakHour % 12 || 12;
      insights.push(`Engagement peaks around ${formattedHour} ${ampm}. Schedule your campaigns at this time to maximize visibility.`);
    }
  } else {
    insights.push("No click data recorded yet. Share your short links on LinkedIn, WhatsApp, or Twitter to collect analytics.");
  }

  return insights;
};

exports.generateInsights = generateInsights;


exports.getDashboardStats = async (req, res, next) => {
  const userId = req.user.userId;
  const role = req.user.role;

  try {
    let statsQuery, userVisitorsQuery, topLinksQuery, overallTrendsQuery;

    if (role === 'admin') {
      statsQuery = db.query(
        `SELECT 
           COUNT(*) as total_urls,
           COALESCE(SUM(click_count), 0) as total_clicks,
           COUNT(*) FILTER (WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())) as active_urls,
           COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_urls
         FROM urls`
      );
      userVisitorsQuery = db.query(
        `SELECT COUNT(DISTINCT visitor_id) as unique_visitors FROM url_visits`
      );
      topLinksQuery = db.query(
        `SELECT id, short_code, original_url, click_count FROM urls ORDER BY click_count DESC LIMIT 5`
      );
      overallTrendsQuery = db.query(
        `SELECT DATE_TRUNC('day', visited_at)::date as date, COUNT(*) as count 
         FROM url_visits 
         WHERE visited_at > NOW() - INTERVAL '7 days'
         GROUP BY date ORDER BY date ASC`
      );
    } else {
      statsQuery = db.query(
        `SELECT 
           COUNT(*) as total_urls,
           COALESCE(SUM(click_count), 0) as total_clicks,
           COUNT(*) FILTER (WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())) as active_urls,
           COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_urls
         FROM urls 
         WHERE user_id = $1`,
        [userId]
      );
      userVisitorsQuery = db.query(
        `SELECT COUNT(DISTINCT v.visitor_id) as unique_visitors
         FROM url_visits v
         JOIN urls u ON v.url_id = u.id
         WHERE u.user_id = $1`,
        [userId]
      );
      topLinksQuery = db.query(
        `SELECT id, short_code, original_url, click_count FROM urls WHERE user_id = $1 ORDER BY click_count DESC LIMIT 5`,
        [userId]
      );
      overallTrendsQuery = db.query(
        `SELECT DATE_TRUNC('day', v.visited_at)::date as date, COUNT(*) as count 
         FROM url_visits v 
         JOIN urls u ON v.url_id = u.id
         WHERE u.user_id = $1 AND v.visited_at > NOW() - INTERVAL '7 days'
         GROUP BY date ORDER BY date ASC`,
        [userId]
      );
    }

    const [statsRes, visitorsRes, topLinksRes, trendsRes] = await Promise.all([
      statsQuery,
      userVisitorsQuery,
      topLinksQuery,
      overallTrendsQuery
    ]);

    const stats = statsRes.rows[0];
    const totalClicks = parseInt(stats.total_clicks);
    const activeUrls = parseInt(stats.active_urls);
    const uniqueVisitors = parseInt(visitorsRes.rows[0]?.unique_visitors || 0);
    const returningVisitors = Math.max(0, totalClicks - uniqueVisitors);

    // Rule-Based AI Insights
    const insights = await generateInsights(userId, role === 'admin');

    res.json({
      success: true,
      data: {
        summary: {
          totalUrls: parseInt(stats.total_urls),
          totalClicks,
          activeUrls,
          expiredUrls: parseInt(stats.expired_urls),
          uniqueVisitors,
          returningVisitors
        },
        topLinks: topLinksRes.rows,
        trends: trendsRes.rows,
        aiInsights: insights
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getOverallAnalytics = async (req, res, next) => {
  const userId = req.user.userId;
  const role = req.user.role;
  const { scope } = req.query; // 'platform' (admin only) or 'user'
  
  const isPlatformScope = role === 'admin' && scope === 'platform';

  try {
    // 1. Device breakdown
    let devicesQuery = isPlatformScope
      ? "SELECT COALESCE(device_type, 'Unknown') as name, COUNT(*) as value FROM url_visits GROUP BY device_type"
      : "SELECT COALESCE(v.device_type, 'Unknown') as name, COUNT(*) as value FROM url_visits v JOIN urls u ON v.url_id = u.id WHERE u.user_id = $1 GROUP BY v.device_type";
    
    // 2. Browser breakdown
    let browsersQuery = isPlatformScope
      ? "SELECT COALESCE(browser, 'Unknown') as name, COUNT(*) as value FROM url_visits GROUP BY browser ORDER BY value DESC LIMIT 5"
      : "SELECT COALESCE(v.browser, 'Unknown') as name, COUNT(*) as value FROM url_visits v JOIN urls u ON v.url_id = u.id WHERE u.user_id = $1 GROUP BY v.browser ORDER BY value DESC LIMIT 5";

    // 3. Country breakdown
    let countriesQuery = isPlatformScope
      ? "SELECT COALESCE(country, 'Unknown') as name, COUNT(*) as value FROM url_visits GROUP BY country ORDER BY value DESC LIMIT 5"
      : "SELECT COALESCE(v.country, 'Unknown') as name, COUNT(*) as value FROM url_visits v JOIN urls u ON v.url_id = u.id WHERE u.user_id = $1 GROUP BY v.country ORDER BY value DESC LIMIT 5";

    // 4. Referrer breakdown
    let referersQuery = isPlatformScope
      ? "SELECT COALESCE(referer, 'Direct') as name, COUNT(*) as value FROM url_visits GROUP BY referer ORDER BY value DESC LIMIT 5"
      : "SELECT COALESCE(v.referer, 'Direct') as name, COUNT(*) as value FROM url_visits v JOIN urls u ON v.url_id = u.id WHERE u.user_id = $1 GROUP BY v.referer ORDER BY value DESC LIMIT 5";

    // 5. Daily Trend
    let trendsQuery = isPlatformScope
      ? "SELECT DATE_TRUNC('day', visited_at)::date as date, COUNT(*) as count FROM url_visits WHERE visited_at > NOW() - INTERVAL '14 days' GROUP BY date ORDER BY date ASC"
      : "SELECT DATE_TRUNC('day', v.visited_at)::date as date, COUNT(*) as count FROM url_visits v JOIN urls u ON v.url_id = u.id WHERE u.user_id = $1 AND v.visited_at > NOW() - INTERVAL '14 days' GROUP BY date ORDER BY date ASC";

    // 6. Recent visits
    let visitsQuery = isPlatformScope
      ? "SELECT v.visited_at, v.ip_address, v.browser, v.device_type, v.country, v.referer, u.short_code FROM url_visits v JOIN urls u ON v.url_id = u.id ORDER BY v.visited_at DESC LIMIT 10"
      : "SELECT v.visited_at, v.ip_address, v.browser, v.device_type, v.country, v.referer, u.short_code FROM url_visits v JOIN urls u ON v.url_id = u.id WHERE u.user_id = $1 ORDER BY v.visited_at DESC LIMIT 10";

    const queryParams = isPlatformScope ? [] : [userId];

    const [devicesRes, browsersRes, countriesRes, referersRes, trendsRes, visitsRes] = await Promise.all([
      db.query(devicesQuery, queryParams),
      db.query(browsersQuery, queryParams),
      db.query(countriesQuery, queryParams),
      db.query(referersQuery, queryParams),
      db.query(trendsQuery, queryParams),
      db.query(visitsQuery, queryParams)
    ]);

    // Fetch unique visitors & returning clicks aggregates
    let visitorStatsQuery = isPlatformScope
      ? "SELECT COUNT(*) as total_clicks, COUNT(DISTINCT visitor_id) as unique_visitors FROM url_visits"
      : "SELECT COUNT(*) as total_clicks, COUNT(DISTINCT v.visitor_id) as unique_visitors FROM url_visits v JOIN urls u ON v.url_id = u.id WHERE u.user_id = $1";
      
    const visitorStatsRes = await db.query(visitorStatsQuery, queryParams);
    
    // Fetch total URLs count
    let totalUrlsQuery = isPlatformScope
      ? "SELECT COUNT(*) as count FROM urls"
      : "SELECT COUNT(*) as count FROM urls WHERE user_id = $1";
    const totalUrlsRes = await db.query(totalUrlsQuery, queryParams);

    const totalClicks = parseInt(visitorStatsRes.rows[0]?.total_clicks || 0);
    const uniqueVisitors = parseInt(visitorStatsRes.rows[0]?.unique_visitors || 0);
    const returningVisitors = Math.max(0, totalClicks - uniqueVisitors);
    const totalUrls = parseInt(totalUrlsRes.rows[0]?.count || 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalClicks,
          uniqueVisitors,
          returningVisitors,
          totalUrls
        },
        devices: devicesRes.rows,
        browsers: browsersRes.rows,
        countries: countriesRes.rows,
        referers: referersRes.rows,
        trends: trendsRes.rows,
        recentVisits: visitsRes.rows
      }
    });
  } catch (err) {
    next(err);
  }
};
