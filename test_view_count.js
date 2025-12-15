const { poolPromise, sql } = require('./config/database');

async function testViewCount() {
    try {
        const pool = await poolPromise;

        console.log('=== TESTING VIEW COUNT DEDUPLICATION ===\n');

        // Get current view count
        const before = await pool.request()
            .input('articleId', sql.Int, 10)
            .query('SELECT views_count FROM articles WHERE article_id = @articleId');

        console.log('Before test - Article 10 views:', before.recordset[0]?.views_count);

        // Simulate a view with viewer info
        const Article = require('./models/Article');

        // Use same session ID for both tests
        const testSessionId = 'dedup-test-session-fixed';

        console.log('\n--- Test 1: First view from session ---');
        const result1 = await Article.addView(10, {
            userId: null,
            sessionId: testSessionId,
            ipAddress: '192.168.1.200',
            userAgent: 'Test Agent'
        });
        console.log('Result:', result1);

        // Try SAME session again
        console.log('\n--- Test 2: Same session again (should NOT count) ---');
        const result2 = await Article.addView(10, {
            userId: null,
            sessionId: testSessionId, // SAME session
            ipAddress: '192.168.1.200',
            userAgent: 'Test Agent'
        });
        console.log('Result:', result2);

        // Get final view count
        const after = await pool.request()
            .input('articleId', sql.Int, 10)
            .query('SELECT views_count FROM articles WHERE article_id = @articleId');

        console.log('\n=== RESULTS ===');
        console.log('Before:', before.recordset[0]?.views_count);
        console.log('After:', after.recordset[0]?.views_count);
        console.log('Views added:', after.recordset[0]?.views_count - before.recordset[0]?.views_count);

        if (result1.counted === true && result2.counted === false) {
            console.log('\n✓ DEDUPLICATION WORKING: First view counted, second view blocked');
        } else if (result1.counted === false && result2.counted === false) {
            console.log('\n✓ Session already viewed within 24 hours (both blocked)');
        } else {
            console.log('\n⚠ Check: First counted=' + result1.counted + ', Second counted=' + result2.counted);
        }

        // Check tracking table
        const logs = await pool.request().query(`
            SELECT view_id, article_id, session_id, ip_address, viewed_at
            FROM ArticleViews
            WHERE session_id = 'dedup-test-session-fixed'
            ORDER BY viewed_at DESC
        `);

        console.log('\n=== View Logs for Test Session ===');
        console.log('Records found:', logs.recordset.length);
        logs.recordset.forEach(l => {
            console.log(`  #${l.view_id} | Viewed at: ${l.viewed_at}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testViewCount();
