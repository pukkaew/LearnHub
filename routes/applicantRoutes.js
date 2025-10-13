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
router.get('/test/login', applicantController.renderTestLogin);
router.get('/test/:test_code', applicantController.renderTestInterface);
router.get('/api/:test_code/info', applicantController.getApplicantByTestCode);
router.post('/api/:test_code/start', applicantController.startApplicantTest);
router.post('/api/:test_code/:attempt_id/submit', applicantController.submitApplicantTest);

// HR and Admin routes (require authentication and appropriate roles)
router.use('/admin', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']));

// HR Management - Render pages
router.get('/admin/', applicantController.renderApplicantManagement);

// Applicant CRUD operations (HR/Admin) (using existing functions)
router.get('/admin/api/all', applicantController.getAllApplicants);
router.get('/admin/api/:applicant_id', applicantController.getApplicantById);
router.put('/admin/api/:applicant_id/status', applicantController.updateApplicantStatus);

// Statistics and reports (using existing functions)
router.get('/admin/api/statistics', applicantController.getApplicantStatistics);

module.exports = router;