require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '@Rc9988!Sql',
    server: process.env.DB_SERVER || '45.136.253.81',
    database: process.env.DB_DATABASE || 'RC_LearnHub',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true,
        enableArithAbort: true
    },
    port: parseInt(process.env.DB_PORT || '1433')
};

async function checkSchema() {
    try {
        console.log('📊 Checking Courses table schema...\n');
        const pool = await sql.connect(config);

        const result = await pool.request().query(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            ORDER BY ORDINAL_POSITION
        `);

        console.log(`Found ${result.recordset.length} columns:\n`);
        console.log('Column Name'.padEnd(35), '| Type'.padEnd(20), '| Nullable | Default');
        console.log('-'.repeat(95));

        result.recordset.forEach(col => {
            const colName = col.COLUMN_NAME.padEnd(35);
            const colType = (col.DATA_TYPE + (col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '')).padEnd(20);
            const nullable = col.IS_NULLABLE.padEnd(9);
            const defaultVal = col.COLUMN_DEFAULT || '';
            console.log(`${colName}| ${colType}| ${nullable}| ${defaultVal}`);
        });

        await pool.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkSchema();
