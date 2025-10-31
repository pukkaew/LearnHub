const { poolPromise } = require('./config/database');

async function checkBranches() {
    try {
        const pool = await poolPromise;

        console.log('\n=== ตรวจสอบสาขาที่มีอยู่ในระบบ ===\n');

        const result = await pool.request().query(`
            SELECT ou.unit_id, ou.unit_name_th, ou.unit_code, ol.level_code
            FROM OrganizationUnits ou
            INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
            WHERE ol.level_code = 'BRANCH'
            AND ou.is_active = 1
            ORDER BY ou.unit_id
        `);

        if (result.recordset.length === 0) {
            console.log('❌ ไม่พบสาขาในระบบ');
        } else {
            console.log(`✅ พบ ${result.recordset.length} สาขา:\n`);
            result.recordset.forEach(branch => {
                console.log(`   ID: ${branch.unit_id} | ${branch.unit_name_th} (${branch.unit_code})`);
            });
        }

        console.log('\n=== ตรวจสอบ Foreign Key Constraints ===\n');

        const constraints = await pool.request().query(`
            SELECT
                fk.name AS constraint_name,
                COL_NAME(fc.parent_object_id, fc.parent_column_id) AS column_name,
                OBJECT_NAME(fk.referenced_object_id) AS referenced_table,
                COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS referenced_column
            FROM sys.foreign_keys AS fk
            INNER JOIN sys.foreign_key_columns AS fc
                ON fk.object_id = fc.constraint_object_id
            WHERE OBJECT_NAME(fk.parent_object_id) = 'Users'
            AND COL_NAME(fc.parent_object_id, fc.parent_column_id) IN ('branch_id', 'office_id', 'division_id')
            ORDER BY COL_NAME(fc.parent_object_id, fc.parent_column_id)
        `);

        if (constraints.recordset.length > 0) {
            console.log('พบ Foreign Key Constraints:\n');
            constraints.recordset.forEach(fk => {
                console.log(`   ${fk.constraint_name}`);
                console.log(`   └─ Users.${fk.column_name} → ${fk.referenced_table}.${fk.referenced_column}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkBranches();
