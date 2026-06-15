const crypto = require('crypto');

// Generates a random alphanumeric short code
function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validates URL format
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Validates Custom Alias pattern (3-50 chars, letters, numbers, hyphens)
function isValidAlias(alias) {
  const regex = /^[a-zA-Z0-9-]{3,50}$/;
  return regex.test(alias);
}

module.exports = {
  generateShortCode,
  isValidUrl,
  isValidAlias
};
