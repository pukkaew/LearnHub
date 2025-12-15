/**
 * Migration: Add Facebook-style Comment Features
 * - CommentReactions table (6 reaction types)
 * - is_pinned column for Comments table
 */

const { poolPromise, sql } = require('../config/database');

async function migrate() {
    try {
        const pool = await poolPromise;
        console.log('Starting Facebook Comment Features migration...\n');

        // 1. Create CommentReactions table
        console.log('1. Creating CommentReactions table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CommentReactions' AND xtype='U')
            BEGIN
                CREATE TABLE CommentReactions (
                    reaction_id INT IDENTITY(1,1) PRIMARY KEY,
                    comment_id INT NOT NULL,
                    user_id INT NOT NULL,
                    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
                    created_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_CommentReactions_Comment FOREIGN KEY (comment_id) REFERENCES Comments(comment_id) ON DELETE CASCADE,
                    CONSTRAINT FK_CommentReactions_User FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                    CONSTRAINT UQ_CommentReaction_User UNIQUE (comment_id, user_id)
                );
                CREATE INDEX IX_CommentReactions_Comment ON CommentReactions(comment_id);
                CREATE INDEX IX_CommentReactions_User ON CommentReactions(user_id);
                PRINT 'CommentReactions table created successfully';
            END
            ELSE
            BEGIN
                PRINT 'CommentReactions table already exists';
            END
        `);
        console.log('   CommentReactions table ready!\n');

        // 2. Add is_pinned column to Comments table
        console.log('2. Adding is_pinned column to Comments table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Comments') AND name = 'is_pinned')
            BEGIN
                ALTER TABLE Comments ADD is_pinned BIT DEFAULT 0;
                PRINT 'is_pinned column added';
            END
            ELSE
            BEGIN
                PRINT 'is_pinned column already exists';
            END
        `);
        console.log('   is_pinned column ready!\n');

        // 3. Add pinned_at column for sorting
        console.log('3. Adding pinned_at column to Comments table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Comments') AND name = 'pinned_at')
            BEGIN
                ALTER TABLE Comments ADD pinned_at DATETIME NULL;
                PRINT 'pinned_at column added';
            END
            ELSE
            BEGIN
                PRINT 'pinned_at column already exists';
            END
        `);
        console.log('   pinned_at column ready!\n');

        // 4. Migrate existing likes from CommentLikes to CommentReactions
        console.log('4. Migrating existing likes to reactions...');
        const existingLikes = await pool.request().query(`
            SELECT COUNT(*) as count FROM CommentLikes
        `);

        if (existingLikes.recordset[0].count > 0) {
            await pool.request().query(`
                INSERT INTO CommentReactions (comment_id, user_id, reaction_type, created_at)
                SELECT comment_id, user_id, 'like', created_at
                FROM CommentLikes
                WHERE NOT EXISTS (
                    SELECT 1 FROM CommentReactions cr
                    WHERE cr.comment_id = CommentLikes.comment_id
                    AND cr.user_id = CommentLikes.user_id
                )
            `);
            console.log(`   Migrated ${existingLikes.recordset[0].count} existing likes!\n`);
        } else {
            console.log('   No existing likes to migrate.\n');
        }

        console.log('='.repeat(50));
        console.log('Migration completed successfully!');
        console.log('='.repeat(50));

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
