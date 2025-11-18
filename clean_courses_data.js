const { poolPromise, sql } = require('./config/database');

async function cleanCoursesData() {
    try {
        console.log('🧹 Starting to clean all courses data...\n');

        const pool = await poolPromise;

        // 1. ลบข้อมูล user_courses (enrollments)
        console.log('1️⃣ Deleting user courses (enrollments)...');
        const enrollmentResult = await pool.request().query(`
            DELETE FROM user_courses WHERE course_id IN (SELECT course_id FROM courses)
        `);
        console.log(`   ✅ Deleted ${enrollmentResult.rowsAffected[0]} enrollments\n`);

        // 2. ลบข้อมูล test_results ที่เกี่ยวข้องกับ tests ของ courses
        console.log('2️⃣ Deleting test results...');
        const testResultsResult = await pool.request().query(`
            DELETE FROM test_results WHERE test_id IN (
                SELECT test_id FROM tests WHERE course_id IN (SELECT course_id FROM courses)
            )
        `);
        console.log(`   ✅ Deleted ${testResultsResult.rowsAffected[0]} test results\n`);

        // 3. ลบข้อมูล test_questions ที่เกี่ยวข้องกับ tests ของ courses
        console.log('3️⃣ Deleting test questions...');
        const testQuestionsResult = await pool.request().query(`
            DELETE FROM test_questions WHERE test_id IN (
                SELECT test_id FROM tests WHERE course_id IN (SELECT course_id FROM courses)
            )
        `);
        console.log(`   ✅ Deleted ${testQuestionsResult.rowsAffected[0]} test questions\n`);

        // 4. ลบข้อมูล tests ที่เกี่ยวข้องกับ courses
        console.log('4️⃣ Deleting tests...');
        const testsResult = await pool.request().query(`
            DELETE FROM tests WHERE course_id IN (SELECT course_id FROM courses)
        `);
        console.log(`   ✅ Deleted ${testsResult.rowsAffected[0]} tests\n`);

        // 5. ลบข้อมูล course_materials
        console.log('5️⃣ Deleting course materials...');
        const materialsResult = await pool.request().query(`
            DELETE FROM course_materials WHERE course_id IN (SELECT course_id FROM courses)
        `);
        console.log(`   ✅ Deleted ${materialsResult.rowsAffected[0]} materials\n`);

        // 6. ลบข้อมูล user_activities ที่เกี่ยวข้องกับ courses
        console.log('6️⃣ Deleting course-related activities...');
        try {
            const activitiesResult = await pool.request().query(`
                DELETE FROM user_activities
                WHERE table_name = 'courses'
                OR description LIKE '%course%'
            `);
            console.log(`   ✅ Deleted ${activitiesResult.rowsAffected[0]} activities\n`);
        } catch (error) {
            console.log('   ⚠️ Skipped activities (column may not exist)\n');
        }

        // 7. ลบข้อมูล courses
        console.log('7️⃣ Deleting all courses...');
        const coursesResult = await pool.request().query(`
            DELETE FROM courses
        `);
        console.log(`   ✅ Deleted ${coursesResult.rowsAffected[0]} courses\n`);

        // 8. Reset Identity (Auto-increment) - ถ้าต้องการให้ course_id เริ่มจาก 1 ใหม่
        console.log('🔄 Resetting course_id identity...');
        try {
            await pool.request().query(`
                DBCC CHECKIDENT ('courses', RESEED, 0)
            `);
            console.log('   ✅ Identity reset successfully\n');
        } catch (error) {
            console.log('   ⚠️ Could not reset identity (table might be referenced)\n');
        }

        console.log('✨ All courses data cleaned successfully!');
        console.log('═══════════════════════════════════════');
        console.log('📊 Summary:');
        console.log(`   • User Courses: ${enrollmentResult.rowsAffected[0]}`);
        console.log(`   • Test Results: ${testResultsResult.rowsAffected[0]}`);
        console.log(`   • Test Questions: ${testQuestionsResult.rowsAffected[0]}`);
        console.log(`   • Tests: ${testsResult.rowsAffected[0]}`);
        console.log(`   • Materials: ${materialsResult.rowsAffected[0]}`);
        console.log(`   • Courses: ${coursesResult.rowsAffected[0]}`);
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error cleaning courses data:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Run the cleaning script
cleanCoursesData();
