const { poolPromise, sql } = require('./config/database');

async function clearAllData() {
    try {
        const pool = await poolPromise;

        console.log('Starting to clear all course and test data...\n');

        // Disable foreign key checks temporarily
        console.log('Disabling foreign key constraints...');

        // List of tables to clear in order (child tables first)
        const tablesToClear = [
            // Test related tables
            'TestAttemptAnswers',
            'TestAttempts',
            'TestQuestions',
            'Questions',
            'Tests',

            // Course related tables (all variations)
            'user_material_progress',
            'MaterialProgress',
            'user_courses',
            'course_enrollments',
            'Enrollments',
            'course_materials',
            'CourseMaterials',
            'Courses',

            // Category tables (optional - uncomment if you want to clear these too)
            // 'CourseCategories',
            // 'TestCategories',
        ];

        for (const table of tablesToClear) {
            try {
                // Check if table exists
                const checkTable = await pool.request().query(`
                    SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_NAME = '${table}'
                `);

                if (checkTable.recordset[0].cnt > 0) {
                    // Get count before delete
                    const countBefore = await pool.request().query(`SELECT COUNT(*) as cnt FROM ${table}`);

                    // Delete all data
                    await pool.request().query(`DELETE FROM ${table}`);

                    // Reset identity if exists
                    try {
                        await pool.request().query(`DBCC CHECKIDENT ('${table}', RESEED, 0)`);
                    } catch (e) {
                        // Table might not have identity column, ignore error
                    }

                    console.log(`✓ Cleared ${table}: ${countBefore.recordset[0].cnt} records deleted`);
                } else {
                    console.log(`- Table ${table} does not exist, skipping`);
                }
            } catch (err) {
                console.error(`✗ Error clearing ${table}:`, err.message);
            }
        }

        console.log('\n========================================');
        console.log('Data clearing completed!');
        console.log('========================================');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

clearAllData();
