const { poolPromise, sql } = require('./config/database');

async function checkUserRole() {
    try {
        const pool = await poolPromise;

        // Get admin user with role info
        const result = await pool.request().query(`
            SELECT TOP 5
                u.user_id,
                u.username,
                u.email,
                u.role_id,
                r.role_name,
                r.role_id as role_table_id
            FROM Users u
            LEFT JOIN Roles r ON u.role_id = r.role_id
            ORDER BY u.user_id
        `);

        console.log('=== User Role Check ===');
        result.recordset.forEach(user => {
            console.log(`User ID: ${user.user_id}`);
            console.log(`  Username: ${user.username}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Role ID: ${user.role_id}`);
            console.log(`  Role Name: ${user.role_name}`);
            console.log('---');
        });

        // Check all roles in the system
        const rolesResult = await pool.request().query(`
            SELECT role_id, role_name FROM Roles ORDER BY role_id
        `);

        console.log('\n=== Available Roles ===');
        rolesResult.recordset.forEach(role => {
            console.log(`Role ID: ${role.role_id}, Name: ${role.role_name}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUserRole();
