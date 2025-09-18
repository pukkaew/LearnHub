const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Apply authentication to all user routes
router.use(verifyToken);

// Render pages
router.get('/', requireRole(['Admin', 'HR']), userController.renderUserList);
router.get('/profile', userController.renderProfile);
router.get('/profile/:user_id', userController.renderUserProfile);
router.get('/create', requireRole(['Admin', 'HR']), userController.renderCreateUser);
router.get('/edit/:user_id', requireRole(['Admin', 'HR']), userController.renderEditUser);

// API endpoints - User CRUD operations
router.post('/', requireRole(['Admin', 'HR']), userController.createUser);
router.get('/api/list', requireRole(['Admin', 'HR']), userController.getUserList);
router.get('/api/:user_id', userController.getUserById);
router.put('/api/:user_id', requireRole(['Admin', 'HR']), userController.updateUser);
router.delete('/api/:user_id', requireRole(['Admin']), userController.deleteUser);

// Profile management
router.get('/api/profile', userController.getProfile);
router.put('/api/profile', userController.updateProfile);
router.post('/api/profile/image', userController.uploadProfileImage);
router.delete('/api/profile/image', userController.deleteProfileImage);

// Password management
router.put('/api/profile/password', userController.changePassword);
router.post('/api/reset-password', userController.resetPassword);

// User activity and statistics
router.get('/api/:user_id/activity', requireRole(['Admin', 'HR']), userController.getUserActivity);
router.get('/api/:user_id/stats', requireRole(['Admin', 'HR']), userController.getUserStats);
router.get('/api/:user_id/progress', userController.getUserProgress);

// User role and permission management
router.put('/api/:user_id/role', requireRole(['Admin']), userController.updateUserRole);
router.put('/api/:user_id/status', requireRole(['Admin', 'HR']), userController.updateUserStatus);
router.put('/api/:user_id/permissions', requireRole(['Admin']), userController.updateUserPermissions);

// Employee management
router.get('/api/employees', requireRole(['Admin', 'HR']), userController.getEmployees);
router.get('/api/employees/by-department/:department_id', requireRole(['Admin', 'HR']), userController.getEmployeesByDepartment);
router.get('/api/employees/supervisors', requireRole(['Admin', 'HR']), userController.getSupervisors);
router.put('/api/:user_id/supervisor', requireRole(['Admin', 'HR']), userController.updateSupervisor);

// User search and filtering
router.get('/api/search', requireRole(['Admin', 'HR']), userController.searchUsers);
router.get('/api/filter', requireRole(['Admin', 'HR']), userController.filterUsers);

// User authentication logs
router.get('/api/:user_id/auth-logs', requireRole(['Admin']), userController.getAuthLogs);
router.get('/api/:user_id/session-history', requireRole(['Admin']), userController.getSessionHistory);

// User gamification
router.get('/api/:user_id/badges', userController.getUserBadges);
router.get('/api/:user_id/points', userController.getUserPoints);
router.get('/api/:user_id/level', userController.getUserLevel);

// Bulk operations
router.post('/api/bulk-create', requireRole(['Admin']), userController.bulkCreateUsers);
router.put('/api/bulk-update', requireRole(['Admin']), userController.bulkUpdateUsers);
router.post('/api/bulk-import', requireRole(['Admin']), userController.bulkImportUsers);
router.get('/api/export', requireRole(['Admin', 'HR']), userController.exportUsers);

// User notifications
router.get('/api/:user_id/notifications', userController.getUserNotifications);
router.put('/api/:user_id/notification-settings', userController.updateNotificationSettings);

module.exports = router;