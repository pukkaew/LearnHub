const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all API routes
router.use(authMiddleware.requireAuth);

// Dashboard API routes that the frontend expects
router.get('/dashboard/stats', dashboardController.getQuickStats);

module.exports = router;