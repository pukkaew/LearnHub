const { poolPromise, sql } = require('./config/database');

async function cleanLearningObjectives() {
    try {
        const pool = await poolPromise;
        console.log('🔌 Connected to database');

        // Get all courses with HTML entities in learning_objectives
        const result = await pool.request().query(`
            SELECT course_id, title, learning_objectives
            FROM courses
            WHERE learning_objectives LIKE '%&quot;%'
               OR learning_objectives LIKE '%&#34;%'
               OR learning_objectives LIKE '%&apos;%'
               OR learning_objectives LIKE '%&#39;%'
        `);

        const courses = result.recordset;
        console.log(`\n📋 Found ${courses.length} courses with HTML entities\n`);

        if (courses.length === 0) {
            console.log('✅ No courses need cleaning!');
            return;
        }

        let cleanedCount = 0;
        let failedCount = 0;

        for (const course of courses) {
            try {
                // Decode HTML entities
                const decoded = course.learning_objectives
                    .replace(/&quot;/g, '"')
                    .replace(/&#34;/g, '"')
                    .replace(/&apos;/g, "'")
                    .replace(/&#39;/g, "'")
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&');

                // Verify it's valid JSON
                JSON.parse(decoded);

                // Update in database
                await pool.request()
                    .input('courseId', sql.Int, course.course_id)
                    .input('objectives', sql.NVarChar(sql.MAX), decoded)
                    .query('UPDATE courses SET learning_objectives = @objectives WHERE course_id = @courseId');

                cleanedCount++;
                console.log(`✅ Cleaned course ${course.course_id}: "${course.title}"`);
                console.log(`   Before: ${course.learning_objectives.substring(0, 50)}...`);
                console.log(`   After:  ${decoded.substring(0, 50)}...`);
                console.log('');

            } catch (err) {
                failedCount++;
                console.error(`❌ Failed to clean course ${course.course_id}: "${course.title}"`);
                console.error(`   Error: ${err.message}`);
                console.log('');
            }
        }

        console.log('\n═══════════════════════════════════════');
        console.log(`📊 Summary:`);
        console.log(`   Total found:    ${courses.length}`);
        console.log(`   Successfully cleaned: ${cleanedCount}`);
        console.log(`   Failed:         ${failedCount}`);
        console.log('═══════════════════════════════════════\n');

        if (cleanedCount > 0) {
            console.log('🎉 Database cleanup completed!');
            console.log('💡 You can now verify by running: node check_all_objectives_in_db.js');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        process.exit();
    }
}

// Run the cleanup
cleanLearningObjectives();
