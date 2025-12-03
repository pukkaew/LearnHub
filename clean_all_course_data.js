const { sql, poolPromise } = require('./config/database');

async function cleanAllCourseData() {
    try {
        const pool = await poolPromise;
        console.log('Connected to database...\n');

        // Delete in order (child tables first)
        const tables = [
            { name: 'user_material_progress', desc: 'User material progress' },
            { name: 'user_lesson_progress', desc: 'User lesson progress' },
            { name: 'user_courses', desc: 'User courses (enrollments)' },
            { name: 'course_reviews', desc: 'Course reviews' },
            { name: 'course_discussions', desc: 'Course discussions' },
            { name: 'course_enrollments', desc: 'Course enrollments' },
            { name: 'course_materials', desc: 'Course materials' },
            { name: 'lessons', desc: 'Lessons' },
            { name: 'courses', desc: 'Courses' }
        ];

        for (const table of tables) {
            try {
                const result = await pool.request().query(`DELETE FROM ${table.name}`);
                console.log(`✅ ${table.desc}: Deleted ${result.rowsAffected[0]} rows`);
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log(`⚠️  ${table.desc}: Table does not exist`);
                } else {
                    console.log(`❌ ${table.desc}: ${err.message}`);
                }
            }
        }

        // Reset identity seeds
        console.log('\nResetting identity seeds...');
        for (const table of tables) {
            try {
                await pool.request().query(`DBCC CHECKIDENT ('${table.name}', RESEED, 0)`);
                console.log(`✅ Reset ${table.name} identity`);
            } catch (err) {
                // Ignore errors for tables without identity
            }
        }

        console.log('\n🎉 All course data cleaned successfully!');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

cleanAllCourseData();
