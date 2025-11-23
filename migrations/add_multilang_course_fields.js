const sql = require('mssql');
const dbConfig = require('../config/database');

async function addMultiLanguageFields() {
    try {
        console.log('🌐 Adding multi-language fields to courses and lessons tables...\n');

        await sql.connect(dbConfig);

        // Add language fields to courses table
        console.log('📝 Adding language fields to courses table...');

        await sql.query`
            -- Add English fields for course content
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('courses') AND name = 'prerequisite_knowledge_en')
            BEGIN
                ALTER TABLE courses ADD prerequisite_knowledge_en NVARCHAR(MAX);
            END
        `;

        await sql.query`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('courses') AND name = 'instructor_title_en')
            BEGIN
                ALTER TABLE courses ADD instructor_title_en NVARCHAR(255);
            END
        `;

        await sql.query`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('courses') AND name = 'course_name_en')
            BEGIN
                ALTER TABLE courses ADD course_name_en NVARCHAR(255);
            END
        `;

        await sql.query`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('courses') AND name = 'description_en')
            BEGIN
                ALTER TABLE courses ADD description_en NVARCHAR(MAX);
            END
        `;

        // Add language fields to lessons table
        console.log('📝 Adding language fields to lessons table...');

        await sql.query`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lessons') AND name = 'title_en')
            BEGIN
                ALTER TABLE lessons ADD title_en NVARCHAR(255);
            END
        `;

        await sql.query`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lessons') AND name = 'content_en')
            BEGIN
                ALTER TABLE lessons ADD content_en NVARCHAR(MAX);
            END
        `;

        console.log('✅ Multi-language fields added successfully!\n');

        // Update existing data with English defaults
        console.log('📝 Updating existing course data with English defaults...');

        await sql.query`
            UPDATE courses
            SET
                prerequisite_knowledge_en = CASE
                    WHEN prerequisite_knowledge = N'ไม่มีความต้องการพื้นฐานพิเศษ' THEN 'No special prerequisites required'
                    ELSE prerequisite_knowledge
                END,
                instructor_title_en = CASE
                    WHEN instructor_title = N'ผู้สอน' THEN 'Instructor'
                    WHEN instructor_title = N'อาจารย์' THEN 'Lecturer'
                    ELSE instructor_title
                END
            WHERE prerequisite_knowledge_en IS NULL OR instructor_title_en IS NULL
        `;

        await sql.query`
            UPDATE lessons
            SET
                title_en = CASE
                    WHEN title = N'เนื้อหาหลักสูตร' THEN 'Course Content'
                    WHEN title LIKE N'%บทที่%' THEN REPLACE(title, N'บทที่', 'Lesson ')
                    ELSE title
                END,
                content_en = content
            WHERE title_en IS NULL
        `;

        console.log('✅ Existing data updated with English defaults!\n');

        // Rename existing fields to _th
        console.log('📝 Renaming existing fields to _th...');

        await sql.query`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('courses') AND name = 'prerequisite_knowledge_th')
            BEGIN
                EXEC sp_rename 'courses.prerequisite_knowledge', 'prerequisite_knowledge_th', 'COLUMN';
            END
        `;

        await sql.query`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('courses') AND name = 'instructor_title_th')
            BEGIN
                EXEC sp_rename 'courses.instructor_title', 'instructor_title_th', 'COLUMN';
            END
        `;

        await sql.query`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lessons') AND name = 'title_th')
            BEGIN
                EXEC sp_rename 'lessons.title', 'title_th', 'COLUMN';
            END
        `;

        await sql.query`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lessons') AND name = 'content_th')
            BEGIN
                EXEC sp_rename 'lessons.content', 'content_th', 'COLUMN';
            END
        `;

        console.log('✅ Fields renamed successfully!\n');
        console.log('🎉 Migration completed successfully!\n');

    } catch (err) {
        console.error('❌ Migration failed:', err);
        throw err;
    } finally {
        await sql.close();
    }
}

// Run migration
addMultiLanguageFields()
    .then(() => {
        console.log('✅ All done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
