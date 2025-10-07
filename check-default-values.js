/**
 * Check Default Values in Database
 * ตรวจสอบว่า default_value มีค่าจริงหรือเปล่า
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

async function checkDefaultValues() {
    try {
        console.log('🔍 Checking default_value column...\n');

        const pool = await sql.connect(config);
        console.log('✅ Connected to database\n');

        // Check first 10 settings
        const result = await pool.request()
            .query(`
                SELECT TOP 10
                    setting_key,
                    setting_label,
                    setting_value,
                    default_value,
                    CASE
                        WHEN setting_value IS NULL THEN 'NULL'
                        WHEN setting_value = '' THEN 'EMPTY_STRING'
                        ELSE 'HAS_VALUE'
                    END as value_status,
                    CASE
                        WHEN default_value IS NULL THEN 'NULL'
                        WHEN default_value = '' THEN 'EMPTY_STRING'
                        ELSE 'HAS_VALUE'
                    END as default_status
                FROM SystemSettings
                WHERE category = 'general'
                ORDER BY display_order
            `);

        console.log('📊 First 10 General Settings:\n');
        console.log('═══════════════════════════════════════════════════════════════════════════════');

        result.recordset.forEach((row, index) => {
            console.log(`\n${index + 1}. ${row.setting_key}`);
            console.log(`   Label: ${row.setting_label}`);
            console.log(`   setting_value: "${row.setting_value}" (${row.value_status})`);
            console.log(`   default_value: "${row.default_value}" (${row.default_status})`);

            // Calculate what should display
            const shouldDisplay = (row.setting_value !== null && row.setting_value !== '')
                ? row.setting_value
                : row.default_value;
            console.log(`   ➡️  Should Display: "${shouldDisplay}"`);
        });

        // Statistics
        const stats = await pool.request()
            .query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN setting_value IS NULL THEN 1 END) as value_null,
                    COUNT(CASE WHEN setting_value = '' THEN 1 END) as value_empty,
                    COUNT(CASE WHEN setting_value IS NOT NULL AND setting_value != '' THEN 1 END) as value_has_data,
                    COUNT(CASE WHEN default_value IS NULL THEN 1 END) as default_null,
                    COUNT(CASE WHEN default_value = '' THEN 1 END) as default_empty,
                    COUNT(CASE WHEN default_value IS NOT NULL AND default_value != '' THEN 1 END) as default_has_data
                FROM SystemSettings
            `);

        console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
        console.log('📈 STATISTICS (All Settings):');
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log(`\nTotal Settings: ${stats.recordset[0].total}`);
        console.log(`\nsetting_value:`);
        console.log(`  - NULL: ${stats.recordset[0].value_null}`);
        console.log(`  - Empty String: ${stats.recordset[0].value_empty}`);
        console.log(`  - Has Data: ${stats.recordset[0].value_has_data}`);
        console.log(`\ndefault_value:`);
        console.log(`  - NULL: ${stats.recordset[0].default_null}`);
        console.log(`  - Empty String: ${stats.recordset[0].default_empty}`);
        console.log(`  - Has Data: ${stats.recordset[0].default_has_data}`);

        // The problem
        console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
        console.log('🔍 PROBLEM ANALYSIS:');
        console.log('═══════════════════════════════════════════════════════════════════════════════\n');

        if (stats.recordset[0].default_empty > 0 || stats.recordset[0].default_null > 0) {
            console.log('❌ FOUND THE PROBLEM!');
            console.log(`\n   ${stats.recordset[0].default_empty + stats.recordset[0].default_null} settings have empty/null default_value`);
            console.log('\n   This means:');
            console.log('   - setting_value is empty ("")');
            console.log('   - default_value is ALSO empty/null');
            console.log('   - So the EJS template outputs: value=""');
            console.log('   - JavaScript reads empty string from the input');
            console.log('   - Server receives empty string');
            console.log('\n   SOLUTION: Populate default_value column with proper default values');
        } else {
            console.log('✅ All default_value entries have data');
            console.log('\n   The problem must be elsewhere...');
        }

        await pool.close();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkDefaultValues();
