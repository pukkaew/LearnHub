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

        // Check both tables
        console.log('\n📊 Checking Settings tables:\n');

        const tables = await sql.query`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME IN ('Settings', 'SystemSettings')
            ORDER BY TABLE_NAME
        `;

        console.log('Available tables:', tables.recordset.map(t => t.TABLE_NAME).join(', '));

        // Check Settings table
        try {
            const settings1 = await sql.query`
                SELECT setting_key, setting_value
                FROM dbo.Settings
                WHERE setting_key = 'system_name'
            `;
            console.log('\n[Settings] system_name:', settings1.recordset[0]);
        } catch (err) {
            console.log('[Settings] Error:', err.message);
        }

        // Check SystemSettings table
        try {
            const settings2 = await sql.query`
                SELECT setting_key, setting_value
                FROM dbo.SystemSettings
                WHERE setting_key = 'system_name'
            `;
            console.log('[SystemSettings] system_name:', settings2.recordset[0]);
        } catch (err) {
            console.log('[SystemSettings] Error:', err.message);
        }

        await sql.close();
        process.exit(0);
    } catch(err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
