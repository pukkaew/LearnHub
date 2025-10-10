const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

(async () => {
    try {
        await sql.connect(config);

        const result = await sql.query`
            SELECT
                setting_key,
                setting_value,
                default_value,
                setting_category,
                setting_type,
                setting_label
            FROM SystemSettings
            WHERE is_active = 1
            ORDER BY setting_category, display_order
        `;

        console.log('\n📋 All Active System Settings:\n');
        console.log('='.repeat(80));

        let currentCat = '';
        result.recordset.forEach(s => {
            if(s.setting_category !== currentCat) {
                currentCat = s.setting_category;
                console.log('\n🏷️  ' + currentCat.toUpperCase() + ':\n');
            }
            const val = s.setting_value || s.default_value;
            const truncVal = val && val.length > 50 ? val.substring(0, 50) + '...' : val;
            console.log(`  📌 ${s.setting_key} (${s.setting_type}): ${truncVal}`);
        });

        console.log('='.repeat(80));
        console.log(`\n✅ Total settings: ${result.recordset.length}\n`);

        process.exit(0);
    } catch(e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();
