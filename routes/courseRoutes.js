const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const materialProgressController = require('../controllers/materialProgressController');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');

// Apply authentication to all course routes
router.use(authMiddleware.requireAuth);

// Render pages - IMPORTANT: Static routes MUST come before dynamic routes
router.get('/', courseController.renderCoursesList);
router.get('/my-courses', courseController.renderMyCourses);
router.get('/create', authMiddleware.requireRole(['Admin', 'Instructor', 'HR']), courseController.renderCreateCourse);
router.get('/categories', authMiddleware.requireRole(['Admin']), courseController.renderCategoryManagement);
router.get('/:course_id/edit', authMiddleware.requireRole(['Admin', 'Instructor', 'HR']), courseController.renderEditCourse);
router.get('/:course_id/content', courseController.renderCourseContent);
router.get('/:course_id', courseController.renderCourseDetail);

// API endpoints - Course CRUD operations (IMPORTANT: Static routes MUST come before dynamic routes)
router.get('/api/all', courseController.getAllCourses);
router.get('/api/list', courseController.getAllCourses);  // Alias for /api/all
router.get('/api/my-courses', courseController.getMyEnrollments);
router.get('/api/categories', courseController.getCategories);
router.get('/api/instructors', courseController.getInstructors);
router.get('/api/recommended', courseController.getRecommendedCourses);
router.get('/api/popular', courseController.getPopularCourses);
router.get('/api/target-positions', courseController.getTargetPositions);
router.get('/api/target-departments', courseController.getTargetDepartments);
router.post('/api/create', authMiddleware.requireRole(['Admin', 'Instructor', 'HR']), validationMiddleware.validateCourseCreation(), courseController.createCourse);

// Dynamic routes MUST come after static routes
router.get('/api/:course_id', courseController.getCourseById);
router.put('/api/:course_id', authMiddleware.requireRole(['Admin', 'Instructor', 'HR']), courseController.updateCourse);
router.delete('/api/:course_id', authMiddleware.requireRole(['Admin']), courseController.deleteCourse);

// Course enrollment management (using existing functions)
router.post('/api/:course_id/enroll', courseController.enrollInCourse);
router.put('/api/:course_id/progress', courseController.updateProgress);

// Course statistics (using existing functions)
router.get('/api/:course_id/statistics', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.getCourseStatistics);

// Course analytics
router.get('/api/:course_id/analytics', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.getAnalytics);
router.get('/api/:course_id/analytics/export', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.exportAnalytics);

// Course detail additional endpoints
router.get('/api/:course_id/curriculum', courseController.getCourseCurriculum);
router.get('/api/:course_id/materials', courseController.getCourseMaterials);
router.post('/api/:course_id/materials', authMiddleware.requireRole(['Admin', 'Instructor', 'HR']), courseController.uploadCourseMaterials);

// Material progress tracking (user-specific)
router.get('/api/:course_id/materials/progress', materialProgressController.getMaterialProgress);
router.post('/api/:course_id/materials/:material_id/complete', materialProgressController.markMaterialComplete);

router.get('/api/:course_id/discussions', courseController.getCourseDiscussions);
router.get('/api/:course_id/reviews', courseController.getCourseReviews);
router.post('/api/:course_id/reviews', courseController.submitCourseReview);
router.get('/api/:course_id/related', courseController.getRelatedCourses);
router.post('/api/:course_id/rate', courseController.rateCourse);

// Course progress tracking
router.get('/api/:course_id/progress', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.getCourseProgress);
router.get('/api/:course_id/progress/export', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.exportProgress);

// Category Management (Admin Only)
router.get('/api/categories-admin/all', authMiddleware.requireRole(['Admin']), courseController.getAllCategoriesAdmin);
router.get('/api/categories-admin/:category_id', authMiddleware.requireRole(['Admin']), courseController.getCategoryByIdAdmin);
router.post('/api/categories-admin', authMiddleware.requireRole(['Admin']), courseController.createCategoryAdmin);
router.put('/api/categories-admin/:category_id', authMiddleware.requireRole(['Admin']), courseController.updateCategoryAdmin);
router.delete('/api/categories-admin/:category_id', authMiddleware.requireRole(['Admin']), courseController.deleteCategoryAdmin);

// Get available tests for course creation
router.get('/api/tests/available', courseController.getAvailableTests);

// File Upload for Courses
router.post('/api/upload/image', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.uploadCourseImage);

module.exports = router;