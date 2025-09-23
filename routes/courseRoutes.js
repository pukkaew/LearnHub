const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all course routes
router.use(authMiddleware.requireAuth);

// Render pages
router.get('/', courseController.renderCoursesList);
router.get('/my-courses', courseController.renderMyCourses);
router.get('/:course_id', courseController.renderCourseDetail);

// API endpoints - Course CRUD operations (using existing functions)
router.get('/api/all', courseController.getAllCourses);
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

module.exports = router;