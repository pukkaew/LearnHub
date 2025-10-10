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
        console.log('✅ Connected to database');

        // Check current value
        const current = await sql.query`
            SELECT setting_key, setting_value
            FROM dbo.SystemSettings
            WHERE setting_key = 'primary_color'
        `;

        console.log('\n📋 Current primary_color:', current.recordset[0]?.setting_value);

        // Update to desired color
        const newColor = '#ff5900'; // Orange-red color
        const userId = 1; // Admin user

        await sql.query`
            EXEC sp_UpdateSystemSetting
                @setting_key = 'primary_color',
                @new_value = ${newColor},
                @modified_by = ${userId},
                @ip_address = NULL,
                @user_agent = 'update-primary-color.js script',
                @change_reason = 'Update primary color from blue to orange-red'
        `;

        console.log(`✅ Updated primary_color to: ${newColor}`);

        // Verify
        const verify = await sql.query`
            SELECT setting_key, setting_value
            FROM dbo.SystemSettings
            WHERE setting_key = 'primary_color'
        `;

        console.log('✅ Verified new value:', verify.recordset[0]?.setting_value);

        await sql.close();
        process.exit(0);
    } catch(err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
