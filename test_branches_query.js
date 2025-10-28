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

async function testBranchesQuery() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);

        // Test 1: ดูข้อมูลทั้งหมดที่เป็น BRANCH level
        console.log('\n=== Test 1: All BRANCH level units ===');
        const result1 = await pool.request().query(`
            SELECT
                ou.unit_id,
                ou.unit_name_th,
                ou.parent_id,
                parent.unit_name_th as parent_name,
                parent_level.level_code as parent_level_code
            FROM OrganizationUnits ou
            INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
            LEFT JOIN OrganizationUnits parent ON ou.parent_id = parent.unit_id
            LEFT JOIN OrganizationLevels parent_level ON parent.level_id = parent_level.level_id
            WHERE ol.level_code = 'BRANCH'
              AND ou.is_active = 1
            ORDER BY ou.unit_name_th
        `);

        console.log('Total BRANCH units:', result1.recordset.length);
        result1.recordset.forEach(u => {
            console.log(`  - ${u.unit_name_th} (ID: ${u.unit_id}, Parent: ${u.parent_name || 'NULL'} [${u.parent_level_code || 'NULL'}], parent_id: ${u.parent_id})`);
        });

        // Test 2: ดูข้อมูล BRANCH ที่มี parent_id
        console.log('\n=== Test 2: BRANCH units with parent_id IS NOT NULL ===');
        const result2 = await pool.request().query(`
            SELECT
                ou.unit_id,
                ou.unit_name_th,
                ou.parent_id,
                parent.unit_name_th as parent_name
            FROM OrganizationUnits ou
            INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
            LEFT JOIN OrganizationUnits parent ON ou.parent_id = parent.unit_id
            WHERE ol.level_code = 'BRANCH'
              AND ou.is_active = 1
              AND ou.parent_id IS NOT NULL
            ORDER BY ou.unit_name_th
        `);

        console.log('BRANCH units with parent:', result2.recordset.length);
        result2.recordset.forEach(u => {
            console.log(`  - ${u.unit_name_th} (ID: ${u.unit_id}, Parent: ${u.parent_name})`);
        });

        // Test 3: ดูว่ามีหน่วยงานไหนเป็น COMPANY level บ้าง
        console.log('\n=== Test 3: COMPANY level units ===');
        const result3 = await pool.request().query(`
            SELECT
                ou.unit_id,
                ou.unit_name_th,
                ou.parent_id,
                ol.level_code
            FROM OrganizationUnits ou
            INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
            WHERE ol.level_code = 'COMPANY'
              AND ou.is_active = 1
            ORDER BY ou.unit_name_th
        `);

        console.log('COMPANY level units:', result3.recordset.length);
        result3.recordset.forEach(u => {
            console.log(`  - ${u.unit_name_th} (ID: ${u.unit_id}, parent_id: ${u.parent_id})`);
        });

        // Test 4: ดูว่ามี level อะไรบ้าง
        console.log('\n=== Test 4: All Organization Levels ===');
        const result4 = await pool.request().query(`
            SELECT level_id, level_code, level_name_th, level_order
            FROM OrganizationLevels
            ORDER BY level_order
        `);

        console.log('Available levels:');
        result4.recordset.forEach(l => {
            console.log(`  - ${l.level_name_th} (${l.level_code}) - Order: ${l.level_order}`);
        });

        await pool.close();
        console.log('\n✅ Query test completed!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testBranchesQuery();
