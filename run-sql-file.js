const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./config/database');

async function runSQLFile() {
    try {
        console.log('🔧 Running SQL file...\n');

        // Read SQL file
        const sqlFilePath = path.join(__dirname, 'sql', 'create_settings_system.sql');
        console.log(`📄 Reading: ${sqlFilePath}\n`);

        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Connect to database
        const pool = await poolPromise;
        console.log('✅ Connected to database\n');

        // Split by GO (handle Windows line endings)
        const batches = sqlContent
            .split(/\r?\nGO\r?\n/i)
            .map(b => b.trim())
            .filter(b => b.length > 0 && !b.match(/^USE\s+/i));

        console.log(`📝 Found ${batches.length} batches\n`);

        // Execute each batch
        for (let i = 0; i < batches.length; i++) {
            try {
                console.log(`⚙️  Executing batch ${i + 1}/${batches.length}...`);
                const preview = batches[i].substring(0, 80).replace(/\s+/g, ' ');
                console.log(`   ${preview}...`);

                await pool.request().query(batches[i]);
                console.log(`✅ Completed\n`);
            } catch (err) {
                if (err.message.includes('already an object') ||
                    err.message.includes('already exists') ||
                    err.message.includes('duplicate key')) {
                    console.log(`⚠️  Skipped (already exists)\n`);
                } else {
                    console.error(`❌ Error: ${err.message}\n`);
                }
            }
        }

        // Verify stored procedures
        const result = await pool.request().query(`
            SELECT ROUTINE_NAME
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_TYPE = 'PROCEDURE'
                AND ROUTINE_NAME LIKE '%Setting%'
            ORDER BY ROUTINE_NAME
        `);

        console.log('📋 Stored Procedures:');
        result.recordset.forEach(row => {
            console.log(`   ✓ ${row.ROUTINE_NAME}`);
        });

        console.log('\n🎉 Done!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

runSQLFile();
