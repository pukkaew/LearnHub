const { poolPromise, sql } = require('./config/database');

async function cleanCoursesAndTests() {
    try {
        const pool = await poolPromise;

        console.log('🧹 Starting cleanup of Courses and Tests data...\n');

        // Helper function to safely delete from table
        async function safeDelete(tableName) {
            try {
                const result = await pool.request().query(`DELETE FROM ${tableName}`);
                console.log(`   ✓ ${tableName}: Deleted ${result.rowsAffected[0]} records`);
                return result.rowsAffected[0];
            } catch (e) {
                if (e.message.includes('Invalid object name')) {
                    console.log(`   - ${tableName}: Table not found (skipped)`);
                } else {
                    console.log(`   ✗ ${tableName}: ${e.message}`);
                }
                return 0;
            }
        }

        // 0. Delete user progress/enrollment data first (has FK to courses)
        console.log('Deleting user enrollment/progress data...');
        await safeDelete('user_material_progress');
        await safeDelete('user_courses');
        await safeDelete('UserCourses');
        await safeDelete('user_course_progress');
        await safeDelete('UserCourseProgress');
        await safeDelete('enrollments');
        await safeDelete('Enrollments');
        await safeDelete('course_enrollments');
        await safeDelete('CourseEnrollments');

        // 1. Delete test-related data
        console.log('\nDeleting test-related data...');
        await safeDelete('TestAttempts');
        await safeDelete('test_attempts');
        await safeDelete('QuestionOptions');
        await safeDelete('question_options');
        await safeDelete('Questions');
        await safeDelete('questions');
        await safeDelete('Tests');
        await safeDelete('tests');

        // 2. Delete course-related data
        console.log('\nDeleting course-related data...');
        await safeDelete('CourseMaterials');
        await safeDelete('course_materials');
        await safeDelete('Lessons');
        await safeDelete('lessons');
        await safeDelete('Chapters');
        await safeDelete('chapters');
        await safeDelete('CourseProgress');
        await safeDelete('course_progress');
        await safeDelete('Courses');
        await safeDelete('courses');

        // 3. Reset identity seeds
        console.log('\n🔄 Resetting identity seeds...');

        const tables = ['user_material_progress', 'user_courses', 'TestAttempts', 'QuestionOptions',
                       'Questions', 'questions', 'Tests', 'tests',
                       'course_materials', 'Lessons', 'lessons',
                       'Chapters', 'chapters', 'Courses', 'courses'];

        for (const table of tables) {
            try {
                await pool.request().query(`DBCC CHECKIDENT ('${table}', RESEED, 0)`);
                console.log(`   ✓ Reset ${table} identity`);
            } catch (e) {
                // Table might not have identity column or doesn't exist
            }
        }

        console.log('\n✅ Cleanup completed successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

cleanCoursesAndTests();
