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
        const result = await sql.query`SELECT TOP 1 * FROM Users WHERE username = 'admin'`;

        if (result.recordset.length > 0) {
            console.log('\n📋 Users Table Columns:\n');
            Object.keys(result.recordset[0]).forEach(col => {
                console.log(`  - ${col}`);
            });
            console.log('');
        }

        process.exit(0);
    } catch(e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();
