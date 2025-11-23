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

        console.log('📋 Courses table columns:');
        const columns = await sql.query`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            ORDER BY ORDINAL_POSITION
        `;

        console.log('\nAll columns:');
        columns.recordset.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''})`);
        });

        // Check for multi-language fields
        const hasEnFields = columns.recordset.some(c => c.COLUMN_NAME.includes('_en'));
        const hasThFields = columns.recordset.some(c => c.COLUMN_NAME.includes('_th'));

        console.log('\n📊 Multi-language fields status:');
        console.log(`  - Has _en fields: ${hasEnFields}`);
        console.log(`  - Has _th fields: ${hasThFields}`);

        // Get Course 1 data
        console.log('\n📖 Course ID 1 data:');
        const course = await sql.query`
            SELECT * FROM courses WHERE course_id = 1
        `;

        if (course.recordset.length > 0) {
            const c = course.recordset[0];
            console.log('\nCourse data:');
            Object.keys(c).forEach(key => {
                if (c[key] && c[key].toString().length > 0) {
                    const value = c[key].toString().substring(0, 100);
                    console.log(`  ${key}: ${value}${c[key].toString().length > 100 ? '...' : ''}`);
                }
            });
        }

        // Check course_materials table
        console.log('\n📚 Checking course_materials for Course 1:');
        try {
            const materials = await sql.query`
                SELECT TOP 5 * FROM course_materials WHERE course_id = 1
            `;
            console.log(`Found ${materials.recordset.length} materials`);
            if (materials.recordset.length > 0) {
                console.log('\nSample material:');
                console.log(materials.recordset[0]);
            }
        } catch (err) {
            console.log('  No course_materials table or no data');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sql.close();
    }
}

checkStructure();
