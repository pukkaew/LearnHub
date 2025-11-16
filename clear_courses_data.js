const { poolPromise } = require('./config/database');

async function clearCoursesData() {
    try {
        console.log('🗑️  Starting to clear courses data...\n');

        const pool = await poolPromise;

        // Step 1: Check current data
        console.log('📊 Current data count:');

        const coursesCount = await pool.request().query('SELECT COUNT(*) as count FROM courses');
        console.log(`   Courses: ${coursesCount.recordset[0].count}`);

        const enrollmentsCount = await pool.request().query('SELECT COUNT(*) as count FROM user_courses');
        console.log(`   Enrollments: ${enrollmentsCount.recordset[0].count}`);

        const materialsCount = await pool.request().query('SELECT COUNT(*) as count FROM course_materials');
        console.log(`   Course Materials: ${materialsCount.recordset[0].count}`);

        console.log('\n⚠️  WARNING: This will delete ALL courses and related data!');
        console.log('    Proceeding in 2 seconds...\n');

        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Delete related data first (to avoid foreign key constraints)
        console.log('🗑️  Deleting enrollments...');
        const deleteEnrollments = await pool.request().query('DELETE FROM user_courses');
        console.log(`   ✅ Deleted ${deleteEnrollments.rowsAffected[0]} enrollments`);

        console.log('\n🗑️  Deleting course materials...');
        const deleteMaterials = await pool.request().query('DELETE FROM course_materials');
        console.log(`   ✅ Deleted ${deleteMaterials.rowsAffected[0]} course materials`);

        // Step 3: Delete courses
        console.log('\n🗑️  Deleting courses...');
        const deleteCourses = await pool.request().query('DELETE FROM courses');
        console.log(`   ✅ Deleted ${deleteCourses.rowsAffected[0]} courses`);

        // Step 4: Reset identity if exists
        console.log('\n🔄 Resetting identity seed...');
        try {
            await pool.request().query('DBCC CHECKIDENT (courses, RESEED, 0)');
            console.log('   ✅ Identity seed reset to 0');
        } catch (err) {
            console.log('   ⚠️  Could not reset identity:', err.message);
        }

        // Step 5: Verify deletion
        console.log('\n📊 Verification - Final data count:');

        const finalCoursesCount = await pool.request().query('SELECT COUNT(*) as count FROM courses');
        console.log(`   Courses: ${finalCoursesCount.recordset[0].count}`);

        const finalEnrollmentsCount = await pool.request().query('SELECT COUNT(*) as count FROM user_courses');
        console.log(`   Enrollments: ${finalEnrollmentsCount.recordset[0].count}`);

        const finalMaterialsCount = await pool.request().query('SELECT COUNT(*) as count FROM course_materials');
        console.log(`   Course Materials: ${finalMaterialsCount.recordset[0].count}`);

        console.log('\n✅ All courses data cleared successfully!');
        console.log('📝 You can now create new courses for testing.\n');

    } catch (error) {
        console.error('\n❌ Error clearing courses data:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit();
    }
}

clearCoursesData();
