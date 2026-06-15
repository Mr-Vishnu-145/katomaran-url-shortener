const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/register', authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

// Google OAuth
router.post('/google', authController.googleLogin);

// Password Recovery
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Profile and Sessions (Protected)
router.post('/password-otp', requireAuth, authController.requestPasswordOtp);
router.put('/change-password', requireAuth, authController.changePassword);
router.put('/profile', requireAuth, authController.updateProfile);
router.delete('/profile', requireAuth, authController.deleteSelf);
router.get('/sessions', requireAuth, authController.listSessions);
router.delete('/sessions/:id', requireAuth, authController.deleteSession);
router.delete('/sessions', requireAuth, authController.deleteAllOtherSessions);

module.exports = router;
