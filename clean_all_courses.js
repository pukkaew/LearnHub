const { poolPromise, sql } = require('./config/database');

async function cleanAllCourses() {
    try {
        console.log('🗑️  CLEANING ALL COURSES DATA\n');
        console.log('='.repeat(80));

        const pool = await poolPromise;

        // Step 1: Count existing data
        console.log('📊 Counting existing data...\n');

        const courseCount = await pool.request().query('SELECT COUNT(*) as count FROM courses');
        const materialsCount = await pool.request().query('SELECT COUNT(*) as count FROM course_materials');

        console.log(`Courses:          ${courseCount.recordset[0].count} records`);
        console.log(`Course Materials: ${materialsCount.recordset[0].count} records`);
        console.log('');

        // Step 2: Delete data
        console.log('─'.repeat(80));
        console.log('🗑️  Deleting data...\n');

        // Delete in order to respect foreign key constraints
        console.log('1. Deleting course materials...');
        await pool.request().query('DELETE FROM course_materials');
        console.log('   ✅ Course materials deleted');

        console.log('2. Deleting courses...');
        await pool.request().query('DELETE FROM courses');
        console.log('   ✅ Courses deleted');

        // Step 3: Reset identity seeds
        console.log('\n3. Resetting ID counters...');

        try {
            await pool.request().query('DBCC CHECKIDENT (courses, RESEED, 0)');
            console.log('   ✅ Courses ID reset to start from 1');
        } catch (err) {
            console.log('   ⚠️  Could not reset courses ID:', err.message);
        }

        try {
            await pool.request().query('DBCC CHECKIDENT (course_materials, RESEED, 0)');
            console.log('   ✅ Course materials ID reset to start from 1');
        } catch (err) {
            console.log('   ⚠️  Could not reset course_materials ID:', err.message);
        }

        // Step 4: Verify
        console.log('');
        console.log('─'.repeat(80));
        console.log('✅ Verification...\n');

        const finalCourseCount = await pool.request().query('SELECT COUNT(*) as count FROM courses');
        const finalMaterialsCount = await pool.request().query('SELECT COUNT(*) as count FROM course_materials');

        console.log(`Courses remaining:          ${finalCourseCount.recordset[0].count}`);
        console.log(`Course Materials remaining: ${finalMaterialsCount.recordset[0].count}`);
        console.log('');

        console.log('='.repeat(80));
        if (finalCourseCount.recordset[0].count === 0 &&
            finalMaterialsCount.recordset[0].count === 0) {
            console.log('🎉 SUCCESS! All course data cleaned successfully!');
            console.log('');
            console.log('📝 Next step: สร้าง Course ใหม่ผ่านฟอร์มบนเว็บ');
            console.log('   http://localhost:3000/courses/create');
        } else {
            console.log('⚠️  Warning: Some data may still remain');
        }
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

cleanAllCourses();
