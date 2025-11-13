const { poolPromise } = require('./config/database');

async function testActivate() {
    try {
        const pool = await poolPromise;
        
        console.log('\n=== Test Activate User ===\n');
        
        // 1. Find an inactive user
        const inactiveUsers = await pool.request().query(`
            SELECT TOP 1 user_id, employee_id, first_name, last_name, is_active, role_id
            FROM Users 
            WHERE is_active = 0
            ORDER BY user_id DESC
        `);
        
        if (inactiveUsers.recordset.length === 0) {
            console.log('No inactive users found to test');
            process.exit(0);
        }
        
        const testUser = inactiveUsers.recordset[0];
        console.log('Found inactive user:');
        console.log('  ID:', testUser.user_id);
        console.log('  Name:', testUser.first_name, testUser.last_name);
        console.log('  Employee ID:', testUser.employee_id);
        console.log('  Current is_active:', testUser.is_active);
        console.log('  Role ID:', testUser.role_id);
        
        // 2. Try to activate
        console.log('\nAttempting to activate...');
        const updateResult = await pool.request()
            .input('userId', testUser.user_id)
            .input('isActive', true)
            .query(`
                UPDATE Users
                SET is_active = @isActive,
                    updated_at = GETDATE()
                WHERE user_id = @userId
            `);
        
        console.log('Rows affected:', updateResult.rowsAffected[0]);
        
        // 3. Verify the change
        const verify = await pool.request()
            .input('userId', testUser.user_id)
            .query('SELECT user_id, is_active FROM Users WHERE user_id = @userId');
        
        console.log('\nVerification:');
        console.log('  New is_active:', verify.recordset[0].is_active);
        console.log(verify.recordset[0].is_active ? '✅ SUCCESS' : '❌ FAILED');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testActivate();
