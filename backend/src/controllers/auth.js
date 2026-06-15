const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/env');
const { sendError } = require('../middleware/error');

exports.register = async (req, res, next) => {
  const { email, password, confirmPassword, fullName, mobileNumber } = req.body;
  
  if (!fullName) return res.status(400).json({ success: false, error: { message: "Full Name is required.", field: "fullName" } });
  if (!mobileNumber) return res.status(400).json({ success: false, error: { message: "Mobile Number is required.", field: "mobileNumber" } });
  if (!email) return sendError(res, 'VAL_001', 400, 'email');
  if (!email.match(/^\S+@\S+\.\S+$/)) return sendError(res, 'VAL_002', 400, 'email');
  if (!password) return sendError(res, 'VAL_003', 400, 'password');
  
  // Password validation: 8+ chars, uppercase, number, special character
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return sendError(res, 'VAL_003', 400, 'password');
  }

  if (password !== confirmPassword) {
    return sendError(res, 'VAL_004', 400, 'confirmPassword');
  }

  try {
    // Check if email already registered
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return sendError(res, 'AUTH_001', 400, 'email');
    }

    // Hash password (bcrypt rounds: 12)
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Save User
    const result = await db.query(
      `INSERT INTO users (email, password_hash, full_name, mobile_number) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, role, full_name, mobile_number`,
      [email.toLowerCase().trim(), passwordHash, fullName, mobileNumber]
    );

    res.status(201).json({
      success: true,
      data: {
        userId: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        fullName: result.rows[0].full_name,
        mobileNumber: result.rows[0].mobile_number
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return sendError(res, 'AUTH_002', 400);
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return sendError(res, 'AUTH_002', 400);
    }

    const user = result.rows[0];
    
    // Check if deleted
    if (user.status === 'deleted') {
      return sendError(res, 'AUTH_002', 400);
    }
    
    // Check suspended
    if (user.is_suspended) {
      return sendError(res, 'AUTH_006', 403);
    }

    // Verify Password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return sendError(res, 'AUTH_002', 400);
    }

    // Generate JWT Access Token (15 min)
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Generate Refresh Token (7 days)
    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Store Refresh Token in DB
    const deviceName = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.connection.remoteAddress;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, device_name, ip_address, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [user.id, refreshToken, deviceName, ipAddress, expiresAt]
    );

    // Store in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.full_name,
          profileImage: user.profile_image,
          mobileNumber: user.mobile_number
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return sendError(res, 'AUTH_007', 401);
  }

  try {
    // Check if token exists in DB and is active
    const tokenCheck = await db.query(
      'SELECT r.*, u.email, u.role, u.is_suspended, u.status FROM refresh_tokens r JOIN users u ON r.user_id = u.id WHERE r.token = $1 AND r.expires_at > NOW()',
      [token]
    );

    if (tokenCheck.rows.length === 0) {
      return sendError(res, 'AUTH_007', 401);
    }

    const { user_id: userId, email, role, is_suspended: isSuspended, status } = tokenCheck.rows[0];

    if (status === 'deleted') {
      return sendError(res, 'AUTH_007', 401);
    }

    if (isSuspended) {
      return sendError(res, 'AUTH_006', 403);
    }

    // Verify JWT Refresh
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    if (decoded.userId !== userId) {
      return sendError(res, 'AUTH_007', 401);
    }

    // Generate New JWT Access Token (15 min)
    const newAccessToken = jwt.sign(
      { userId, email, role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        user: { id: userId, email, role }
      }
    });
  } catch (err) {
    return sendError(res, 'AUTH_007', 401);
  }
};

exports.logout = async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (token) {
    try {
      await db.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    } catch (err) {
      console.error("Logout delete token error:", err.message);
    }
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  });

  res.json({
    success: true,
    message: "Logged out successfully"
  });
};

exports.me = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, email, role, is_suspended, status, full_name, profile_image, google_profile_image, mobile_number, auth_provider FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) {
      return sendError(res, 'AUTH_003', 401);
    }
    
    const user = result.rows[0];
    if (user.status === 'deleted') {
      return sendError(res, 'AUTH_003', 401);
    }
    if (user.is_suspended) {
      return sendError(res, 'AUTH_006', 403);
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        profileImage: user.profile_image,
        googleProfileImage: user.google_profile_image,
        mobileNumber: user.mobile_number,
        authProvider: user.auth_provider
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.googleLogin = async (req, res, next) => {
  const { credential } = req.body;
  if (!credential) {
    return sendError(res, 'AUTH_002', 400);
  }

  const { GOOGLE_CLIENT_ID } = require('../config/env');

  try {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('mockclientid')) {
      console.warn("GOOGLE_CLIENT_ID is not configured or is a mock ID in .env. Mocking Google authentication for development.");
      const decoded = jwt.decode(credential);
      if (decoded && decoded.email) {
        return handleGoogleUser(decoded.email, decoded.name, decoded.picture, decoded.sub, res, decoded.mobileNumber || decoded.phone);
      }
      return res.status(400).json({ success: false, error: { message: "Google Client ID is not configured." } });
    }

    const { OAuth2Client } = require('google-auth-library');
    const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId, phone_number } = payload;

    await handleGoogleUser(email, name, picture, googleId, res, phone_number || null);
  } catch (err) {
    console.error("Google authentication error:", err.message);
    return sendError(res, 'AUTH_002', 400);
  }
};

async function handleGoogleUser(email, name, picture, googleId, res, mobileNumber = null) {
  let result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  let user;

  if (result.rows.length === 0) {
    const insertRes = await db.query(
      `INSERT INTO users (email, full_name, profile_image, google_profile_image, google_id, auth_provider, mobile_number)
       VALUES ($1, $2, $3, $3, $4, 'google', $5)
       RETURNING id, email, role, is_suspended, full_name, profile_image, google_profile_image, mobile_number, auth_provider`,
      [email.toLowerCase().trim(), name, picture, googleId, mobileNumber]
    );
    user = insertRes.rows[0];
  } else {
    user = result.rows[0];
    if (user.status === 'deleted') {
      return res.status(403).json({ success: false, error: { message: "Account has been deleted." } });
    }
    if (user.is_suspended) {
      return sendError(res, 'AUTH_006', 403);
    }
    const updateRes = await db.query(
      `UPDATE users 
       SET google_id = COALESCE(google_id, $1), 
           full_name = COALESCE(full_name, $2), 
           profile_image = COALESCE(profile_image, $3),
           google_profile_image = $3,
           auth_provider = COALESCE(auth_provider, 'google'),
           mobile_number = COALESCE(mobile_number, $5),
           updated_at = NOW() 
       WHERE id = $4
       RETURNING id, email, role, is_suspended, full_name, profile_image, google_profile_image, mobile_number, auth_provider`,
      [googleId, name, picture, user.id, mobileNumber]
    );
    user = updateRes.rows[0];
  }

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, device_name, ip_address, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [user.id, refreshToken, 'LinkSphere Session', '0.0.0.0', expiresAt]
  );

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        profileImage: user.profile_image,
        googleProfileImage: user.google_profile_image,
        mobileNumber: user.mobile_number,
        authProvider: user.auth_provider
      }
    }
  });
}

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return sendError(res, 'VAL_001', 400, 'email');
  }

  const crypto = require('crypto');
  const nodemailer = require('nodemailer');
  const { EMAIL_USER, EMAIL_PASS, FRONTEND_URL } = require('../config/env');

  try {
    const userRes = await db.query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      return res.json({
        success: true,
        message: "If the email is registered, a password reset link has been sent."
      });
    }

    const user = userRes.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
    console.log("====================================================");
    console.log(`PASSWORD RESET REQUEST FOR: ${email}`);
    console.log(`RESET LINK: ${resetLink}`);
    console.log("====================================================");

    let transporter;
    if (EMAIL_USER && EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS
        }
      });
    } else {
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: "mock_user",
          pass: "mock_pass"
        }
      });
    }

    try {
      if (EMAIL_USER && EMAIL_PASS) {
        await transporter.sendMail({
          from: `"LinkSphere Support" <${EMAIL_USER}>`,
          to: email,
          subject: "Reset your LinkSphere password",
          html: `<p>You requested a password reset. Click <a href="${resetLink}">here</a> to choose a new password. The link will expire in 1 hour.</p>`
        });
      }
    } catch (mailErr) {
      console.warn("Could not send SMTP email (using simulated reset instead). Link:", resetLink);
    }

    res.json({
      success: true,
      message: "If the email is registered, a password reset link has been sent."
    });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  const { token, password, confirmPassword } = req.body;

  if (!token) return res.status(400).json({ success: false, error: { message: "Token is required." } });
  if (!password) return sendError(res, 'VAL_003', 400, 'password');

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return sendError(res, 'VAL_003', 400, 'password');
  }

  if (password !== confirmPassword) {
    return sendError(res, 'VAL_004', 400, 'confirmPassword');
  }

  try {
    const tokenCheck = await db.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (tokenCheck.rows.length === 0) {
      return res.status(400).json({ success: false, error: { message: "Invalid or expired reset token." } });
    }

    const { user_id: userId } = tokenCheck.rows[0];
    const passwordHash = await bcrypt.hash(password, 12);

    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
    await db.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    res.json({
      success: true,
      message: "Password reset successfully. Please login with your new password."
    });
  } catch (err) {
    next(err);
  }
};

exports.requestPasswordOtp = async (req, res, next) => {
  const userId = req.user.userId;

  try {
    const userRes = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return sendError(res, 'AUTH_003', 401);
    }

    const email = userRes.rows[0].email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    await db.query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3',
      [otp, expiresAt, userId]
    );

    console.log("====================================================");
    console.log(`PASSWORD CHANGE OTP FOR ${email}: ${otp}`);
    console.log("====================================================");

    const { EMAIL_USER, EMAIL_PASS } = require('../config/env');
    const nodemailer = require('nodemailer');
    
    let transporter;
    if (EMAIL_USER && EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
      });
    } else {
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: "mock_user", pass: "mock_pass" }
      });
    }

    try {
      if (EMAIL_USER && EMAIL_PASS) {
        await transporter.sendMail({
          from: `"LinkSphere Support" <${EMAIL_USER}>`,
          to: email,
          subject: "Your LinkSphere verification code",
          html: `<p>Your verification code to update your password is: <strong>${otp}</strong>. This code will expire in 5 minutes.</p>`
        });
      }
    } catch (mailErr) {
      console.warn("Could not send SMTP email verification code. Code:", otp);
    }

    res.json({
      success: true,
      message: "Verification code sent to your registered email address."
    });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  const { otpCode, newPassword, confirmPassword } = req.body;
  const userId = req.user.userId;

  if (!otpCode || !newPassword) {
    return res.status(400).json({ success: false, error: { message: "Verification code and new password are required." } });
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return sendError(res, 'VAL_003', 400, 'newPassword');
  }

  if (newPassword !== confirmPassword) {
    return sendError(res, 'VAL_004', 400, 'confirmPassword');
  }

  try {
    const userRes = await db.query('SELECT otp_code, otp_expires_at FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return sendError(res, 'AUTH_003', 401);
    }

    const user = userRes.rows[0];

    if (!user.otp_code || user.otp_code !== otpCode || new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ success: false, error: { message: "Invalid or expired verification code." } });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.query(
      'UPDATE users SET password_hash = $1, otp_code = NULL, otp_expires_at = NULL, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );

    // Force expire all refresh tokens (sign out from all other devices on password change)
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    res.json({
      success: true,
      message: "Password updated successfully."
    });
  } catch (err) {
    next(err);
  }
};

exports.listSessions = async (req, res, next) => {
  const userId = req.user.userId;
  try {
    const sessions = await db.query(
      `SELECT id, token, device_name, ip_address, expires_at, created_at 
       FROM refresh_tokens 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    const currentToken = req.cookies.refreshToken;

    const data = sessions.rows.map(session => ({
      id: session.id,
      deviceName: session.device_name,
      ipAddress: session.ip_address,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
      isCurrent: session.token === currentToken || false
    }));

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteSession = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    await db.query('DELETE FROM refresh_tokens WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({
      success: true,
      message: "Session terminated successfully."
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteAllOtherSessions = async (req, res, next) => {
  const userId = req.user.userId;
  const currentToken = req.cookies.refreshToken;

  try {
    if (currentToken) {
      await db.query(
        'DELETE FROM refresh_tokens WHERE user_id = $1 AND token != $2',
        [userId, currentToken]
      );
    } else {
      await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    }
    
    res.json({
      success: true,
      message: "All other sessions terminated successfully."
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  const { fullName, profileImage, mobileNumber } = req.body;
  const userId = req.user.userId;

  try {
    const result = await db.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name), 
           profile_image = COALESCE($2, profile_image),
           mobile_number = COALESCE($3, mobile_number),
           updated_at = NOW() 
       WHERE id = $4
       RETURNING id, email, role, full_name, profile_image, google_profile_image, mobile_number, auth_provider`,
      [fullName, profileImage, mobileNumber, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'AUTH_003', 401);
    }

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        fullName: result.rows[0].full_name,
        profileImage: result.rows[0].profile_image,
        googleProfileImage: result.rows[0].google_profile_image,
        mobileNumber: result.rows[0].mobile_number,
        authProvider: result.rows[0].auth_provider
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteSelf = async (req, res, next) => {
  const userId = req.user.userId;
  const { password } = req.body;

  try {
    const userCheck = await db.query('SELECT role, email, full_name, password_hash, auth_provider, status FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: "User not found." } });
    }

    const user = userCheck.rows[0];

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, error: { message: "Admin accounts cannot be deleted." } });
    }

    if (user.status === 'deleted') {
      return res.status(400).json({ success: false, error: { message: "Account is already deleted." } });
    }

    // Validate password if user registered with email auth provider
    if (user.auth_provider !== 'google') {
      if (!password) {
        return res.status(400).json({ success: false, error: { message: "Password is required to delete your account.", field: "password" } });
      }
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(400).json({ success: false, error: { message: "Incorrect password.", field: "password" } });
      }
    }

    // Begin transaction
    await db.query('BEGIN');

    // 1. Insert into deleted_users audit log
    await db.query(
      'INSERT INTO deleted_users (user_id, email, full_name) VALUES ($1, $2, $3)',
      [userId, user.email, user.full_name]
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
      [userId]
    );

    // 3. Delete all refresh tokens
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    // 4. Delete all password reset tokens
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

    // 5. Delete all URLs they created (which cascades to visits)
    // First, find codes to evict from cache
    const urls = await db.query('SELECT short_code FROM urls WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM urls WHERE user_id = $1', [userId]);

    // Commit transaction
    await db.query('COMMIT');

    // Evict codes from Node Cache
    const { redirectCache } = require('./url');
    if (redirectCache && urls.rows.length > 0) {
      urls.rows.forEach(u => {
        redirectCache.del(u.short_code);
      });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });

    res.json({
      success: true,
      message: "Your account has been deleted successfully."
    });
  } catch (err) {
    await db.query('ROLLBACK');
    next(err);
  }
};

