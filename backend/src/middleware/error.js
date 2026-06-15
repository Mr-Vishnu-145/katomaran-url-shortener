const errors = {
  AUTH_001: "Email already registered. Please login or use a different email.",
  AUTH_002: "Invalid email or password. Please check your credentials.",
  AUTH_003: "Session expired. Please login again.",
  AUTH_004: "You do not have permission to access this resource.",
  AUTH_005: "Too many login attempts. Wait 15 minutes and try again.",
  AUTH_006: "Account suspended. Please contact support.",
  AUTH_007: "Refresh token invalid or expired. Please login again.",
  URL_001: "Please enter a valid URL starting with http:// or https://",
  URL_002: "This custom alias is already taken. Please choose another.",
  URL_003: "Short URL not found or has been deleted.",
  URL_004: "This link has expired and is no longer active.",
  URL_006: "You are not authorized to modify this URL.",
  URL_008: "Alias must be 3-50 characters: letters, numbers, hyphens only.",
  VAL_001: "Email is required.",
  VAL_002: "Please enter a valid email address.",
  VAL_003: "Password: 8+ chars, uppercase, number, special character required.",
  VAL_004: "Passwords do not match.",
  SRV_001: "Something went wrong. Please try again in a moment."
};

const errorMiddleware = (err, req, res, next) => {
  console.error("Express Error Handler Captured:", err);
  const status = err.status || 500;
  const code = err.code || 'SRV_001';
  const message = err.message || errors[code] || errors.SRV_001;
  const field = err.field || undefined;

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      field
    }
  });
};

const sendError = (res, code, status = 400, field = undefined, customMessage = null) => {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message: customMessage || errors[code] || errors.SRV_001,
      field
    }
  });
};

module.exports = { errorMiddleware, sendError, errors };
