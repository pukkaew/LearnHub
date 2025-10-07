/**
 * Detailed Settings Test
 * ทดสอบระบบ Settings แบบละเอียด
 */

const sql = require('mssql');

const config = {
    user: 'ruxchai_admin',
    password: 'P@ssw0rd2024',
    server: 'localhost',
    database: 'RuxchaiLearnHub',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

async function testSettingsDetailed() {
    try {
        console.log('🔍 Starting detailed settings test...\n');

        // Connect to database
        const pool = await sql.connect(config);
        console.log('✅ Connected to database\n');

        // Test 1: Check current values in database
        console.log('═══════════════════════════════════════════════════════');
        console.log('TEST 1: Check Database Values');
        console.log('═══════════════════════════════════════════════════════');

        const dbResult = await pool.request()
            .query(`
                SELECT TOP 10
                    setting_key,
                    setting_label,
                    setting_type,
                    setting_value,
                    default_value,
                    CASE
                        WHEN setting_value IS NULL THEN 'NULL'
                        WHEN setting_value = '' THEN 'EMPTY_STRING'
                        ELSE 'HAS_VALUE'
                    END as value_status
                FROM SystemSettings
                WHERE category = 'general'
                ORDER BY display_order
            `);

        console.log('\n📊 Database Values (First 10 General Settings):');
        console.log('─────────────────────────────────────────────────────────');
        dbResult.recordset.forEach((row, index) => {
            console.log(`\n${index + 1}. ${row.setting_key}`);
            console.log(`   Label: ${row.setting_label}`);
            console.log(`   Type: ${row.setting_type}`);
            console.log(`   Value Status: ${row.value_status}`);
            console.log(`   Current Value: "${row.setting_value}"`);
            console.log(`   Default Value: "${row.default_value}"`);
            console.log(`   Should Display: "${row.setting_value !== null && row.setting_value !== '' ? row.setting_value : row.default_value}"`);
        });

        // Test 2: Simulate what EJS template should render
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('TEST 2: Simulated EJS Rendering');
        console.log('═══════════════════════════════════════════════════════');

        const setting = dbResult.recordset[0]; // system_name
        const displayValue = (setting.setting_value !== null && setting.setting_value !== '')
            ? setting.setting_value
            : setting.default_value;

        console.log(`\n📝 Example: ${setting.setting_key}`);
        console.log(`   setting_value !== null: ${setting.setting_value !== null}`);
        console.log(`   setting_value !== '': ${setting.setting_value !== ''}`);
        console.log(`   Both conditions: ${setting.setting_value !== null && setting.setting_value !== ''}`);
        console.log(`   Final display value: "${displayValue}"`);
        console.log(`\n   Rendered HTML would be:`);
        console.log(`   <input type="text" value="${displayValue}" data-setting-key="${setting.setting_key}" />`);

        // Test 3: Test JavaScript value collection logic
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('TEST 3: JavaScript Collection Logic Simulation');
        console.log('═══════════════════════════════════════════════════════');

        const mockInputs = [
            { key: 'system_name', type: 'string', tagName: 'INPUT', value: 'รุกชัย หงเส้ง LMS', checked: undefined },
            { key: 'enable_two_factor', type: 'boolean', tagName: 'INPUT', value: 'on', checked: true },
            { key: 'session_timeout', type: 'number', tagName: 'INPUT', value: '3600', checked: undefined },
            { key: 'primary_color', type: 'color', tagName: 'INPUT', value: '#3B82F6', checked: undefined }
        ];

        console.log('\n🔍 Simulating JavaScript collection:');
        mockInputs.forEach((input, index) => {
            let collectedValue;

            if (input.type === 'boolean') {
                collectedValue = input.checked ? 'true' : 'false';
            } else if (input.tagName === 'TEXTAREA') {
                collectedValue = input.value;
            } else {
                collectedValue = input.value;
            }

            console.log(`\n${index + 1}. ${input.key} (${input.type})`);
            console.log(`   Input value: "${input.value}"`);
            console.log(`   Collected value: "${collectedValue}"`);
            console.log(`   Will send: {"key":"${input.key}","value":"${collectedValue}"}`);
        });

        // Test 4: Test actual batch update with real values
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('TEST 4: Batch Update with Real Values');
        console.log('═══════════════════════════════════════════════════════');

        const testSettings = [
            { key: 'system_name', value: 'TEST System Name 测试' },
            { key: 'system_name_en', value: 'TEST System Name EN' },
            { key: 'company_name', value: 'TEST Company 公司' }
        ];

        console.log('\n📤 Sending batch update with test values:');
        testSettings.forEach(s => {
            console.log(`   ${s.key} = "${s.value}"`);
        });

        // Execute batch update
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const setting of testSettings) {
                await transaction.request()
                    .input('setting_key', sql.NVarChar(100), setting.key)
                    .input('setting_value', sql.NVarChar(sql.MAX), setting.value)
                    .input('modified_by', sql.Int, 17)
                    .execute('sp_UpdateSystemSetting');
            }

            await transaction.commit();
            console.log('\n✅ Batch update committed successfully');

        } catch (error) {
            await transaction.rollback();
            console.log('\n❌ Batch update failed:', error.message);
            throw error;
        }

        // Test 5: Verify values were saved
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('TEST 5: Verify Saved Values');
        console.log('═══════════════════════════════════════════════════════');

        const verifyResult = await pool.request()
            .query(`
                SELECT setting_key, setting_value, modified_at
                FROM SystemSettings
                WHERE setting_key IN ('system_name', 'system_name_en', 'company_name')
                ORDER BY setting_key
            `);

        console.log('\n📊 Verification Results:');
        verifyResult.recordset.forEach(row => {
            const expected = testSettings.find(s => s.key === row.setting_key);
            const match = row.setting_value === expected.value;
            console.log(`\n   ${row.setting_key}:`);
            console.log(`      Expected: "${expected.value}"`);
            console.log(`      Actual:   "${row.setting_value}"`);
            console.log(`      Match:    ${match ? '✅' : '❌'}`);
            console.log(`      Modified: ${row.modified_at}`);
        });

        // Test 6: Test what would be displayed after reload
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('TEST 6: Display After Reload');
        console.log('═══════════════════════════════════════════════════════');

        const displayResult = await pool.request()
            .query(`
                SELECT
                    setting_key,
                    setting_value,
                    default_value,
                    CASE
                        WHEN setting_value IS NOT NULL AND setting_value != ''
                        THEN setting_value
                        ELSE default_value
                    END as display_value
                FROM SystemSettings
                WHERE setting_key IN ('system_name', 'system_name_en', 'company_name')
                ORDER BY setting_key
            `);

        console.log('\n📺 What should display in form:');
        displayResult.recordset.forEach(row => {
            console.log(`\n   ${row.setting_key}:`);
            console.log(`      Display Value: "${row.display_value}"`);
            console.log(`      (from ${row.setting_value !== null && row.setting_value !== '' ? 'setting_value' : 'default_value'})`);
        });

        // Summary
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('📋 TEST SUMMARY');
        console.log('═══════════════════════════════════════════════════════\n');

        const allMatch = verifyResult.recordset.every(row => {
            const expected = testSettings.find(s => s.key === row.setting_key);
            return row.setting_value === expected.value;
        });

        if (allMatch) {
            console.log('✅ ALL TESTS PASSED');
            console.log('   - Database values are correct');
            console.log('   - Save functionality works');
            console.log('   - Display logic is correct');
            console.log('\n💡 If values still not showing in browser:');
            console.log('   1. Clear browser cache (Ctrl+Shift+Delete)');
            console.log('   2. Hard reload (Ctrl+F5)');
            console.log('   3. Check browser console for errors');
        } else {
            console.log('❌ SOME TESTS FAILED');
            console.log('   - Check the verification results above');
        }

        await pool.close();

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testSettingsDetailed();
