const { poolPromise, sql } = require('../config/database');
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');

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

            // List of tables to clear (order matters due to foreign keys)
            const tables = [
                'TestResults',
                'TestQuestions',
                'CourseEnrollments',
                'CourseProgress',
                'Certificates',
                'TestAttempts',
                'UserActivities',
                'Notifications',
                'Comments',
                'Articles',
                'Tests',
                'Courses',
                'CourseCategories',
                'Users',
                'Applicants',
                'JobPositions',
                'Departments',
                'Positions',
                'Roles'
            ];

            for (const table of tables) {
                try {
                    await this.pool.request().query(`DELETE FROM ${table}`);
                    console.log(`Cleared table: ${table}`);
                } catch (error) {
                    console.log(`Table ${table} might not exist or already empty: ${error.message}`);
                }
            }

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
                { role_id: uuidv4(), role_name: 'Admin', description: 'System Administrator' },
                { role_id: uuidv4(), role_name: 'HR', description: 'Human Resources' },
                { role_id: uuidv4(), role_name: 'Manager', description: 'Department Manager' },
                { role_id: uuidv4(), role_name: 'Supervisor', description: 'Team Supervisor' },
                { role_id: uuidv4(), role_name: 'Employee', description: 'Regular Employee' },
                { role_id: uuidv4(), role_name: 'Instructor', description: 'Course Instructor' }
            ];

            for (const role of roles) {
                await this.pool.request()
                    .input('roleId', sql.UniqueIdentifier, role.role_id)
                    .input('roleName', sql.NVarChar(50), role.role_name)
                    .input('description', sql.NVarChar(255), role.description)
                    .query(`
                        INSERT INTO Roles (role_id, role_name, description, created_date, is_active)
                        VALUES (@roleId, @roleName, @description, GETDATE(), 1)
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
                { department_id: uuidv4(), department_name: 'Information Technology', department_code: 'IT' },
                { department_id: uuidv4(), department_name: 'Human Resources', department_code: 'HR' },
                { department_id: uuidv4(), department_name: 'Finance', department_code: 'FIN' },
                { department_id: uuidv4(), department_name: 'Marketing', department_code: 'MKT' },
                { department_id: uuidv4(), department_name: 'Operations', department_code: 'OPS' },
                { department_id: uuidv4(), department_name: 'Sales', department_code: 'SALES' }
            ];

            for (const dept of departments) {
                await this.pool.request()
                    .input('departmentId', sql.UniqueIdentifier, dept.department_id)
                    .input('departmentName', sql.NVarChar(100), dept.department_name)
                    .input('departmentCode', sql.NVarChar(10), dept.department_code)
                    .query(`
                        INSERT INTO Departments (department_id, department_name, department_code, created_date, is_active)
                        VALUES (@departmentId, @departmentName, @departmentCode, GETDATE(), 1)
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
                { position_id: uuidv4(), position_name: 'CEO', level: 1 },
                { position_id: uuidv4(), position_name: 'CTO', level: 2 },
                { position_id: uuidv4(), position_name: 'Department Manager', level: 3 },
                { position_id: uuidv4(), position_name: 'Team Lead', level: 4 },
                { position_id: uuidv4(), position_name: 'Senior Developer', level: 5 },
                { position_id: uuidv4(), position_name: 'Developer', level: 6 },
                { position_id: uuidv4(), position_name: 'Junior Developer', level: 7 },
                { position_id: uuidv4(), position_name: 'Analyst', level: 6 },
                { position_id: uuidv4(), position_name: 'Specialist', level: 5 },
                { position_id: uuidv4(), position_name: 'Assistant', level: 7 }
            ];

            for (const pos of positions) {
                await this.pool.request()
                    .input('positionId', sql.UniqueIdentifier, pos.position_id)
                    .input('positionName', sql.NVarChar(100), pos.position_name)
                    .input('level', sql.Int, pos.level)
                    .query(`
                        INSERT INTO Positions (position_id, position_name, level, created_date, is_active)
                        VALUES (@positionId, @positionName, @level, GETDATE(), 1)
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

            const adminRoleId = this.roles.find(r => r.role_name === 'Admin').role_id;
            const hrRoleId = this.roles.find(r => r.role_name === 'HR').role_id;
            const managerRoleId = this.roles.find(r => r.role_name === 'Manager').role_id;
            const employeeRoleId = this.roles.find(r => r.role_name === 'Employee').role_id;
            const instructorRoleId = this.roles.find(r => r.role_name === 'Instructor').role_id;

            const passwordHash = await bcrypt.hash('password123', this.saltRounds);

            const users = [
                {
                    user_id: uuidv4(),
                    employee_id: 'ADM001',
                    username: 'admin',
                    first_name: 'System',
                    last_name: 'Administrator',
                    email: 'admin@ruxchai.com',
                    role_id: adminRoleId,
                    department_id: this.departments[0].department_id,
                    position_id: this.positions[0].position_id
                },
                {
                    user_id: uuidv4(),
                    employee_id: 'HR001',
                    username: 'hr.manager',
                    first_name: 'Human',
                    last_name: 'Resources',
                    email: 'hr@ruxchai.com',
                    role_id: hrRoleId,
                    department_id: this.departments[1].department_id,
                    position_id: this.positions[2].position_id
                },
                {
                    user_id: uuidv4(),
                    employee_id: 'MGR001',
                    username: 'it.manager',
                    first_name: 'IT',
                    last_name: 'Manager',
                    email: 'it.manager@ruxchai.com',
                    role_id: managerRoleId,
                    department_id: this.departments[0].department_id,
                    position_id: this.positions[2].position_id
                },
                {
                    user_id: uuidv4(),
                    employee_id: 'INS001',
                    username: 'instructor1',
                    first_name: 'John',
                    last_name: 'Smith',
                    email: 'instructor1@ruxchai.com',
                    role_id: instructorRoleId,
                    department_id: this.departments[0].department_id,
                    position_id: this.positions[4].position_id
                }
            ];

            // Add random employees
            for (let i = 0; i < 20; i++) {
                const dept = faker.helpers.arrayElement(this.departments);
                const pos = faker.helpers.arrayElement(this.positions.slice(4)); // Non-executive positions

                users.push({
                    user_id: uuidv4(),
                    employee_id: `EMP${String(i + 1).padStart(3, '0')}`,
                    username: faker.internet.userName().toLowerCase(),
                    first_name: faker.person.firstName(),
                    last_name: faker.person.lastName(),
                    email: faker.internet.email().toLowerCase(),
                    role_id: employeeRoleId,
                    department_id: dept.department_id,
                    position_id: pos.position_id,
                    phone_mobile: faker.phone.number(),
                    hire_date: faker.date.past({ years: 5 })
                });
            }

            for (const user of users) {
                await this.pool.request()
                    .input('userId', sql.UniqueIdentifier, user.user_id)
                    .input('employeeId', sql.NVarChar(20), user.employee_id)
                    .input('username', sql.NVarChar(50), user.username)
                    .input('passwordHash', sql.NVarChar(255), passwordHash)
                    .input('email', sql.NVarChar(100), user.email)
                    .input('firstName', sql.NVarChar(100), user.first_name)
                    .input('lastName', sql.NVarChar(100), user.last_name)
                    .input('departmentId', sql.UniqueIdentifier, user.department_id)
                    .input('positionId', sql.UniqueIdentifier, user.position_id)
                    .input('roleId', sql.UniqueIdentifier, user.role_id)
                    .input('phoneMobile', sql.NVarChar(20), user.phone_mobile || null)
                    .input('hireDate', sql.Date, user.hire_date || null)
                    .query(`
                        INSERT INTO Users (
                            user_id, employee_id, username, password_hash, email,
                            first_name, last_name, department_id, position_id, role_id,
                            phone_mobile, hire_date, created_date, is_active, must_change_password
                        ) VALUES (
                            @userId, @employeeId, @username, @passwordHash, @email,
                            @firstName, @lastName, @departmentId, @positionId, @roleId,
                            @phoneMobile, @hireDate, GETDATE(), 1, 0
                        )
                    `);
            }

            this.users = users;
            console.log(`Seeded ${users.length} users`);
            console.log('Test login credentials:');
            console.log('Admin: admin / password123');
            console.log('HR: hr.manager / password123');
            console.log('Manager: it.manager / password123');
            console.log('Instructor: instructor1 / password123');
        } catch (error) {
            console.error('Error seeding users:', error);
            throw error;
        }
    }

    async seedCourseCategories() {
        try {
            console.log('Seeding course categories...');

            const categories = [
                { category_id: uuidv4(), category_name: 'Programming', description: 'Programming and Software Development' },
                { category_id: uuidv4(), category_name: 'Management', description: 'Management and Leadership' },
                { category_id: uuidv4(), category_name: 'HR', description: 'Human Resources Training' },
                { category_id: uuidv4(), category_name: 'Safety', description: 'Workplace Safety Training' },
                { category_id: uuidv4(), category_name: 'Compliance', description: 'Compliance and Regulatory Training' },
                { category_id: uuidv4(), category_name: 'Communication', description: 'Communication Skills' }
            ];

            for (const cat of categories) {
                await this.pool.request()
                    .input('categoryId', sql.UniqueIdentifier, cat.category_id)
                    .input('categoryName', sql.NVarChar(100), cat.category_name)
                    .input('description', sql.NVarChar(500), cat.description)
                    .query(`
                        INSERT INTO CourseCategories (category_id, category_name, description, created_date, is_active)
                        VALUES (@categoryId, @categoryName, @description, GETDATE(), 1)
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

            const instructorId = this.users.find(u => u.username === 'instructor1').user_id;

            const courses = [
                {
                    course_id: uuidv4(),
                    course_code: 'JS101',
                    course_name: 'JavaScript Fundamentals',
                    course_name_en: 'JavaScript Fundamentals',
                    category_id: this.categories[0].category_id,
                    course_type: 'Online',
                    difficulty_level: 'Beginner',
                    language: 'TH',
                    description: 'Learn the fundamentals of JavaScript programming',
                    objectives: 'Understand variables, functions, and basic programming concepts',
                    target_audience: 'Developers, Students',
                    duration_hours: 40,
                    max_students: 30,
                    instructor_id: instructorId,
                    passing_score: 70,
                    max_attempts: 3
                },
                {
                    course_id: uuidv4(),
                    course_code: 'MGT101',
                    course_name: 'Leadership Fundamentals',
                    course_name_en: 'Leadership Fundamentals',
                    category_id: this.categories[1].category_id,
                    course_type: 'Classroom',
                    difficulty_level: 'Intermediate',
                    language: 'TH',
                    description: 'Essential leadership skills for managers',
                    objectives: 'Develop leadership and team management skills',
                    target_audience: 'Managers, Team Leads',
                    duration_hours: 24,
                    max_students: 20,
                    instructor_id: instructorId,
                    passing_score: 75,
                    max_attempts: 2
                },
                {
                    course_id: uuidv4(),
                    course_code: 'SAFE101',
                    course_name: 'Workplace Safety Training',
                    course_name_en: 'Workplace Safety Training',
                    category_id: this.categories[3].category_id,
                    course_type: 'Online',
                    difficulty_level: 'Beginner',
                    language: 'TH',
                    description: 'Basic workplace safety guidelines and procedures',
                    objectives: 'Understand safety protocols and emergency procedures',
                    target_audience: 'All Employees',
                    duration_hours: 8,
                    max_students: 100,
                    instructor_id: instructorId,
                    passing_score: 80,
                    max_attempts: 5
                }
            ];

            for (const course of courses) {
                await this.pool.request()
                    .input('courseId', sql.UniqueIdentifier, course.course_id)
                    .input('courseCode', sql.NVarChar(20), course.course_code)
                    .input('courseName', sql.NVarChar(200), course.course_name)
                    .input('courseNameEn', sql.NVarChar(200), course.course_name_en)
                    .input('categoryId', sql.UniqueIdentifier, course.category_id)
                    .input('courseType', sql.NVarChar(50), course.course_type)
                    .input('difficultyLevel', sql.NVarChar(50), course.difficulty_level)
                    .input('language', sql.NVarChar(10), course.language)
                    .input('description', sql.Text, course.description)
                    .input('objectives', sql.Text, course.objectives)
                    .input('targetAudience', sql.NVarChar(500), course.target_audience)
                    .input('durationHours', sql.Int, course.duration_hours)
                    .input('maxStudents', sql.Int, course.max_students)
                    .input('instructorId', sql.UniqueIdentifier, course.instructor_id)
                    .input('passingScore', sql.Int, course.passing_score)
                    .input('maxAttempts', sql.Int, course.max_attempts)
                    .query(`
                        INSERT INTO Courses (
                            course_id, course_code, course_name, course_name_en, category_id,
                            course_type, difficulty_level, language, description, objectives,
                            target_audience, duration_hours, max_students, instructor_id,
                            passing_score, max_attempts, created_date, is_published, is_active
                        ) VALUES (
                            @courseId, @courseCode, @courseName, @courseNameEn, @categoryId,
                            @courseType, @difficultyLevel, @language, @description, @objectives,
                            @targetAudience, @durationHours, @maxStudents, @instructorId,
                            @passingScore, @maxAttempts, GETDATE(), 1, 1
                        )
                    `);
            }

            this.courses = courses;
            console.log(`Seeded ${courses.length} courses`);
        } catch (error) {
            console.error('Error seeding courses:', error);
            throw error;
        }
    }

    async seedJobPositions() {
        try {
            console.log('Seeding job positions...');

            const jobPositions = [
                {
                    position_id: uuidv4(),
                    position_title: 'Senior Software Engineer',
                    department_id: this.departments[0].department_id,
                    description: 'Design and develop software applications',
                    requirements: 'Bachelor degree in Computer Science, 5+ years experience',
                    salary_range: '50000-80000',
                    employment_type: 'Full-time',
                    location: 'Bangkok',
                    is_active: 1
                },
                {
                    position_id: uuidv4(),
                    position_title: 'Marketing Specialist',
                    department_id: this.departments[3].department_id,
                    description: 'Develop marketing strategies and campaigns',
                    requirements: 'Bachelor degree in Marketing, 2+ years experience',
                    salary_range: '30000-50000',
                    employment_type: 'Full-time',
                    location: 'Bangkok',
                    is_active: 1
                },
                {
                    position_id: uuidv4(),
                    position_title: 'HR Generalist',
                    department_id: this.departments[1].department_id,
                    description: 'Handle HR operations and employee relations',
                    requirements: 'Bachelor degree in HR or related field, 3+ years experience',
                    salary_range: '35000-55000',
                    employment_type: 'Full-time',
                    location: 'Bangkok',
                    is_active: 1
                }
            ];

            for (const position of jobPositions) {
                await this.pool.request()
                    .input('positionId', sql.UniqueIdentifier, position.position_id)
                    .input('positionTitle', sql.NVarChar(200), position.position_title)
                    .input('departmentId', sql.UniqueIdentifier, position.department_id)
                    .input('description', sql.Text, position.description)
                    .input('requirements', sql.Text, position.requirements)
                    .input('salaryRange', sql.NVarChar(100), position.salary_range)
                    .input('employmentType', sql.NVarChar(50), position.employment_type)
                    .input('location', sql.NVarChar(100), position.location)
                    .input('isActive', sql.Bit, position.is_active)
                    .query(`
                        INSERT INTO JobPositions (
                            position_id, position_title, department_id, description,
                            requirements, salary_range, employment_type, location,
                            created_date, is_active
                        ) VALUES (
                            @positionId, @positionTitle, @departmentId, @description,
                            @requirements, @salaryRange, @employmentType, @location,
                            GETDATE(), @isActive
                        )
                    `);
            }

            this.jobPositions = jobPositions;
            console.log(`Seeded ${jobPositions.length} job positions`);
        } catch (error) {
            console.error('Error seeding job positions:', error);
            throw error;
        }
    }

    async seedApplicants() {
        try {
            console.log('Seeding applicants...');

            const applicants = [];
            for (let i = 0; i < 10; i++) {
                applicants.push({
                    applicant_id: uuidv4(),
                    application_code: `APP${new Date().getFullYear()}${String(i + 1).padStart(4, '0')}`,
                    position_id: faker.helpers.arrayElement(this.jobPositions).position_id,
                    first_name: faker.person.firstName(),
                    last_name: faker.person.lastName(),
                    email: faker.internet.email().toLowerCase(),
                    phone: faker.phone.number(),
                    birth_date: faker.date.birthdate({ min: 22, max: 45, mode: 'age' }),
                    education_level: faker.helpers.arrayElement(['Bachelor', 'Master', 'PhD']),
                    work_experience: faker.number.int({ min: 0, max: 15 }),
                    application_status: faker.helpers.arrayElement(['Applied', 'Screening', 'Interview', 'Testing']),
                    resume_url: `resumes/resume_${i + 1}.pdf`
                });
            }

            for (const applicant of applicants) {
                await this.pool.request()
                    .input('applicantId', sql.UniqueIdentifier, applicant.applicant_id)
                    .input('applicationCode', sql.NVarChar(50), applicant.application_code)
                    .input('positionId', sql.UniqueIdentifier, applicant.position_id)
                    .input('firstName', sql.NVarChar(100), applicant.first_name)
                    .input('lastName', sql.NVarChar(100), applicant.last_name)
                    .input('email', sql.NVarChar(100), applicant.email)
                    .input('phone', sql.NVarChar(20), applicant.phone)
                    .input('birthDate', sql.Date, applicant.birth_date)
                    .input('educationLevel', sql.NVarChar(50), applicant.education_level)
                    .input('workExperience', sql.Int, applicant.work_experience)
                    .input('applicationStatus', sql.NVarChar(50), applicant.application_status)
                    .input('resumeUrl', sql.NVarChar(500), applicant.resume_url)
                    .query(`
                        INSERT INTO Applicants (
                            applicant_id, application_code, position_id, first_name, last_name,
                            email, phone, birth_date, education_level, work_experience,
                            application_status, resume_url, application_date, is_active
                        ) VALUES (
                            @applicantId, @applicationCode, @positionId, @firstName, @lastName,
                            @email, @phone, @birthDate, @educationLevel, @workExperience,
                            @applicationStatus, @resumeUrl, GETDATE(), 1
                        )
                    `);
            }

            this.applicants = applicants;
            console.log(`Seeded ${applicants.length} applicants`);
        } catch (error) {
            console.error('Error seeding applicants:', error);
            throw error;
        }
    }

    async seedTests() {
        try {
            console.log('Seeding tests...');

            const instructorId = this.users.find(u => u.username === 'instructor1').user_id;

            const tests = [
                {
                    test_id: uuidv4(),
                    test_code: 'JST001',
                    test_name: 'JavaScript Fundamentals Test',
                    description: 'Test knowledge of JavaScript basics',
                    test_type: 'Assessment',
                    duration_minutes: 60,
                    total_questions: 20,
                    passing_score: 70,
                    max_attempts: 3,
                    created_by: instructorId,
                    is_published: 1
                },
                {
                    test_id: uuidv4(),
                    test_code: 'MGT001',
                    test_name: 'Leadership Assessment',
                    description: 'Evaluate leadership capabilities',
                    test_type: 'Assessment',
                    duration_minutes: 45,
                    total_questions: 15,
                    passing_score: 75,
                    max_attempts: 2,
                    created_by: instructorId,
                    is_published: 1
                },
                {
                    test_id: uuidv4(),
                    test_code: 'PRE001',
                    test_name: 'Pre-employment Test',
                    description: 'General aptitude test for job applicants',
                    test_type: 'Pre-employment',
                    duration_minutes: 90,
                    total_questions: 30,
                    passing_score: 65,
                    max_attempts: 1,
                    created_by: instructorId,
                    is_published: 1
                }
            ];

            for (const test of tests) {
                await this.pool.request()
                    .input('testId', sql.UniqueIdentifier, test.test_id)
                    .input('testCode', sql.NVarChar(20), test.test_code)
                    .input('testName', sql.NVarChar(200), test.test_name)
                    .input('description', sql.Text, test.description)
                    .input('testType', sql.NVarChar(50), test.test_type)
                    .input('durationMinutes', sql.Int, test.duration_minutes)
                    .input('totalQuestions', sql.Int, test.total_questions)
                    .input('passingScore', sql.Int, test.passing_score)
                    .input('maxAttempts', sql.Int, test.max_attempts)
                    .input('createdBy', sql.UniqueIdentifier, test.created_by)
                    .input('isPublished', sql.Bit, test.is_published)
                    .query(`
                        INSERT INTO Tests (
                            test_id, test_code, test_name, description, test_type,
                            duration_minutes, total_questions, passing_score, max_attempts,
                            created_by, created_date, is_published, is_active
                        ) VALUES (
                            @testId, @testCode, @testName, @description, @testType,
                            @durationMinutes, @totalQuestions, @passingScore, @maxAttempts,
                            @createdBy, GETDATE(), @isPublished, 1
                        )
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

            const authorId = this.users.find(u => u.username === 'instructor1').user_id;

            const articles = [
                {
                    article_id: uuidv4(),
                    title: 'Getting Started with JavaScript ES6',
                    content: 'ES6 introduced many new features that make JavaScript development more efficient...',
                    excerpt: 'Learn about the essential ES6 features every developer should know',
                    featured_image: 'articles/js-es6.jpg',
                    author_id: authorId,
                    category: 'Programming',
                    tags: 'javascript,es6,programming',
                    is_published: 1,
                    view_count: faker.number.int({ min: 50, max: 500 })
                },
                {
                    article_id: uuidv4(),
                    title: 'Effective Team Leadership Strategies',
                    content: 'Leadership is not about being in charge, it is about taking care of those in your charge...',
                    excerpt: 'Discover proven strategies for leading teams effectively',
                    featured_image: 'articles/leadership.jpg',
                    author_id: authorId,
                    category: 'Management',
                    tags: 'leadership,management,team',
                    is_published: 1,
                    view_count: faker.number.int({ min: 30, max: 300 })
                },
                {
                    article_id: uuidv4(),
                    title: 'Workplace Safety Best Practices',
                    content: 'Creating a safe work environment is everyone\'s responsibility...',
                    excerpt: 'Essential safety practices every employee should follow',
                    featured_image: 'articles/safety.jpg',
                    author_id: authorId,
                    category: 'Safety',
                    tags: 'safety,workplace,guidelines',
                    is_published: 1,
                    view_count: faker.number.int({ min: 100, max: 600 })
                }
            ];

            for (const article of articles) {
                await this.pool.request()
                    .input('articleId', sql.UniqueIdentifier, article.article_id)
                    .input('title', sql.NVarChar(300), article.title)
                    .input('content', sql.Text, article.content)
                    .input('excerpt', sql.NVarChar(500), article.excerpt)
                    .input('featuredImage', sql.NVarChar(500), article.featured_image)
                    .input('authorId', sql.UniqueIdentifier, article.author_id)
                    .input('category', sql.NVarChar(100), article.category)
                    .input('tags', sql.NVarChar(500), article.tags)
                    .input('isPublished', sql.Bit, article.is_published)
                    .input('viewCount', sql.Int, article.view_count)
                    .query(`
                        INSERT INTO Articles (
                            article_id, title, content, excerpt, featured_image,
                            author_id, category, tags, is_published, view_count,
                            created_date, is_active
                        ) VALUES (
                            @articleId, @title, @content, @excerpt, @featuredImage,
                            @authorId, @category, @tags, @isPublished, @viewCount,
                            GETDATE(), 1
                        )
                    `);
            }

            this.articles = articles;
            console.log(`Seeded ${articles.length} articles`);
        } catch (error) {
            console.error('Error seeding articles:', error);
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
            await this.seedJobPositions();
            await this.seedApplicants();
            await this.seedTests();
            await this.seedArticles();

            console.log('Database seeding completed successfully!');
            console.log('\n=== LOGIN CREDENTIALS ===');
            console.log('Admin: admin / password123');
            console.log('HR Manager: hr.manager / password123');
            console.log('IT Manager: it.manager / password123');
            console.log('Instructor: instructor1 / password123');
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