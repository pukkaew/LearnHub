// Test Organization API functions directly (bypass auth)
require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true
    },
    port: parseInt(process.env.DB_PORT || '1433')
};

async function testAPIs() {
    try {
        console.log('Connecting to database...\n');
        const pool = await sql.connect(config);

        // Test 1: Branches API
        console.log('=== Test 1: /organization/api/branches ===');
        const branchesResult = await pool.request().query(`
            SELECT ou.unit_id, ou.unit_name_th
            FROM OrganizationUnits ou
            INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
            WHERE ol.level_code = 'BRANCH'
              AND ou.is_active = 1
              AND ou.parent_id IS NOT NULL
            ORDER BY ou.unit_name_th
        `);

        const branches = branchesResult.recordset.map(u => ({
            branch_id: u.unit_id,
            branch_name: u.unit_name_th
        }));

        console.log('Branches:', JSON.stringify(branches, null, 2));
        console.log(`Total: ${branches.length} branches\n`);

        if (branches.length > 0) {
            const testBranchId = branches[0].branch_id;
            console.log(`Using branch ID ${testBranchId} for testing...\n`);

            // Test 2: Offices API (with branch_id)
            console.log(`=== Test 2: /organization/api/offices?branch_id=${testBranchId} ===`);
            const officesResult = await pool.request()
                .input('branch_id', sql.Int, testBranchId)
                .query(`
                    SELECT ou.unit_id, ou.unit_name_th
                    FROM OrganizationUnits ou
                    INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                    WHERE ol.level_code = 'OFFICE'
                      AND ou.parent_id = @branch_id
                      AND ou.is_active = 1
                    ORDER BY ou.unit_name_th
                `);

            const offices = officesResult.recordset.map(u => ({
                office_id: u.unit_id,
                office_name: u.unit_name_th
            }));

            console.log('Offices:', JSON.stringify(offices, null, 2));
            console.log(`Total: ${offices.length} offices\n`);

            // Test 3: Divisions API (with branch_id - direct)
            console.log(`=== Test 3: /organization/api/divisions?branch_id=${testBranchId} ===`);
            const divisionsResult = await pool.request()
                .input('branch_id', sql.Int, testBranchId)
                .query(`
                    SELECT ou.unit_id, ou.unit_name_th
                    FROM OrganizationUnits ou
                    INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                    WHERE ol.level_code = 'DIVISION'
                      AND ou.parent_id = @branch_id
                      AND ou.is_active = 1
                    ORDER BY ou.unit_name_th
                `);

            const divisions = divisionsResult.recordset.map(u => ({
                division_id: u.unit_id,
                division_name: u.unit_name_th
            }));

            console.log('Divisions:', JSON.stringify(divisions, null, 2));
            console.log(`Total: ${divisions.length} divisions\n`);

            if (divisions.length > 0) {
                const testDivisionId = divisions[0].division_id;

                // Test 4: Departments API (with division_id)
                console.log(`=== Test 4: /organization/api/departments?division_id=${testDivisionId} ===`);
                const departmentsResult = await pool.request()
                    .input('division_id', sql.Int, testDivisionId)
                    .query(`
                        SELECT ou.unit_id, ou.unit_name_th
                        FROM OrganizationUnits ou
                        INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                        WHERE ol.level_code = 'DEPARTMENT'
                          AND ou.parent_id = @division_id
                          AND ou.is_active = 1
                        ORDER BY ou.unit_name_th
                    `);

                const departments = departmentsResult.recordset.map(u => ({
                    department_id: u.unit_id,
                    department_name: u.unit_name_th
                }));

                console.log('Departments:', JSON.stringify(departments, null, 2));
                console.log(`Total: ${departments.length} departments\n`);
            }
        }

        // Test 5: Positions API
        console.log('=== Test 5: /organization/api/positions ===');
        const positionsResult = await pool.request().query(`
            SELECT
                position_id,
                position_code,
                position_name_th,
                position_name_en,
                position_type,
                is_active
            FROM Positions
            WHERE is_active = 1
            ORDER BY position_name_th
        `);

        console.log('Positions:', JSON.stringify(positionsResult.recordset.slice(0, 5), null, 2));
        console.log(`Total: ${positionsResult.recordset.length} positions\n`);

        await pool.close();
        console.log('✅ All tests completed!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testAPIs();
