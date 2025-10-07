const bcrypt = require('bcryptjs');
const { poolPromise } = require('./config/database');

async function resetAdminPassword() {
    try {
        const pool = await poolPromise;

        const newPassword = 'password123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        console.log('Generated hash:', hashedPassword);

        const result = await pool.request()
            .input('employee_id', 'ADM001')
            .input('password', hashedPassword)
            .query(`
                UPDATE Users
                SET password = @password
                WHERE employee_id = @employee_id
            `);

        console.log('✅ Password reset successfully for ADM001');
        console.log('   Employee ID: ADM001');
        console.log('   Password: password123');
        console.log('   Rows affected:', result.rowsAffected[0]);

        const verify = await pool.request()
            .input('employee_id', 'ADM001')
            .query('SELECT employee_id, email FROM Users WHERE employee_id = @employee_id');

        if (verify.recordset.length > 0) {
            console.log('\n📋 User details:');
            console.log('   Employee ID:', verify.recordset[0].employee_id);
            console.log('   Email:', verify.recordset[0].email);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetAdminPassword();