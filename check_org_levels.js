const { poolPromise } = require('./config/database');

async function checkTable() {
    try {
        const pool = await poolPromise;

        console.log('Checking OrganizationLevels table...\n');

        // Check if table exists
        const tableExists = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'OrganizationLevels'
        `);

        if (tableExists.recordset[0].count === 0) {
            console.log('❌ Table OrganizationLevels does NOT exist!');
            process.exit(0);
        }

        console.log('✅ Table OrganizationLevels exists\n');

        // Get all data
        const result = await pool.request().query('SELECT * FROM OrganizationLevels ORDER BY level_id');

        console.log('Organization Levels:');
        console.log('='.repeat(80));
        result.recordset.forEach(level => {
            console.log(`Level ${level.level_id}: ${level.level_name} (${level.level_code || 'N/A'})`);
        });
        console.log('='.repeat(80));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTable();
