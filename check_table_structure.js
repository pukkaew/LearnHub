const { poolPromise } = require('./config/database');

async function checkTableStructure() {
    try {
        const pool = await poolPromise;
        console.log('✅ Connected to database\n');

        console.log('='.repeat(80));
        console.log('CHECKING TABLE STRUCTURES');
        console.log('='.repeat(80));

        // Check OrganizationUnits columns
        console.log('\n📋 OrganizationUnits Table Columns:\n');
        const orgUnitsColumns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'OrganizationUnits'
            ORDER BY ORDINAL_POSITION
        `);
        orgUnitsColumns.recordset.forEach(col => {
            console.log(`   ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE}`);
        });

        // Check Positions columns
        console.log('\n📋 Positions Table Columns:\n');
        const positionsColumns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Positions'
            ORDER BY ORDINAL_POSITION
        `);
        positionsColumns.recordset.forEach(col => {
            console.log(`   ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE}`);
        });

        // Check courses columns
        console.log('\n📋 courses Table Columns:\n');
        const coursesColumns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            ORDER BY ORDINAL_POSITION
        `);
        coursesColumns.recordset.forEach(col => {
            console.log(`   ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE}`);
        });

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkTableStructure();
