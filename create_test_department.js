const { poolPromise, sql } = require('./config/database');

async function createTestDepartment() {
    try {
        const pool = await poolPromise;

        // Create a test department under Division WH (unit_id=32)
        console.log('Creating test department under Division WH (unit_id=32)...');

        const result = await pool.request()
            .input('parent_id', sql.Int, 32)  // WH division
            .input('level_id', sql.Int, 5)     // DEPARTMENT level
            .input('unit_code', sql.NVarChar(20), 'DEPT001')
            .input('unit_name_th', sql.NVarChar(100), 'แผนกทดสอบ')
            .input('unit_name_en', sql.NVarChar(100), 'Test Department')
            .input('unit_abbr', sql.NVarChar(10), 'TEST')
            .input('status', sql.NVarChar(20), 'ACTIVE')
            .query(`
                INSERT INTO OrganizationUnits (
                    parent_id, level_id, unit_code, unit_name_th, unit_name_en, unit_abbr, status
                )
                OUTPUT INSERTED.unit_id, INSERTED.unit_name_th
                VALUES (
                    @parent_id, @level_id, @unit_code, @unit_name_th, @unit_name_en, @unit_abbr, @status
                )
            `);

        console.log('Department created successfully:', result.recordset[0]);

        // Verify by querying children of WH
        console.log('\nVerifying - Children of WH (Division):');
        const children = await pool.request()
            .input('parent_id', sql.Int, 32)
            .query(`
                SELECT ou.unit_id, ou.unit_name_th, ol.level_code
                FROM OrganizationUnits ou
                INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                WHERE ou.parent_id = @parent_id
            `);
        console.log(children.recordset);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createTestDepartment();
