const { poolPromise } = require('./config/database');

async function check() {
    try {
        const pool = await poolPromise;

        // Total users
        const total = await pool.request().query('SELECT COUNT(*) as total FROM users');
        console.log('Total users:', total.recordset[0].total);

        // Active users
        const active = await pool.request().query('SELECT COUNT(*) as active FROM users WHERE is_active = 1');
        console.log('Active users (is_active=1):', active.recordset[0].active);

        // Inactive users
        const inactive = await pool.request().query('SELECT COUNT(*) as inactive FROM users WHERE is_active = 0');
        console.log('Inactive users (is_active=0):', inactive.recordset[0].inactive);

        // By user_type
        const byType = await pool.request().query('SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type');
        console.log('\nBy user_type:');
        byType.recordset.forEach(r => console.log(`  ${r.user_type || 'NULL'}: ${r.count}`));

        // By role
        const byRole = await pool.request().query(`
            SELECT r.role_name, COUNT(u.user_id) as count
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            GROUP BY r.role_name
        `);
        console.log('\nBy role:');
        byRole.recordset.forEach(r => console.log(`  ${r.role_name || 'NULL'}: ${r.count}`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

check();
