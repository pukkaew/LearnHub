const express = require('express');
const router = express.Router();
const chapterController = require('../controllers/chapterController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all chapter routes
router.use(authMiddleware.requireAuth);

// Render chapter management page for a course
router.get('/courses/:course_id/chapters',
    authMiddleware.requireRole(['Admin', 'Instructor', 'HR']),
    chapterController.renderChapterManagement
);

// API endpoints - Chapter CRUD operations
router.get('/api/courses/:course_id/chapters', chapterController.getChaptersByCourse);
router.get('/api/chapters/:chapter_id', chapterController.getChapterById);
router.post('/api/chapters',
    authMiddleware.requireRole(['Admin', 'Instructor', 'HR']),
    chapterController.createChapter
);
router.put('/api/chapters/:chapter_id',
    authMiddleware.requireRole(['Admin', 'Instructor', 'HR']),
    chapterController.updateChapter
);
router.delete('/api/chapters/:chapter_id',
    authMiddleware.requireRole(['Admin', 'Instructor']),
    chapterController.deleteChapter
);

// Reorder chapters
router.put('/api/courses/:course_id/chapters/reorder',
    authMiddleware.requireRole(['Admin', 'Instructor', 'HR']),
    chapterController.reorderChapters
);

module.exports = router;
