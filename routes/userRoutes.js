const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all user routes
router.use(authMiddleware.requireAuth);

// Render pages - Static routes MUST come before dynamic routes
router.get('/', authMiddleware.requireRole(['Admin', 'HR']), userController.renderUserManagement);
router.get('/profile', userController.renderProfile);
router.get('/export', authMiddleware.requireRole(['Admin', 'HR']), userController.exportUsers);

// API endpoints - Static API routes
router.post('/', authMiddleware.requireRole(['Admin', 'HR']), userController.createUser);
router.get('/api/list', authMiddleware.requireRole(['Admin', 'HR']), userController.getAllUsers);
router.get('/api/profile', userController.getProfile);
router.put('/api/profile', userController.updateProfile);
router.post('/api/profile/image', userController.uploadProfileImage);

// Dynamic routes - MUST come after static routes
router.get('/:user_id/view', authMiddleware.requireRole(['Admin', 'HR']), userController.renderViewUser);
router.get('/:user_id/edit', authMiddleware.requireRole(['Admin', 'HR']), userController.renderEditUser);

// API endpoints - Dynamic user-specific routes
router.get('/api/:user_id', userController.getUserById);
router.put('/api/:user_id', authMiddleware.requireRole(['Admin', 'HR']), userController.updateUser);
router.delete('/api/:user_id', authMiddleware.requireRole(['Admin']), userController.deactivateUser);
router.post('/api/:user_id/suspend', authMiddleware.requireRole(['Admin', 'HR']), userController.deactivateUser);
router.post('/api/:user_id/activate', authMiddleware.requireRole(['Admin', 'HR']), userController.activateUser);
router.post('/api/:user_id/reset-password', authMiddleware.requireRole(['Admin', 'HR']), userController.resetPassword);
router.get('/api/:user_id/activity', authMiddleware.requireAuth, userController.getUserActivity);
router.get('/api/:user_id/stats', authMiddleware.requireRole(['Admin', 'HR']), userController.getUserStats);

module.exports = router;