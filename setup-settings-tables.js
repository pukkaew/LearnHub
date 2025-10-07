const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./config/database');

async function setupSettingsTables() {
    try {
        console.log('🔧 Setting up Settings System tables...\n');

        const pool = await poolPromise;
        console.log('✅ Connected to database\n');

        // Read SQL file
        const sqlFilePath = path.join(__dirname, 'sql', 'create_settings_system.sql');
        console.log(`📄 Reading SQL file: ${sqlFilePath}`);

        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Split SQL into batches (split by GO statements)
        // Replace \r\n with \n first to normalize line endings
        const normalizedContent = sqlContent.replace(/\r\n/g, '\n');
        const batches = normalizedContent
            .split(/\nGO\n|\nGO$|^GO\n/gm)
            .map(batch => batch.trim())
            .filter(batch => batch.length > 0 && !batch.startsWith('--') && !batch.startsWith('USE'));

        console.log(`📝 Found ${batches.length} SQL batches to execute\n`);

        // Execute each batch
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];

            // Skip USE statements and comments
            if (batch.startsWith('USE ') || batch.startsWith('--')) {
                continue;
            }

            try {
                console.log(`⚙️  Executing batch ${i + 1}/${batches.length}...`);

                // Log first 100 characters of the batch for debugging
                const preview = batch.substring(0, 100).replace(/\s+/g, ' ');
                console.log(`   Preview: ${preview}${batch.length > 100 ? '...' : ''}`);

                await pool.request().query(batch);
                console.log(`✅ Batch ${i + 1} completed\n`);
            } catch (batchError) {
                // Some errors are expected (like "table already exists")
                if (batchError.message.includes('already an object') ||
                    batchError.message.includes('already exists') ||
                    batchError.message.includes('Cannot insert duplicate key')) {
                    console.log(`⚠️  Batch ${i + 1} skipped (already exists)\n`);
                } else {
                    console.error(`❌ Error in batch ${i + 1}:`, batchError.message);
                    console.error(`   Batch content: ${batch.substring(0, 200)}...\n`);
                    // Continue with next batch instead of stopping
                }
            }
        }

        // Verify tables were created
        console.log('\n🔍 Verifying tables...');
        const tablesResult = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME IN ('SystemSettings', 'UserSettings', 'DepartmentSettings', 'SettingAuditLog')
            ORDER BY TABLE_NAME
        `);

        console.log('\n📊 Tables found:');
        tablesResult.recordset.forEach(row => {
            console.log(`   ✓ ${row.TABLE_NAME}`);
        });

        // Verify stored procedures
        console.log('\n🔍 Verifying stored procedures...');
        const procsResult = await pool.request().query(`
            SELECT ROUTINE_NAME
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_TYPE = 'PROCEDURE'
                AND ROUTINE_NAME LIKE 'sp_%Setting%'
            ORDER BY ROUTINE_NAME
        `);

        console.log('\n📋 Stored procedures found:');
        procsResult.recordset.forEach(row => {
            console.log(`   ✓ ${row.ROUTINE_NAME}`);
        });

        // Check if we have default settings
        const settingsCount = await pool.request().query(`
            SELECT COUNT(*) as count FROM SystemSettings
        `);

        console.log(`\n📈 System Settings count: ${settingsCount.recordset[0].count}`);

        console.log('\n🎉 Settings System setup completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

setupSettingsTables();
