const { poolPromise } = require('../config/database');

async function checkAdminUsers() {
    try {
        const pool = await poolPromise;

        // First check table structure
        const columns = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'users'
        `);
        console.log('Users table columns:', columns.recordset.map(c => c.COLUMN_NAME).join(', '));

        // Get all users to find admin
        const result = await pool.request().query(`
            SELECT TOP 10 * FROM users ORDER BY user_id
        `);

        console.log('\nUsers found:');
        result.recordset.forEach(u => {
            console.log(`- ID: ${u.user_id}, Employee: ${u.employee_id}, Name: ${u.first_name} ${u.last_name}, Role: ${u.role || u.role_id}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkAdminUsers();
