const { poolPromise } = require('./config/database');

async function checkCategories() {
    try {
        const pool = await poolPromise;

        // Check table with correct name CourseCategories
        const result = await pool.request()
            .query(`SELECT * FROM CourseCategories ORDER BY display_order`);

        console.log('=== Course Categories in Database ===');
        console.log('Total categories:', result.recordset.length);

        if (result.recordset.length > 0) {
            result.recordset.forEach((cat, i) => {
                console.log(`${i + 1}. ${cat.category_name} (ID: ${cat.category_id}, Active: ${cat.is_active})`);
            });
        } else {
            console.log('No categories found in database!');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkCategories();
