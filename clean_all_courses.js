const {poolPromise} = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        console.log('\n🧹 CLEAN ALL COURSES DATA');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Count before deletion
        const beforeCount = await pool.request().query('SELECT COUNT(*) as count FROM courses');
        console.log(`📊 Current courses count: ${beforeCount.recordset[0].count}`);

        if (beforeCount.recordset[0].count === 0) {
            console.log('\n✅ Database is already clean - no courses to delete');
            process.exit(0);
        }

        console.log('\n⚠️  WARNING: This will delete ALL course-related data:');
        console.log('  - All courses');
        console.log('  - All enrollments');
        console.log('  - All lessons');
        console.log('  - All materials');
        console.log('  - All course reviews');
        console.log('  - All course progress');
        console.log('  - All related data');
        console.log('\n🔥 This action CANNOT be undone!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Delete in correct order (child tables first)
        console.log('🗑️  Deleting course-related data...\n');

        // 1. Delete course reviews
        try {
            const result = await pool.request().query('DELETE FROM CourseReviews');
            console.log(`  ✅ Deleted ${result.rowsAffected[0]} course reviews`);
        } catch (e) {
            console.log(`  ⚠️  CourseReviews: ${e.message}`);
        }

        // 2. Delete course materials
        try {
            const result = await pool.request().query('DELETE FROM course_materials');
            console.log(`  ✅ Deleted ${result.rowsAffected[0]} materials`);
        } catch (e) {
            console.log(`  ⚠️  Materials: ${e.message}`);
        }

        // 3. Delete lessons
        try {
            const result = await pool.request().query('DELETE FROM Lessons');
            console.log(`  ✅ Deleted ${result.rowsAffected[0]} lessons`);
        } catch (e) {
            console.log(`  ⚠️  Lessons: ${e.message}`);
        }

        // 4. Delete enrollments
        try {
            const result = await pool.request().query('DELETE FROM Enrollments');
            console.log(`  ✅ Deleted ${result.rowsAffected[0]} enrollments`);
        } catch (e) {
            console.log(`  ⚠️  Enrollments: ${e.message}`);
        }

        // 5. Delete course progress
        try {
            const result = await pool.request().query('DELETE FROM CourseProgress');
            console.log(`  ✅ Deleted ${result.rowsAffected[0]} progress records`);
        } catch (e) {
            console.log(`  ⚠️  CourseProgress: ${e.message}`);
        }

        // 6. Delete course discussions
        try {
            const result = await pool.request().query('DELETE FROM CourseDiscussions');
            console.log(`  ✅ Deleted ${result.rowsAffected[0]} discussions`);
        } catch (e) {
            console.log(`  ⚠️  CourseDiscussions: ${e.message}`);
        }

        // 7. Finally, delete courses
        const coursesResult = await pool.request().query('DELETE FROM courses');
        console.log(`  ✅ Deleted ${coursesResult.rowsAffected[0]} courses`);

        console.log('\n🔄 Resetting identity counters...\n');

        // Reset identity counters
        try {
            await pool.request().query(`DBCC CHECKIDENT ('courses', RESEED, 0)`);
            console.log(`  ✅ Reset courses identity to 0`);
        } catch (e) {
            console.log(`  ⚠️  Could not reset courses identity: ${e.message}`);
        }

        try {
            await pool.request().query(`DBCC CHECKIDENT ('Lessons', RESEED, 0)`);
            console.log(`  ✅ Reset lessons identity to 0`);
        } catch (e) {
            console.log(`  ⚠️  Could not reset lessons identity`);
        }

        try {
            await pool.request().query(`DBCC CHECKIDENT ('course_materials', RESEED, 0)`);
            console.log(`  ✅ Reset materials identity to 0`);
        } catch (e) {
            console.log(`  ⚠️  Could not reset materials identity`);
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ ALL COURSE DATA CLEANED SUCCESSFULLY!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Verify
        const afterCount = await pool.request().query('SELECT COUNT(*) as count FROM courses');
        console.log(`📊 Verification: ${afterCount.recordset[0].count} courses remaining`);

        console.log('\n📝 Next steps:');
        console.log('  1. สร้างคอร์สใหม่ที่: http://localhost:3000/courses/create');
        console.log('  2. ตรวจสอบรายการคอร์สที่: http://localhost:3000/courses\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error cleaning data:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
})();
