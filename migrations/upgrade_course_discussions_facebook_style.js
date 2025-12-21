/**
 * Migration: Upgrade CourseDiscussions to Facebook-style
 * เพิ่ม columns สำหรับ replies, reactions, pin
 */

const { poolPromise, sql } = require('../config/database');

async function up() {
    console.log('🔄 Running migration: upgrade_course_discussions_facebook_style');

    const pool = await poolPromise;

    // Check if CourseDiscussions table exists
    const tableCheck = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'CourseDiscussions'
    `);

    if (tableCheck.recordset.length === 0) {
        console.log('  ⚠️ CourseDiscussions table does not exist, creating it first...');

        // Create CourseDiscussions table
        await pool.request().query(`
            CREATE TABLE CourseDiscussions (
                discussion_id INT IDENTITY(1,1) PRIMARY KEY,
                course_id INT NOT NULL,
                user_id INT NOT NULL,
                material_id INT NULL,
                parent_id INT NULL,
                comment_text NVARCHAR(MAX) NOT NULL,
                status NVARCHAR(20) DEFAULT 'active',
                is_pinned BIT DEFAULT 0,
                pinned_at DATETIME2 NULL,
                reply_to_user_id INT NULL,
                reply_to_discussion_id INT NULL,
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE(),
                CONSTRAINT FK_CourseDiscussions_Course FOREIGN KEY (course_id) REFERENCES courses(course_id),
                CONSTRAINT FK_CourseDiscussions_User FOREIGN KEY (user_id) REFERENCES users(user_id),
                CONSTRAINT FK_CourseDiscussions_Parent FOREIGN KEY (parent_id) REFERENCES CourseDiscussions(discussion_id)
            )
        `);
        console.log('  ✅ Created CourseDiscussions table with all columns');
    } else {
        // Add is_pinned column if not exists
        const isPinnedCheck = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'CourseDiscussions' AND COLUMN_NAME = 'is_pinned'
        `);
        if (isPinnedCheck.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE CourseDiscussions ADD is_pinned BIT DEFAULT 0
            `);
            console.log('  ✅ Added is_pinned column');
        } else {
            console.log('  ⏭️ is_pinned column already exists');
        }

        // Add pinned_at column if not exists
        const pinnedAtCheck = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'CourseDiscussions' AND COLUMN_NAME = 'pinned_at'
        `);
        if (pinnedAtCheck.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE CourseDiscussions ADD pinned_at DATETIME2 NULL
            `);
            console.log('  ✅ Added pinned_at column');
        } else {
            console.log('  ⏭️ pinned_at column already exists');
        }

        // Add reply_to_user_id column if not exists
        const replyToUserCheck = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'CourseDiscussions' AND COLUMN_NAME = 'reply_to_user_id'
        `);
        if (replyToUserCheck.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE CourseDiscussions ADD reply_to_user_id INT NULL
            `);
            console.log('  ✅ Added reply_to_user_id column');
        } else {
            console.log('  ⏭️ reply_to_user_id column already exists');
        }

        // Add reply_to_discussion_id column if not exists
        const replyToDiscussionCheck = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'CourseDiscussions' AND COLUMN_NAME = 'reply_to_discussion_id'
        `);
        if (replyToDiscussionCheck.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE CourseDiscussions ADD reply_to_discussion_id INT NULL
            `);
            console.log('  ✅ Added reply_to_discussion_id column');
        } else {
            console.log('  ⏭️ reply_to_discussion_id column already exists');
        }
    }

    // Create CourseDiscussionReactions table if not exists
    const reactionsTableCheck = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'CourseDiscussionReactions'
    `);

    if (reactionsTableCheck.recordset.length === 0) {
        await pool.request().query(`
            CREATE TABLE CourseDiscussionReactions (
                reaction_id INT IDENTITY(1,1) PRIMARY KEY,
                discussion_id INT NOT NULL,
                user_id INT NOT NULL,
                reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
                created_at DATETIME2 DEFAULT GETDATE(),
                CONSTRAINT FK_DiscussionReactions_Discussion FOREIGN KEY (discussion_id) REFERENCES CourseDiscussions(discussion_id) ON DELETE CASCADE,
                CONSTRAINT FK_DiscussionReactions_User FOREIGN KEY (user_id) REFERENCES users(user_id),
                CONSTRAINT UQ_DiscussionReactions UNIQUE (discussion_id, user_id)
            )
        `);
        console.log('  ✅ Created CourseDiscussionReactions table');

        // Create indexes
        await pool.request().query(`
            CREATE INDEX IX_DiscussionReactions_Discussion ON CourseDiscussionReactions(discussion_id);
            CREATE INDEX IX_DiscussionReactions_User ON CourseDiscussionReactions(user_id);
        `);
        console.log('  ✅ Created indexes for CourseDiscussionReactions');
    } else {
        console.log('  ⏭️ CourseDiscussionReactions table already exists');
    }

    // Create indexes for CourseDiscussions if not exists
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CourseDiscussions_Course' AND object_id = OBJECT_ID('CourseDiscussions'))
            CREATE INDEX IX_CourseDiscussions_Course ON CourseDiscussions(course_id);
        `);
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CourseDiscussions_User' AND object_id = OBJECT_ID('CourseDiscussions'))
            CREATE INDEX IX_CourseDiscussions_User ON CourseDiscussions(user_id);
        `);
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CourseDiscussions_Parent' AND object_id = OBJECT_ID('CourseDiscussions'))
            CREATE INDEX IX_CourseDiscussions_Parent ON CourseDiscussions(parent_id);
        `);
        console.log('  ✅ Ensured indexes exist for CourseDiscussions');
    } catch (err) {
        console.log('  ⏭️ Some indexes may already exist');
    }

    console.log('✅ Migration completed: upgrade_course_discussions_facebook_style');
}

async function down() {
    console.log('🔄 Rolling back migration: upgrade_course_discussions_facebook_style');

    const pool = await poolPromise;

    try {
        await pool.request().query(`DROP TABLE IF EXISTS CourseDiscussionReactions`);
        console.log('  ✅ Dropped CourseDiscussionReactions table');
    } catch (error) {
        console.log('  ⏭️ Could not drop CourseDiscussionReactions table:', error.message);
    }

    // Note: We don't remove the added columns to avoid data loss
    console.log('  ⚠️ Added columns in CourseDiscussions are preserved to avoid data loss');

    console.log('✅ Rollback completed: upgrade_course_discussions_facebook_style');
}

// Run migration
if (require.main === module) {
    up()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
}

module.exports = { up, down };
