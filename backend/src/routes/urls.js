const express = require('express');
const router = express.Router();
const urlController = require('../controllers/url');
const analyticsController = require('../controllers/analytics');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/', urlController.create);
router.get('/', urlController.list);
router.get('/dashboard/stats', analyticsController.getDashboardStats);
router.get('/dashboard/analytics', analyticsController.getOverallAnalytics);
router.put('/:id', urlController.edit);
router.delete('/:id', urlController.deleteUrl);
router.get('/:id/qr', urlController.getQr);
router.get('/:id/analytics', analyticsController.getUrlAnalytics);

module.exports = router;
