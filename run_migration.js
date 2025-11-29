const { poolPromise, sql } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Starting migration...');

        const pool = await poolPromise;
        const sqlFilePath = path.join(__dirname, 'sql', 'create_chapters_lessons.sql');
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

        // Verify tables were created
        const result = await pool.request().query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME IN ('chapters', 'lessons')
            ORDER BY TABLE_NAME
        `);

        console.log('\nTables created:');
        result.recordset.forEach(row => {
            console.log(`  - ${row.TABLE_NAME}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

runMigration();
