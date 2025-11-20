const { poolPromise, sql } = require('./config/database');

async function checkThaiEncoding() {
    try {
        const pool = await poolPromise;

        // Get course 1 data
        const result = await pool.request()
            .input('courseId', sql.Int, 1)
            .query('SELECT course_id, title, description FROM courses WHERE course_id = @courseId');

        if (result.recordset.length === 0) {
            console.log('❌ No course found with ID 1');
            return;
        }

        const course = result.recordset[0];

        console.log('\n📊 Course Data from Database:');
        console.log('=====================================');
        console.log('Course ID:', course.course_id);
        console.log('\nTitle (raw):');
        console.log(course.title);
        console.log('\nTitle (bytes):');
        if (course.title) {
            const buffer = Buffer.from(course.title, 'utf8');
            console.log(buffer.toString('hex'));
        }

        console.log('\nDescription (first 200 chars):');
        console.log(course.description ? course.description.substring(0, 200) : 'null');

        console.log('\n\n🔍 Testing different encodings:');
        console.log('=====================================');

        if (course.title) {
            console.log('\nUTF-8:', course.title);

            // Try to detect if it's double-encoded
            try {
                const latin1Buffer = Buffer.from(course.title, 'latin1');
                console.log('Latin1 to UTF-8:', latin1Buffer.toString('utf8'));
            } catch (err) {
                console.log('Latin1 conversion failed');
            }
        }

        // Check database collation
        const collationResult = await pool.request().query(`
            SELECT
                DATABASEPROPERTYEX('LearnHub', 'Collation') as DatabaseCollation,
                SERVERPROPERTY('Collation') as ServerCollation
        `);

        console.log('\n\n⚙️ Database Settings:');
        console.log('=====================================');
        console.log('Database Collation:', collationResult.recordset[0].DatabaseCollation);
        console.log('Server Collation:', collationResult.recordset[0].ServerCollation);

        // Check table column collation
        const columnResult = await pool.request().query(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_SET_NAME,
                COLLATION_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            AND COLUMN_NAME IN ('title', 'description')
        `);

        console.log('\n📋 Column Settings:');
        columnResult.recordset.forEach(col => {
            console.log(`\n${col.COLUMN_NAME}:`);
            console.log(`  Type: ${col.DATA_TYPE}`);
            console.log(`  Charset: ${col.CHARACTER_SET_NAME}`);
            console.log(`  Collation: ${col.COLLATION_NAME}`);
        });

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkThaiEncoding();
