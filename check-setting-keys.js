const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true
    }
};

(async () => {
    try {
        await sql.connect(config);

        const result = await sql.query`
            SELECT setting_key, setting_value
            FROM dbo.SystemSettings
            WHERE setting_key LIKE '%name%' OR setting_key LIKE '%color%'
            ORDER BY setting_key
        `;

        console.log('\n📊 Settings Keys in Database:\n');
        result.recordset.forEach(row => {
            console.log(`  ${row.setting_key}: "${row.setting_value}"`);
        });
        console.log('');

        await sql.close();
        process.exit(0);
    } catch(err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
