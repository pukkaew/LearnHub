const { sql, poolPromise } = require('./config/database');

async function cleanCourses() {
    try {
        const pool = await poolPromise;
        console.log('Connected to database');

        // Delete in correct order due to foreign keys
        console.log('Deleting course_materials...');
        const mat = await pool.request().query('DELETE FROM course_materials');
        console.log(`  Deleted ${mat.rowsAffected[0]} rows`);

        console.log('Deleting user_courses (enrollments)...');
        const enr = await pool.request().query('DELETE FROM user_courses');
        console.log(`  Deleted ${enr.rowsAffected[0]} rows`);

        console.log('Deleting course_discussions...');
        try {
            const dis = await pool.request().query('DELETE FROM course_discussions');
            console.log(`  Deleted ${dis.rowsAffected[0]} rows`);
        } catch(e) { console.log('  (table may not exist)'); }

        console.log('Deleting course_reviews...');
        try {
            const rev = await pool.request().query('DELETE FROM course_reviews');
            console.log(`  Deleted ${rev.rowsAffected[0]} rows`);
        } catch(e) { console.log('  (table may not exist)'); }

        // Clear course_id from tests (set to NULL)
        console.log('Clearing course_id from tests...');
        try {
            const tst = await pool.request().query('UPDATE tests SET course_id = NULL WHERE course_id IS NOT NULL');
            console.log(`  Updated ${tst.rowsAffected[0]} rows`);
        } catch(e) { console.log('  (table may not exist or no course_id column)'); }

        console.log('Deleting courses...');
        const crs = await pool.request().query('DELETE FROM courses');
        console.log(`  Deleted ${crs.rowsAffected[0]} rows`);

        // Reset identity
        console.log('Resetting identity counters...');
        try { await pool.request().query('DBCC CHECKIDENT (courses, RESEED, 0)'); } catch(e) {}
        try { await pool.request().query('DBCC CHECKIDENT (course_materials, RESEED, 0)'); } catch(e) {}
        try { await pool.request().query('DBCC CHECKIDENT (user_courses, RESEED, 0)'); } catch(e) {}

        console.log('');
        console.log('✅ All course data has been cleaned successfully!');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

cleanCourses();
