const { poolPromise } = require('./config/database');

async function checkMaterials() {
    try {
        const pool = await poolPromise;

        console.log('Checking course_materials table columns:');
        const cols = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'course_materials'
            ORDER BY ORDINAL_POSITION
        `);
        console.log(cols.recordset);

        console.log('\nCourse materials for course_id=1:');
        const materials = await pool.request().query(`
            SELECT * FROM course_materials WHERE course_id = 1
        `);
        console.log(materials.recordset);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkMaterials();
