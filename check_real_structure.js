const { poolPromise } = require('./config/database');

async function checkStructure() {
    try {
        const pool = await poolPromise;

        console.log('\n=== โครงสร้างองค์กรทั้งหมดในระบบ ===\n');

        const result = await pool.request().query(`
            SELECT
                ou.unit_id,
                ou.unit_code,
                ou.unit_name_th,
                ol.level_code,
                ol.level_name_th,
                ou.parent_id,
                parent.unit_name_th as parent_name
            FROM OrganizationUnits ou
            INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
            LEFT JOIN OrganizationUnits parent ON ou.parent_id = parent.unit_id
            WHERE ou.is_active = 1
            ORDER BY ou.unit_id
        `);

        result.recordset.forEach(unit => {
            console.log(`ID: ${unit.unit_id} | ${unit.level_name_th} (${unit.level_code}) | ${unit.unit_name_th} | รหัส: ${unit.unit_code}`);
            if (unit.parent_name) {
                console.log(`   └─ สังกัด: ${unit.parent_name} (ID: ${unit.parent_id})`);
            }
            console.log('');
        });

        console.log('\n=== โครงสร้างแบบ Tree ===\n');

        const treeResult = await pool.request().query(`
            WITH OrgTree AS (
                SELECT
                    ou.unit_id,
                    ou.unit_code,
                    ou.unit_name_th,
                    ol.level_code,
                    ol.level_name_th,
                    ou.parent_id,
                    0 as depth,
                    CAST(ou.unit_name_th AS NVARCHAR(500)) as path
                FROM OrganizationUnits ou
                INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                WHERE ou.parent_id IS NULL

                UNION ALL

                SELECT
                    ou.unit_id,
                    ou.unit_code,
                    ou.unit_name_th,
                    ol.level_code,
                    ol.level_name_th,
                    ou.parent_id,
                    t.depth + 1,
                    CAST(t.path + ' > ' + ou.unit_name_th AS NVARCHAR(500))
                FROM OrganizationUnits ou
                INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                INNER JOIN OrgTree t ON ou.parent_id = t.unit_id
                WHERE ou.is_active = 1
            )
            SELECT * FROM OrgTree ORDER BY path
        `);

        treeResult.recordset.forEach(unit => {
            const indent = '  '.repeat(unit.depth);
            console.log(`${indent}└─ [${unit.level_name_th}] ${unit.unit_name_th} (${unit.unit_code})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkStructure();
