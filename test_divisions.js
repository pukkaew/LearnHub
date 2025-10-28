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

async function testDivisions() {
    try {
        const pool = await sql.connect(config);

        const result = await pool.request().query(`
            SELECT
                ou.unit_id,
                ou.unit_name_th,
                ou.parent_id,
                parent.unit_name_th as parent_name,
                parent_level.level_code as parent_level
            FROM OrganizationUnits ou
            INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
            LEFT JOIN OrganizationUnits parent ON ou.parent_id = parent.unit_id
            LEFT JOIN OrganizationLevels parent_level ON parent.level_id = parent_level.level_id
            WHERE ol.level_code = 'DIVISION' AND ou.is_active = 1
            ORDER BY ou.unit_name_th
        `);

        console.log('=== DIVISIONS (ฝ่าย) ===');
        result.recordset.forEach(d => {
            console.log(`\n${d.unit_name_th} (ID: ${d.unit_id})`);
            console.log(`  parent_id: ${d.parent_id}`);
            console.log(`  parent: ${d.parent_name} (${d.parent_level})`);
        });

        await pool.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

testDivisions();
