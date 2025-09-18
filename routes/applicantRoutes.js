const express = require('express');
const router = express.Router();
const applicantController = require('../controllers/applicantController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/register', applicantController.renderApplicantRegister);
router.post('/register', applicantController.registerApplicant);
router.get('/login', applicantController.renderApplicantLogin);
router.post('/login', applicantController.loginApplicant);
router.get('/test/:test_code', applicantController.renderTestPage);
router.post('/test/:test_code/start', applicantController.startTest);
router.put('/test/:test_code/submit', applicantController.submitTest);
router.get('/test/:test_code/result', applicantController.getTestResult);

// Applicant dashboard (requires applicant authentication)
router.get('/dashboard', applicantController.renderApplicantDashboard);
router.get('/profile', applicantController.renderApplicantProfile);
router.put('/profile', applicantController.updateApplicantProfile);

// Test management for applicants
router.get('/my-tests', applicantController.getMyTests);
router.get('/test-history', applicantController.getTestHistory);
router.post('/test/:test_code/request-retest', applicantController.requestRetest);

// HR and Admin routes (require authentication and appropriate roles)
router.use('/admin', verifyToken, requireRole(['Admin', 'HR']));

// HR Management - Render pages
router.get('/admin/', applicantController.renderApplicantManagement);
router.get('/admin/list', applicantController.renderApplicantList);
router.get('/admin/:applicant_id', applicantController.renderApplicantDetail);
router.get('/admin/:applicant_id/edit', applicantController.renderEditApplicant);
router.get('/admin/tests/create', applicantController.renderCreateApplicantTest);
router.get('/admin/tests/:test_id/edit', applicantController.renderEditApplicantTest);

// Applicant CRUD operations (HR/Admin)
router.get('/admin/api/list', applicantController.getApplicantList);
router.get('/admin/api/:applicant_id', applicantController.getApplicantById);
router.put('/admin/api/:applicant_id', applicantController.updateApplicant);
router.delete('/admin/api/:applicant_id', requireRole(['Admin']), applicantController.deleteApplicant);
router.put('/admin/api/:applicant_id/status', applicantController.updateApplicantStatus);

// Job position management
router.post('/admin/api/positions', applicantController.createJobPosition);
router.get('/admin/api/positions', applicantController.getJobPositions);
router.put('/admin/api/positions/:position_id', applicantController.updateJobPosition);
router.delete('/admin/api/positions/:position_id', requireRole(['Admin']), applicantController.deleteJobPosition);

// Applicant test management
router.post('/admin/api/tests', applicantController.createApplicantTest);
router.get('/admin/api/tests', applicantController.getApplicantTests);
router.put('/admin/api/tests/:test_id', applicantController.updateApplicantTest);
router.delete('/admin/api/tests/:test_id', requireRole(['Admin']), applicantController.deleteApplicantTest);

// Test code management
router.post('/admin/api/test-codes', applicantController.generateTestCode);
router.get('/admin/api/test-codes', applicantController.getTestCodes);
router.put('/admin/api/test-codes/:code_id/activate', applicantController.activateTestCode);
router.put('/admin/api/test-codes/:code_id/deactivate', applicantController.deactivateTestCode);
router.delete('/admin/api/test-codes/:code_id', applicantController.deleteTestCode);

// Applicant assignment and scheduling
router.post('/admin/api/:applicant_id/assign-test', applicantController.assignTestToApplicant);
router.delete('/admin/api/:applicant_id/unassign-test/:assignment_id', applicantController.unassignTest);
router.put('/admin/api/:applicant_id/schedule-test', applicantController.scheduleTest);
router.get('/admin/api/:applicant_id/assignments', applicantController.getApplicantAssignments);

// Test results and evaluation
router.get('/admin/api/:applicant_id/results', applicantController.getApplicantResults);
router.get('/admin/api/test-results/:result_id', applicantController.getTestResultDetail);
router.put('/admin/api/test-results/:result_id/evaluate', applicantController.evaluateTestResult);
router.post('/admin/api/:applicant_id/interview-notes', applicantController.addInterviewNotes);

// Applicant ranking and scoring
router.get('/admin/api/rankings/:position_id', applicantController.getApplicantRankings);
router.put('/admin/api/:applicant_id/score', applicantController.updateApplicantScore);
router.post('/admin/api/:applicant_id/rating', applicantController.rateApplicant);
router.get('/admin/api/:applicant_id/comparison', applicantController.compareApplicants);

// Communication and notifications
router.post('/admin/api/:applicant_id/notify', applicantController.sendNotification);
router.get('/admin/api/:applicant_id/communications', applicantController.getCommunicationHistory);
router.post('/admin/api/:applicant_id/email', applicantController.sendEmail);
router.post('/admin/api/bulk-notify', applicantController.bulkSendNotifications);

// Applicant search and filtering
router.get('/admin/api/search', applicantController.searchApplicants);
router.get('/admin/api/filter', applicantController.filterApplicants);
router.get('/admin/api/by-position/:position_id', applicantController.getApplicantsByPosition);
router.get('/admin/api/by-status/:status', applicantController.getApplicantsByStatus);

// Reports and analytics
router.get('/admin/api/analytics', applicantController.getApplicantAnalytics);
router.get('/admin/api/reports/summary', applicantController.getApplicationSummary);
router.get('/admin/api/reports/position-stats', applicantController.getPositionStatistics);
router.get('/admin/api/reports/test-performance', applicantController.getTestPerformanceReport);

// Security and monitoring
router.get('/admin/api/:applicant_id/security-logs', applicantController.getSecurityLogs);
router.get('/admin/api/suspicious-activities', applicantController.getSuspiciousActivities);
router.put('/admin/api/:applicant_id/flag', applicantController.flagApplicant);
router.get('/admin/api/flagged-applicants', applicantController.getFlaggedApplicants);

// Bulk operations
router.post('/admin/api/bulk-import', requireRole(['Admin']), applicantController.bulkImportApplicants);
router.post('/admin/api/bulk-assign-tests', applicantController.bulkAssignTests);
router.post('/admin/api/bulk-update-status', applicantController.bulkUpdateStatus);
router.get('/admin/api/export', applicantController.exportApplicants);

// Application workflow
router.put('/admin/api/:applicant_id/advance-stage', applicantController.advanceToNextStage);
router.put('/admin/api/:applicant_id/reject', applicantController.rejectApplicant);
router.put('/admin/api/:applicant_id/hire', applicantController.hireApplicant);
router.get('/admin/api/:applicant_id/workflow-history', applicantController.getWorkflowHistory);

// Document management
router.post('/admin/api/:applicant_id/documents', applicantController.uploadDocument);
router.get('/admin/api/:applicant_id/documents', applicantController.getApplicantDocuments);
router.delete('/admin/api/:applicant_id/documents/:document_id', applicantController.deleteDocument);
router.get('/admin/api/documents/:document_id/download', applicantController.downloadDocument);

// Interview management
router.post('/admin/api/:applicant_id/interviews', applicantController.scheduleInterview);
router.get('/admin/api/:applicant_id/interviews', applicantController.getApplicantInterviews);
router.put('/admin/api/interviews/:interview_id', applicantController.updateInterview);
router.post('/admin/api/interviews/:interview_id/feedback', applicantController.addInterviewFeedback);

// Compliance and audit
router.get('/admin/api/audit-logs', requireRole(['Admin']), applicantController.getAuditLogs);
router.get('/admin/api/compliance-report', requireRole(['Admin']), applicantController.getComplianceReport);
router.post('/admin/api/gdpr-export/:applicant_id', requireRole(['Admin']), applicantController.exportGDPRData);
router.delete('/admin/api/gdpr-delete/:applicant_id', requireRole(['Admin']), applicantController.deleteGDPRData);

module.exports = router;