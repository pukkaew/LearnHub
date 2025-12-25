const { poolPromise, sql } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Reset Database Script
 * - Clears all data
 * - Runs all migrations
 * - Re-creates indexes
 * - Seeds initial data
 */

class DatabaseReset {
    constructor() {
        this.pool = null;
    }

    async connect() {
        this.pool = await poolPromise;
        console.log('Connected to MSSQL database');
    }

    async clearAllData() {
        console.log('\n=== CLEARING ALL DATA ===');

        // Get all tables in dependency order and clear them
        const clearScript = `
            -- Disable all foreign key constraints
            DECLARE @sql NVARCHAR(MAX) = '';

            SELECT @sql = @sql + 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + ' NOCHECK CONSTRAINT ' + QUOTENAME(name) + ';'
            FROM sys.foreign_keys;

            EXEC sp_executesql @sql;
        `;

        await this.pool.request().query(clearScript);
        console.log('Foreign key constraints disabled');

        // Get all user tables and delete data
        const tablesResult = await this.pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            AND TABLE_SCHEMA = 'dbo'
            ORDER BY TABLE_NAME
        `);

        for (const row of tablesResult.recordset) {
            const table = row.TABLE_NAME;
            try {
                await this.pool.request().query(`DELETE FROM [${table}]`);
                // Reset identity if exists
                try {
                    await this.pool.request().query(`DBCC CHECKIDENT ('[${table}]', RESEED, 0)`);
                } catch (e) {
                    // No identity column
                }
                console.log(`Cleared table: ${table}`);
            } catch (error) {
                console.log(`Skipped table ${table}: ${error.message.substring(0, 50)}...`);
            }
        }

        // Re-enable all foreign key constraints
        const enableScript = `
            DECLARE @sql NVARCHAR(MAX) = '';

            SELECT @sql = @sql + 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + ' WITH CHECK CHECK CONSTRAINT ' + QUOTENAME(name) + ';'
            FROM sys.foreign_keys;

            EXEC sp_executesql @sql;
        `;

        try {
            await this.pool.request().query(enableScript);
            console.log('Foreign key constraints re-enabled');
        } catch (error) {
            console.log('Some constraints could not be re-enabled (will be fixed by migrations)');
        }

        console.log('All data cleared successfully\n');
    }

    async runMigrations() {
        console.log('\n=== RUNNING MIGRATIONS ===');

        const migrationsDir = path.join(__dirname, '../migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.js'))
            .sort();

        for (const file of files) {
            try {
                console.log(`Running migration: ${file}`);
                const migration = require(path.join(migrationsDir, file));
                if (typeof migration.up === 'function') {
                    await migration.up();
                    console.log(`Completed: ${file}`);
                }
            } catch (error) {
                console.log(`Migration ${file} skipped or already applied: ${error.message}`);
            }
        }

        console.log('Migrations completed\n');
    }

    async reIndex() {
        console.log('\n=== RE-INDEXING DATABASE ===');

        // Drop existing indexes
        const dropIndexes = `
            -- Drop existing non-primary key indexes
            DECLARE @sql NVARCHAR(MAX) = '';

            SELECT @sql = @sql + 'DROP INDEX IF EXISTS ' + QUOTENAME(i.name) + ' ON ' + QUOTENAME(OBJECT_SCHEMA_NAME(i.object_id)) + '.' + QUOTENAME(OBJECT_NAME(i.object_id)) + ';' + CHAR(13)
            FROM sys.indexes i
            INNER JOIN sys.tables t ON i.object_id = t.object_id
            WHERE i.is_primary_key = 0
              AND i.is_unique_constraint = 0
              AND i.type > 0
              AND t.is_ms_shipped = 0
              AND i.name NOT LIKE 'PK_%';

            EXEC sp_executesql @sql;
        `;

        try {
            await this.pool.request().query(dropIndexes);
            console.log('Dropped existing indexes');
        } catch (error) {
            console.log('Some indexes could not be dropped:', error.message);
        }

        // Create indexes
        const indexes = [
            // Users table
            "CREATE INDEX IX_Users_Username ON Users(username)",
            "CREATE INDEX IX_Users_Email ON Users(email)",
            "CREATE INDEX IX_Users_EmployeeId ON Users(employee_id)",
            "CREATE INDEX IX_Users_RoleId ON Users(role_id)",
            "CREATE INDEX IX_Users_DepartmentId ON Users(department_id)",
            "CREATE INDEX IX_Users_PositionId ON Users(position_id)",
            "CREATE INDEX IX_Users_IsActive ON Users(is_active)",

            // Courses table
            "CREATE INDEX IX_Courses_CategoryId ON Courses(category_id)",
            "CREATE INDEX IX_Courses_InstructorId ON Courses(instructor_id)",
            "CREATE INDEX IX_Courses_CourseCode ON Courses(course_code)",
            "CREATE INDEX IX_Courses_IsPublished ON Courses(is_published)",
            "CREATE INDEX IX_Courses_IsActive ON Courses(is_active)",
            "CREATE INDEX IX_Courses_CourseType ON Courses(course_type)",

            // Tests table
            "CREATE INDEX IX_Tests_CourseId ON Tests(course_id)",
            "CREATE INDEX IX_Tests_CreatedBy ON Tests(created_by)",
            "CREATE INDEX IX_Tests_TestCode ON Tests(test_code)",
            "CREATE INDEX IX_Tests_IsPublished ON Tests(is_published)",
            "CREATE INDEX IX_Tests_IsActive ON Tests(is_active)",
            "CREATE INDEX IX_Tests_TestType ON Tests(test_type)",

            // QuestionBank table
            "CREATE INDEX IX_QuestionBank_CourseId ON QuestionBank(course_id)",
            "CREATE INDEX IX_QuestionBank_QuestionType ON QuestionBank(question_type)",
            "CREATE INDEX IX_QuestionBank_Difficulty ON QuestionBank(difficulty_level)",
            "CREATE INDEX IX_QuestionBank_IsActive ON QuestionBank(is_active)",

            // TestQuestions table
            "CREATE INDEX IX_TestQuestions_TestId ON TestQuestions(test_id)",
            "CREATE INDEX IX_TestQuestions_QuestionId ON TestQuestions(question_id)",

            // TestAttempts table
            "CREATE INDEX IX_TestAttempts_TestId ON TestAttempts(test_id)",
            "CREATE INDEX IX_TestAttempts_UserId ON TestAttempts(user_id)",
            "CREATE INDEX IX_TestAttempts_Status ON TestAttempts(status)",

            // UserAnswers table
            "CREATE INDEX IX_UserAnswers_AttemptId ON UserAnswers(attempt_id)",
            "CREATE INDEX IX_UserAnswers_TestQuestionId ON UserAnswers(test_question_id)",

            // Enrollments table
            "CREATE INDEX IX_Enrollments_UserId ON Enrollments(user_id)",
            "CREATE INDEX IX_Enrollments_CourseId ON Enrollments(course_id)",
            "CREATE INDEX IX_Enrollments_Status ON Enrollments(status)",

            // Articles table
            "CREATE INDEX IX_Articles_AuthorId ON Articles(author_id)",
            "CREATE INDEX IX_Articles_IsPublished ON Articles(is_published)",
            "CREATE INDEX IX_Articles_Category ON Articles(category)",
            "CREATE INDEX IX_Articles_CreatedDate ON Articles(created_date)",

            // Applicants table
            "CREATE INDEX IX_Applicants_PositionId ON Applicants(position_id)",
            "CREATE INDEX IX_Applicants_ApplicationStatus ON Applicants(application_status)",
            "CREATE INDEX IX_Applicants_Email ON Applicants(email)",

            // JobPositions table
            "CREATE INDEX IX_JobPositions_DepartmentId ON JobPositions(department_id)",
            "CREATE INDEX IX_JobPositions_IsActive ON JobPositions(is_active)",

            // Notifications table
            "CREATE INDEX IX_Notifications_UserId ON Notifications(user_id)",
            "CREATE INDEX IX_Notifications_IsRead ON Notifications(is_read)",
            "CREATE INDEX IX_Notifications_CreatedAt ON Notifications(created_at)",

            // ActivityLogs table
            "CREATE INDEX IX_ActivityLogs_UserId ON ActivityLogs(user_id)",
            "CREATE INDEX IX_ActivityLogs_ActionType ON ActivityLogs(action_type)",
            "CREATE INDEX IX_ActivityLogs_CreatedAt ON ActivityLogs(created_at)",

            // Chapters table
            "CREATE INDEX IX_Chapters_CourseId ON Chapters(course_id)",
            "CREATE INDEX IX_Chapters_ChapterOrder ON Chapters(chapter_order)",

            // Lessons table
            "CREATE INDEX IX_Lessons_ChapterId ON Lessons(chapter_id)",
            "CREATE INDEX IX_Lessons_LessonOrder ON Lessons(lesson_order)",

            // LessonProgress table
            "CREATE INDEX IX_LessonProgress_UserId ON LessonProgress(user_id)",
            "CREATE INDEX IX_LessonProgress_LessonId ON LessonProgress(lesson_id)",

            // CourseDiscussions table
            "CREATE INDEX IX_CourseDiscussions_CourseId ON CourseDiscussions(course_id)",
            "CREATE INDEX IX_CourseDiscussions_UserId ON CourseDiscussions(user_id)",
            "CREATE INDEX IX_CourseDiscussions_ParentId ON CourseDiscussions(parent_id)"
        ];

        for (const indexSql of indexes) {
            try {
                await this.pool.request().query(indexSql);
                const indexName = indexSql.match(/CREATE INDEX (\w+)/)[1];
                console.log(`Created index: ${indexName}`);
            } catch (error) {
                // Index might already exist or table doesn't exist
                if (!error.message.includes('already exists')) {
                    console.log(`Skipped index: ${error.message.substring(0, 50)}...`);
                }
            }
        }

        // Rebuild all indexes
        console.log('\nRebuilding all indexes...');
        try {
            await this.pool.request().query(`
                EXEC sp_MSforeachtable 'ALTER INDEX ALL ON ? REBUILD'
            `);
            console.log('All indexes rebuilt');
        } catch (error) {
            console.log('Index rebuild skipped:', error.message);
        }

        // Update statistics
        console.log('\nUpdating statistics...');
        try {
            await this.pool.request().query(`
                EXEC sp_updatestats
            `);
            console.log('Statistics updated');
        } catch (error) {
            console.log('Statistics update skipped:', error.message);
        }

        console.log('\nRe-indexing completed\n');
    }

    async seedData() {
        console.log('\n=== SEEDING DATA ===');

        const SeedData = require('../seeds/seedData');
        const seeder = new SeedData();
        await seeder.run();

        console.log('Data seeding completed\n');
    }

    async run() {
        try {
            console.log('========================================');
            console.log('   DATABASE RESET & RE-INDEX SCRIPT');
            console.log('========================================\n');

            await this.connect();
            await this.clearAllData();
            await this.runMigrations();
            await this.reIndex();
            await this.seedData();

            console.log('\n========================================');
            console.log('   DATABASE RESET COMPLETED!');
            console.log('========================================');
            console.log('\nLogin Credentials:');
            console.log('Admin: admin / password123');
            console.log('HR Manager: hr.manager / password123');
            console.log('IT Manager: it.manager / password123');
            console.log('Instructor: instructor1 / password123');
            console.log('========================================\n');

        } catch (error) {
            console.error('Reset failed:', error);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const reset = new DatabaseReset();
    reset.run()
        .then(() => {
            console.log('Process finished');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Process failed:', error);
            process.exit(1);
        });
}

module.exports = DatabaseReset;
