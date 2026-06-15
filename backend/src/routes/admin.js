const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

router.get('/users', adminController.listUsers);
router.get('/deleted-users', adminController.listDeletedUsers);
router.get('/users/:id', adminController.getUserDetail);
router.put('/users/:id', adminController.toggleSuspension);
router.delete('/users/:id', adminController.deleteUser);
router.get('/urls', adminController.listAllUrls);
router.delete('/urls/:id', adminController.deleteUrl);
router.get('/analytics', adminController.getPlatformAnalytics);

module.exports = router;
