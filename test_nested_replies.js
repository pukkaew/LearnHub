// Comprehensive test for nested replies feature
const { poolPromise, sql } = require('./config/database');
const Comment = require('./models/Comment');

async function testNestedReplies() {
    console.log('========================================');
    console.log('NESTED REPLIES COMPREHENSIVE TEST');
    console.log('========================================\n');

    try {
        const pool = await poolPromise;

        // 1. Check database schema
        console.log('1. DATABASE SCHEMA CHECK');
        console.log('------------------------');
        const schemaResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Comments'
            AND COLUMN_NAME IN ('comment_id', 'parent_comment_id', 'reply_to_user_id', 'reply_to_comment_id')
        `);
        console.table(schemaResult.recordset);

        // 2. Check raw data in database
        console.log('\n2. RAW DATABASE DATA (Replies)');
        console.log('------------------------------');
        const rawData = await pool.request().query(`
            SELECT
                c.comment_id,
                c.parent_comment_id,
                c.reply_to_user_id,
                c.reply_to_comment_id,
                LEFT(c.comment_text, 30) as text,
                CONCAT(u.first_name, ' ', u.last_name) as author
            FROM Comments c
            LEFT JOIN users u ON c.user_id = u.user_id
            WHERE c.parent_comment_id IS NOT NULL
            AND c.status = 'active'
            ORDER BY c.parent_comment_id, c.comment_id
        `);
        console.table(rawData.recordset);

        // 3. Check what Comment model returns
        console.log('\n3. COMMENT MODEL OUTPUT');
        console.log('-----------------------');
        // Find an article with comments
        const articleResult = await pool.request().query(`
            SELECT TOP 1 article_id FROM Comments WHERE parent_comment_id IS NULL AND status = 'active'
        `);

        if (articleResult.recordset.length > 0) {
            const articleId = articleResult.recordset[0].article_id;
            console.log(`Testing with article_id: ${articleId}`);

            const comments = await Comment.getByArticle(articleId, 1, 20, null);

            if (comments.data && comments.data.length > 0) {
                comments.data.forEach(comment => {
                    console.log(`\nMain Comment ${comment.comment_id}: "${comment.comment_text?.substring(0, 30)}..."`);
                    console.log(`  Replies count: ${comment.replies?.length || 0}`);

                    if (comment.replies && comment.replies.length > 0) {
                        comment.replies.forEach(reply => {
                            console.log(`    Reply ${reply.comment_id}:`);
                            console.log(`      - reply_to_comment_id: ${reply.reply_to_comment_id}`);
                            console.log(`      - reply_to_user_id: ${reply.reply_to_user_id}`);
                            console.log(`      - reply_to_name: ${reply.reply_to_name}`);
                            console.log(`      - text: "${reply.comment_text?.substring(0, 20)}..."`);
                        });
                    }
                });
            }
        }

        // 4. Simulate frontend logic
        console.log('\n4. FRONTEND LOGIC SIMULATION');
        console.log('----------------------------');

        // Get sample replies for a comment
        const sampleReplies = await pool.request().query(`
            SELECT TOP 1 parent_comment_id FROM Comments
            WHERE parent_comment_id IS NOT NULL
            GROUP BY parent_comment_id
            HAVING COUNT(*) > 3
        `);

        if (sampleReplies.recordset.length > 0) {
            const parentCommentId = sampleReplies.recordset[0].parent_comment_id;

            const repliesResult = await pool.request()
                .input('parentId', sql.Int, parentCommentId)
                .query(`
                    SELECT
                        c.comment_id,
                        c.reply_to_comment_id,
                        c.reply_to_user_id,
                        (SELECT CONCAT(ru.first_name, ' ', ru.last_name) FROM users ru WHERE ru.user_id = c.reply_to_user_id) as reply_to_name,
                        LEFT(c.comment_text, 30) as content
                    FROM Comments c
                    WHERE c.parent_comment_id = @parentId AND c.status = 'active'
                    ORDER BY c.created_at ASC
                `);

            const replies = repliesResult.recordset;
            console.log(`\nSimulating renderNestedReplies for comment ${parentCommentId}`);
            console.log(`Total replies: ${replies.length}`);

            // Build replyMap
            const replyMap = {};
            replies.forEach(r => {
                replyMap[r.comment_id] = r;
            });
            console.log('\nReply Map keys:', Object.keys(replyMap));

            // Classify replies
            const directReplies = replies.filter(r => {
                if (!r.reply_to_comment_id) return true;
                return !replyMap[r.reply_to_comment_id];
            });

            const nestedReplies = replies.filter(r => {
                return r.reply_to_comment_id && replyMap[r.reply_to_comment_id];
            });

            console.log('\nDirect Replies (reply_to_comment_id is null or parent not in list):');
            directReplies.forEach(r => {
                console.log(`  - ID ${r.comment_id}: reply_to_comment_id=${r.reply_to_comment_id}, "${r.content}"`);
            });

            console.log('\nNested Replies (reply_to_comment_id points to another reply):');
            nestedReplies.forEach(r => {
                console.log(`  - ID ${r.comment_id}: reply_to_comment_id=${r.reply_to_comment_id} (parent: ID ${r.reply_to_comment_id}), "${r.content}"`);
            });

            // Group nested by parent
            const nestedByParent = {};
            nestedReplies.forEach(r => {
                const parentId = r.reply_to_comment_id;
                if (!nestedByParent[parentId]) {
                    nestedByParent[parentId] = [];
                }
                nestedByParent[parentId].push(r);
            });

            console.log('\nNested grouped by parent:');
            Object.keys(nestedByParent).forEach(parentId => {
                console.log(`  Parent ${parentId}: [${nestedByParent[parentId].map(r => r.comment_id).join(', ')}]`);
            });

            // Simulate render order
            console.log('\n5. EXPECTED RENDER ORDER');
            console.log('------------------------');
            directReplies.forEach(reply => {
                console.log(`[DIRECT] Reply ${reply.comment_id}: "${reply.content}"`);
                const children = nestedByParent[reply.comment_id] || [];
                children.forEach(child => {
                    console.log(`  [NESTED] ↳ Reply ${child.comment_id}: "${child.content}" (replying to ${child.reply_to_comment_id})`);
                });
            });
        }

        console.log('\n========================================');
        console.log('TEST COMPLETE');
        console.log('========================================');

    } catch (error) {
        console.error('Test error:', error);
    }

    process.exit(0);
}

testNestedReplies();
