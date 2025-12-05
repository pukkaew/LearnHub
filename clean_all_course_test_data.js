/**
 * Script to clean all Course, Test, and Test Results data
 * WARNING: This will permanently delete all data!
 */

const { poolPromise, sql } = require('./config/database');

async function cleanAllData() {
    try {
        const pool = await poolPromise;
        console.log('Connected to database');
        console.log('');
        console.log('='.repeat(60));
        console.log('WARNING: Deleting ALL Course, Test, and Test Results data!');
        console.log('='.repeat(60));
        console.log('');

        // Order matters due to foreign key constraints
        // Delete from child tables first, then parent tables

        // 1. Delete Test Results / Attempts related data
        console.log('1. Deleting UserAnswers...');
        const userAnswersResult = await pool.request().query('DELETE FROM UserAnswers');
        console.log(`   Deleted ${userAnswersResult.rowsAffected[0]} rows`);

        console.log('2. Deleting TestAttempts...');
        const testAttemptsResult = await pool.request().query('DELETE FROM TestAttempts');
        console.log(`   Deleted ${testAttemptsResult.rowsAffected[0]} rows`);

        // 2. Delete Questions related data
        console.log('3. Deleting QuestionOptions...');
        const questionOptionsResult = await pool.request().query('DELETE FROM QuestionOptions');
        console.log(`   Deleted ${questionOptionsResult.rowsAffected[0]} rows`);

        console.log('4. Deleting TestQuestions...');
        const testQuestionsResult = await pool.request().query('DELETE FROM TestQuestions');
        console.log(`   Deleted ${testQuestionsResult.rowsAffected[0]} rows`);

        console.log('5. Deleting Questions...');
        const questionsResult = await pool.request().query('DELETE FROM Questions');
        console.log(`   Deleted ${questionsResult.rowsAffected[0]} rows`);

        // 3. Delete Tests
        console.log('6. Deleting Tests...');
        const testsResult = await pool.request().query('DELETE FROM tests');
        console.log(`   Deleted ${testsResult.rowsAffected[0]} rows`);

        // 4. Delete Course related data
        console.log('7. Deleting user_material_progress...');
        const materialProgressResult = await pool.request().query('DELETE FROM user_material_progress');
        console.log(`   Deleted ${materialProgressResult.rowsAffected[0]} rows`);

        console.log('8. Deleting course_materials...');
        const courseMaterialsResult = await pool.request().query('DELETE FROM course_materials');
        console.log(`   Deleted ${courseMaterialsResult.rowsAffected[0]} rows`);

        console.log('9. Deleting user_courses (enrollments)...');
        const userCoursesResult = await pool.request().query('DELETE FROM user_courses');
        console.log(`   Deleted ${userCoursesResult.rowsAffected[0]} rows`);

        console.log('10. Deleting lessons...');
        const lessonsResult = await pool.request().query('DELETE FROM lessons');
        console.log(`   Deleted ${lessonsResult.rowsAffected[0]} rows`);

        console.log('11. Deleting chapters...');
        const chaptersResult = await pool.request().query('DELETE FROM chapters');
        console.log(`   Deleted ${chaptersResult.rowsAffected[0]} rows`);

        console.log('12. Deleting courses...');
        const coursesResult = await pool.request().query('DELETE FROM courses');
        console.log(`   Deleted ${coursesResult.rowsAffected[0]} rows`);

        // 5. Reset identity seeds (optional)
        console.log('');
        console.log('13. Resetting identity seeds...');

        const tablesToReset = [
            'UserAnswers', 'TestAttempts', 'QuestionOptions', 'TestQuestions',
            'Questions', 'tests', 'user_material_progress', 'course_materials',
            'user_courses', 'lessons', 'chapters', 'courses'
        ];

        for (const table of tablesToReset) {
            try {
                await pool.request().query(`DBCC CHECKIDENT ('${table}', RESEED, 0)`);
                console.log(`   Reset ${table} identity`);
            } catch (e) {
                // Table might not have identity column
                console.log(`   Skipped ${table} (no identity or error)`);
            }
        }

        console.log('');
        console.log('='.repeat(60));
        console.log('All data deleted successfully!');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

cleanAllData();
