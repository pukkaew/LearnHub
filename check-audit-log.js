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

        // Check recent audit logs
        const result = await sql.query`
            SELECT TOP 10
                audit_id,
                setting_key,
                old_value,
                new_value,
                changed_by,
                changed_date,
                change_reason
            FROM dbo.SettingAuditLog
            WHERE setting_key = 'system_name'
            ORDER BY changed_date DESC
        `;

        console.log('\n📋 Recent Audit Logs for system_name:\n');
        result.recordset.forEach(log => {
            console.log(`  [${log.changed_date.toISOString()}]`);
            console.log(`    Old: "${log.old_value}"`);
            console.log(`    New: "${log.new_value}"`);
            console.log(`    By User ID: ${log.changed_by}`);
            console.log('');
        });

        if (result.recordset.length === 0) {
            console.log('  No audit logs found for system_name\n');
        }

        await sql.close();
        process.exit(0);
    } catch(err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
