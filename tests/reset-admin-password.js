const { poolPromise } = require('../config/database');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
    try {
        const pool = await poolPromise;

        // Hash the new password
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update admin user password
        const result = await pool.request()
            .input('password', hashedPassword)
            .input('employeeId', 'ADM001')
            .query(`
                UPDATE users
                SET password = @password
                WHERE employee_id = @employeeId
            `);

        console.log('Password reset result:', result.rowsAffected);

        if (result.rowsAffected[0] > 0) {
            console.log('SUCCESS: Admin password reset to "admin123"');
            console.log('Employee ID: ADM001');
        } else {
            console.log('No user found with employee_id = ADM001');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

resetAdminPassword();
