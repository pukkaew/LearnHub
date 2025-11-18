const { poolPromise } = require('./config/database');

async function cleanAllCourses() {
    try {
        console.log('🗑️  Starting to clean all courses data...\n');

        const pool = await poolPromise;

        // 1. Count existing data
        console.log('📊 Counting existing data...');
        const countsResult = await pool.request().query(`
            SELECT
                (SELECT COUNT(*) FROM courses) as course_count,
                (SELECT COUNT(*) FROM course_materials) as materials_count,
                (SELECT COUNT(*) FROM user_courses) as enrollments_count
        `);

        const counts = countsResult.recordset[0];
        console.log(`   Courses: ${counts.course_count}`);
        console.log(`   Materials: ${counts.materials_count}`);
        console.log(`   Enrollments: ${counts.enrollments_count}`);
        console.log('');

        // 2. Delete course materials first (foreign key dependency)
        console.log('🗑️  Deleting course materials...');
        const materialsResult = await pool.request().query(`
            DELETE FROM course_materials
        `);
        console.log(`   ✅ Deleted ${materialsResult.rowsAffected[0]} materials\n`);

        // 3. Delete user enrollments
        console.log('🗑️  Deleting user enrollments...');
        const enrollmentsResult = await pool.request().query(`
            DELETE FROM user_courses
        `);
        console.log(`   ✅ Deleted ${enrollmentsResult.rowsAffected[0]} enrollments\n`);

        // 4. Delete courses
        console.log('🗑️  Deleting all courses...');
        const coursesResult = await pool.request().query(`
            DELETE FROM courses
        `);
        console.log(`   ✅ Deleted ${coursesResult.rowsAffected[0]} courses\n`);

        // 5. Reset identity seed (optional - allows IDs to start from 1 again)
        console.log('🔄 Resetting identity seeds...');
        await pool.request().query(`
            DBCC CHECKIDENT ('courses', RESEED, 0);
            DBCC CHECKIDENT ('course_materials', RESEED, 0);
        `);
        console.log('   ✅ Identity seeds reset\n');

        // 6. Verify cleanup
        console.log('✔️  Verifying cleanup...');
        const verifyResult = await pool.request().query(`
            SELECT
                (SELECT COUNT(*) FROM courses) as course_count,
                (SELECT COUNT(*) FROM course_materials) as materials_count,
                (SELECT COUNT(*) FROM user_courses) as enrollments_count
        `);

        const verify = verifyResult.recordset[0];
        console.log(`   Courses remaining: ${verify.course_count}`);
        console.log(`   Materials remaining: ${verify.materials_count}`);
        console.log(`   Enrollments remaining: ${verify.enrollments_count}`);
        console.log('');

        if (verify.course_count === 0 && verify.materials_count === 0 && verify.enrollments_count === 0) {
            console.log('✅ ✅ ✅ All courses data cleaned successfully!');
            console.log('🎉 Database is ready for fresh course data!\n');
        } else {
            console.log('⚠️  Warning: Some data may still remain\n');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error cleaning courses data:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

// Ask for confirmation before running
console.log('⚠️  WARNING: This will delete ALL courses, materials, and enrollments!');
console.log('⚠️  This action CANNOT be undone!\n');
console.log('Starting cleanup in 3 seconds...');
console.log('Press Ctrl+C to cancel\n');

setTimeout(() => {
    cleanAllCourses();
}, 3000);
