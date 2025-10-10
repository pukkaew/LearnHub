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
            SELECT TOP 5
                u.user_id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                r.role_name,
                u.is_active
            FROM Users u
            LEFT JOIN Roles r ON u.role_id = r.role_id
            WHERE u.is_active = 1
            ORDER BY u.user_id
        `;

        console.log('\n📋 User Accounts in System:\n');
        console.log('='.repeat(60));

        result.recordset.forEach(u => {
            console.log(`\n👤 Username: ${u.username}`);
            console.log(`   Email: ${u.email}`);
            console.log(`   Name: ${u.first_name} ${u.last_name}`);
            console.log(`   Role: ${u.role_name}`);
            console.log(`   Status: ${u.is_active ? 'Active' : 'Inactive'}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log(`\nTotal active users: ${result.recordset.length}\n`);

        await sql.close();
        process.exit(0);
    } catch(err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
