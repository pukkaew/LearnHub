require('dotenv').config();
const { sql, poolPromise } = require('./config/database');

async function cleanAllCourses() {
    try {
        const pool = await poolPromise;

        console.log('🧹 Starting to clean all course data...\n');

        // 1. Delete lesson_progress
        console.log('1. Deleting lesson_progress...');
        let result = await pool.request().query('DELETE FROM lesson_progress');
        console.log(`   ✅ Deleted ${result.rowsAffected[0]} records\n`);

        // 2. Delete user material progress
        console.log('2. Deleting user_material_progress...');
        result = await pool.request().query('DELETE FROM user_material_progress');
        console.log(`   ✅ Deleted ${result.rowsAffected[0]} records\n`);

        // 3. Delete course_reviews
        console.log('3. Deleting course_reviews...');
        result = await pool.request().query('DELETE FROM course_reviews');
        console.log(`   ✅ Deleted ${result.rowsAffected[0]} records\n`);

        // 4. Delete user_courses (enrollments)
        console.log('4. Deleting user_courses...');
        result = await pool.request().query('DELETE FROM user_courses');
        console.log(`   ✅ Deleted ${result.rowsAffected[0]} records\n`);

        // 5. Delete course_materials
        console.log('5. Deleting course_materials...');
        result = await pool.request().query('DELETE FROM course_materials');
        console.log(`   ✅ Deleted ${result.rowsAffected[0]} records\n`);

        // 6. Delete tests linked to courses
        console.log('6. Deleting tests linked to courses...');
        result = await pool.request().query('DELETE FROM tests WHERE course_id IS NOT NULL');
        console.log(`   ✅ Deleted ${result.rowsAffected[0]} records\n`);

        // 7. Delete courses
        console.log('7. Deleting courses...');
        result = await pool.request().query('DELETE FROM courses');
        console.log(`   ✅ Deleted ${result.rowsAffected[0]} records\n`);

        // Reset identity seeds
        console.log('8. Resetting identity seeds...');
        await pool.request().query(`
            DBCC CHECKIDENT ('courses', RESEED, 0);
            DBCC CHECKIDENT ('course_materials', RESEED, 0);
        `);
        console.log('   ✅ Identity seeds reset\n');

        console.log('✅ All course data cleaned successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

cleanAllCourses();
