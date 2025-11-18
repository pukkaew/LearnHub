const { poolPromise, sql } = require('./config/database');

async function checkColumns() {
    try {
        const pool = await poolPromise;

        console.log('Checking Positions table columns:');
        const posResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Positions'
            ORDER BY ORDINAL_POSITION
        `);
        console.log(posResult.recordset);

        console.log('\nChecking OrganizationUnits table columns:');
        const ouResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'OrganizationUnits'
            ORDER BY ORDINAL_POSITION
        `);
        console.log(ouResult.recordset);

        console.log('\nChecking user_courses table columns:');
        const ucResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'user_courses'
            ORDER BY ORDINAL_POSITION
        `);
        console.log(ucResult.recordset);

        console.log('\nChecking users table columns:');
        const usersResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'users'
            ORDER BY ORDINAL_POSITION
        `);
        console.log(usersResult.recordset);

        console.log('\nChecking courses table columns:');
        const coursesResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            ORDER BY ORDINAL_POSITION
        `);
        console.log(coursesResult.recordset);

        console.log('\nChecking course ID 1 data:');
        const courseData = await pool.request().query(`
            SELECT TOP 1 * FROM courses WHERE course_id = 1
        `);
        console.log(courseData.recordset[0]);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkColumns();
