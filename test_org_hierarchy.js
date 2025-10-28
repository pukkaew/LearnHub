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

async function testOrgHierarchy() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);

        // Test 1: Check all branches
        console.log('\n=== BRANCHES (สาขา) ===');
        const branches = await pool.request().query(`
            SELECT ou.unit_id, ou.unit_name_th, ou.parent_id
            FROM OrganizationUnits ou
            INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
            WHERE ol.level_code = 'BRANCH' AND ou.is_active = 1
            ORDER BY ou.unit_name_th
        `);
        console.log(`Found ${branches.recordset.length} branches:`);
        branches.recordset.forEach(b => {
            console.log(`  - ${b.unit_name_th} (ID: ${b.unit_id}, parent_id: ${b.parent_id})`);
        });

        // Test 2: Check offices for each branch
        console.log('\n=== OFFICES (สำนัก) by Branch ===');
        for (const branch of branches.recordset) {
            const offices = await pool.request()
                .input('branch_id', sql.Int, branch.unit_id)
                .query(`
                    SELECT ou.unit_id, ou.unit_name_th, ou.parent_id
                    FROM OrganizationUnits ou
                    INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                    WHERE ol.level_code = 'OFFICE'
                      AND ou.parent_id = @branch_id
                      AND ou.is_active = 1
                    ORDER BY ou.unit_name_th
                `);

            console.log(`\nBranch: ${branch.unit_name_th} (ID: ${branch.unit_id})`);
            console.log(`  Offices: ${offices.recordset.length}`);
            offices.recordset.forEach(o => {
                console.log(`    - ${o.unit_name_th} (ID: ${o.unit_id}, parent_id: ${o.parent_id})`);
            });

            // Test 3: Check divisions for each office
            if (offices.recordset.length > 0) {
                console.log(`  Divisions (ฝ่าย):`);
                for (const office of offices.recordset) {
                    const divisions = await pool.request()
                        .input('office_id', sql.Int, office.unit_id)
                        .query(`
                            SELECT ou.unit_id, ou.unit_name_th, ou.parent_id
                            FROM OrganizationUnits ou
                            INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                            WHERE ol.level_code = 'DIVISION'
                              AND ou.parent_id = @office_id
                              AND ou.is_active = 1
                            ORDER BY ou.unit_name_th
                        `);

                    console.log(`    Office: ${office.unit_name_th} has ${divisions.recordset.length} divisions`);
                    divisions.recordset.forEach(d => {
                        console.log(`      - ${d.unit_name_th} (ID: ${d.unit_id}, parent_id: ${d.parent_id})`);
                    });

                    // Test 4: Check departments for each division
                    if (divisions.recordset.length > 0) {
                        console.log(`      Departments (แผนก):`);
                        for (const division of divisions.recordset) {
                            const departments = await pool.request()
                                .input('division_id', sql.Int, division.unit_id)
                                .query(`
                                    SELECT ou.unit_id, ou.unit_name_th, ou.parent_id
                                    FROM OrganizationUnits ou
                                    INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                                    WHERE ol.level_code = 'DEPARTMENT'
                                      AND ou.parent_id = @division_id
                                      AND ou.is_active = 1
                                    ORDER BY ou.unit_name_th
                                `);

                            console.log(`        Division: ${division.unit_name_th} has ${departments.recordset.length} departments`);
                            departments.recordset.forEach(dept => {
                                console.log(`          - ${dept.unit_name_th} (ID: ${dept.unit_id}, parent_id: ${dept.parent_id})`);
                            });
                        }
                    }
                }
            }
        }

        // Test 5: Check all organization levels
        console.log('\n=== ALL ORGANIZATION LEVELS ===');
        const levels = await pool.request().query(`
            SELECT level_id, level_code, level_name_th, level_order
            FROM OrganizationLevels
            ORDER BY level_order
        `);
        levels.recordset.forEach(l => {
            console.log(`  - ${l.level_name_th} (${l.level_code}) - Order: ${l.level_order}`);
        });

        // Test 6: Count units by level
        console.log('\n=== COUNT OF ACTIVE UNITS BY LEVEL ===');
        const counts = await pool.request().query(`
            SELECT
                ol.level_code,
                ol.level_name_th,
                COUNT(ou.unit_id) as unit_count
            FROM OrganizationLevels ol
            LEFT JOIN OrganizationUnits ou ON ol.level_id = ou.level_id AND ou.is_active = 1
            GROUP BY ol.level_code, ol.level_name_th, ol.level_order
            ORDER BY ol.level_order
        `);
        counts.recordset.forEach(c => {
            console.log(`  - ${c.level_name_th} (${c.level_code}): ${c.unit_count} units`);
        });

        await pool.close();
        console.log('\n✅ Test completed!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testOrgHierarchy();
