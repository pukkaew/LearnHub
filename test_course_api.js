const { poolPromise } = require('./config/database');
const Course = require('./models/Course');

async function testCourseAPI() {
    try {
        console.log('Testing Course.findById(1)...\n');

        const course = await Course.findById(1);

        console.log('Course data:');
        console.log('- course_id:', course.course_id);
        console.log('- title:', course.title);
        console.log('- instructor_id:', course.instructor_id);
        console.log('- instructor_name:', course.instructor_name);
        console.log('- instructor_title:', course.instructor_title);
        console.log('- instructor_email:', course.instructor_email);
        console.log('- instructor_image:', course.instructor_image);
        console.log('- instructor_avatar:', course.instructor_avatar);
        console.log('- instructor_bio:', course.instructor_bio);
        console.log('- category:', course.category);
        console.log('- category_name:', course.category_name);
        console.log('- difficulty_level:', course.difficulty_level);
        console.log('- description:', course.description);
        console.log('- learning_objectives:', course.learning_objectives);
        console.log('- prerequisites_text:', course.prerequisites_text);
        console.log('- enrolled_count:', course.enrolled_count);
        console.log('- lessons count:', course.lessons ? course.lessons.length : 0);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testCourseAPI();
