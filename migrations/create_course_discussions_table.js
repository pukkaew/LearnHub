/**
 * Migration: Create course_discussions table
 * สำหรับระบบความคิดเห็นในหลักสูตร
 */

const { poolPromise, sql } = require('../config/database');

async function up() {
    console.log('🔄 Running migration: create_course_discussions_table');

    const pool = await poolPromise;

    // Check if table exists
    const tableCheck = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'CourseDiscussions'
    `);

    if (tableCheck.recordset.length > 0) {
        console.log('  ⏭️ CourseDiscussions table already exists');
        return;
    }

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
            created_at DATETIME2 DEFAULT GETDATE(),
            updated_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT FK_CourseDiscussions_Course FOREIGN KEY (course_id) REFERENCES courses(course_id),
            CONSTRAINT FK_CourseDiscussions_User FOREIGN KEY (user_id) REFERENCES users(user_id),
            CONSTRAINT FK_CourseDiscussions_Parent FOREIGN KEY (parent_id) REFERENCES CourseDiscussions(discussion_id)
        )
    `);
    console.log('  ✅ Created CourseDiscussions table');

    // Create indexes
    await pool.request().query(`
        CREATE INDEX IX_CourseDiscussions_Course ON CourseDiscussions(course_id);
        CREATE INDEX IX_CourseDiscussions_User ON CourseDiscussions(user_id);
        CREATE INDEX IX_CourseDiscussions_Material ON CourseDiscussions(material_id);
        CREATE INDEX IX_CourseDiscussions_Parent ON CourseDiscussions(parent_id);
    `);
    console.log('  ✅ Created indexes');

    console.log('✅ Migration completed: create_course_discussions_table');
}

async function down() {
    console.log('🔄 Rolling back migration: create_course_discussions_table');

    const pool = await poolPromise;

    try {
        await pool.request().query(`DROP TABLE IF EXISTS CourseDiscussions`);
        console.log('  ✅ Dropped CourseDiscussions table');
    } catch (error) {
        console.log('  ⏭️ Could not drop CourseDiscussions table:', error.message);
    }

    console.log('✅ Rollback completed: create_course_discussions_table');
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
