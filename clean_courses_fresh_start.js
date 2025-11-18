const { poolPromise } = require('./config/database');

async function cleanAllCourses() {
    try {
        const pool = await poolPromise;
        console.log('✅ Connected to database\n');

        console.log('='.repeat(60));
        console.log('CLEAN ALL COURSES DATA');
        console.log('='.repeat(60));

        // 1. Check current data
        console.log('\n📊 Current Data Count:');

        const coursesCount = await pool.request().query('SELECT COUNT(*) as count FROM courses');
        console.log(`   Courses: ${coursesCount.recordset[0].count}`);

        const materialsCount = await pool.request().query('SELECT COUNT(*) as count FROM course_materials');
        console.log(`   Course Materials: ${materialsCount.recordset[0].count}`);

        const enrollmentsCount = await pool.request().query('SELECT COUNT(*) as count FROM user_courses');
        console.log(`   Enrollments (user_courses): ${enrollmentsCount.recordset[0].count}`);

        if (coursesCount.recordset[0].count === 0) {
            console.log('\n✅ No courses to clean. Database is already empty.');
            process.exit(0);
        }

        console.log('\n⚠️  WARNING: This will DELETE ALL course data!');
        console.log('   - All courses');
        console.log('   - All course materials (lessons, videos)');
        console.log('   - All enrollments');
        console.log('   - All course-related records');
        console.log('\n   ✅ Users, Categories, Positions, and Departments will NOT be deleted.');

        // Delete in correct order to avoid foreign key constraints
        console.log('\n' + '='.repeat(60));
        console.log('Starting cleanup...');
        console.log('='.repeat(60));

        // 1. Delete user_courses (enrollments)
        console.log('\n1. Deleting user_courses (enrollments)...');
        const deleteEnrollments = await pool.request().query('DELETE FROM user_courses');
        console.log(`   ✅ Deleted ${deleteEnrollments.rowsAffected[0]} enrollments`);

        // 2. Delete course_materials (lessons, videos, materials)
        console.log('\n2. Deleting course_materials...');
        const deleteMaterials = await pool.request().query('DELETE FROM course_materials');
        console.log(`   ✅ Deleted ${deleteMaterials.rowsAffected[0]} materials`);

        // 3. Delete course reviews if table exists
        try {
            console.log('\n3. Checking for course_reviews...');
            const deleteReviews = await pool.request().query('DELETE FROM course_reviews');
            console.log(`   ✅ Deleted ${deleteReviews.rowsAffected[0]} reviews`);
        } catch (err) {
            console.log('   ⚠️  Table course_reviews not found or already empty');
        }

        // 4. Delete course discussions if table exists
        try {
            console.log('\n4. Checking for course_discussions...');
            const deleteDiscussions = await pool.request().query('DELETE FROM course_discussions');
            console.log(`   ✅ Deleted ${deleteDiscussions.rowsAffected[0]} discussions`);
        } catch (err) {
            console.log('   ⚠️  Table course_discussions not found or already empty');
        }

        // 5. Delete courses
        console.log('\n5. Deleting courses...');
        const deleteCourses = await pool.request().query('DELETE FROM courses');
        console.log(`   ✅ Deleted ${deleteCourses.rowsAffected[0]} courses`);

        // 6. Reset identity if needed (optional)
        console.log('\n6. Resetting auto-increment counters...');
        try {
            await pool.request().query('DBCC CHECKIDENT (courses, RESEED, 0)');
            console.log('   ✅ Courses counter reset');
        } catch (err) {
            console.log('   ⚠️  Could not reset counter (may be fine)');
        }

        try {
            await pool.request().query('DBCC CHECKIDENT (course_materials, RESEED, 0)');
            console.log('   ✅ Course materials counter reset');
        } catch (err) {
            console.log('   ⚠️  Could not reset counter (may be fine)');
        }

        // 7. Verify cleanup
        console.log('\n' + '='.repeat(60));
        console.log('Verifying cleanup...');
        console.log('='.repeat(60));

        const finalCoursesCount = await pool.request().query('SELECT COUNT(*) as count FROM courses');
        const finalMaterialsCount = await pool.request().query('SELECT COUNT(*) as count FROM course_materials');
        const finalEnrollmentsCount = await pool.request().query('SELECT COUNT(*) as count FROM user_courses');

        console.log('\n📊 Final Data Count:');
        console.log(`   Courses: ${finalCoursesCount.recordset[0].count}`);
        console.log(`   Course Materials: ${finalMaterialsCount.recordset[0].count}`);
        console.log(`   Enrollments: ${finalEnrollmentsCount.recordset[0].count}`);

        // Check what's NOT deleted
        console.log('\n✅ Data Preserved:');
        const usersCount = await pool.request().query('SELECT COUNT(*) as count FROM users');
        console.log(`   Users: ${usersCount.recordset[0].count}`);

        const categoriesCount = await pool.request().query('SELECT COUNT(*) as count FROM CourseCategories');
        console.log(`   Categories: ${categoriesCount.recordset[0].count}`);

        const positionsCount = await pool.request().query('SELECT COUNT(*) as count FROM Positions');
        console.log(`   Positions: ${positionsCount.recordset[0].count}`);

        const departmentsCount = await pool.request().query('SELECT COUNT(*) as count FROM OrganizationUnits');
        console.log(`   Departments: ${departmentsCount.recordset[0].count}`);

        if (finalCoursesCount.recordset[0].count === 0 &&
            finalMaterialsCount.recordset[0].count === 0) {
            console.log('\n' + '='.repeat(60));
            console.log('🎉 CLEANUP COMPLETED SUCCESSFULLY!');
            console.log('='.repeat(60));
            console.log('\n✅ All course data has been removed');
            console.log('✅ Database is ready for fresh course creation');
            console.log('\n👉 You can now create new courses from:');
            console.log('   http://localhost:3000/courses/create');
        } else {
            console.log('\n⚠️  WARNING: Some data may not have been deleted');
            console.log('   Please check the counts above');
        }

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error during cleanup:', error.message);
        console.error(error);
        console.log('\n⚠️  Cleanup may be incomplete. Please check your database.');
        process.exit(1);
    }
}

// Run the cleanup
console.log('\n⚠️  DANGER ZONE: COURSE DATA CLEANUP');
console.log('This will delete ALL courses and related data.');
console.log('Starting in 2 seconds...\n');

setTimeout(() => {
    cleanAllCourses();
}, 2000);
