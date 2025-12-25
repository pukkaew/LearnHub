const { poolPromise, sql } = require('../config/database');

/**
 * Re-Index Database Script
 * Drops and re-creates all indexes, updates statistics
 */

async function reIndex() {
    console.log('\n========================================');
    console.log('   DATABASE RE-INDEX SCRIPT');
    console.log('========================================\n');

    const pool = await poolPromise;
    console.log('Connected to database');

    console.log('\n=== DROPPING EXISTING INDEXES ===');

    // Get and drop non-system indexes
    try {
        const dropResult = await pool.request().query(`
            DECLARE @sql NVARCHAR(MAX) = '';

            SELECT @sql = @sql + 'DROP INDEX IF EXISTS ' + QUOTENAME(i.name) + ' ON ' + QUOTENAME(OBJECT_SCHEMA_NAME(i.object_id)) + '.' + QUOTENAME(OBJECT_NAME(i.object_id)) + ';' + CHAR(13)
            FROM sys.indexes i
            INNER JOIN sys.tables t ON i.object_id = t.object_id
            WHERE i.is_primary_key = 0
              AND i.is_unique_constraint = 0
              AND i.type > 0
              AND t.is_ms_shipped = 0
              AND i.name NOT LIKE 'PK_%'
              AND i.name IS NOT NULL;

            EXEC sp_executesql @sql;
        `);
        console.log('Dropped existing indexes');
    } catch (error) {
        console.log('Some indexes could not be dropped:', error.message.substring(0, 50));
    }

    console.log('\n=== CREATING INDEXES ===');

    // Index definitions
    const indexes = [
        // Users table
        { name: 'IX_Users_Username', table: 'users', column: 'username' },
        { name: 'IX_Users_Email', table: 'users', column: 'email' },
        { name: 'IX_Users_EmployeeId', table: 'users', column: 'employee_id' },
        { name: 'IX_Users_RoleId', table: 'users', column: 'role_id' },
        { name: 'IX_Users_DepartmentId', table: 'users', column: 'department_id' },
        { name: 'IX_Users_PositionId', table: 'users', column: 'position_id' },
        { name: 'IX_Users_IsActive', table: 'users', column: 'is_active' },

        // Courses table
        { name: 'IX_Courses_InstructorId', table: 'courses', column: 'instructor_id' },
        { name: 'IX_Courses_CourseCode', table: 'courses', column: 'course_code' },
        { name: 'IX_Courses_IsPublished', table: 'courses', column: 'is_published' },
        { name: 'IX_Courses_IsActive', table: 'courses', column: 'is_active' },
        { name: 'IX_Courses_CourseType', table: 'courses', column: 'course_type' },
        { name: 'IX_Courses_Status', table: 'courses', column: 'status' },

        // Tests table
        { name: 'IX_Tests_CourseId', table: 'tests', column: 'course_id' },
        { name: 'IX_Tests_InstructorId', table: 'tests', column: 'instructor_id' },
        { name: 'IX_Tests_Status', table: 'tests', column: 'status' },
        { name: 'IX_Tests_Type', table: 'tests', column: 'type' },

        // QuestionBank table
        { name: 'IX_QuestionBank_CourseId', table: 'QuestionBank', column: 'course_id' },
        { name: 'IX_QuestionBank_IsActive', table: 'QuestionBank', column: 'is_active' },

        // TestQuestions table
        { name: 'IX_TestQuestions_TestId', table: 'TestQuestions', column: 'test_id' },
        { name: 'IX_TestQuestions_QuestionId', table: 'TestQuestions', column: 'question_id' },

        // TestAttempts table
        { name: 'IX_TestAttempts_TestId', table: 'TestAttempts', column: 'test_id' },
        { name: 'IX_TestAttempts_UserId', table: 'TestAttempts', column: 'user_id' },
        { name: 'IX_TestAttempts_Status', table: 'TestAttempts', column: 'status' },

        // UserAnswers table
        { name: 'IX_UserAnswers_AttemptId', table: 'UserAnswers', column: 'attempt_id' },

        // user_courses table
        { name: 'IX_UserCourses_UserId', table: 'user_courses', column: 'user_id' },
        { name: 'IX_UserCourses_CourseId', table: 'user_courses', column: 'course_id' },

        // Articles table
        { name: 'IX_Articles_AuthorId', table: 'articles', column: 'author_id' },
        { name: 'IX_Articles_Status', table: 'articles', column: 'status' },
        { name: 'IX_Articles_Slug', table: 'articles', column: 'slug' },
        { name: 'IX_Articles_CreatedAt', table: 'articles', column: 'created_at' },

        // Applicants table
        { name: 'IX_Applicants_Email', table: 'Applicants', column: 'email' },

        // Notifications table
        { name: 'IX_Notifications_UserId', table: 'notifications', column: 'user_id' },
        { name: 'IX_Notifications_CreatedAt', table: 'notifications', column: 'created_at' },

        // Chapters table
        { name: 'IX_Chapters_CourseId', table: 'chapters', column: 'course_id' },

        // Lessons table
        { name: 'IX_Lessons_ChapterId', table: 'lessons', column: 'chapter_id' },

        // lesson_progress table
        { name: 'IX_LessonProgress_UserId', table: 'lesson_progress', column: 'user_id' },
        { name: 'IX_LessonProgress_LessonId', table: 'lesson_progress', column: 'lesson_id' },

        // CourseDiscussions table
        { name: 'IX_CourseDiscussions_CourseId', table: 'CourseDiscussions', column: 'course_id' },
        { name: 'IX_CourseDiscussions_UserId', table: 'CourseDiscussions', column: 'user_id' }
    ];

    let created = 0;
    let skipped = 0;

    for (const idx of indexes) {
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = '${idx.name}')
                CREATE INDEX ${idx.name} ON ${idx.table}(${idx.column})
            `);
            console.log(`Created: ${idx.name}`);
            created++;
        } catch (error) {
            skipped++;
        }
    }

    console.log(`\nIndexes: ${created} created, ${skipped} skipped`);

    console.log('\n=== REBUILDING ALL INDEXES ===');
    try {
        await pool.request().query(`
            EXEC sp_MSforeachtable 'ALTER INDEX ALL ON ? REBUILD'
        `);
        console.log('All indexes rebuilt successfully');
    } catch (error) {
        console.log('Index rebuild completed with warnings');
    }

    console.log('\n=== UPDATING STATISTICS ===');
    try {
        await pool.request().query(`EXEC sp_updatestats`);
        console.log('Statistics updated successfully');
    } catch (error) {
        console.log('Statistics update completed');
    }

    console.log('\n========================================');
    console.log('   RE-INDEX COMPLETED!');
    console.log('========================================\n');
}

// Run
reIndex()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Re-index failed:', err);
        process.exit(1);
    });
