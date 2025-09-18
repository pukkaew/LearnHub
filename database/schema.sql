-- Ruxchai LearnHub Database Schema for Microsoft SQL Server

-- Create Database (run this separately in SQL Server Management Studio)
-- CREATE DATABASE LearnHub;
-- USE LearnHub;

-- Drop tables if they exist (in reverse order due to foreign keys)
DROP TABLE IF EXISTS TestResults;
DROP TABLE IF EXISTS TestQuestions;
DROP TABLE IF EXISTS CourseEnrollments;
DROP TABLE IF EXISTS CourseProgress;
DROP TABLE IF EXISTS Certificates;
DROP TABLE IF EXISTS TestAttempts;
DROP TABLE IF EXISTS UserActivities;
DROP TABLE IF EXISTS Notifications;
DROP TABLE IF EXISTS Comments;
DROP TABLE IF EXISTS Articles;
DROP TABLE IF EXISTS Tests;
DROP TABLE IF EXISTS Courses;
DROP TABLE IF EXISTS CourseCategories;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Applicants;
DROP TABLE IF EXISTS JobPositions;
DROP TABLE IF EXISTS Departments;
DROP TABLE IF EXISTS Positions;
DROP TABLE IF EXISTS Roles;
DROP TABLE IF EXISTS AuditLog;

-- Create Roles table
CREATE TABLE Roles (
    role_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    role_name NVARCHAR(50) NOT NULL UNIQUE,
    description NVARCHAR(255),
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2,
    is_active BIT DEFAULT 1
);

-- Create Departments table
CREATE TABLE Departments (
    department_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    department_name NVARCHAR(100) NOT NULL,
    department_code NVARCHAR(10) NOT NULL UNIQUE,
    description NVARCHAR(500),
    manager_id UNIQUEIDENTIFIER,
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2,
    is_active BIT DEFAULT 1
);

-- Create Positions table
CREATE TABLE Positions (
    position_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    position_name NVARCHAR(100) NOT NULL,
    level INT,
    description NVARCHAR(500),
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2,
    is_active BIT DEFAULT 1
);

-- Create Users table
CREATE TABLE Users (
    user_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    employee_id NVARCHAR(20) NOT NULL UNIQUE,
    username NVARCHAR(50) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    email NVARCHAR(100) NOT NULL UNIQUE,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    first_name_en NVARCHAR(100),
    last_name_en NVARCHAR(100),
    department_id UNIQUEIDENTIFIER,
    position_id UNIQUEIDENTIFIER,
    role_id UNIQUEIDENTIFIER NOT NULL,
    supervisor_id UNIQUEIDENTIFIER,
    phone_internal NVARCHAR(20),
    phone_mobile NVARCHAR(20),
    line_id NVARCHAR(50),
    profile_image NVARCHAR(500),
    hire_date DATE,
    last_login_date DATETIME2,
    login_count INT DEFAULT 0,
    failed_login_count INT DEFAULT 0,
    account_locked BIT DEFAULT 0,
    account_locked_until DATETIME2,
    password_changed_date DATETIME2,
    password_reset_token NVARCHAR(255),
    password_reset_expires DATETIME2,
    must_change_password BIT DEFAULT 1,
    email_verified BIT DEFAULT 0,
    email_verification_token NVARCHAR(255),
    created_date DATETIME2 DEFAULT GETDATE(),
    created_by UNIQUEIDENTIFIER,
    modified_date DATETIME2,
    modified_by UNIQUEIDENTIFIER,
    version INT DEFAULT 1,
    is_active BIT DEFAULT 1,
    FOREIGN KEY (department_id) REFERENCES Departments(department_id),
    FOREIGN KEY (position_id) REFERENCES Positions(position_id),
    FOREIGN KEY (role_id) REFERENCES Roles(role_id),
    FOREIGN KEY (supervisor_id) REFERENCES Users(user_id)
);

-- Create CourseCategories table
CREATE TABLE CourseCategories (
    category_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    category_name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(500),
    parent_category_id UNIQUEIDENTIFIER,
    sort_order INT DEFAULT 0,
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2,
    is_active BIT DEFAULT 1,
    FOREIGN KEY (parent_category_id) REFERENCES CourseCategories(category_id)
);

-- Create Courses table
CREATE TABLE Courses (
    course_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    course_code NVARCHAR(20) NOT NULL UNIQUE,
    course_name NVARCHAR(200) NOT NULL,
    course_name_en NVARCHAR(200),
    category_id UNIQUEIDENTIFIER,
    course_type NVARCHAR(50) DEFAULT 'Online', -- Online, Classroom, Blended
    difficulty_level NVARCHAR(50) DEFAULT 'Beginner', -- Beginner, Intermediate, Advanced
    language NVARCHAR(10) DEFAULT 'TH',
    description TEXT,
    objectives TEXT,
    target_audience NVARCHAR(500),
    prerequisites NVARCHAR(500),
    duration_hours INT,
    max_students INT,
    thumbnail_image NVARCHAR(500),
    intro_video_url NVARCHAR(500),
    instructor_id UNIQUEIDENTIFIER,
    passing_score INT DEFAULT 70,
    max_attempts INT DEFAULT 3,
    show_correct_answers BIT DEFAULT 1,
    allow_retake BIT DEFAULT 1,
    certificate_template NVARCHAR(500),
    start_date DATETIME2,
    end_date DATETIME2,
    enrollment_start DATETIME2,
    enrollment_end DATETIME2,
    created_date DATETIME2 DEFAULT GETDATE(),
    created_by UNIQUEIDENTIFIER,
    modified_date DATETIME2,
    modified_by UNIQUEIDENTIFIER,
    is_published BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES CourseCategories(category_id),
    FOREIGN KEY (instructor_id) REFERENCES Users(user_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id),
    FOREIGN KEY (modified_by) REFERENCES Users(user_id)
);

-- Create Tests table
CREATE TABLE Tests (
    test_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    test_code NVARCHAR(20) NOT NULL UNIQUE,
    test_name NVARCHAR(200) NOT NULL,
    description TEXT,
    test_type NVARCHAR(50) DEFAULT 'Assessment', -- Assessment, Survey, Quiz, Pre-employment
    course_id UNIQUEIDENTIFIER,
    duration_minutes INT,
    total_questions INT,
    passing_score INT DEFAULT 70,
    max_attempts INT DEFAULT 3,
    show_results_immediately BIT DEFAULT 1,
    randomize_questions BIT DEFAULT 1,
    randomize_answers BIT DEFAULT 1,
    allow_back_navigation BIT DEFAULT 1,
    require_webcam BIT DEFAULT 0,
    require_fullscreen BIT DEFAULT 0,
    auto_submit BIT DEFAULT 1,
    instructions TEXT,
    start_date DATETIME2,
    end_date DATETIME2,
    created_date DATETIME2 DEFAULT GETDATE(),
    created_by UNIQUEIDENTIFIER NOT NULL,
    modified_date DATETIME2,
    modified_by UNIQUEIDENTIFIER,
    is_published BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    FOREIGN KEY (course_id) REFERENCES Courses(course_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id),
    FOREIGN KEY (modified_by) REFERENCES Users(user_id)
);

-- Create Articles table
CREATE TABLE Articles (
    article_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    title NVARCHAR(300) NOT NULL,
    slug NVARCHAR(300),
    content TEXT,
    excerpt NVARCHAR(500),
    featured_image NVARCHAR(500),
    author_id UNIQUEIDENTIFIER NOT NULL,
    category NVARCHAR(100),
    tags NVARCHAR(500),
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    reading_time INT,
    meta_title NVARCHAR(200),
    meta_description NVARCHAR(300),
    published_date DATETIME2,
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2,
    is_published BIT DEFAULT 0,
    is_featured BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    FOREIGN KEY (author_id) REFERENCES Users(user_id)
);

-- Create JobPositions table
CREATE TABLE JobPositions (
    position_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    position_title NVARCHAR(200) NOT NULL,
    department_id UNIQUEIDENTIFIER,
    description TEXT,
    requirements TEXT,
    responsibilities TEXT,
    salary_range NVARCHAR(100),
    employment_type NVARCHAR(50) DEFAULT 'Full-time',
    location NVARCHAR(100),
    experience_required NVARCHAR(100),
    education_required NVARCHAR(100),
    skills_required NVARCHAR(500),
    benefits TEXT,
    application_deadline DATETIME2,
    posted_date DATETIME2 DEFAULT GETDATE(),
    created_date DATETIME2 DEFAULT GETDATE(),
    created_by UNIQUEIDENTIFIER,
    modified_date DATETIME2,
    modified_by UNIQUEIDENTIFIER,
    is_active BIT DEFAULT 1,
    FOREIGN KEY (department_id) REFERENCES Departments(department_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

-- Create Applicants table
CREATE TABLE Applicants (
    applicant_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    application_code NVARCHAR(50) NOT NULL UNIQUE,
    position_id UNIQUEIDENTIFIER NOT NULL,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) NOT NULL,
    phone NVARCHAR(20),
    address TEXT,
    birth_date DATE,
    education_level NVARCHAR(50),
    university NVARCHAR(200),
    major NVARCHAR(100),
    gpa DECIMAL(3,2),
    work_experience INT DEFAULT 0,
    previous_company NVARCHAR(200),
    previous_position NVARCHAR(100),
    skills NVARCHAR(500),
    portfolio_url NVARCHAR(500),
    linkedin_url NVARCHAR(500),
    resume_url NVARCHAR(500),
    cover_letter TEXT,
    application_status NVARCHAR(50) DEFAULT 'Applied', -- Applied, Screening, Interview, Testing, Offered, Hired, Rejected
    rejection_reason NVARCHAR(500),
    interview_date DATETIME2,
    interview_notes TEXT,
    test_score DECIMAL(5,2),
    hr_notes TEXT,
    application_date DATETIME2 DEFAULT GETDATE(),
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2,
    is_active BIT DEFAULT 1,
    FOREIGN KEY (position_id) REFERENCES JobPositions(position_id)
);

-- Create CourseEnrollments table
CREATE TABLE CourseEnrollments (
    enrollment_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    course_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    enrollment_date DATETIME2 DEFAULT GETDATE(),
    start_date DATETIME2,
    completion_date DATETIME2,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    current_lesson_id UNIQUEIDENTIFIER,
    time_spent INT DEFAULT 0, -- in minutes
    attempts INT DEFAULT 0,
    best_score DECIMAL(5,2),
    final_score DECIMAL(5,2),
    status NVARCHAR(50) DEFAULT 'Active', -- Active, Completed, Dropped, Suspended
    certificate_issued BIT DEFAULT 0,
    certificate_date DATETIME2,
    notes TEXT,
    enrolled_by UNIQUEIDENTIFIER,
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2,
    UNIQUE (course_id, user_id),
    FOREIGN KEY (course_id) REFERENCES Courses(course_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (enrolled_by) REFERENCES Users(user_id)
);

-- Create TestAttempts table
CREATE TABLE TestAttempts (
    attempt_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    test_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER,
    applicant_id UNIQUEIDENTIFIER,
    attempt_number INT NOT NULL,
    start_time DATETIME2 DEFAULT GETDATE(),
    end_time DATETIME2,
    time_taken INT, -- in minutes
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    percentage DECIMAL(5,2),
    passed BIT DEFAULT 0,
    status NVARCHAR(50) DEFAULT 'In Progress', -- In Progress, Completed, Abandoned, Submitted
    ip_address NVARCHAR(45),
    user_agent TEXT,
    browser_info TEXT,
    cheating_flags TEXT,
    proctor_notes TEXT,
    created_date DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (test_id) REFERENCES Tests(test_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (applicant_id) REFERENCES Applicants(applicant_id)
);

-- Create TestQuestions table
CREATE TABLE TestQuestions (
    question_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    test_id UNIQUEIDENTIFIER NOT NULL,
    question_text TEXT NOT NULL,
    question_type NVARCHAR(50) DEFAULT 'multiple_choice', -- multiple_choice, true_false, essay, fill_blank
    options TEXT, -- JSON format for multiple choice options
    correct_answer TEXT,
    explanation TEXT,
    points DECIMAL(5,2) DEFAULT 1,
    difficulty_level NVARCHAR(50) DEFAULT 'Medium',
    category NVARCHAR(100),
    tags NVARCHAR(500),
    time_limit INT, -- in seconds
    sort_order INT DEFAULT 0,
    created_date DATETIME2 DEFAULT GETDATE(),
    created_by UNIQUEIDENTIFIER,
    modified_date DATETIME2,
    modified_by UNIQUEIDENTIFIER,
    is_active BIT DEFAULT 1,
    FOREIGN KEY (test_id) REFERENCES Tests(test_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id),
    FOREIGN KEY (modified_by) REFERENCES Users(user_id)
);

-- Create TestResults table
CREATE TABLE TestResults (
    result_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    attempt_id UNIQUEIDENTIFIER NOT NULL,
    question_id UNIQUEIDENTIFIER NOT NULL,
    user_answer TEXT,
    is_correct BIT,
    points_earned DECIMAL(5,2) DEFAULT 0,
    time_taken INT, -- in seconds
    created_date DATETIME2 DEFAULT GETDATE(),
    UNIQUE (attempt_id, question_id),
    FOREIGN KEY (attempt_id) REFERENCES TestAttempts(attempt_id),
    FOREIGN KEY (question_id) REFERENCES TestQuestions(question_id)
);

-- Create Comments table
CREATE TABLE Comments (
    comment_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    article_id UNIQUEIDENTIFIER,
    parent_comment_id UNIQUEIDENTIFIER,
    user_id UNIQUEIDENTIFIER NOT NULL,
    content TEXT NOT NULL,
    like_count INT DEFAULT 0,
    report_count INT DEFAULT 0,
    is_approved BIT DEFAULT 1,
    is_pinned BIT DEFAULT 0,
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2,
    is_active BIT DEFAULT 1,
    FOREIGN KEY (article_id) REFERENCES Articles(article_id),
    FOREIGN KEY (parent_comment_id) REFERENCES Comments(comment_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Create Notifications table
CREATE TABLE Notifications (
    notification_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type NVARCHAR(50) DEFAULT 'info', -- info, success, warning, error
    action_url NVARCHAR(500),
    is_read BIT DEFAULT 0,
    created_date DATETIME2 DEFAULT GETDATE(),
    read_date DATETIME2,
    expires_date DATETIME2,
    is_active BIT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Create UserActivities table (Activity Log)
CREATE TABLE UserActivities (
    activity_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER,
    activity_type NVARCHAR(50) NOT NULL, -- login, logout, course_access, test_start, etc.
    description NVARCHAR(500),
    ip_address NVARCHAR(45),
    user_agent TEXT,
    session_id NVARCHAR(100),
    additional_data TEXT, -- JSON format
    created_date DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Create Certificates table
CREATE TABLE Certificates (
    certificate_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    course_id UNIQUEIDENTIFIER,
    test_id UNIQUEIDENTIFIER,
    certificate_code NVARCHAR(50) NOT NULL UNIQUE,
    certificate_type NVARCHAR(50) DEFAULT 'completion', -- completion, achievement, participation
    issued_date DATETIME2 DEFAULT GETDATE(),
    valid_until DATETIME2,
    certificate_url NVARCHAR(500),
    verification_code NVARCHAR(100),
    issued_by UNIQUEIDENTIFIER,
    template_used NVARCHAR(100),
    metadata TEXT, -- JSON format
    created_date DATETIME2 DEFAULT GETDATE(),
    is_active BIT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (course_id) REFERENCES Courses(course_id),
    FOREIGN KEY (test_id) REFERENCES Tests(test_id),
    FOREIGN KEY (issued_by) REFERENCES Users(user_id)
);

-- Create CourseProgress table
CREATE TABLE CourseProgress (
    progress_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    enrollment_id UNIQUEIDENTIFIER NOT NULL,
    lesson_id UNIQUEIDENTIFIER,
    section_id UNIQUEIDENTIFIER,
    activity_type NVARCHAR(50), -- lesson, quiz, assignment, video, document
    status NVARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, completed
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    time_spent INT DEFAULT 0, -- in minutes
    last_accessed DATETIME2,
    completion_date DATETIME2,
    score DECIMAL(5,2),
    attempts INT DEFAULT 0,
    notes TEXT,
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2,
    FOREIGN KEY (enrollment_id) REFERENCES CourseEnrollments(enrollment_id)
);

-- Create AuditLog table for tracking changes
CREATE TABLE AuditLog (
    audit_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    table_name NVARCHAR(100) NOT NULL,
    record_id UNIQUEIDENTIFIER NOT NULL,
    action NVARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_value TEXT,
    new_value TEXT,
    changed_by UNIQUEIDENTIFIER,
    changed_date DATETIME2 DEFAULT GETDATE(),
    ip_address NVARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (changed_by) REFERENCES Users(user_id)
);

-- Create Indexes for performance
CREATE INDEX IX_Users_Email ON Users(email);
CREATE INDEX IX_Users_EmployeeId ON Users(employee_id);
CREATE INDEX IX_Users_Username ON Users(username);
CREATE INDEX IX_Users_DepartmentId ON Users(department_id);
CREATE INDEX IX_Users_RoleId ON Users(role_id);
CREATE INDEX IX_Users_IsActive ON Users(is_active);

CREATE INDEX IX_Courses_CategoryId ON Courses(category_id);
CREATE INDEX IX_Courses_InstructorId ON Courses(instructor_id);
CREATE INDEX IX_Courses_IsPublished ON Courses(is_published);
CREATE INDEX IX_Courses_IsActive ON Courses(is_active);

CREATE INDEX IX_Tests_CourseId ON Tests(course_id);
CREATE INDEX IX_Tests_CreatedBy ON Tests(created_by);
CREATE INDEX IX_Tests_IsPublished ON Tests(is_published);

CREATE INDEX IX_Articles_AuthorId ON Articles(author_id);
CREATE INDEX IX_Articles_Category ON Articles(category);
CREATE INDEX IX_Articles_IsPublished ON Articles(is_published);
CREATE INDEX IX_Articles_PublishedDate ON Articles(published_date);

CREATE INDEX IX_CourseEnrollments_CourseId ON CourseEnrollments(course_id);
CREATE INDEX IX_CourseEnrollments_UserId ON CourseEnrollments(user_id);
CREATE INDEX IX_CourseEnrollments_Status ON CourseEnrollments(status);

CREATE INDEX IX_TestAttempts_TestId ON TestAttempts(test_id);
CREATE INDEX IX_TestAttempts_UserId ON TestAttempts(user_id);
CREATE INDEX IX_TestAttempts_ApplicantId ON TestAttempts(applicant_id);
CREATE INDEX IX_TestAttempts_Status ON TestAttempts(status);

CREATE INDEX IX_Applicants_PositionId ON Applicants(position_id);
CREATE INDEX IX_Applicants_Email ON Applicants(email);
CREATE INDEX IX_Applicants_ApplicationStatus ON Applicants(application_status);

CREATE INDEX IX_Notifications_UserId ON Notifications(user_id);
CREATE INDEX IX_Notifications_IsRead ON Notifications(is_read);
CREATE INDEX IX_Notifications_CreatedDate ON Notifications(created_date);

CREATE INDEX IX_UserActivities_UserId ON UserActivities(user_id);
CREATE INDEX IX_UserActivities_ActivityType ON UserActivities(activity_type);
CREATE INDEX IX_UserActivities_CreatedDate ON UserActivities(created_date);

CREATE INDEX IX_AuditLog_TableName ON AuditLog(table_name);
CREATE INDEX IX_AuditLog_RecordId ON AuditLog(record_id);
CREATE INDEX IX_AuditLog_ChangedDate ON AuditLog(changed_date);

-- Add foreign key for department manager after Users table is created
ALTER TABLE Departments
ADD CONSTRAINT FK_Departments_Manager
FOREIGN KEY (manager_id) REFERENCES Users(user_id);

PRINT 'Database schema created successfully!';
