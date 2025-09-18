const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Apply authentication to all course routes
router.use(verifyToken);

// Render pages
router.get('/', courseController.renderCourseList);
router.get('/create', requireRole(['Admin', 'Instructor']), courseController.renderCreateCourse);
router.get('/edit/:course_id', requireRole(['Admin', 'Instructor']), courseController.renderEditCourse);
router.get('/:course_id', courseController.renderCourseDetail);
router.get('/:course_id/content', courseController.renderCourseContent);
router.get('/:course_id/progress', courseController.renderCourseProgress);
router.get('/:course_id/analytics', requireRole(['Admin', 'Instructor']), courseController.renderCourseAnalytics);

// API endpoints - Course CRUD operations
router.post('/', requireRole(['Admin', 'Instructor']), courseController.createCourse);
router.get('/api/list', courseController.getCourseList);
router.get('/api/:course_id', courseController.getCourseById);
router.put('/api/:course_id', requireRole(['Admin', 'Instructor']), courseController.updateCourse);
router.delete('/api/:course_id', requireRole(['Admin']), courseController.deleteCourse);

// Course enrollment management
router.post('/api/:course_id/enroll', courseController.enrollInCourse);
router.delete('/api/:course_id/unenroll', courseController.unenrollFromCourse);
router.get('/api/:course_id/enrollments', requireRole(['Admin', 'Instructor']), courseController.getCourseEnrollments);
router.put('/api/:course_id/enrollments/:enrollment_id/status', requireRole(['Admin', 'Instructor']), courseController.updateEnrollmentStatus);

// Course content management
router.post('/api/:course_id/materials', requireRole(['Admin', 'Instructor']), courseController.addCourseMaterial);
router.get('/api/:course_id/materials', courseController.getCourseMaterials);
router.put('/api/:course_id/materials/:material_id', requireRole(['Admin', 'Instructor']), courseController.updateCourseMaterial);
router.delete('/api/:course_id/materials/:material_id', requireRole(['Admin', 'Instructor']), courseController.deleteCourseMaterial);

// Course progress tracking
router.get('/api/:course_id/progress', courseController.getCourseProgress);
router.put('/api/:course_id/progress/:material_id', courseController.updateMaterialProgress);
router.post('/api/:course_id/complete', courseController.completeCourse);
router.get('/api/:course_id/completion-certificate', courseController.getCompletionCertificate);

// Course prerequisites
router.get('/api/:course_id/prerequisites', courseController.getCoursePrerequisites);
router.post('/api/:course_id/prerequisites', requireRole(['Admin', 'Instructor']), courseController.addCoursePrerequisite);
router.delete('/api/:course_id/prerequisites/:prerequisite_id', requireRole(['Admin', 'Instructor']), courseController.removeCoursePrerequisite);

// Course categories and tags
router.get('/api/categories', courseController.getCourseCategories);
router.get('/api/categories/:category_id/courses', courseController.getCoursesByCategory);
router.put('/api/:course_id/category', requireRole(['Admin', 'Instructor']), courseController.updateCourseCategory);

// Course search and filtering
router.get('/api/search', courseController.searchCourses);
router.get('/api/filter', courseController.filterCourses);
router.get('/api/recommended', courseController.getRecommendedCourses);

// Course ratings and reviews
router.post('/api/:course_id/rate', courseController.rateCourse);
router.get('/api/:course_id/ratings', courseController.getCourseRatings);
router.post('/api/:course_id/review', courseController.addCourseReview);
router.get('/api/:course_id/reviews', courseController.getCourseReviews);

// Course statistics and analytics
router.get('/api/:course_id/stats', requireRole(['Admin', 'Instructor']), courseController.getCourseStats);
router.get('/api/:course_id/analytics', requireRole(['Admin', 'Instructor']), courseController.getCourseAnalytics);
router.get('/api/:course_id/completion-rate', requireRole(['Admin', 'Instructor']), courseController.getCompletionRate);
router.get('/api/:course_id/time-analytics', requireRole(['Admin', 'Instructor']), courseController.getTimeAnalytics);

// Course announcements
router.post('/api/:course_id/announcements', requireRole(['Admin', 'Instructor']), courseController.createAnnouncement);
router.get('/api/:course_id/announcements', courseController.getCourseAnnouncements);
router.put('/api/:course_id/announcements/:announcement_id', requireRole(['Admin', 'Instructor']), courseController.updateAnnouncement);
router.delete('/api/:course_id/announcements/:announcement_id', requireRole(['Admin', 'Instructor']), courseController.deleteAnnouncement);

// Course discussions/forums
router.post('/api/:course_id/discussions', courseController.createDiscussion);
router.get('/api/:course_id/discussions', courseController.getCourseDiscussions);
router.post('/api/:course_id/discussions/:discussion_id/reply', courseController.replyToDiscussion);
router.get('/api/:course_id/discussions/:discussion_id', courseController.getDiscussionDetail);

// Course publishing and status
router.put('/api/:course_id/publish', requireRole(['Admin', 'Instructor']), courseController.publishCourse);
router.put('/api/:course_id/unpublish', requireRole(['Admin', 'Instructor']), courseController.unpublishCourse);
router.put('/api/:course_id/status', requireRole(['Admin']), courseController.updateCourseStatus);

// Bulk operations
router.post('/api/bulk-enroll', requireRole(['Admin', 'HR']), courseController.bulkEnrollUsers);
router.post('/api/bulk-import', requireRole(['Admin']), courseController.bulkImportCourses);
router.get('/api/export', requireRole(['Admin']), courseController.exportCourses);

// My courses (learner view)
router.get('/api/my-courses', courseController.getMyCourses);
router.get('/api/my-courses/completed', courseController.getMyCompletedCourses);
router.get('/api/my-courses/in-progress', courseController.getMyInProgressCourses);
router.get('/api/my-courses/certificates', courseController.getMyCertificates);

// Instructor specific routes
router.get('/api/instructor/courses', requireRole(['Instructor']), courseController.getInstructorCourses);
router.get('/api/instructor/students', requireRole(['Instructor']), courseController.getInstructorStudents);
router.get('/api/instructor/analytics', requireRole(['Instructor']), courseController.getInstructorAnalytics);

module.exports = router;