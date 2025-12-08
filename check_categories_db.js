const db = require('./models');

async function checkCategories() {
    try {
        const categories = await db.CourseCategory.findAll({
            order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
        });

        console.log('=== Course Categories in Database ===');
        console.log('Total categories:', categories.length);

        if (categories.length > 0) {
            categories.forEach((cat, i) => {
                console.log(`${i + 1}. ${cat.name} (ID: ${cat.category_id})`);
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
