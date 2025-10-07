/**
 * Fix Settings Empty String Issue
 * แก้ปัญหา Save แล้วไม่จดจำค่า
 */

const { poolPromise, sql } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runFix() {
    try {
        console.log('🔧 Starting fix for empty string settings...\n');

        const pool = await poolPromise;

        // Read SQL file
        const sqlFile = path.join(__dirname, 'sql', 'fix_settings_empty_string.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        // Split by GO statements
        const statements = sqlContent
            .split(/\nGO\s*\n/gi)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

        console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            // Skip comments and PRINT statements
            if (statement.startsWith('PRINT ') || statement.match(/^--/)) {
                continue;
            }

            try {
                console.log(`Executing statement ${i + 1}/${statements.length}...`);
                await pool.request().query(statement);
            } catch (error) {
                console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            }
        }

        // Verify the fix
        console.log('\n📊 Checking current settings status...\n');

        const result = await pool.request().query(`
            SELECT
                setting_key,
                setting_value,
                default_value,
                CASE
                    WHEN setting_value IS NULL THEN 'Will use DEFAULT ✅'
                    WHEN setting_value = '' THEN 'EMPTY (Problem!) ❌'
                    ELSE 'Custom value ✓'
                END AS [Status]
            FROM [SystemSettings]
            WHERE setting_category = 'general'
            ORDER BY display_order
        `);

        console.log('General Settings Status:');
        console.table(result.recordset);

        console.log('\n✅ Fix completed successfully!');
        console.log('🔄 Please restart your application to clear the cache.\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error running fix:', error);
        process.exit(1);
    }
}

runFix();
