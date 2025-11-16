const { poolPromise, sql } = require('./config/database');

async function checkCourseCategories() {
    try {
        const pool = await poolPromise;

        // Check CourseCategories table structure
        console.log('\n=== CourseCategories Table Structure ===');
        const structureResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'CourseCategories'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('Columns:');
        structureResult.recordset.forEach(col => {
            console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        // Check data
        console.log('\n=== CourseCategories Data ===');
        const dataResult = await pool.request().query(`
            SELECT TOP 20 *
            FROM CourseCategories
            ORDER BY category_name
        `);

        console.log('Total categories:', dataResult.recordset.length);
        console.log('\nCategories:');
        dataResult.recordset.forEach(cat => {
            console.log(`- ${cat.category_id}: ${cat.category_name} (${cat.category_type || 'N/A'})`);
        });

        // Check tests table structure
        console.log('\n=== Tests Table Structure ===');
        const testsStructureResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'tests'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('Columns:');
        testsStructureResult.recordset.forEach(col => {
            console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

checkCourseCategories();
