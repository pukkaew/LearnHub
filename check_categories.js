const { poolPromise, sql } = require('./config/database');

async function checkCategories() {
    try {
        const pool = await poolPromise;

        // Check categories table
        console.log('\n=== Categories Table ===');
        const categoriesResult = await pool.request().query(`
            SELECT category_id, category_name, category_type, parent_category_id, is_active
            FROM categories
            WHERE is_active = 1
            ORDER BY category_name
        `);

        console.log('Total categories:', categoriesResult.recordset.length);
        console.log('\nCategories:');
        categoriesResult.recordset.forEach(cat => {
            console.log(`- ${cat.category_id}: ${cat.category_name} (${cat.category_type})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkCategories();
