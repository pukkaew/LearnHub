const { poolPromise, sql } = require('../config/database');
const bcrypt = require('bcrypt');

/**
 * Seed Data Script - Updated for current table structure
 * Creates initial data for the LearnHub system
 */

class SeedData {
    constructor() {
        this.pool = null;
        this.saltRounds = 12;
    }

    async connect() {
        this.pool = await poolPromise;
        console.log('Connected to MSSQL database for seeding');
    }

    async clearAllData() {
        try {
            console.log('Clearing existing data...');

            // Disable constraints
            await this.pool.request().query(`
                DECLARE @sql NVARCHAR(MAX) = '';
                SELECT @sql = @sql + 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + ' NOCHECK CONSTRAINT ' + QUOTENAME(name) + ';'
                FROM sys.foreign_keys;
                EXEC sp_executesql @sql;
            `);

            // Tables to clear in order
            const tables = [
                'UserAnswers', 'TestAttempts', 'TestQuestions', 'AnswerOptions', 'QuestionBank',
                'ApplicantTestResults', 'ApplicantTestAssignments', 'ApplicantTestProgress', 'ApplicantNotes', 'Applicants',
                'PositionTestSets', 'lesson_progress', 'lessons', 'chapters',
                'user_courses', 'courses', 'CourseCategories', 'tests',
                'Comments', 'articles', 'notifications', 'badges', 'Settings',
                'SystemSettings', 'OrganizationUnits', 'OrganizationLevels',
                'users', 'positions', 'departments', 'roles'
            ];

            for (const table of tables) {
                try {
                    await this.pool.request().query(`DELETE FROM [${table}]`);
                    try {
                        await this.pool.request().query(`DBCC CHECKIDENT ('[${table}]', RESEED, 0)`);
                    } catch (e) { }
                } catch (error) { }
            }

            // Re-enable constraints
            await this.pool.request().query(`
                DECLARE @sql NVARCHAR(MAX) = '';
                SELECT @sql = @sql + 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + ' WITH CHECK CHECK CONSTRAINT ' + QUOTENAME(name) + ';'
                FROM sys.foreign_keys;
                EXEC sp_executesql @sql;
            `);

            console.log('All data cleared successfully');
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }

    async seedRoles() {
        try {
            console.log('Seeding roles...');

            const roles = [
                { role_id: 1, role_name: 'Admin', description: 'System Administrator' },
                { role_id: 2, role_name: 'HR', description: 'Human Resources' },
                { role_id: 3, role_name: 'Manager', description: 'Department Manager' },
                { role_id: 4, role_name: 'Supervisor', description: 'Team Supervisor' },
                { role_id: 5, role_name: 'Employee', description: 'Regular Employee' },
                { role_id: 6, role_name: 'Instructor', description: 'Course Instructor' }
            ];

            for (const role of roles) {
                await this.pool.request()
                    .input('roleId', sql.Int, role.role_id)
                    .input('roleName', sql.NVarChar(50), role.role_name)
                    .input('description', sql.NVarChar(255), role.description)
                    .query(`
                        SET IDENTITY_INSERT roles ON;
                        INSERT INTO roles (role_id, role_name, description, is_active, created_at)
                        VALUES (@roleId, @roleName, @description, 1, GETDATE());
                        SET IDENTITY_INSERT roles OFF;
                    `);
            }

            this.roles = roles;
            console.log(`Seeded ${roles.length} roles`);
        } catch (error) {
            console.error('Error seeding roles:', error);
            throw error;
        }
    }

    async seedDepartments() {
        try {
            console.log('Seeding departments...');

            const departments = [
                { department_id: 1, department_name: 'Information Technology', description: 'IT Department' },
                { department_id: 2, department_name: 'Human Resources', description: 'HR Department' },
                { department_id: 3, department_name: 'Finance', description: 'Finance Department' },
                { department_id: 4, department_name: 'Marketing', description: 'Marketing Department' },
                { department_id: 5, department_name: 'Operations', description: 'Operations Department' },
                { department_id: 6, department_name: 'Sales', description: 'Sales Department' }
            ];

            for (const dept of departments) {
                await this.pool.request()
                    .input('departmentId', sql.Int, dept.department_id)
                    .input('departmentName', sql.NVarChar(100), dept.department_name)
                    .input('description', sql.NVarChar(500), dept.description)
                    .query(`
                        SET IDENTITY_INSERT departments ON;
                        INSERT INTO departments (department_id, department_name, description, is_active, created_at)
                        VALUES (@departmentId, @departmentName, @description, 1, GETDATE());
                        SET IDENTITY_INSERT departments OFF;
                    `);
            }

            this.departments = departments;
            console.log(`Seeded ${departments.length} departments`);
        } catch (error) {
            console.error('Error seeding departments:', error);
            throw error;
        }
    }

    async seedPositions() {
        try {
            console.log('Seeding positions...');

            const positions = [
                { position_id: 1, position_name: 'CEO', department_id: null, level: 1 },
                { position_id: 2, position_name: 'CTO', department_id: 1, level: 2 },
                { position_id: 3, position_name: 'Department Manager', department_id: null, level: 3 },
                { position_id: 4, position_name: 'Team Lead', department_id: null, level: 4 },
                { position_id: 5, position_name: 'Senior Developer', department_id: 1, level: 5 },
                { position_id: 6, position_name: 'Developer', department_id: 1, level: 6 },
                { position_id: 7, position_name: 'Junior Developer', department_id: 1, level: 7 },
                { position_id: 8, position_name: 'HR Manager', department_id: 2, level: 3 },
                { position_id: 9, position_name: 'HR Specialist', department_id: 2, level: 5 },
                { position_id: 10, position_name: 'Accountant', department_id: 3, level: 5 }
            ];

            for (const pos of positions) {
                await this.pool.request()
                    .input('positionId', sql.Int, pos.position_id)
                    .input('positionName', sql.NVarChar(100), pos.position_name)
                    .input('departmentId', sql.Int, pos.department_id)
                    .input('level', sql.Int, pos.level)
                    .query(`
                        SET IDENTITY_INSERT positions ON;
                        INSERT INTO positions (position_id, position_name, department_id, level, is_active, created_at)
                        VALUES (@positionId, @positionName, @departmentId, @level, 1, GETDATE());
                        SET IDENTITY_INSERT positions OFF;
                    `);
            }

            this.positions = positions;
            console.log(`Seeded ${positions.length} positions`);
        } catch (error) {
            console.error('Error seeding positions:', error);
            throw error;
        }
    }

    async seedUsers() {
        try {
            console.log('Seeding users...');

            const passwordHash = await bcrypt.hash('password123', this.saltRounds);

            const users = [
                {
                    user_id: 1,
                    employee_id: 'ADM001',
                    username: 'admin',
                    first_name: 'System',
                    last_name: 'Administrator',
                    email: 'admin@learnhub.com',
                    role_id: 1,
                    department_id: 1,
                    position_id: 1
                },
                {
                    user_id: 2,
                    employee_id: 'HR001',
                    username: 'hr.manager',
                    first_name: 'HR',
                    last_name: 'Manager',
                    email: 'hr@learnhub.com',
                    role_id: 2,
                    department_id: 2,
                    position_id: 8
                },
                {
                    user_id: 3,
                    employee_id: 'MGR001',
                    username: 'it.manager',
                    first_name: 'IT',
                    last_name: 'Manager',
                    email: 'it.manager@learnhub.com',
                    role_id: 3,
                    department_id: 1,
                    position_id: 3
                },
                {
                    user_id: 4,
                    employee_id: 'INS001',
                    username: 'instructor1',
                    first_name: 'John',
                    last_name: 'Smith',
                    email: 'instructor1@learnhub.com',
                    role_id: 6,
                    department_id: 1,
                    position_id: 5
                },
                {
                    user_id: 5,
                    employee_id: 'EMP001',
                    username: 'employee1',
                    first_name: 'Jane',
                    last_name: 'Doe',
                    email: 'employee1@learnhub.com',
                    role_id: 5,
                    department_id: 1,
                    position_id: 6
                }
            ];

            for (const user of users) {
                await this.pool.request()
                    .input('userId', sql.Int, user.user_id)
                    .input('employeeId', sql.NVarChar(20), user.employee_id)
                    .input('username', sql.NVarChar(50), user.username)
                    .input('password', sql.NVarChar(255), passwordHash)
                    .input('email', sql.NVarChar(100), user.email)
                    .input('firstName', sql.NVarChar(100), user.first_name)
                    .input('lastName', sql.NVarChar(100), user.last_name)
                    .input('departmentId', sql.Int, user.department_id)
                    .input('positionId', sql.Int, user.position_id)
                    .input('roleId', sql.Int, user.role_id)
                    .query(`
                        SET IDENTITY_INSERT users ON;
                        INSERT INTO users (
                            user_id, employee_id, username, password, email,
                            first_name, last_name, department_id, position_id, role_id,
                            is_active, email_verified, created_at
                        ) VALUES (
                            @userId, @employeeId, @username, @password, @email,
                            @firstName, @lastName, @departmentId, @positionId, @roleId,
                            1, 1, GETDATE()
                        );
                        SET IDENTITY_INSERT users OFF;
                    `);
            }

            this.users = users;
            console.log(`Seeded ${users.length} users`);
        } catch (error) {
            console.error('Error seeding users:', error);
            throw error;
        }
    }

    async seedCourseCategories() {
        try {
            console.log('Seeding course categories...');

            const categories = [
                { category_id: 1, category_name: 'Programming', category_name_en: 'Programming', description: 'Programming and Software Development' },
                { category_id: 2, category_name: 'Management', category_name_en: 'Management', description: 'Management and Leadership' },
                { category_id: 3, category_name: 'HR', category_name_en: 'Human Resources', description: 'Human Resources Training' },
                { category_id: 4, category_name: 'Safety', category_name_en: 'Safety', description: 'Workplace Safety Training' },
                { category_id: 5, category_name: 'Compliance', category_name_en: 'Compliance', description: 'Compliance and Regulatory Training' },
                { category_id: 6, category_name: 'Communication', category_name_en: 'Communication', description: 'Communication Skills' }
            ];

            for (const cat of categories) {
                await this.pool.request()
                    .input('categoryId', sql.Int, cat.category_id)
                    .input('categoryName', sql.NVarChar(100), cat.category_name)
                    .input('categoryNameEn', sql.NVarChar(100), cat.category_name_en)
                    .input('description', sql.NVarChar(500), cat.description)
                    .query(`
                        SET IDENTITY_INSERT CourseCategories ON;
                        INSERT INTO CourseCategories (category_id, category_name, category_name_en, description, is_active, created_at)
                        VALUES (@categoryId, @categoryName, @categoryNameEn, @description, 1, GETDATE());
                        SET IDENTITY_INSERT CourseCategories OFF;
                    `);
            }

            this.categories = categories;
            console.log(`Seeded ${categories.length} course categories`);
        } catch (error) {
            console.error('Error seeding course categories:', error);
            throw error;
        }
    }

    async seedCourses() {
        try {
            console.log('Seeding courses...');

            const courses = [
                {
                    course_id: 1,
                    course_code: 'JS101',
                    title: 'JavaScript Fundamentals',
                    category: 'Programming',
                    course_type: 'Online',
                    difficulty_level: 'Beginner',
                    language: 'TH',
                    description: 'Learn the fundamentals of JavaScript programming',
                    learning_objectives: 'Understand variables, functions, and basic programming concepts',
                    target_audience: 'Developers, Students',
                    duration_hours: 40,
                    max_students: 30,
                    instructor_id: 4,
                    passing_score: 70,
                    max_attempts: 3
                },
                {
                    course_id: 2,
                    course_code: 'MGT101',
                    title: 'Leadership Fundamentals',
                    category: 'Management',
                    course_type: 'Classroom',
                    difficulty_level: 'Intermediate',
                    language: 'TH',
                    description: 'Essential leadership skills for managers',
                    learning_objectives: 'Develop leadership and team management skills',
                    target_audience: 'Managers, Team Leads',
                    duration_hours: 24,
                    max_students: 20,
                    instructor_id: 4,
                    passing_score: 75,
                    max_attempts: 2
                },
                {
                    course_id: 3,
                    course_code: 'SAFE101',
                    title: 'Workplace Safety Training',
                    category: 'Safety',
                    course_type: 'Online',
                    difficulty_level: 'Beginner',
                    language: 'TH',
                    description: 'Basic workplace safety guidelines and procedures',
                    learning_objectives: 'Understand safety protocols and emergency procedures',
                    target_audience: 'All Employees',
                    duration_hours: 8,
                    max_students: 100,
                    instructor_id: 4,
                    passing_score: 80,
                    max_attempts: 5
                }
            ];

            for (const course of courses) {
                await this.pool.request()
                    .input('courseId', sql.Int, course.course_id)
                    .input('courseCode', sql.NVarChar(20), course.course_code)
                    .input('title', sql.NVarChar(200), course.title)
                    .input('category', sql.NVarChar(100), course.category)
                    .input('courseType', sql.NVarChar(50), course.course_type)
                    .input('difficultyLevel', sql.NVarChar(50), course.difficulty_level)
                    .input('language', sql.NVarChar(10), course.language)
                    .input('description', sql.NVarChar(sql.MAX), course.description)
                    .input('learningObjectives', sql.NVarChar(sql.MAX), course.learning_objectives)
                    .input('targetAudience', sql.NVarChar(500), course.target_audience)
                    .input('durationHours', sql.Decimal(5, 2), course.duration_hours)
                    .input('maxStudents', sql.Int, course.max_students)
                    .input('instructorId', sql.Int, course.instructor_id)
                    .input('passingScore', sql.Int, course.passing_score)
                    .input('maxAttempts', sql.Int, course.max_attempts)
                    .query(`
                        SET IDENTITY_INSERT courses ON;
                        INSERT INTO courses (
                            course_id, course_code, title, category,
                            course_type, difficulty_level, language, description, learning_objectives,
                            target_audience, duration_hours, max_students, instructor_id,
                            passing_score, max_attempts, status, is_published, is_active, created_at
                        ) VALUES (
                            @courseId, @courseCode, @title, @category,
                            @courseType, @difficultyLevel, @language, @description, @learningObjectives,
                            @targetAudience, @durationHours, @maxStudents, @instructorId,
                            @passingScore, @maxAttempts, 'active', 1, 1, GETDATE()
                        );
                        SET IDENTITY_INSERT courses OFF;
                    `);
            }

            this.courses = courses;
            console.log(`Seeded ${courses.length} courses`);
        } catch (error) {
            console.error('Error seeding courses:', error);
            throw error;
        }
    }

    async seedTests() {
        try {
            console.log('Seeding tests...');

            const tests = [
                {
                    test_id: 1,
                    title: 'JavaScript Fundamentals Test',
                    description: 'Test knowledge of JavaScript basics',
                    course_id: 1,
                    instructor_id: 4,
                    type: 'Assessment',
                    time_limit: 60,
                    total_marks: 100,
                    passing_marks: 70,
                    attempts_allowed: 3
                },
                {
                    test_id: 2,
                    title: 'Leadership Assessment',
                    description: 'Evaluate leadership capabilities',
                    course_id: 2,
                    instructor_id: 4,
                    type: 'Assessment',
                    time_limit: 45,
                    total_marks: 100,
                    passing_marks: 75,
                    attempts_allowed: 2
                },
                {
                    test_id: 3,
                    title: 'Pre-employment Test',
                    description: 'General aptitude test for job applicants',
                    course_id: null,
                    instructor_id: 4,
                    type: 'Pre-employment',
                    time_limit: 90,
                    total_marks: 100,
                    passing_marks: 65,
                    attempts_allowed: 1
                }
            ];

            for (const test of tests) {
                await this.pool.request()
                    .input('testId', sql.Int, test.test_id)
                    .input('title', sql.NVarChar(200), test.title)
                    .input('description', sql.NVarChar(sql.MAX), test.description)
                    .input('courseId', sql.Int, test.course_id)
                    .input('instructorId', sql.Int, test.instructor_id)
                    .input('type', sql.NVarChar(50), test.type)
                    .input('timeLimit', sql.Int, test.time_limit)
                    .input('totalMarks', sql.Int, test.total_marks)
                    .input('passingMarks', sql.Int, test.passing_marks)
                    .input('attemptsAllowed', sql.Int, test.attempts_allowed)
                    .query(`
                        SET IDENTITY_INSERT tests ON;
                        INSERT INTO tests (
                            test_id, title, description, course_id, instructor_id,
                            type, time_limit, total_marks, passing_marks, attempts_allowed,
                            status, created_at
                        ) VALUES (
                            @testId, @title, @description, @courseId, @instructorId,
                            @type, @timeLimit, @totalMarks, @passingMarks, @attemptsAllowed,
                            'published', GETDATE()
                        );
                        SET IDENTITY_INSERT tests OFF;
                    `);
            }

            this.tests = tests;
            console.log(`Seeded ${tests.length} tests`);
        } catch (error) {
            console.error('Error seeding tests:', error);
            throw error;
        }
    }

    async seedArticles() {
        try {
            console.log('Seeding articles...');

            const articles = [
                {
                    article_id: 1,
                    title: 'Getting Started with JavaScript ES6',
                    slug: 'getting-started-with-javascript-es6',
                    content: 'ES6 introduced many new features that make JavaScript development more efficient...',
                    category: 'Programming',
                    author_id: 4,
                    status: 'published'
                },
                {
                    article_id: 2,
                    title: 'Effective Team Leadership Strategies',
                    slug: 'effective-team-leadership-strategies',
                    content: 'Leadership is not about being in charge, it is about taking care of those in your charge...',
                    category: 'Management',
                    author_id: 4,
                    status: 'published'
                },
                {
                    article_id: 3,
                    title: 'Workplace Safety Best Practices',
                    slug: 'workplace-safety-best-practices',
                    content: 'Creating a safe work environment is everyones responsibility...',
                    category: 'Safety',
                    author_id: 4,
                    status: 'published'
                }
            ];

            for (const article of articles) {
                await this.pool.request()
                    .input('articleId', sql.Int, article.article_id)
                    .input('title', sql.NVarChar(300), article.title)
                    .input('slug', sql.NVarChar(300), article.slug)
                    .input('content', sql.NVarChar(sql.MAX), article.content)
                    .input('category', sql.NVarChar(100), article.category)
                    .input('authorId', sql.Int, article.author_id)
                    .input('status', sql.NVarChar(50), article.status)
                    .query(`
                        SET IDENTITY_INSERT articles ON;
                        INSERT INTO articles (article_id, title, slug, content, category, author_id, status, created_at)
                        VALUES (@articleId, @title, @slug, @content, @category, @authorId, @status, GETDATE());
                        SET IDENTITY_INSERT articles OFF;
                    `);
            }

            this.articles = articles;
            console.log(`Seeded ${articles.length} articles`);
        } catch (error) {
            console.error('Error seeding articles:', error);
            throw error;
        }
    }

    async seedSystemSettings() {
        try {
            console.log('Seeding system settings...');

            const settings = [
                // General Settings
                { setting_id: 1, setting_category: 'general', setting_key: 'company_name', setting_value: 'LearnHub', setting_type: 'text', setting_label: 'Company Name', setting_description: 'Company name displayed in the system', default_value: 'LearnHub', display_order: 1, group_name: 'company' },
                { setting_id: 2, setting_category: 'general', setting_key: 'company_name_en', setting_value: 'LearnHub Learning Management System', setting_type: 'text', setting_label: 'Company Name (English)', setting_description: 'Company name in English', default_value: 'LearnHub LMS', display_order: 2, group_name: 'company' },
                { setting_id: 3, setting_category: 'general', setting_key: 'company_logo', setting_value: '/images/logo.png', setting_type: 'file', setting_label: 'Company Logo', setting_description: 'Logo displayed in the header', default_value: '/images/logo.png', display_order: 3, group_name: 'company' },
                { setting_id: 4, setting_category: 'general', setting_key: 'company_address', setting_value: 'Bangkok, Thailand', setting_type: 'textarea', setting_label: 'Company Address', setting_description: 'Company address', default_value: '', display_order: 4, group_name: 'company' },
                { setting_id: 5, setting_category: 'general', setting_key: 'company_phone', setting_value: '+66 2 123 4567', setting_type: 'text', setting_label: 'Company Phone', setting_description: 'Company phone number', default_value: '', display_order: 5, group_name: 'company' },
                { setting_id: 6, setting_category: 'general', setting_key: 'company_email', setting_value: 'info@learnhub.com', setting_type: 'email', setting_label: 'Company Email', setting_description: 'Company contact email', default_value: '', display_order: 6, group_name: 'company' },
                { setting_id: 7, setting_category: 'general', setting_key: 'timezone', setting_value: 'Asia/Bangkok', setting_type: 'select', setting_label: 'Timezone', setting_description: 'System timezone', default_value: 'Asia/Bangkok', display_order: 7, group_name: 'localization' },
                { setting_id: 8, setting_category: 'general', setting_key: 'date_format', setting_value: 'DD/MM/YYYY', setting_type: 'select', setting_label: 'Date Format', setting_description: 'Date display format', default_value: 'DD/MM/YYYY', display_order: 8, group_name: 'localization' },
                { setting_id: 9, setting_category: 'general', setting_key: 'time_format', setting_value: 'HH:mm', setting_type: 'select', setting_label: 'Time Format', setting_description: 'Time display format', default_value: 'HH:mm', display_order: 9, group_name: 'localization' },
                { setting_id: 10, setting_category: 'general', setting_key: 'default_language', setting_value: 'th', setting_type: 'select', setting_label: 'Default Language', setting_description: 'System default language', default_value: 'th', display_order: 10, group_name: 'localization' },

                // Email Settings
                { setting_id: 11, setting_category: 'email', setting_key: 'smtp_host', setting_value: 'smtp.gmail.com', setting_type: 'text', setting_label: 'SMTP Host', setting_description: 'SMTP server hostname', default_value: '', display_order: 1, group_name: 'smtp' },
                { setting_id: 12, setting_category: 'email', setting_key: 'smtp_port', setting_value: '587', setting_type: 'number', setting_label: 'SMTP Port', setting_description: 'SMTP server port', default_value: '587', display_order: 2, group_name: 'smtp' },
                { setting_id: 13, setting_category: 'email', setting_key: 'smtp_user', setting_value: '', setting_type: 'text', setting_label: 'SMTP Username', setting_description: 'SMTP authentication username', default_value: '', display_order: 3, group_name: 'smtp' },
                { setting_id: 14, setting_category: 'email', setting_key: 'smtp_password', setting_value: '', setting_type: 'password', setting_label: 'SMTP Password', setting_description: 'SMTP authentication password', default_value: '', display_order: 4, group_name: 'smtp', is_sensitive: true },
                { setting_id: 15, setting_category: 'email', setting_key: 'smtp_secure', setting_value: 'true', setting_type: 'boolean', setting_label: 'Use TLS/SSL', setting_description: 'Enable TLS/SSL encryption', default_value: 'true', display_order: 5, group_name: 'smtp' },
                { setting_id: 16, setting_category: 'email', setting_key: 'email_from_name', setting_value: 'LearnHub', setting_type: 'text', setting_label: 'From Name', setting_description: 'Email sender name', default_value: 'LearnHub', display_order: 6, group_name: 'sender' },
                { setting_id: 17, setting_category: 'email', setting_key: 'email_from_address', setting_value: 'noreply@learnhub.com', setting_type: 'email', setting_label: 'From Address', setting_description: 'Email sender address', default_value: '', display_order: 7, group_name: 'sender' },

                // Security Settings
                { setting_id: 18, setting_category: 'security', setting_key: 'password_min_length', setting_value: '8', setting_type: 'number', setting_label: 'Minimum Password Length', setting_description: 'Minimum characters required for password', default_value: '8', display_order: 1, group_name: 'password' },
                { setting_id: 19, setting_category: 'security', setting_key: 'password_require_uppercase', setting_value: 'true', setting_type: 'boolean', setting_label: 'Require Uppercase', setting_description: 'Password must contain uppercase letter', default_value: 'true', display_order: 2, group_name: 'password' },
                { setting_id: 20, setting_category: 'security', setting_key: 'password_require_lowercase', setting_value: 'true', setting_type: 'boolean', setting_label: 'Require Lowercase', setting_description: 'Password must contain lowercase letter', default_value: 'true', display_order: 3, group_name: 'password' },
                { setting_id: 21, setting_category: 'security', setting_key: 'password_require_number', setting_value: 'true', setting_type: 'boolean', setting_label: 'Require Number', setting_description: 'Password must contain number', default_value: 'true', display_order: 4, group_name: 'password' },
                { setting_id: 22, setting_category: 'security', setting_key: 'password_require_special', setting_value: 'false', setting_type: 'boolean', setting_label: 'Require Special Character', setting_description: 'Password must contain special character', default_value: 'false', display_order: 5, group_name: 'password' },
                { setting_id: 23, setting_category: 'security', setting_key: 'session_timeout', setting_value: '480', setting_type: 'number', setting_label: 'Session Timeout (minutes)', setting_description: 'Session expiration time in minutes', default_value: '480', display_order: 6, group_name: 'session' },
                { setting_id: 24, setting_category: 'security', setting_key: 'max_login_attempts', setting_value: '5', setting_type: 'number', setting_label: 'Max Login Attempts', setting_description: 'Maximum failed login attempts before lockout', default_value: '5', display_order: 7, group_name: 'session' },
                { setting_id: 25, setting_category: 'security', setting_key: 'lockout_duration', setting_value: '30', setting_type: 'number', setting_label: 'Lockout Duration (minutes)', setting_description: 'Account lockout duration in minutes', default_value: '30', display_order: 8, group_name: 'session' },
                { setting_id: 26, setting_category: 'security', setting_key: 'two_factor_enabled', setting_value: 'false', setting_type: 'boolean', setting_label: 'Enable Two-Factor Authentication', setting_description: 'Enable 2FA for all users', default_value: 'false', display_order: 9, group_name: 'authentication' },

                // Appearance Settings
                { setting_id: 27, setting_category: 'appearance', setting_key: 'primary_color', setting_value: '#1976D2', setting_type: 'color', setting_label: 'Primary Color', setting_description: 'Primary theme color', default_value: '#1976D2', display_order: 1, group_name: 'theme' },
                { setting_id: 28, setting_category: 'appearance', setting_key: 'secondary_color', setting_value: '#424242', setting_type: 'color', setting_label: 'Secondary Color', setting_description: 'Secondary theme color', default_value: '#424242', display_order: 2, group_name: 'theme' },
                { setting_id: 29, setting_category: 'appearance', setting_key: 'accent_color', setting_value: '#FF5722', setting_type: 'color', setting_label: 'Accent Color', setting_description: 'Accent theme color', default_value: '#FF5722', display_order: 3, group_name: 'theme' },
                { setting_id: 30, setting_category: 'appearance', setting_key: 'sidebar_style', setting_value: 'expanded', setting_type: 'select', setting_label: 'Sidebar Style', setting_description: 'Default sidebar display style', default_value: 'expanded', display_order: 4, group_name: 'layout' },
                { setting_id: 31, setting_category: 'appearance', setting_key: 'items_per_page', setting_value: '10', setting_type: 'select', setting_label: 'Items Per Page', setting_description: 'Default pagination size', default_value: '10', display_order: 5, group_name: 'layout' },

                // Notification Settings
                { setting_id: 32, setting_category: 'notification', setting_key: 'email_notifications_enabled', setting_value: 'true', setting_type: 'boolean', setting_label: 'Enable Email Notifications', setting_description: 'Send email notifications to users', default_value: 'true', display_order: 1, group_name: 'email' },
                { setting_id: 33, setting_category: 'notification', setting_key: 'course_enrollment_notification', setting_value: 'true', setting_type: 'boolean', setting_label: 'Course Enrollment Notification', setting_description: 'Notify when enrolled in course', default_value: 'true', display_order: 2, group_name: 'email' },
                { setting_id: 34, setting_category: 'notification', setting_key: 'test_reminder_notification', setting_value: 'true', setting_type: 'boolean', setting_label: 'Test Reminder Notification', setting_description: 'Send test reminder notifications', default_value: 'true', display_order: 3, group_name: 'email' },
                { setting_id: 35, setting_category: 'notification', setting_key: 'certificate_notification', setting_value: 'true', setting_type: 'boolean', setting_label: 'Certificate Notification', setting_description: 'Notify when certificate is issued', default_value: 'true', display_order: 4, group_name: 'email' },

                // Course Settings
                { setting_id: 36, setting_category: 'course', setting_key: 'default_passing_score', setting_value: '70', setting_type: 'number', setting_label: 'Default Passing Score (%)', setting_description: 'Default passing score for courses', default_value: '70', display_order: 1, group_name: 'default' },
                { setting_id: 37, setting_category: 'course', setting_key: 'default_max_attempts', setting_value: '3', setting_type: 'number', setting_label: 'Default Max Attempts', setting_description: 'Default max test attempts', default_value: '3', display_order: 2, group_name: 'default' },
                { setting_id: 38, setting_category: 'course', setting_key: 'certificate_enabled', setting_value: 'true', setting_type: 'boolean', setting_label: 'Enable Certificates', setting_description: 'Issue certificates on course completion', default_value: 'true', display_order: 3, group_name: 'default' },
                { setting_id: 39, setting_category: 'course', setting_key: 'allow_course_reviews', setting_value: 'true', setting_type: 'boolean', setting_label: 'Allow Course Reviews', setting_description: 'Allow users to review courses', default_value: 'true', display_order: 4, group_name: 'default' },
                { setting_id: 40, setting_category: 'course', setting_key: 'show_course_progress', setting_value: 'true', setting_type: 'boolean', setting_label: 'Show Course Progress', setting_description: 'Display progress bar in courses', default_value: 'true', display_order: 5, group_name: 'default' }
            ];

            for (const setting of settings) {
                await this.pool.request()
                    .input('settingId', sql.Int, setting.setting_id)
                    .input('settingCategory', sql.NVarChar(50), setting.setting_category)
                    .input('settingKey', sql.NVarChar(100), setting.setting_key)
                    .input('settingValue', sql.NVarChar(sql.MAX), setting.setting_value)
                    .input('settingType', sql.NVarChar(50), setting.setting_type)
                    .input('settingLabel', sql.NVarChar(200), setting.setting_label)
                    .input('settingDescription', sql.NVarChar(500), setting.setting_description || '')
                    .input('defaultValue', sql.NVarChar(sql.MAX), setting.default_value || '')
                    .input('displayOrder', sql.Int, setting.display_order)
                    .input('isSensitive', sql.Bit, setting.is_sensitive ? 1 : 0)
                    .query(`
                        SET IDENTITY_INSERT SystemSettings ON;
                        INSERT INTO SystemSettings (
                            setting_id, setting_category, setting_key, setting_value,
                            setting_type, setting_label, setting_description, default_value,
                            display_order, is_sensitive, is_editable, is_active, created_date
                        ) VALUES (
                            @settingId, @settingCategory, @settingKey, @settingValue,
                            @settingType, @settingLabel, @settingDescription, @defaultValue,
                            @displayOrder, @isSensitive, 1, 1, GETDATE()
                        );
                        SET IDENTITY_INSERT SystemSettings OFF;
                    `);
            }

            console.log(`Seeded ${settings.length} system settings`);
        } catch (error) {
            console.error('Error seeding system settings:', error);
            throw error;
        }
    }

    async seedOrganizationLevels() {
        try {
            console.log('Seeding organization levels...');

            const levels = [
                { level_id: 1, level_code: 'COMPANY', level_name_th: 'บริษัท', level_name_en: 'Company', level_order: 1 },
                { level_id: 2, level_code: 'DIVISION', level_name_th: 'ฝ่าย', level_name_en: 'Division', level_order: 2 },
                { level_id: 3, level_code: 'DEPARTMENT', level_name_th: 'แผนก', level_name_en: 'Department', level_order: 3 },
                { level_id: 4, level_code: 'SECTION', level_name_th: 'หน่วยงาน', level_name_en: 'Section', level_order: 4 },
                { level_id: 5, level_code: 'TEAM', level_name_th: 'ทีม', level_name_en: 'Team', level_order: 5 }
            ];

            for (const level of levels) {
                await this.pool.request()
                    .input('levelId', sql.Int, level.level_id)
                    .input('levelCode', sql.NVarChar(50), level.level_code)
                    .input('levelNameTh', sql.NVarChar(100), level.level_name_th)
                    .input('levelNameEn', sql.NVarChar(100), level.level_name_en)
                    .input('levelOrder', sql.Int, level.level_order)
                    .query(`
                        SET IDENTITY_INSERT OrganizationLevels ON;
                        INSERT INTO OrganizationLevels (level_id, level_code, level_name_th, level_name_en, level_order, is_active, created_at)
                        VALUES (@levelId, @levelCode, @levelNameTh, @levelNameEn, @levelOrder, 1, GETDATE());
                        SET IDENTITY_INSERT OrganizationLevels OFF;
                    `);
            }

            console.log(`Seeded ${levels.length} organization levels`);
        } catch (error) {
            console.error('Error seeding organization levels:', error);
            throw error;
        }
    }

    async seedOrganizationUnits() {
        try {
            console.log('Seeding organization units...');

            const units = [
                { unit_id: 1, unit_code: 'LH', unit_name_th: 'LearnHub', unit_name_en: 'LearnHub', level_id: 1, parent_id: null },
                { unit_id: 2, unit_code: 'IT-DIV', unit_name_th: 'ฝ่ายเทคโนโลยีสารสนเทศ', unit_name_en: 'IT Division', level_id: 2, parent_id: 1 },
                { unit_id: 3, unit_code: 'HR-DIV', unit_name_th: 'ฝ่ายทรัพยากรบุคคล', unit_name_en: 'HR Division', level_id: 2, parent_id: 1 },
                { unit_id: 4, unit_code: 'FIN-DIV', unit_name_th: 'ฝ่ายการเงิน', unit_name_en: 'Finance Division', level_id: 2, parent_id: 1 },
                { unit_id: 5, unit_code: 'DEV-DEPT', unit_name_th: 'แผนกพัฒนาระบบ', unit_name_en: 'Development Department', level_id: 3, parent_id: 2 },
                { unit_id: 6, unit_code: 'INFRA-DEPT', unit_name_th: 'แผนกโครงสร้างพื้นฐาน', unit_name_en: 'Infrastructure Department', level_id: 3, parent_id: 2 },
                { unit_id: 7, unit_code: 'REC-DEPT', unit_name_th: 'แผนกสรรหา', unit_name_en: 'Recruitment Department', level_id: 3, parent_id: 3 },
                { unit_id: 8, unit_code: 'TRAIN-DEPT', unit_name_th: 'แผนกฝึกอบรม', unit_name_en: 'Training Department', level_id: 3, parent_id: 3 }
            ];

            for (const unit of units) {
                await this.pool.request()
                    .input('unitId', sql.Int, unit.unit_id)
                    .input('unitCode', sql.NVarChar(50), unit.unit_code)
                    .input('unitNameTh', sql.NVarChar(200), unit.unit_name_th)
                    .input('unitNameEn', sql.NVarChar(200), unit.unit_name_en)
                    .input('levelId', sql.Int, unit.level_id)
                    .input('parentId', sql.Int, unit.parent_id)
                    .query(`
                        SET IDENTITY_INSERT OrganizationUnits ON;
                        INSERT INTO OrganizationUnits (unit_id, unit_code, unit_name_th, unit_name_en, level_id, parent_id, is_active, created_at)
                        VALUES (@unitId, @unitCode, @unitNameTh, @unitNameEn, @levelId, @parentId, 1, GETDATE());
                        SET IDENTITY_INSERT OrganizationUnits OFF;
                    `);
            }

            console.log(`Seeded ${units.length} organization units`);
        } catch (error) {
            console.error('Error seeding organization units:', error);
            throw error;
        }
    }

    async run() {
        try {
            console.log('Starting database seeding process...');

            await this.connect();
            await this.clearAllData();

            await this.seedRoles();
            await this.seedDepartments();
            await this.seedPositions();
            await this.seedUsers();
            await this.seedCourseCategories();
            await this.seedCourses();
            await this.seedTests();
            await this.seedArticles();
            await this.seedSystemSettings();
            await this.seedOrganizationLevels();
            await this.seedOrganizationUnits();

            console.log('\nDatabase seeding completed successfully!');
            console.log('\n=== LOGIN CREDENTIALS ===');
            console.log('Admin: admin / password123');
            console.log('HR Manager: hr.manager / password123');
            console.log('IT Manager: it.manager / password123');
            console.log('Instructor: instructor1 / password123');
            console.log('Employee: employee1 / password123');
            console.log('========================\n');

        } catch (error) {
            console.error('Error during seeding:', error);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const seeder = new SeedData();
    seeder.run()
        .then(() => {
            console.log('Seeding process finished');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeding failed:', error);
            process.exit(1);
        });
}

module.exports = SeedData;
