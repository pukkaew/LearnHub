const { poolPromise, sql } = require('./config/database');

async function checkNestedReplies() {
    try {
        const pool = await poolPromise;

        // Get all replies with their reply_to_comment_id
        const result = await pool.request()
            .query(`
                SELECT
                    c.comment_id,
                    c.article_id,
                    c.parent_comment_id,
                    c.reply_to_comment_id,
                    c.reply_to_user_id,
                    c.comment_text,
                    c.created_at,
                    CONCAT(u.first_name, ' ', u.last_name) as user_name,
                    (SELECT CONCAT(ru.first_name, ' ', ru.last_name)
                     FROM users ru WHERE ru.user_id = c.reply_to_user_id) as reply_to_name
                FROM Comments c
                LEFT JOIN users u ON c.user_id = u.user_id
                WHERE c.parent_comment_id IS NOT NULL
                AND c.status = 'active'
                ORDER BY c.parent_comment_id, c.created_at
            `);

        console.log('=== ALL REPLIES IN DATABASE ===');
        console.log('Total replies:', result.recordset.length);
        console.log('');

        // Group by parent_comment_id
        const byParent = {};
        result.recordset.forEach(r => {
            if (!byParent[r.parent_comment_id]) {
                byParent[r.parent_comment_id] = [];
            }
            byParent[r.parent_comment_id].push(r);
        });

        for (const parentId of Object.keys(byParent)) {
            console.log(`\n--- Parent Comment ID: ${parentId} ---`);
            byParent[parentId].forEach(r => {
                console.log(`  Reply ID: ${r.comment_id}`);
                console.log(`    User: ${r.user_name}`);
                console.log(`    Text: ${r.comment_text.substring(0, 50)}...`);
                console.log(`    reply_to_comment_id: ${r.reply_to_comment_id || 'NULL'}`);
                console.log(`    reply_to_user_id: ${r.reply_to_user_id || 'NULL'}`);
                console.log(`    reply_to_name: ${r.reply_to_name || 'NULL'}`);
                console.log('');
            });
        }

        // Check for nested replies (reply_to_comment_id that points to another reply)
        console.log('\n=== NESTED REPLIES ANALYSIS ===');
        const replyIds = result.recordset.map(r => r.comment_id);
        const nestedReplies = result.recordset.filter(r =>
            r.reply_to_comment_id && replyIds.includes(r.reply_to_comment_id)
        );

        console.log(`Total nested replies (reply to reply): ${nestedReplies.length}`);
        nestedReplies.forEach(r => {
            console.log(`  - Reply ${r.comment_id} replies to Reply ${r.reply_to_comment_id}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkNestedReplies();
