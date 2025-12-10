const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all test routes
router.use(authMiddleware.requireAuth);

// ============================================
// API ROUTES - MUST come BEFORE dynamic routes
// ============================================

// Chapter and Lesson APIs for dynamic loading (for test creation form)
router.get('/api/courses/:course_id/chapters', testController.getChaptersByCourse);
router.get('/api/chapters/:chapter_id/lessons', testController.getLessonsByChapter);
router.get('/api/courses/:course_id/tests', testController.getTestsByCourse);

// Test list and stats APIs (for index page)
router.get('/api/stats', testController.getTestStats);
router.get('/api/counts', testController.getTabCounts);
router.get('/api/list', testController.getTestList);
router.get('/api/categories', testController.getTestCategories);

// Test CRUD operations
router.get('/api/all', testController.getAllTests);
router.post('/api/create', authMiddleware.requireRole(['Admin', 'Instructor']), testController.createTest);

// Test results API
router.get('/api/attempts/:attempt_id/results', testController.getAttemptResultsAPI);

// Test analytics API (Admin/Instructor only)
router.get('/api/analytics', authMiddleware.requireRole(['Admin', 'Instructor']), testController.getTestAnalyticsAPI);

// Position Test Sets API (HR/Admin) - MUST come before :test_id routes
router.get('/api/position-test-sets/:position_id', authMiddleware.requireRole(['Admin', 'HR', 'Instructor']), testController.getPositionTestSet);
router.post('/api/position-test-sets/:position_id', authMiddleware.requireRole(['Admin', 'HR', 'Instructor']), testController.addTestToPositionSet);
router.put('/api/position-test-sets/:set_id/order', authMiddleware.requireRole(['Admin', 'HR', 'Instructor']), testController.updateTestOrder);
router.delete('/api/position-test-sets/:set_id', authMiddleware.requireRole(['Admin', 'HR', 'Instructor']), testController.removeTestFromPositionSet);
router.get('/api/position-test-config/:position_id', authMiddleware.requireRole(['Admin', 'HR', 'Instructor']), testController.getPositionTestConfig);
router.put('/api/position-test-config/:position_id', authMiddleware.requireRole(['Admin', 'HR', 'Instructor']), testController.updatePositionTestConfig);

// Test-specific API endpoints (with :test_id)
router.get('/api/:test_id', testController.getTestById);
router.put('/api/:test_id', authMiddleware.requireRole(['Admin', 'Instructor']), testController.updateTest);
router.delete('/api/:test_id', authMiddleware.requireRole(['Admin']), testController.deleteTest);
router.get('/api/:test_id/my-attempts', testController.getMyAttempts);
router.post('/api/:test_id/start', testController.startTest);
router.post('/api/:test_id/:attempt_id/submit', testController.submitTest);
router.get('/api/:test_id/results', testController.getTestResults);
router.get('/api/:test_id/statistics', authMiddleware.requireRole(['Admin', 'Instructor']), testController.getTestStatistics);
router.get('/api/:test_id/positions', testController.getTestPositions);

// ============================================
// PAGE ROUTES - Dynamic routes come LAST
// ============================================

router.get('/', testController.renderTestsList);
router.get('/position-test-sets', authMiddleware.requireRole(['Admin', 'HR', 'Instructor']), testController.renderPositionTestSets);
router.get('/create', authMiddleware.requireRole(['Admin', 'Instructor']), testController.renderCreateTest);
router.get('/:test_id/edit', authMiddleware.requireRole(['Admin', 'Instructor']), testController.renderEditTest);
router.get('/:test_id', testController.renderTestDetail);
router.get('/:test_id/start', testController.startTestAndRedirect);
router.get('/:test_id/take', testController.startTestAndRedirect);
router.get('/:test_id/results', testController.renderTestResults);
router.get('/:test_id/analytics', authMiddleware.requireRole(['Admin', 'Instructor']), testController.renderTestAnalytics);
router.get('/:test_id/:attempt_id/taking', testController.renderTestTaking);

module.exports = router;