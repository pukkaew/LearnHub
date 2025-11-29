const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all test routes
router.use(authMiddleware.requireAuth);

// Render pages - IMPORTANT: Static routes MUST come before dynamic routes
router.get('/', testController.renderTestsList);
router.get('/create', authMiddleware.requireRole(['Admin', 'Instructor']), testController.renderCreateTest);
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

// Chapter and Lesson APIs for dynamic loading
router.get('/api/courses/:course_id/chapters', testController.getChaptersByCourse);
router.get('/api/chapters/:chapter_id/lessons', testController.getLessonsByChapter);

// Get tests by course ID (for assessment structure display)
router.get('/api/courses/:course_id/tests', testController.getTestsByCourse);

module.exports = router;