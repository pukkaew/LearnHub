require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true
    }
};

async function checkStructure() {
    try {
        await sql.connect(dbConfig);

        console.log('📋 Courses table structure:');
        const coursesColumns = await sql.query`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            ORDER BY ORDINAL_POSITION
        `;
        console.log(coursesColumns.recordset);

        console.log('\n📋 Lessons table structure:');
        const lessonsColumns = await sql.query`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'lessons'
            ORDER BY ORDINAL_POSITION
        `;
        console.log(lessonsColumns.recordset);

        console.log('\n📋 Sample course data:');
        const courseData = await sql.query`
            SELECT TOP 1 *
            FROM courses
            WHERE course_id = 1
        `;
        console.log(courseData.recordset[0]);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await sql.close();
    }
}

checkStructure();
