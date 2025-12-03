require('dotenv').config();
const { poolPromise, sql } = require('./config/database');

async function cleanAllCourses() {
    const pool = await poolPromise;

    console.log('=== Cleaning All Course Data ===\n');

    try {
        // Start transaction
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            // 1. Delete user material progress
            console.log('1. Deleting user_material_progress...');
            const progress1 = await transaction.request().query('DELETE FROM user_material_progress');
            console.log(`   Deleted ${progress1.rowsAffected[0]} rows`);

            // 2. Delete lesson progress
            console.log('2. Deleting lesson_progress...');
            try {
                const progress2 = await transaction.request().query('DELETE FROM lesson_progress');
                console.log(`   Deleted ${progress2.rowsAffected[0]} rows`);
            } catch (e) {
                console.log('   Table not found or empty');
            }

            // 2.5 Delete lesson_time_logs
            console.log('2.5. Deleting lesson_time_logs...');
            try {
                const timeLogs = await transaction.request().query('DELETE FROM lesson_time_logs');
                console.log(`   Deleted ${timeLogs.rowsAffected[0]} rows`);
            } catch (e) {
                console.log('   Table not found or empty');
            }

            // 3. Delete course materials
            console.log('3. Deleting course_materials...');
            const materials = await transaction.request().query('DELETE FROM course_materials');
            console.log(`   Deleted ${materials.rowsAffected[0]} rows`);

            // 4. Delete lessons
            console.log('4. Deleting lessons...');
            const lessons = await transaction.request().query('DELETE FROM lessons');
            console.log(`   Deleted ${lessons.rowsAffected[0]} rows`);

            // 5. Delete course reviews
            console.log('5. Deleting course_reviews...');
            const reviews = await transaction.request().query('DELETE FROM course_reviews');
            console.log(`   Deleted ${reviews.rowsAffected[0]} rows`);

            // 6. Delete user_courses (enrollments)
            console.log('6. Deleting user_courses...');
            const enrollments = await transaction.request().query('DELETE FROM user_courses');
            console.log(`   Deleted ${enrollments.rowsAffected[0]} rows`);

            // 7. Delete courses
            console.log('7. Deleting courses...');
            const courses = await transaction.request().query('DELETE FROM courses');
            console.log(`   Deleted ${courses.rowsAffected[0]} rows`);

            // Commit transaction
            await transaction.commit();
            console.log('\n=== Database Cleaned Successfully! ===');

            // 8. Clean upload folders
            console.log('\n8. Cleaning upload folders...');
            const fs = require('fs');
            const path = require('path');

            const foldersToClean = [
                path.join(__dirname, 'public', 'uploads', 'materials'),
                path.join(__dirname, 'public', 'uploads', 'images'),
                path.join(__dirname, 'public', 'uploads', 'videos')
            ];

            for (const folder of foldersToClean) {
                if (fs.existsSync(folder)) {
                    const files = fs.readdirSync(folder);
                    let deletedCount = 0;
                    for (const file of files) {
                        if (file === '.gitkeep') continue;
                        try {
                            fs.unlinkSync(path.join(folder, file));
                            deletedCount++;
                        } catch (e) {}
                    }
                    console.log(`   Deleted ${deletedCount} files from ${path.basename(folder)}/`);
                }
            }

            console.log('\n=== All Course Data Cleaned Successfully! ===');

        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (error) {
        console.error('Error cleaning courses:', error.message);
    }

    process.exit(0);
}

cleanAllCourses();
