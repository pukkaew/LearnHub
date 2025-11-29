const { poolPromise } = require('./config/database');

/**
 * Script to clean all course data from database
 * WARNING: This will delete ALL courses and related data!
 */

async function cleanAllCourses() {
    console.log('🧹 Starting to clean all course data...\n');

    try {
        const pool = await poolPromise;

        // Start transaction
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            console.log('📊 Checking current data...');

            // Check current counts
            const coursesCount = await transaction.request()
                .query('SELECT COUNT(*) as count FROM courses');
            const chaptersCount = await transaction.request()
                .query('SELECT COUNT(*) as count FROM chapters');
            const lessonsCount = await transaction.request()
                .query('SELECT COUNT(*) as count FROM lessons');
            const testsCount = await transaction.request()
                .query('SELECT COUNT(*) as count FROM tests WHERE course_id IS NOT NULL');
            const allTestsCount = await transaction.request()
                .query('SELECT COUNT(*) as count FROM tests');

            console.log(`  - Courses: ${coursesCount.recordset[0].count}`);
            console.log(`  - Chapters: ${chaptersCount.recordset[0].count}`);
            console.log(`  - Lessons: ${lessonsCount.recordset[0].count}`);
            console.log(`  - Tests (linked to courses): ${testsCount.recordset[0].count}`);
            console.log(`  - Tests (total): ${allTestsCount.recordset[0].count}`);

            if (coursesCount.recordset[0].count === 0) {
                console.log('\n✅ No courses found. Database is already clean.');
                await transaction.rollback();
                return;
            }

            console.log('\n🗑️  Deleting related data...');

            // Delete in correct order (child tables first due to foreign keys)

            // 1. Course materials
            console.log('  1. Deleting course_materials...');
            const materials = await transaction.request()
                .query('DELETE FROM course_materials; SELECT @@ROWCOUNT as deleted');
            console.log(`     ✅ Deleted ${materials.recordset[0].deleted} materials`);

            // 2. Learning objectives
            console.log('  2. Deleting learning_objectives...');
            try {
                const objectives = await transaction.request()
                    .query('DELETE FROM learning_objectives; SELECT @@ROWCOUNT as deleted');
                console.log(`     ✅ Deleted ${objectives.recordset[0].deleted} objectives`);
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log('     ⏭️  Table learning_objectives does not exist, skipping');
                } else {
                    throw err;
                }
            }

            // 3. Target audience (if exists)
            console.log('  3. Deleting target_audience...');
            try {
                const audience = await transaction.request()
                    .query('DELETE FROM target_audience; SELECT @@ROWCOUNT as deleted');
                console.log(`     ✅ Deleted ${audience.recordset[0].deleted} target audience records`);
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log('     ⏭️  Table target_audience does not exist, skipping');
                } else {
                    throw err;
                }
            }

            // 4. Course categories (junction table)
            console.log('  4. Deleting course_categories...');
            try {
                const categories = await transaction.request()
                    .query('DELETE FROM course_categories; SELECT @@ROWCOUNT as deleted');
                console.log(`     ✅ Deleted ${categories.recordset[0].deleted} category associations`);
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log('     ⏭️  Table course_categories does not exist, skipping');
                } else {
                    throw err;
                }
            }

            // 5. Test attempts (if exists)
            console.log('  5. Deleting test_attempts...');
            try {
                const attempts = await transaction.request()
                    .query('DELETE FROM test_attempts; SELECT @@ROWCOUNT as deleted');
                console.log(`     ✅ Deleted ${attempts.recordset[0].deleted} test attempts`);
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log('     ⏭️  Table test_attempts does not exist, skipping');
                } else {
                    throw err;
                }
            }

            // 6. Test questions (if exists)
            console.log('  6. Deleting test_questions...');
            try {
                const questions = await transaction.request()
                    .query('DELETE FROM test_questions; SELECT @@ROWCOUNT as deleted');
                console.log(`     ✅ Deleted ${questions.recordset[0].deleted} test questions`);
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log('     ⏭️  Table test_questions does not exist, skipping');
                } else {
                    throw err;
                }
            }

            // 7. Course enrollments (if exists)
            console.log('  7. Deleting course_enrollments...');
            try {
                const enrollments = await transaction.request()
                    .query('DELETE FROM course_enrollments; SELECT @@ROWCOUNT as deleted');
                console.log(`     ✅ Deleted ${enrollments.recordset[0].deleted} enrollments`);
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log('     ⏭️  Table course_enrollments does not exist, skipping');
                } else {
                    throw err;
                }
            }

            // 7.5. User courses (enrollment records)
            console.log('  7.5. Deleting user_courses...');
            try {
                const userCourses = await transaction.request()
                    .query('DELETE FROM user_courses; SELECT @@ROWCOUNT as deleted');
                console.log(`     ✅ Deleted ${userCourses.recordset[0].deleted} user enrollments`);
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log('     ⏭️  Table user_courses does not exist, skipping');
                } else {
                    throw err;
                }
            }

            // 7.6. Course ratings (if exists)
            console.log('  7.6. Deleting course_ratings...');
            try {
                const ratings = await transaction.request()
                    .query('DELETE FROM course_ratings; SELECT @@ROWCOUNT as deleted');
                console.log(`     ✅ Deleted ${ratings.recordset[0].deleted} ratings`);
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log('     ⏭️  Table course_ratings does not exist, skipping');
                } else {
                    throw err;
                }
            }

            // 8. Unlink tests from courses (keep tests as standalone)
            console.log('  8. Unlinking tests from courses...');
            const testsUnlinked = await transaction.request()
                .query(`UPDATE tests
                        SET course_id = NULL, chapter_id = NULL, lesson_id = NULL, updated_at = GETDATE()
                        WHERE course_id IS NOT NULL;
                        SELECT @@ROWCOUNT as updated`);
            console.log(`     ✅ Unlinked ${testsUnlinked.recordset[0].updated} tests from courses`);

            // 9. Delete lessons (must be before chapters)
            console.log('  9. Deleting lessons...');
            try {
                const lessons = await transaction.request()
                    .query('DELETE FROM lessons; SELECT @@ROWCOUNT as deleted');
                console.log(`     ✅ Deleted ${lessons.recordset[0].deleted} lessons`);
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log('     ⏭️  Table lessons does not exist, skipping');
                } else {
                    throw err;
                }
            }

            // 10. Delete chapters (must be before courses)
            console.log('  10. Deleting chapters...');
            try {
                const chapters = await transaction.request()
                    .query('DELETE FROM chapters; SELECT @@ROWCOUNT as deleted');
                console.log(`     ✅ Deleted ${chapters.recordset[0].deleted} chapters`);
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log('     ⏭️  Table chapters does not exist, skipping');
                } else {
                    throw err;
                }
            }

            // 11. Courses (parent table - delete last)
            console.log('  11. Deleting courses...');
            const coursesDeleted = await transaction.request()
                .query('DELETE FROM courses; SELECT @@ROWCOUNT as deleted');
            console.log(`     ✅ Deleted ${coursesDeleted.recordset[0].deleted} courses`);

            // Commit transaction
            await transaction.commit();

            console.log('\n✅ All course data cleaned successfully!');
            console.log('🎉 Database is ready for fresh data.\n');

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error('❌ Error cleaning course data:', error.message);
        throw error;
    } finally {
        process.exit();
    }
}

// Run the cleanup
cleanAllCourses();
