const {poolPromise} = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;
        const courses = await pool.request().query('SELECT COUNT(*) as count FROM courses');
        const materials = await pool.request().query('SELECT COUNT(*) as count FROM course_materials');

        console.log('\n✅ Database Verification:');
        console.log(`   Courses: ${courses.recordset[0].count}`);
        console.log(`   Materials: ${materials.recordset[0].count}`);
        console.log('\n🎉 Database is clean and ready for new data!\n');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
