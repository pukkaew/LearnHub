const { poolPromise } = require('./config/database');

async function testDashboardAPIs() {
    try {
        const pool = await poolPromise;
        const userId = 24; // Test user

        console.log('=== Testing Dashboard APIs ===\n');

        // Test getProgress query
        console.log('1. Testing getProgress query:');
        const progressResult = await pool.request()
            .input('user_id', require('mssql').Int, userId)
            .query(`
                SELECT TOP 5
                    c.course_id,
                    c.title,
                    uc.progress as progress_percentage,
                    uc.status,
                    uc.enrollment_date,
                    uc.completion_date as completed_at
                FROM user_courses uc
                INNER JOIN courses c ON uc.course_id = c.course_id
                WHERE uc.user_id = @user_id
                    AND uc.status IN ('enrolled', 'in_progress', 'completed', 'active')
                ORDER BY
                    CASE WHEN uc.status IN ('in_progress', 'active') AND uc.progress > 0 THEN 1
                         WHEN uc.status IN ('enrolled', 'active') AND uc.progress = 0 THEN 2
                         ELSE 3 END,
                    uc.progress DESC
            `);
        console.log('Records found:', progressResult.recordset.length);
        if (progressResult.recordset.length > 0) {
            console.log(progressResult.recordset);
        }

        // Test getRecentArticles query
        console.log('\n2. Testing getRecentArticles query:');
        const articlesResult = await pool.request().query(`
            SELECT TOP 6
                a.article_id,
                a.title,
                a.excerpt,
                a.featured_image as thumbnail,
                a.views_count as view_count,
                a.published_at,
                a.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as author_name
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.user_id
            WHERE a.status = 'published'
            ORDER BY a.published_at DESC, a.created_at DESC
        `);
        console.log('Records found:', articlesResult.recordset.length);
        if (articlesResult.recordset.length > 0) {
            console.log(articlesResult.recordset.map(a => ({
                article_id: a.article_id,
                title: a.title,
                thumbnail: a.thumbnail,
                author_name: a.author_name,
                view_count: a.view_count
            })));
        }

        // Test getRecentCourses query
        console.log('\n3. Testing getRecentCourses query:');
        const coursesResult = await pool.request()
            .input('user_id', require('mssql').Int, userId)
            .query(`
                SELECT TOP 5
                    c.course_id,
                    c.title,
                    c.thumbnail,
                    c.description,
                    CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                    uc.progress as progress_percentage,
                    uc.status,
                    uc.last_access_date as last_accessed_at
                FROM user_courses uc
                INNER JOIN courses c ON uc.course_id = c.course_id
                LEFT JOIN users u ON c.instructor_id = u.user_id
                WHERE uc.user_id = @user_id
                    AND uc.status IN ('enrolled', 'in_progress', 'active')
                ORDER BY uc.last_access_date DESC, uc.enrollment_date DESC
            `);
        console.log('Records found:', coursesResult.recordset.length);
        if (coursesResult.recordset.length > 0) {
            console.log(coursesResult.recordset.map(c => ({
                course_id: c.course_id,
                title: c.title,
                progress_percentage: c.progress_percentage,
                status: c.status
            })));
        }

        console.log('\n=== All APIs working correctly! ===');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testDashboardAPIs();
