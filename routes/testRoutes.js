const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Apply authentication to all test routes
router.use(verifyToken);

// Render pages
router.get('/', testController.renderTestList);
router.get('/create', requireRole(['Admin', 'Instructor']), testController.renderCreateTest);
router.get('/edit/:test_id', requireRole(['Admin', 'Instructor']), testController.renderEditTest);
router.get('/:test_id', testController.renderTestDetail);
router.get('/:test_id/take', testController.renderTakeTest);
router.get('/:test_id/results', testController.renderTestResults);
router.get('/:test_id/analytics', requireRole(['Admin', 'Instructor']), testController.renderTestAnalytics);

// API endpoints - Test CRUD operations
router.post('/', requireRole(['Admin', 'Instructor']), testController.createTest);
router.get('/api/list', testController.getTestList);
router.get('/api/:test_id', testController.getTestById);
router.put('/api/:test_id', requireRole(['Admin', 'Instructor']), testController.updateTest);
router.delete('/api/:test_id', requireRole(['Admin']), testController.deleteTest);

// Test attempt management
router.post('/api/:test_id/start', testController.startTestAttempt);
router.put('/api/:test_id/attempts/:attempt_id/submit', testController.submitTestAttempt);
router.get('/api/:test_id/attempts/:attempt_id', testController.getTestAttempt);
router.put('/api/:test_id/attempts/:attempt_id/save-progress', testController.saveTestProgress);
router.post('/api/:test_id/attempts/:attempt_id/finish', testController.finishTestAttempt);

// Question management
router.post('/api/:test_id/questions', requireRole(['Admin', 'Instructor']), testController.addQuestion);
router.get('/api/:test_id/questions', testController.getTestQuestions);
router.put('/api/:test_id/questions/:question_id', requireRole(['Admin', 'Instructor']), testController.updateQuestion);
router.delete('/api/:test_id/questions/:question_id', requireRole(['Admin', 'Instructor']), testController.deleteQuestion);
router.put('/api/:test_id/questions/reorder', requireRole(['Admin', 'Instructor']), testController.reorderQuestions);

// Question bank integration
router.get('/api/question-banks', requireRole(['Admin', 'Instructor']), testController.getQuestionBanks);
router.post('/api/:test_id/questions/import', requireRole(['Admin', 'Instructor']), testController.importQuestionsFromBank);
router.post('/api/:test_id/questions/bulk-add', requireRole(['Admin', 'Instructor']), testController.bulkAddQuestions);

// Test results and grading
router.get('/api/:test_id/results', requireRole(['Admin', 'Instructor']), testController.getTestResults);
router.get('/api/:test_id/attempts/:attempt_id/results', testController.getAttemptResults);
router.put('/api/:test_id/attempts/:attempt_id/grade', requireRole(['Admin', 'Instructor']), testController.gradeAttempt);
router.post('/api/:test_id/attempts/:attempt_id/feedback', requireRole(['Admin', 'Instructor']), testController.addFeedback);

// Test statistics and analytics
router.get('/api/:test_id/stats', requireRole(['Admin', 'Instructor']), testController.getTestStats);
router.get('/api/:test_id/analytics', requireRole(['Admin', 'Instructor']), testController.getTestAnalytics);
router.get('/api/:test_id/difficulty-analysis', requireRole(['Admin', 'Instructor']), testController.getDifficultyAnalysis);
router.get('/api/:test_id/question-analysis', requireRole(['Admin', 'Instructor']), testController.getQuestionAnalysis);

// Test categories and tags
router.get('/api/categories', testController.getTestCategories);
router.get('/api/categories/:category_id/tests', testController.getTestsByCategory);
router.put('/api/:test_id/category', requireRole(['Admin', 'Instructor']), testController.updateTestCategory);

// Test search and filtering
router.get('/api/search', testController.searchTests);
router.get('/api/filter', testController.filterTests);
router.get('/api/my-tests', testController.getMyTests);

// Test settings and configuration
router.put('/api/:test_id/settings', requireRole(['Admin', 'Instructor']), testController.updateTestSettings);
router.put('/api/:test_id/timing', requireRole(['Admin', 'Instructor']), testController.updateTestTiming);
router.put('/api/:test_id/security', requireRole(['Admin', 'Instructor']), testController.updateTestSecurity);
router.put('/api/:test_id/grading', requireRole(['Admin', 'Instructor']), testController.updateGradingSettings);

// Test publishing and status
router.put('/api/:test_id/publish', requireRole(['Admin', 'Instructor']), testController.publishTest);
router.put('/api/:test_id/unpublish', requireRole(['Admin', 'Instructor']), testController.unpublishTest);
router.put('/api/:test_id/status', requireRole(['Admin']), testController.updateTestStatus);

// Test access and permissions
router.post('/api/:test_id/access', requireRole(['Admin', 'Instructor']), testController.grantTestAccess);
router.delete('/api/:test_id/access/:user_id', requireRole(['Admin', 'Instructor']), testController.revokeTestAccess);
router.get('/api/:test_id/access-list', requireRole(['Admin', 'Instructor']), testController.getTestAccessList);

// Test scheduling
router.put('/api/:test_id/schedule', requireRole(['Admin', 'Instructor']), testController.scheduleTest);
router.get('/api/:test_id/schedule', testController.getTestSchedule);
router.delete('/api/:test_id/schedule', requireRole(['Admin', 'Instructor']), testController.removeTestSchedule);

// Test reports and exports
router.get('/api/:test_id/report', requireRole(['Admin', 'Instructor']), testController.generateTestReport);
router.get('/api/:test_id/export-results', requireRole(['Admin', 'Instructor']), testController.exportTestResults);
router.get('/api/:test_id/export-questions', requireRole(['Admin', 'Instructor']), testController.exportTestQuestions);

// Proctoring and security
router.post('/api/:test_id/attempts/:attempt_id/security-log', testController.logSecurityEvent);
router.get('/api/:test_id/attempts/:attempt_id/security-logs', requireRole(['Admin', 'Instructor']), testController.getSecurityLogs);
router.put('/api/:test_id/attempts/:attempt_id/flag', requireRole(['Admin', 'Instructor']), testController.flagAttempt);

// Test templates and duplication
router.post('/api/:test_id/duplicate', requireRole(['Admin', 'Instructor']), testController.duplicateTest);
router.get('/api/templates', requireRole(['Admin', 'Instructor']), testController.getTestTemplates);
router.post('/api/templates/:template_id/create', requireRole(['Admin', 'Instructor']), testController.createFromTemplate);

// Bulk operations
router.post('/api/bulk-import', requireRole(['Admin']), testController.bulkImportTests);
router.post('/api/bulk-assign', requireRole(['Admin', 'HR']), testController.bulkAssignTests);
router.get('/api/export', requireRole(['Admin']), testController.exportTests);

// My test attempts (learner view)
router.get('/api/my-attempts', testController.getMyTestAttempts);
router.get('/api/my-attempts/completed', testController.getMyCompletedAttempts);
router.get('/api/my-attempts/in-progress', testController.getMyInProgressAttempts);
router.get('/api/my-results', testController.getMyTestResults);

// Certification tests
router.get('/api/certification', testController.getCertificationTests);
router.post('/api/:test_id/certificate', testController.generateCertificate);
router.get('/api/:test_id/certificate/:attempt_id', testController.getCertificate);

module.exports = router;