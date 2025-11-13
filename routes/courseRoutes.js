const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all course routes
router.use(authMiddleware.requireAuth);

// Render pages - IMPORTANT: Static routes MUST come before dynamic routes
router.get('/', courseController.renderCoursesList);
router.get('/my-courses', courseController.renderMyCourses);
router.get('/create', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.renderCreateCourse);
router.get('/categories', authMiddleware.requireRole(['Admin']), courseController.renderCategoryManagement);
router.get('/:course_id/edit', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.renderEditCourse);
router.get('/:course_id', courseController.renderCourseDetail);

// API endpoints - Course CRUD operations (using existing functions)
router.get('/api/all', courseController.getAllCourses);
router.get('/api/categories', courseController.getCategories);
router.get('/api/recommended', courseController.getRecommendedCourses);
router.get('/api/popular', courseController.getPopularCourses);
router.get('/api/target-positions', courseController.getTargetPositions);
router.get('/api/target-departments', courseController.getTargetDepartments);
router.get('/api/:course_id', courseController.getCourseById);
router.post('/api/create', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.createCourse);
router.put('/api/:course_id', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.updateCourse);
router.delete('/api/:course_id', authMiddleware.requireRole(['Admin']), courseController.deleteCourse);

// Course enrollment management (using existing functions)
router.post('/api/:course_id/enroll', courseController.enrollInCourse);
router.get('/api/my-enrollments', courseController.getMyEnrollments);
router.put('/api/:course_id/progress', courseController.updateProgress);

// Course statistics (using existing functions)
router.get('/api/:course_id/statistics', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.getCourseStatistics);

// Course analytics
router.get('/api/:course_id/analytics', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.getAnalytics);
router.get('/api/:course_id/analytics/export', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.exportAnalytics);

// Course progress tracking
router.get('/api/:course_id/progress', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.getCourseProgress);
router.get('/api/:course_id/progress/export', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.exportProgress);

// Category Management (Admin Only)
router.get('/api/categories-admin/all', authMiddleware.requireRole(['Admin']), courseController.getAllCategoriesAdmin);
router.get('/api/categories-admin/:category_id', authMiddleware.requireRole(['Admin']), courseController.getCategoryByIdAdmin);
router.post('/api/categories-admin', authMiddleware.requireRole(['Admin']), courseController.createCategoryAdmin);
router.put('/api/categories-admin/:category_id', authMiddleware.requireRole(['Admin']), courseController.updateCategoryAdmin);
router.delete('/api/categories-admin/:category_id', authMiddleware.requireRole(['Admin']), courseController.deleteCategoryAdmin);

module.exports = router;