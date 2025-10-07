const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all dashboard routes
router.use(authMiddleware.requireAuth);

// Main dashboard page
router.get('/', dashboardController.renderDashboard);

// API endpoints for dashboard data
router.get('/api/data', dashboardController.getDashboard);
router.get('/api/stats', dashboardController.getQuickStats);
router.get('/api/notifications', dashboardController.getNotifications);
router.get('/api/activities', dashboardController.getActivityLogs);
router.get('/api/user-stats', dashboardController.getUserStats);
router.get('/api/real-time-data', dashboardController.getRealTimeData);

// Socket.io real-time endpoints
router.post('/api/activity-tracking', dashboardController.trackUserActivity);
router.get('/api/leaderboard', dashboardController.getLeaderboard);
router.get('/api/upcoming-events', dashboardController.getUpcomingEvents);

// Additional endpoints for alternative API paths
router.get('/stats', dashboardController.getQuickStats);  // For /api/dashboard/stats
router.get('/activities/recent', dashboardController.getActivityLogs);  // For /api/dashboard/activities/recent
router.get('/leaderboard', dashboardController.getLeaderboard);  // For /api/dashboard/leaderboard

// Missing endpoints that dashboard view needs
router.get('/api/recent-courses', dashboardController.getRecentCourses);
router.get('/api/progress', dashboardController.getProgress);
router.get('/api/recent-articles', dashboardController.getRecentArticles);
router.get('/api/my-badges', dashboardController.getMyBadges);

// Notification management
router.put('/api/notifications/:notification_id/read', dashboardController.markNotificationAsRead);
router.put('/api/notifications/mark-all-read', dashboardController.markAllNotificationsAsRead);

// Admin only routes
router.get('/api/system-health', authMiddleware.requireRole(['Admin']), dashboardController.getSystemHealth);

module.exports = router;