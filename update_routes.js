const fs = require('fs');

const filePath = 'D:/App/LearnHub/routes/courseRoutes.js';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `router.get('/api/:course_id/reviews', courseController.getCourseReviews);
router.get('/api/:course_id/related', courseController.getRelatedCourses);`;

const newCode = `router.get('/api/:course_id/reviews', courseController.getCourseReviews);
router.post('/api/:course_id/reviews', courseController.submitReview);
router.get('/api/:course_id/user-review', courseController.getUserReview);
router.get('/api/:course_id/related', courseController.getRelatedCourses);`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Added submitReview and getUserReview routes');
} else {
    console.log('❌ Could not find the route pattern');
    console.log('Checking if routes already exist...');
    if (content.includes('submitReview')) {
        console.log('submitReview route already exists');
    }
}
