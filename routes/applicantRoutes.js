const express = require('express');
const router = express.Router();
const applicantController = require('../controllers/applicantController');
const authMiddleware = require('../middleware/auth');

// Root route - redirect based on user role
router.get('/', (req, res) => {
    // If user is logged in and has HR/Admin role, redirect to admin panel
    if (req.session && req.session.user) {
        const userRole = req.session.user.role;
        if (userRole === 'Admin' || userRole === 'HR') {
            return res.redirect('/applicants/admin/');
        }
    }
    // Otherwise, redirect to applicant test login page
    return res.redirect('/applicants/test/login');
});

// Public routes (no authentication required)
router.post('/register', applicantController.registerApplicant);
router.get('/test', (req, res) => res.redirect('/applicants/test/login'));
router.get('/test/login', applicantController.renderTestLogin);

// Multi-test Dashboard routes (NEW)
router.get('/dashboard/:test_code', applicantController.renderApplicantDashboard);
router.get('/api/:test_code/progress', applicantController.getApplicantTestProgress);
router.get('/api/:test_code/info', applicantController.getApplicantInfoForDashboard);

// Single test routes (existing - now also supports multi-test via test_id query param)
router.get('/test/:test_code', applicantController.renderTestInterface);
router.get('/result/:test_code', applicantController.renderTestResult);

// Overall result page (multi-test)
router.get('/overall-result/:test_code', applicantController.renderOverallResult);

// Test API routes
router.post('/api/test/:test_code/start', applicantController.startApplicantTest);
router.get('/api/test/:test_code/start-specific', applicantController.startSpecificTest);
router.post('/api/test/:test_code/submit', applicantController.submitApplicantTest);
router.post('/api/test/:test_code/submit-specific', applicantController.submitSpecificTest);
router.post('/api/test/:test_code/autosave', applicantController.autosaveApplicantTest);
router.post('/api/test/:test_code/log-activity', applicantController.logTestActivity);

// Legacy routes (keep for compatibility)
router.post('/api/:test_code/start', applicantController.startApplicantTest);
router.post('/api/:test_code/:attempt_id/submit', applicantController.submitApplicantTest);

// HR and Admin routes (require authentication and appropriate roles)
router.use('/admin', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']));

// Applicant API operations (HR/Admin) - MUST come before :applicant_id route
router.get('/admin/api/all', applicantController.getAllApplicants);
router.get('/admin/api/statistics', applicantController.getApplicantStatistics);
router.get('/admin/api/:applicant_id', applicantController.getApplicantById);

// HR Management - Render pages (dynamic routes last)
router.get('/admin/', applicantController.renderApplicantManagement);
router.get('/admin/:applicant_id', applicantController.renderApplicantDetail);

module.exports = router;