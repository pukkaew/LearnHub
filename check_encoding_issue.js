const { poolPromise, sql } = require('./config/database');

async function checkEncodingIssue() {
    try {
        const pool = await poolPromise;

        console.log('\n🔍 Checking Encoding Issues');
        console.log('='.repeat(60));

        // Check lessons/curriculum
        console.log('\n📚 Checking Lessons/Curriculum:');
        const lessonsResult = await pool.request()
            .input('courseId', sql.Int, 1)
            .query('SELECT TOP 5 * FROM lessons WHERE course_id = @courseId ORDER BY order_index');

        if (lessonsResult.recordset.length > 0) {
            lessonsResult.recordset.forEach((lesson, index) => {
                console.log(`\nLesson ${index + 1}:`);
                console.log(`  ID: ${lesson.lesson_id}`);
                console.log(`  Title: ${lesson.title}`);
                console.log(`  Title (hex): ${Buffer.from(lesson.title || '', 'utf8').toString('hex').substring(0, 50)}`);
                console.log(`  Content: ${(lesson.content || '').substring(0, 100)}`);

                // Check for mojibake pattern
                if (lesson.title && lesson.title.includes('à¸')) {
                    console.log(`  ⚠️  MOJIBAKE DETECTED in title!`);
                }
            });
        } else {
            console.log('  No lessons found');
        }

        // Check materials
        console.log('\n📄 Checking Materials:');
        const materialsResult = await pool.request()
            .input('courseId', sql.Int, 1)
            .query('SELECT * FROM course_materials WHERE course_id = @courseId ORDER BY material_id');

        if (materialsResult.recordset.length > 0) {
            materialsResult.recordset.forEach((material, index) => {
                console.log(`\nMaterial ${index + 1}:`);
                console.log(`  ID: ${material.material_id}`);
                console.log(`  Title: ${material.title}`);
                console.log(`  Title (hex): ${Buffer.from(material.title || '', 'utf8').toString('hex').substring(0, 50)}`);
                console.log(`  File Path: ${material.file_path}`);

                // Check for mojibake pattern
                if (material.title && material.title.includes('à¸')) {
                    console.log(`  ⚠️  MOJIBAKE DETECTED in title!`);

                    // Try to decode
                    try {
                        // Convert back to buffer and decode properly
                        const latin1Buffer = Buffer.from(material.title, 'latin1');
                        const utf8String = latin1Buffer.toString('utf8');
                        console.log(`  Attempted fix: ${utf8String}`);
                    } catch (e) {
                        console.log(`  Cannot fix automatically`);
                    }
                }
            });
        } else {
            console.log('  No materials found');
        }

        // Check database collation
        console.log('\n⚙️  Database Collation:');
        const collationResult = await pool.request().query(`
            SELECT
                DATABASEPROPERTYEX('LearnHub', 'Collation') as DBCollation,
                SERVERPROPERTY('Collation') as ServerCollation
        `);
        console.log(`  Database: ${collationResult.recordset[0].DBCollation}`);
        console.log(`  Server: ${collationResult.recordset[0].ServerCollation}`);

        console.log('\n' + '='.repeat(60));

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkEncodingIssue();
