const sql = require('mssql');
const bcrypt = require('bcryptjs');
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
            SELECT
                username,
                password,
                email
            FROM Users
            WHERE username = 'admin'
        `;

        if (result.recordset.length === 0) {
            console.log('❌ Admin user not found');
            process.exit(1);
        }

        const admin = result.recordset[0];
        console.log('\n📋 Admin Account Info:\n');
        console.log(`Username: ${admin.username}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Password Hash exists: ${admin.password ? 'Yes' : 'No'}`);

        // Test common passwords
        const testPasswords = ['admin', 'Admin123', 'admin123', 'password', 'Admin@123'];

        console.log('\n🔐 Testing common passwords:\n');

        for (const pwd of testPasswords) {
            try {
                const match = await bcrypt.compare(pwd, admin.password);
                if (match) {
                    console.log(`✅ Password found: "${pwd}"`);
                } else {
                    console.log(`❌ Not: "${pwd}"`);
                }
            } catch (err) {
                console.log(`⚠️  Error testing "${pwd}": ${err.message}`);
            }
        }

        console.log('\n');

        await sql.close();
        process.exit(0);
    } catch(err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
