// Test the courses API endpoint
const { poolPromise, sql } = require('./config/database');
const Course = require('./models/Course');

async function testCoursesAPI() {
    try {
        console.log('\n=== Testing Courses API ===\n');

        // Test Course.findAll()
        console.log('1. Testing Course.findAll():');
        const result = await Course.findAll(1, 12, {});

        console.log(`Total courses: ${result.total}`);
        console.log(`Total pages: ${result.totalPages}`);
        console.log(`Current page: ${result.page}`);
        console.log(`Courses returned: ${result.data.length}\n`);

        if (result.data.length > 0) {
            const firstCourse = result.data[0];
            console.log('First course data:');
            console.log({
                course_id: firstCourse.course_id,
                title: firstCourse.title,
                description: firstCourse.description ? firstCourse.description.substring(0, 50) + '...' : null,
                category: firstCourse.category,
                category_name: firstCourse.category_name,
                difficulty_level: firstCourse.difficulty_level,
                instructor_id: firstCourse.instructor_id,
                instructor_name: firstCourse.instructor_name,
                thumbnail: firstCourse.thumbnail,
                duration_hours: firstCourse.duration_hours,
                price: firstCourse.price,
                is_free: firstCourse.is_free,
                status: firstCourse.status,
                enrolled_count: firstCourse.enrolled_count,
                created_at: firstCourse.created_at
            });

            console.log('\n2. Checking for missing fields:');
            const requiredFields = [
                'course_id', 'title', 'description', 'category_name',
                'difficulty_level', 'instructor_name', 'duration_hours'
            ];

            const missingFields = requiredFields.filter(field => !firstCourse[field]);
            if (missingFields.length > 0) {
                console.log('❌ Missing fields:', missingFields);
            } else {
                console.log('✅ All required fields present');
            }

            // Check all courses for consistency
            console.log('\n3. Summary of all courses:');
            console.table(result.data.map(c => ({
                id: c.course_id,
                title: c.title,
                category: c.category_name || c.category,
                difficulty: c.difficulty_level,
                instructor: c.instructor_name,
                duration: c.duration_hours,
                thumbnail: c.thumbnail ? 'Yes' : 'No',
                enrolled: c.enrolled_count
            })));
        }

        console.log('\n=== Test Complete ===\n');
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testCoursesAPI();
