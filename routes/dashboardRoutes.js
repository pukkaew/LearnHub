const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Apply authentication to all dashboard routes
router.use(verifyToken);

// Main dashboard page
router.get('/', dashboardController.renderDashboard);

// API endpoints for dashboard data
router.get('/api/data', dashboardController.getDashboard);
router.get('/api/stats', dashboardController.getQuickStats);
router.get('/api/notifications', dashboardController.getNotifications);
router.get('/api/activities', dashboardController.getActivityLogs);
router.get('/api/user-stats', dashboardController.getUserStats);

// Notification management
router.put('/api/notifications/:notification_id/read', dashboardController.markNotificationAsRead);
router.put('/api/notifications/mark-all-read', dashboardController.markAllNotificationsAsRead);

// Admin only routes
router.get('/api/system-health', requireRole(['Admin']), dashboardController.getSystemHealth);

module.exports = router;