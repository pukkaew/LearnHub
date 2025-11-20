// Check all learning_objectives in database
const { poolPromise, sql } = require('./config/database');

async function checkAllObjectives() {
    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .query(`
                SELECT course_id, title,
                       LEN(learning_objectives) as length,
                       LEFT(learning_objectives, 100) as preview
                FROM courses
                WHERE learning_objectives IS NOT NULL
                ORDER BY course_id DESC
            `);

        console.log('=== ALL COURSES WITH LEARNING OBJECTIVES ===\n');

        for (const course of result.recordset) {
            console.log(`Course ${course.course_id}: ${course.title}`);
            console.log(`  Length: ${course.length}`);
            console.log(`  Preview: ${course.preview}`);

            // Check if it contains HTML entities
            if (course.preview && course.preview.includes('&quot;')) {
                console.log('  ⚠️  CONTAINS HTML ENTITIES');
            } else if (course.preview && course.preview.includes('"')) {
                console.log('  ✓ Contains normal quotes');
            }
            console.log('');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkAllObjectives();
