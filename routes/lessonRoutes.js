const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all lesson routes
router.use(authMiddleware.requireAuth);

// Render lesson management page for a chapter
router.get('/chapters/:chapter_id/lessons',
    authMiddleware.requireRole(['Admin', 'Instructor', 'HR']),
    lessonController.renderLessonManagement
);

// API endpoints - Lesson CRUD operations
router.get('/api/chapters/:chapter_id/lessons', lessonController.getLessonsByChapter);
router.get('/api/lessons/:lesson_id', lessonController.getLessonById);
router.post('/api/lessons',
    authMiddleware.requireRole(['Admin', 'Instructor', 'HR']),
    lessonController.createLesson
);
router.put('/api/lessons/:lesson_id',
    authMiddleware.requireRole(['Admin', 'Instructor', 'HR']),
    lessonController.updateLesson
);
router.delete('/api/lessons/:lesson_id',
    authMiddleware.requireRole(['Admin', 'Instructor']),
    lessonController.deleteLesson
);

// Reorder lessons
router.put('/api/chapters/:chapter_id/lessons/reorder',
    authMiddleware.requireRole(['Admin', 'Instructor', 'HR']),
    lessonController.reorderLessons
);

// ============================================
// Learning Progress Tracking APIs
// ============================================

// Get lesson progress for current user
router.get('/api/lessons/:lesson_id/progress', lessonController.getLessonProgress);

// Track time spent on lesson
router.post('/api/lessons/:lesson_id/track-time', lessonController.trackTime);

// Track video progress
router.post('/api/lessons/:lesson_id/track-video', lessonController.trackVideoProgress);

// Complete lesson (validates all requirements)
router.post('/api/lessons/:lesson_id/complete', lessonController.completeLesson);

// Get learning time summary
router.get('/api/learning-summary', lessonController.getLearningTimeSummary);

module.exports = router;
