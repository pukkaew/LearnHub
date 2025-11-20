const express = require('express');
const router = express.Router();
const questionBankController = require('../controllers/questionBankController');
const authMiddleware = require('../middleware/auth');

/**
 * Question Bank Routes
 * All routes require authentication
 * Some routes require instructor or admin role
 */

// ========================================
// View Routes (Render HTML Pages)
// ========================================

/**
 * Show question bank management page for a course
 * GET /courses/:courseId/questions
 * Requires: Instructor or Admin
 */
router.get(
    '/courses/:courseId/questions',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.showQuestionBank
);

/**
 * Show create question form
 * GET /courses/:courseId/questions/create
 * Requires: Instructor or Admin
 */
router.get(
    '/courses/:courseId/questions/create',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.showCreateForm
);

/**
 * Show edit question form
 * GET /courses/:courseId/questions/:questionId/edit
 * Requires: Instructor or Admin (owner of question)
 */
router.get(
    '/courses/:courseId/questions/:questionId/edit',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.showEditForm
);

/**
 * Show question detail
 * GET /courses/:courseId/questions/:questionId
 * Requires: Instructor or Admin
 */
router.get(
    '/courses/:courseId/questions/:questionId',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.showDetail
);

// ========================================
// API Routes (JSON Responses)
// ========================================

/**
 * Get all questions for a course (with filters)
 * GET /api/courses/:courseId/questions
 * Requires: Instructor or Admin
 */
router.get(
    '/api/courses/:courseId/questions',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.getQuestions
);

/**
 * Get question by ID
 * GET /api/questions/:questionId
 * Requires: Instructor or Admin
 */
router.get(
    '/api/questions/:questionId',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.getQuestionById
);

/**
 * Create new question
 * POST /api/courses/:courseId/questions
 * Requires: Instructor or Admin
 */
router.post(
    '/api/courses/:courseId/questions',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.createQuestion
);

/**
 * Update question
 * PUT /api/questions/:questionId
 * Requires: Instructor or Admin (owner of question)
 */
router.put(
    '/api/questions/:questionId',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.updateQuestion
);

/**
 * Delete question (soft delete)
 * DELETE /api/questions/:questionId
 * Requires: Instructor or Admin (owner of question)
 */
router.delete(
    '/api/questions/:questionId',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.deleteQuestion
);

/**
 * Duplicate question
 * POST /api/questions/:questionId/duplicate
 * Requires: Instructor or Admin
 */
router.post(
    '/api/questions/:questionId/duplicate',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.duplicateQuestion
);

/**
 * Get random questions for test generation
 * POST /api/courses/:courseId/questions/random
 * Requires: Instructor or Admin
 */
router.post(
    '/api/courses/:courseId/questions/random',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.getRandomQuestions
);

/**
 * Get question bank statistics
 * GET /api/courses/:courseId/questions/statistics
 * Requires: Instructor or Admin
 */
router.get(
    '/api/courses/:courseId/questions/statistics',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.getStatistics
);

/**
 * Verify question (Admin only)
 * POST /api/questions/:questionId/verify
 * Requires: Admin
 */
router.post(
    '/api/questions/:questionId/verify',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin']),
    questionBankController.verifyQuestion
);

/**
 * Bulk import questions
 * POST /api/courses/:courseId/questions/bulk-import
 * Requires: Instructor or Admin
 */
router.post(
    '/api/courses/:courseId/questions/bulk-import',
    authMiddleware.requireAuth,
    authMiddleware.requireRole(['Admin', 'Instructor']),
    questionBankController.bulkImport
);

module.exports = router;
