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
            const testsCount = await transaction.request()
                .query('SELECT COUNT(*) as count FROM tests');

            console.log(`  - Courses: ${coursesCount.recordset[0].count}`);
            console.log(`  - Tests: ${testsCount.recordset[0].count}`);

            if (coursesCount.recordset[0].count === 0 && testsCount.recordset[0].count === 0) {
                console.log('\n✅ Database is already clean. No data to delete.');
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

            // 8. Tests
            console.log('  8. Deleting tests...');
            const testsDeleted = await transaction.request()
                .query('DELETE FROM tests; SELECT @@ROWCOUNT as deleted');
            console.log(`     ✅ Deleted ${testsDeleted.recordset[0].deleted} tests`);

            // 9. Courses (parent table - delete last)
            console.log('  9. Deleting courses...');
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
