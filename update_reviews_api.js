const fs = require('fs');

const filePath = 'D:/App/LearnHub/controllers/courseController.js';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `    // Get course reviews
    async getCourseReviews(req, res) {
        try {
            const { course_id } = req.params;
            // TODO: Implement when reviews table is ready
            res.json({ success: true, data: [] });
        } catch (error) {
            console.error('Get reviews error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get related courses`;

const newCode = `    // Get course reviews
    async getCourseReviews(req, res) {
        try {
            const { course_id } = req.params;
            const pool = await poolPromise;

            // Get reviews with user info
            const result = await pool.request()
                .input('course_id', sql.Int, course_id)
                .query(\`
                    SELECT
                        cr.review_id,
                        cr.course_id,
                        cr.user_id,
                        cr.rating,
                        cr.review_text,
                        cr.created_at,
                        u.username,
                        u.first_name,
                        u.last_name,
                        up.avatar_url
                    FROM course_reviews cr
                    JOIN users u ON cr.user_id = u.user_id
                    LEFT JOIN user_profiles up ON u.user_id = up.user_id
                    WHERE cr.course_id = @course_id AND cr.is_approved = 1
                    ORDER BY cr.created_at DESC
                \`);

            // Get average rating and count
            const statsResult = await pool.request()
                .input('course_id', sql.Int, course_id)
                .query(\`
                    SELECT
                        COUNT(*) as total_reviews,
                        AVG(CAST(rating AS FLOAT)) as average_rating,
                        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
                        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
                        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
                        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
                        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
                    FROM course_reviews
                    WHERE course_id = @course_id AND is_approved = 1
                \`);

            const stats = statsResult.recordset[0];

            res.json({
                success: true,
                data: result.recordset,
                stats: {
                    total_reviews: stats.total_reviews || 0,
                    average_rating: stats.average_rating ? parseFloat(stats.average_rating.toFixed(1)) : 0,
                    distribution: {
                        5: stats.five_star || 0,
                        4: stats.four_star || 0,
                        3: stats.three_star || 0,
                        2: stats.two_star || 0,
                        1: stats.one_star || 0
                    }
                }
            });
        } catch (error) {
            console.error('Get reviews error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Submit a review
    async submitReview(req, res) {
        try {
            const { course_id } = req.params;
            const { rating, review_text } = req.body;
            const user_id = req.session.user?.user_id;

            if (!user_id) {
                return res.status(401).json({ success: false, message: 'Please login first' });
            }

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
            }

            const pool = await poolPromise;

            // Check if user is enrolled in this course
            const enrollmentCheck = await pool.request()
                .input('course_id', sql.Int, course_id)
                .input('user_id', sql.Int, user_id)
                .query(\`
                    SELECT enrollment_id FROM user_courses
                    WHERE course_id = @course_id AND user_id = @user_id
                \`);

            if (enrollmentCheck.recordset.length === 0) {
                return res.status(403).json({ success: false, message: 'You must be enrolled to review this course' });
            }

            // Check if user already reviewed
            const existingReview = await pool.request()
                .input('course_id', sql.Int, course_id)
                .input('user_id', sql.Int, user_id)
                .query(\`
                    SELECT review_id FROM course_reviews
                    WHERE course_id = @course_id AND user_id = @user_id
                \`);

            if (existingReview.recordset.length > 0) {
                // Update existing review
                await pool.request()
                    .input('course_id', sql.Int, course_id)
                    .input('user_id', sql.Int, user_id)
                    .input('rating', sql.Int, rating)
                    .input('review_text', sql.NVarChar(sql.MAX), review_text || '')
                    .query(\`
                        UPDATE course_reviews
                        SET rating = @rating, review_text = @review_text, updated_at = GETDATE()
                        WHERE course_id = @course_id AND user_id = @user_id
                    \`);

                return res.json({ success: true, message: 'Review updated successfully' });
            }

            // Insert new review
            await pool.request()
                .input('course_id', sql.Int, course_id)
                .input('user_id', sql.Int, user_id)
                .input('rating', sql.Int, rating)
                .input('review_text', sql.NVarChar(sql.MAX), review_text || '')
                .query(\`
                    INSERT INTO course_reviews (course_id, user_id, rating, review_text)
                    VALUES (@course_id, @user_id, @rating, @review_text)
                \`);

            res.json({ success: true, message: 'Review submitted successfully' });
        } catch (error) {
            console.error('Submit review error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get user's review for a course
    async getUserReview(req, res) {
        try {
            const { course_id } = req.params;
            const user_id = req.session.user?.user_id;

            if (!user_id) {
                return res.json({ success: true, data: null });
            }

            const pool = await poolPromise;

            const result = await pool.request()
                .input('course_id', sql.Int, course_id)
                .input('user_id', sql.Int, user_id)
                .query(\`
                    SELECT review_id, rating, review_text, created_at, updated_at
                    FROM course_reviews
                    WHERE course_id = @course_id AND user_id = @user_id
                \`);

            res.json({
                success: true,
                data: result.recordset.length > 0 ? result.recordset[0] : null
            });
        } catch (error) {
            console.error('Get user review error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get related courses`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated getCourseReviews, added submitReview and getUserReview APIs');
} else {
    console.log('❌ Could not find the code to replace');
    // Try to find partial match
    if (content.includes('// TODO: Implement when reviews table is ready')) {
        console.log('Found TODO marker, but full pattern did not match');
    }
}
