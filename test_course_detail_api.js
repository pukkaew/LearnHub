// Test script to check course detail API
const { poolPromise, sql } = require('./config/database');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');

async function testCourseDetailAPI() {
    try {
        const courseId = 7;
        const userId = 17; // Admin user

        console.log('\n=== Testing Course Detail API for course_id =', courseId, '===\n');

        // Test 1: Call Course.findById
        console.log('1. Testing Course.findById...');
        try {
            const course = await Course.findById(courseId);
            console.log('✅ Course.findById SUCCESS');
            console.log('Course title:', course.title);
            console.log('Instructor:', course.instructor_name);
            console.log('Category:', course.category_name);
            console.log('Duration:', course.duration_hours, 'hours');
            console.log('Enrolled count:', course.enrolled_count);
            console.log('Instructor avatar:', course.instructor_avatar);
            console.log('Learning objectives:', course.learning_objectives);
            console.log('Rating:', course.rating);
        } catch (error) {
            console.error('❌ Course.findById FAILED:', error.message);
            console.error('Error stack:', error.stack);
        }

        // Test 2: Call Enrollment.findByUserAndCourse
        console.log('\n2. Testing Enrollment.findByUserAndCourse...');
        try {
            const enrollment = await Enrollment.findByUserAndCourse(userId, courseId);
            console.log('✅ Enrollment.findByUserAndCourse SUCCESS');
            if (enrollment) {
                console.log('Enrollment status:', enrollment.completion_status || enrollment.status);
                console.log('Progress:', enrollment.progress_percentage || enrollment.progress);
            } else {
                console.log('No enrollment found (user not enrolled)');
            }
        } catch (error) {
            console.error('❌ Enrollment.findByUserAndCourse FAILED:', error.message);
        }

        // Test 3: Check if Enrollment.findByUser exists
        console.log('\n3. Testing Enrollment.findByUser...');
        console.log('typeof Enrollment.findByUser:', typeof Enrollment.findByUser);
        if (typeof Enrollment.findByUser === 'function') {
            console.log('✅ Enrollment.findByUser EXISTS');
        } else {
            console.error('❌ Enrollment.findByUser DOES NOT EXIST');
        }

        console.log('\n=== Test Complete ===\n');
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

testCourseDetailAPI();
