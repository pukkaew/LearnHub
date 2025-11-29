const { poolPromise, sql } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Starting migration to remove test_id from courses...');

        const pool = await poolPromise;
        const sqlFilePath = path.join(__dirname, 'sql', 'remove_test_id_from_courses.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Split by GO statements
        const batches = sqlContent.split(/^\s*GO\s*$/gim).filter(batch => batch.trim());

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch) {
                console.log(`Executing batch ${i + 1}/${batches.length}...`);
                await pool.request().query(batch);
            }
        }

        console.log('✓ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

runMigration();
