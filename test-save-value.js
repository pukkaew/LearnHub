/**
 * Test Save Value - ทดสอบว่า value ถูกส่งมาจาก frontend หรือไม่
 */

const { poolPromise } = require('./config/database');

async function testSave() {
    try {
        console.log('🔍 Testing save value issue...\n');

        const pool = await poolPromise;

        // Check current value
        console.log('📊 Step 1: Checking current system_name value...\n');

        const beforeResult = await pool.request().query(`
            SELECT
                setting_key,
                setting_value,
                default_value,
                COALESCE(setting_value, default_value) AS effective_value
            FROM SystemSettings
            WHERE setting_key = 'system_name'
        `);

        console.log('Current status:');
        console.table(beforeResult.recordset);

        // Simulate update with actual value
        console.log('\n🔧 Step 2: Simulating update to "Rukchai LearnHub"...\n');

        const updateResult = await pool.request()
            .input('setting_key', 'system_name')
            .input('new_value', 'Rukchai LearnHub')
            .input('modified_by', 17)
            .input('ip_address', '127.0.0.1')
            .input('user_agent', 'Test Script')
            .input('change_reason', 'Testing save')
            .execute('sp_UpdateSystemSetting');

        console.log('Update result:');
        console.table(updateResult.recordset);

        // Check after update
        console.log('\n📊 Step 3: Checking after update...\n');

        const afterResult = await pool.request().query(`
            SELECT
                setting_key,
                setting_value,
                default_value,
                COALESCE(setting_value, default_value) AS effective_value
            FROM SystemSettings
            WHERE setting_key = 'system_name'
        `);

        console.log('After update:');
        console.table(afterResult.recordset);

        // Test with empty string
        console.log('\n🔧 Step 4: Testing update with empty string...\n');

        const emptyResult = await pool.request()
            .input('setting_key', 'system_name')
            .input('new_value', '')
            .input('modified_by', 17)
            .input('ip_address', '127.0.0.1')
            .input('user_agent', 'Test Script')
            .input('change_reason', 'Testing empty string')
            .execute('sp_UpdateSystemSetting');

        console.log('Empty string update result:');
        console.table(emptyResult.recordset);

        // Check final state
        const finalResult = await pool.request().query(`
            SELECT
                setting_key,
                setting_value,
                default_value,
                COALESCE(setting_value, default_value) AS effective_value
            FROM SystemSettings
            WHERE setting_key = 'system_name'
        `);

        console.log('\nFinal status:');
        console.table(finalResult.recordset);

        console.log('\n✅ Test completed!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testSave();
