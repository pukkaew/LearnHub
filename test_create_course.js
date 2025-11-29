// Test script for course creation
const { poolPromise, sql } = require('./config/database');

async function testCourseCreation() {
    console.log('🧪 Starting Course Creation Test...\n');

    const pool = await poolPromise;

    // Get a valid user_id from database
    const userResult = await pool.request().query('SELECT TOP 1 user_id FROM users WHERE is_active = 1');
    const validUserId = userResult.recordset[0]?.user_id;

    if (!validUserId) {
        console.log('❌ No active users found in database');
        process.exit(1);
    }
    console.log('📋 Using user_id:', validUserId);

    // Test data similar to what frontend sends
    const courseData = {
        course_name: 'Test Course Auto ' + Date.now(),
        course_code: 'CRS-TEST-' + Math.floor(Math.random() * 10000),
        category_id: 7,
        difficulty_level: 'Beginner',
        course_type: 'mandatory',
        language: 'th',
        description: 'Test course description',
        learning_objectives: ['Objective 1', 'Objective 2', 'Objective 3'],
        target_positions: ['57'],
        target_departments: ['43'],
        lessons: [
            { title: 'บทที่ 1', duration: 30, description: 'บทเรียนแรก', has_quiz: true },
            { title: 'บทที่ 2', duration: 45, description: 'บทเรียนที่สอง', has_quiz: false },
            { title: 'บทที่ 3', duration: 60, description: 'บทเรียนที่สาม', has_quiz: false }
        ],
        passing_score: null,
        max_attempts: null,
        max_students: null,
        certificate_validity: null,
        created_by: validUserId,
        instructor_id: validUserId
    };

    try {
        // Load Course model
        const Course = require('./models/Course');

        console.log('📋 Course Data:');
        console.log(JSON.stringify(courseData, null, 2));
        console.log('\n');

        // Test course creation
        console.log('🔄 Creating course...');
        const result = await Course.create(courseData);

        if (result.success) {
            console.log('✅ Course created successfully!');
            console.log('   Course ID:', result.data.course_id);

            // Verify the course was created
            const course = await Course.findById(result.data.course_id);
            if (course) {
                console.log('\n📚 Created Course Details:');
                console.log('   Title:', course.title);
                console.log('   Code:', course.course_code);
                console.log('   Category:', course.category);
                console.log('   Type:', course.course_type);
                console.log('   Language:', course.language);
                console.log('   Lessons:', course.lessons?.length || 0);
            }

            // Clean up - delete test course
            console.log('\n🧹 Cleaning up test data...');
            await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query('DELETE FROM course_materials WHERE course_id = @courseId');
            await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query('DELETE FROM tests WHERE course_id = @courseId');
            await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query('DELETE FROM courses WHERE course_id = @courseId');
            console.log('✅ Test data cleaned up');

        } else {
            console.log('❌ Course creation failed!');
            console.log('   Error:', result.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('   Stack:', error.stack);
    }

    process.exit(0);
}

testCourseCreation();
