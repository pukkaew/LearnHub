const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all test routes
router.use(authMiddleware.requireAuth);

// Render pages
router.get('/', testController.renderTestsList);
router.get('/:test_id', testController.renderTestDetail);
router.get('/:test_id/:attempt_id/taking', testController.renderTestTaking);

// API endpoints - Test CRUD operations (using existing functions)
router.get('/api/all', testController.getAllTests);
router.get('/api/:test_id', testController.getTestById);
router.post('/api/create', authMiddleware.requireRole(['Admin', 'Instructor']), testController.createTest);
router.put('/api/:test_id', authMiddleware.requireRole(['Admin', 'Instructor']), testController.updateTest);
router.delete('/api/:test_id', authMiddleware.requireRole(['Admin']), testController.deleteTest);

// Test attempt management (using existing functions)
router.post('/api/:test_id/start', testController.startTest);
router.post('/api/:test_id/:attempt_id/submit', testController.submitTest);

// Test results (using existing functions)
router.get('/api/:test_id/results', testController.getTestResults);

// Test statistics (using existing functions)
router.get('/api/:test_id/statistics', authMiddleware.requireRole(['Admin', 'Instructor']), testController.getTestStatistics);

module.exports = router;