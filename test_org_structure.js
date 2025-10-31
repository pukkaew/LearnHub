const { poolPromise } = require('./config/database');

async function testOrgStructure() {
    try {
        const pool = await poolPromise;

        console.log('\n=== Office 32 Details ===');
        const officeResult = await pool.request()
            .input('unit_id', 32)
            .query(`
                SELECT ou.unit_id, ou.unit_name_th, ou.unit_code, ol.level_code, ou.parent_id
                FROM OrganizationUnits ou
                INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                WHERE ou.unit_id = @unit_id
            `);
        console.log(officeResult.recordset);

        console.log('\n=== Direct Children of Office 32 ===');
        const childrenResult = await pool.request()
            .input('parent_id', 32)
            .query(`
                SELECT ou.unit_id, ou.unit_name_th, ou.unit_code, ol.level_code, ou.parent_id
                FROM OrganizationUnits ou
                INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                WHERE ou.parent_id = @parent_id
                ORDER BY ou.unit_id
            `);
        console.log(childrenResult.recordset);
        console.log(`Found ${childrenResult.recordset.length} direct children`);

        console.log('\n=== All Departments (for reference) ===');
        const allDepts = await pool.request()
            .query(`
                SELECT ou.unit_id, ou.unit_name_th, ou.unit_code, ol.level_code, ou.parent_id
                FROM OrganizationUnits ou
                INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                WHERE ol.level_code = 'DEPARTMENT'
                ORDER BY ou.unit_id
            `);
        console.log(`Total departments in system: ${allDepts.recordset.length}`);
        console.log(allDepts.recordset.slice(0, 5)); // Show first 5

        console.log('\n=== Full Hierarchy from Branch 29 ===');
        const hierarchyResult = await pool.request()
            .query(`
                WITH OrgHierarchy AS (
                    SELECT ou.unit_id, ou.unit_name_th, ou.unit_code, ou.level_id, ou.parent_id, 0 as depth
                    FROM OrganizationUnits ou
                    WHERE ou.unit_id = 29

                    UNION ALL

                    SELECT o.unit_id, o.unit_name_th, o.unit_code, o.level_id, o.parent_id, h.depth + 1
                    FROM OrganizationUnits o
                    INNER JOIN OrgHierarchy h ON o.parent_id = h.unit_id
                )
                SELECT h.*, ol.level_code
                FROM OrgHierarchy h
                INNER JOIN OrganizationLevels ol ON h.level_id = ol.level_id
                ORDER BY h.depth, h.unit_id
            `);
        console.log(hierarchyResult.recordset);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testOrgStructure();
