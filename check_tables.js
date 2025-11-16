const { poolPromise, sql } = require('./config/database');

async function checkTables() {
    try {
        const pool = await poolPromise;

        // Check all tables
        console.log('\n=== All Tables in Database ===');
        const tablesResult = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);

        console.log('Total tables:', tablesResult.recordset.length);
        console.log('\nTables:');
        tablesResult.recordset.forEach(table => {
            console.log(`- ${table.TABLE_NAME}`);
        });

        // Check if there's CourseCategories or similar
        console.log('\n=== Tables with "categ" in name ===');
        const categoryTablesResult = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            AND TABLE_NAME LIKE '%categ%'
            ORDER BY TABLE_NAME
        `);

        if (categoryTablesResult.recordset.length > 0) {
            categoryTablesResult.recordset.forEach(table => {
                console.log(`- ${table.TABLE_NAME}`);
            });
        } else {
            console.log('No tables with "categ" in name found.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTables();
