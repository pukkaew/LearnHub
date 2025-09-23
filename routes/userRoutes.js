const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all user routes
router.use(authMiddleware.requireAuth);

// Render pages
router.get('/', authMiddleware.requireRole(['Admin', 'HR']), userController.renderUserManagement);
router.get('/profile', userController.renderProfile);

// API endpoints - User CRUD operations (only implemented functions)
router.post('/', authMiddleware.requireRole(['Admin', 'HR']), userController.createUser);
router.get('/api/list', authMiddleware.requireRole(['Admin', 'HR']), userController.getAllUsers);
router.get('/api/:user_id', userController.getUserById);
router.put('/api/:user_id', authMiddleware.requireRole(['Admin', 'HR']), userController.updateUser);
router.delete('/api/:user_id', authMiddleware.requireRole(['Admin']), userController.deactivateUser);

// Profile management (only implemented functions)
router.get('/api/profile', userController.getProfile);
router.put('/api/profile', userController.updateProfile);
router.post('/api/profile/image', userController.uploadProfileImage);

// User statistics (only implemented functions)
router.get('/api/:user_id/stats', authMiddleware.requireRole(['Admin', 'HR']), userController.getUserStats);

module.exports = router;