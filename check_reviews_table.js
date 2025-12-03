const { poolPromise } = require('./config/database');

async function checkReviewsTable() {
    try {
        const pool = await poolPromise;

        // Check reviews for course 1
        const reviews = await pool.request().query(`
            SELECT cr.*, u.first_name, u.last_name
            FROM course_reviews cr
            LEFT JOIN users u ON cr.user_id = u.user_id
            WHERE cr.course_id = 1
        `);

        console.log('=== Reviews for Course 1 ===');
        if (reviews.recordset.length === 0) {
            console.log('No reviews found');
        } else {
            reviews.recordset.forEach(r => {
                console.log('User:', r.first_name, r.last_name, '(ID:', r.user_id + ')');
                console.log('  Rating:', r.rating, 'stars');
                console.log('  Review:', r.review_text || '(no text)');
                console.log('  Created:', r.created_at);
                console.log('---');
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkReviewsTable();
