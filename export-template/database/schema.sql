-- ============================================
-- LearnHub Database Schema Export
-- Complete SQL Server Schema for LMS System
-- ============================================

-- ============================================
-- 1. SYSTEM SETTINGS TABLES
-- ============================================

-- SystemSettings Table
CREATE TABLE SystemSettings (
    setting_id INT IDENTITY(1,1) PRIMARY KEY,
    setting_category NVARCHAR(50) NOT NULL,
    setting_key NVARCHAR(100) NOT NULL UNIQUE,
    setting_value NVARCHAR(MAX),
    setting_type NVARCHAR(20) DEFAULT 'text', -- text, number, boolean, color, select, textarea, image, email, url, password
    setting_label NVARCHAR(200),
    setting_description NVARCHAR(500),
    default_value NVARCHAR(MAX),
    validation_rules NVARCHAR(MAX), -- JSON: { required, min, max, pattern, etc. }
    options NVARCHAR(MAX), -- JSON: for select type [{ value, label }]
    is_sensitive BIT DEFAULT 0,
    is_editable BIT DEFAULT 1,
    display_order INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2 DEFAULT GETDATE(),
    modified_by INT
);

-- UserSettings Table
CREATE TABLE UserSettings (
    user_setting_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    setting_key NVARCHAR(100) NOT NULL,
    setting_value NVARCHAR(MAX),
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_UserSettings_User FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT UQ_UserSettings UNIQUE (user_id, setting_key)
);

-- DepartmentSettings Table
CREATE TABLE DepartmentSettings (
    dept_setting_id INT IDENTITY(1,1) PRIMARY KEY,
    department_id INT NOT NULL,
    setting_key NVARCHAR(100) NOT NULL,
    setting_value NVARCHAR(MAX),
    created_by INT,
    created_date DATETIME2 DEFAULT GETDATE(),
    modified_by INT,
    modified_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_DeptSettings_Dept FOREIGN KEY (department_id) REFERENCES departments(department_id),
    CONSTRAINT UQ_DeptSettings UNIQUE (department_id, setting_key)
);

-- SettingAuditLog Table
CREATE TABLE SettingAuditLog (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    setting_type NVARCHAR(20) NOT NULL, -- 'system', 'user', 'department'
    setting_id INT,
    setting_key NVARCHAR(100),
    old_value NVARCHAR(MAX),
    new_value NVARCHAR(MAX),
    changed_by INT,
    changed_at DATETIME2 DEFAULT GETDATE(),
    ip_address NVARCHAR(45),
    user_agent NVARCHAR(500),
    change_reason NVARCHAR(500)
);

-- ============================================
-- 2. USER & ROLE TABLES
-- ============================================

CREATE TABLE roles (
    role_id INT IDENTITY(1,1) PRIMARY KEY,
    role_name NVARCHAR(50) NOT NULL UNIQUE,
    role_description NVARCHAR(255),
    is_active BIT DEFAULT 1,
    created_date DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    employee_id NVARCHAR(20) UNIQUE,
    username NVARCHAR(50) NOT NULL UNIQUE,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    phone NVARCHAR(20),
    profile_image NVARCHAR(500),
    role_id INT NOT NULL,
    department_id INT,
    position_id INT,
    hire_date DATE,
    is_active BIT DEFAULT 1,
    last_login DATETIME2,
    password_changed_at DATETIME2,
    preferred_language NVARCHAR(5) DEFAULT 'th',
    created_date DATETIME2 DEFAULT GETDATE(),
    updated_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Users_Role FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- ============================================
-- 3. ORGANIZATION TABLES
-- ============================================

CREATE TABLE org_levels (
    level_id INT IDENTITY(1,1) PRIMARY KEY,
    level_name NVARCHAR(100) NOT NULL,
    level_order INT NOT NULL,
    is_active BIT DEFAULT 1,
    created_date DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE departments (
    department_id INT IDENTITY(1,1) PRIMARY KEY,
    department_code NVARCHAR(20) UNIQUE,
    department_name NVARCHAR(100) NOT NULL,
    parent_department_id INT,
    level_id INT,
    manager_id INT,
    is_active BIT DEFAULT 1,
    created_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Dept_Parent FOREIGN KEY (parent_department_id) REFERENCES departments(department_id),
    CONSTRAINT FK_Dept_Level FOREIGN KEY (level_id) REFERENCES org_levels(level_id)
);

CREATE TABLE positions (
    position_id INT IDENTITY(1,1) PRIMARY KEY,
    position_code NVARCHAR(20) UNIQUE,
    position_name NVARCHAR(100) NOT NULL,
    position_level INT,
    department_id INT,
    is_active BIT DEFAULT 1,
    created_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Position_Dept FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- ============================================
-- 4. COURSE TABLES
-- ============================================

CREATE TABLE course_categories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    category_name NVARCHAR(100) NOT NULL,
    category_name_en NVARCHAR(100),
    category_description NVARCHAR(500),
    parent_category_id INT,
    icon_class NVARCHAR(50),
    display_order INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Category_Parent FOREIGN KEY (parent_category_id) REFERENCES course_categories(category_id)
);

CREATE TABLE courses (
    course_id INT IDENTITY(1,1) PRIMARY KEY,
    course_code NVARCHAR(20) UNIQUE,
    course_name NVARCHAR(200) NOT NULL,
    course_name_en NVARCHAR(200),
    description NVARCHAR(MAX),
    description_en NVARCHAR(MAX),
    category_id INT,
    instructor_id INT,
    thumbnail_url NVARCHAR(500),
    duration_hours DECIMAL(5,1),
    difficulty_level NVARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
    course_type NVARCHAR(20) DEFAULT 'mandatory', -- 'mandatory', 'optional', 'recommended'
    is_recurring BIT DEFAULT 0,
    recurring_interval_months INT,
    certificate_enabled BIT DEFAULT 1,
    passing_score INT DEFAULT 80,
    max_attempts INT,
    is_published BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_by INT,
    created_date DATETIME2 DEFAULT GETDATE(),
    updated_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Course_Category FOREIGN KEY (category_id) REFERENCES course_categories(category_id),
    CONSTRAINT FK_Course_Instructor FOREIGN KEY (instructor_id) REFERENCES users(user_id)
);

CREATE TABLE course_materials (
    material_id INT IDENTITY(1,1) PRIMARY KEY,
    course_id INT NOT NULL,
    material_title NVARCHAR(200) NOT NULL,
    material_type NVARCHAR(20) NOT NULL, -- 'video', 'document', 'article', 'quiz', 'link'
    content_url NVARCHAR(500),
    content_text NVARCHAR(MAX),
    duration_minutes INT,
    display_order INT DEFAULT 0,
    is_required BIT DEFAULT 1,
    is_active BIT DEFAULT 1,
    created_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Material_Course FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

CREATE TABLE enrollments (
    enrollment_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_date DATETIME2 DEFAULT GETDATE(),
    completed_date DATETIME2,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'enrolled', -- 'enrolled', 'in_progress', 'completed', 'expired'
    score DECIMAL(5,2),
    certificate_issued BIT DEFAULT 0,
    certificate_url NVARCHAR(500),
    renewal_due_date DATE,
    CONSTRAINT FK_Enrollment_User FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT FK_Enrollment_Course FOREIGN KEY (course_id) REFERENCES courses(course_id),
    CONSTRAINT UQ_Enrollment UNIQUE (user_id, course_id)
);

-- ============================================
-- 5. DISCUSSION TABLES (Facebook-style)
-- ============================================

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
);

CREATE TABLE CourseDiscussionReactions (
    reaction_id INT IDENTITY(1,1) PRIMARY KEY,
    discussion_id INT NOT NULL,
    user_id INT NOT NULL,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_DiscussionReactions_Discussion FOREIGN KEY (discussion_id) REFERENCES CourseDiscussions(discussion_id) ON DELETE CASCADE,
    CONSTRAINT FK_DiscussionReactions_User FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT UQ_DiscussionReactions UNIQUE (discussion_id, user_id)
);

-- Indexes
CREATE INDEX IX_CourseDiscussions_Course ON CourseDiscussions(course_id);
CREATE INDEX IX_CourseDiscussions_User ON CourseDiscussions(user_id);
CREATE INDEX IX_CourseDiscussions_Parent ON CourseDiscussions(parent_id);
CREATE INDEX IX_DiscussionReactions_Discussion ON CourseDiscussionReactions(discussion_id);

-- ============================================
-- 6. TEST/QUIZ TABLES
-- ============================================

CREATE TABLE tests (
    test_id INT IDENTITY(1,1) PRIMARY KEY,
    test_code NVARCHAR(20) UNIQUE,
    test_name NVARCHAR(200) NOT NULL,
    test_description NVARCHAR(MAX),
    test_type NVARCHAR(20) DEFAULT 'assessment', -- 'pre_test', 'post_test', 'assessment', 'survey'
    course_id INT,
    duration_minutes INT,
    passing_score INT DEFAULT 80,
    max_attempts INT DEFAULT 3,
    shuffle_questions BIT DEFAULT 1,
    shuffle_answers BIT DEFAULT 1,
    show_correct_answers BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_by INT,
    created_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Test_Course FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

CREATE TABLE questions (
    question_id INT IDENTITY(1,1) PRIMARY KEY,
    test_id INT NOT NULL,
    question_text NVARCHAR(MAX) NOT NULL,
    question_type NVARCHAR(20) DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false', 'short_answer', 'essay'
    options NVARCHAR(MAX), -- JSON array of options
    correct_answer NVARCHAR(MAX),
    points INT DEFAULT 1,
    explanation NVARCHAR(MAX),
    display_order INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    CONSTRAINT FK_Question_Test FOREIGN KEY (test_id) REFERENCES tests(test_id)
);

CREATE TABLE test_attempts (
    attempt_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    test_id INT NOT NULL,
    start_time DATETIME2 DEFAULT GETDATE(),
    end_time DATETIME2,
    score DECIMAL(5,2),
    passed BIT,
    answers NVARCHAR(MAX), -- JSON
    attempt_number INT DEFAULT 1,
    CONSTRAINT FK_Attempt_User FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT FK_Attempt_Test FOREIGN KEY (test_id) REFERENCES tests(test_id)
);

-- ============================================
-- 7. ARTICLE TABLES
-- ============================================

CREATE TABLE articles (
    article_id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    slug NVARCHAR(255) UNIQUE,
    content NVARCHAR(MAX),
    excerpt NVARCHAR(500),
    thumbnail_url NVARCHAR(500),
    category_id INT,
    author_id INT,
    status NVARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    view_count INT DEFAULT 0,
    is_featured BIT DEFAULT 0,
    published_date DATETIME2,
    created_date DATETIME2 DEFAULT GETDATE(),
    updated_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Article_Author FOREIGN KEY (author_id) REFERENCES users(user_id)
);

CREATE TABLE article_comments (
    comment_id INT IDENTITY(1,1) PRIMARY KEY,
    article_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_id INT,
    comment_text NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) DEFAULT 'active',
    is_pinned BIT DEFAULT 0,
    reply_to_user_id INT,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_ArticleComment_Article FOREIGN KEY (article_id) REFERENCES articles(article_id),
    CONSTRAINT FK_ArticleComment_User FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE article_reactions (
    reaction_id INT IDENTITY(1,1) PRIMARY KEY,
    comment_id INT NOT NULL,
    user_id INT NOT NULL,
    reaction_type VARCHAR(20) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_ArticleReaction_Comment FOREIGN KEY (comment_id) REFERENCES article_comments(comment_id) ON DELETE CASCADE,
    CONSTRAINT UQ_ArticleReaction UNIQUE (comment_id, user_id)
);

-- ============================================
-- 8. NOTIFICATION TABLE
-- ============================================

CREATE TABLE notifications (
    notification_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    title NVARCHAR(200) NOT NULL,
    message NVARCHAR(MAX),
    notification_type NVARCHAR(50), -- 'course', 'test', 'announcement', 'reminder'
    reference_type NVARCHAR(50),
    reference_id INT,
    is_read BIT DEFAULT 0,
    read_at DATETIME2,
    created_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Notification_User FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================
-- 9. ACTIVITY LOG TABLE
-- ============================================

CREATE TABLE activity_logs (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT,
    action_type NVARCHAR(50) NOT NULL,
    description NVARCHAR(500),
    entity_type NVARCHAR(50),
    entity_id INT,
    old_values NVARCHAR(MAX),
    new_values NVARCHAR(MAX),
    ip_address NVARCHAR(45),
    user_agent NVARCHAR(500),
    created_date DATETIME2 DEFAULT GETDATE()
);

-- ============================================
-- 10. DEFAULT DATA
-- ============================================

-- Insert default roles
INSERT INTO roles (role_name, role_description) VALUES
('Admin', 'System Administrator'),
('HR', 'Human Resources'),
('Manager', 'Department Manager'),
('Instructor', 'Course Instructor'),
('Employee', 'Regular Employee');

-- Insert default organization levels
INSERT INTO org_levels (level_name, level_order) VALUES
('Company', 1),
('Division', 2),
('Department', 3),
('Section', 4),
('Team', 5);

-- Insert default system settings
INSERT INTO SystemSettings (setting_category, setting_key, setting_value, setting_type, setting_label, setting_description, display_order) VALUES
-- General Settings
('general', 'system_name', 'LearnHub', 'text', 'System Name', 'Name of the learning management system', 1),
('general', 'system_name_en', 'LearnHub', 'text', 'System Name (English)', 'English name of the system', 2),
('general', 'company_name', 'Your Company', 'text', 'Company Name', 'Organization name', 3),
('general', 'company_name_en', 'Your Company', 'text', 'Company Name (English)', 'English company name', 4),
('general', 'contact_email', 'admin@yourcompany.com', 'email', 'Contact Email', 'Main contact email', 5),
('general', 'contact_phone', '02-000-0000', 'text', 'Contact Phone', 'Contact phone number', 6),

-- Appearance Settings
('appearance', 'primary_color', '#0090D3', 'color', 'Primary Color', 'Main brand color', 1),
('appearance', 'secondary_color', '#3AAA35', 'color', 'Secondary Color', 'Secondary brand color', 2),
('appearance', 'sidebar_color', '#1f2937', 'color', 'Sidebar Color', 'Sidebar background color', 3),
('appearance', 'accent_color', '#3b82f6', 'color', 'Accent Color', 'Accent color for highlights', 4),
('appearance', 'background_color', '#f9fafb', 'color', 'Background Color', 'Page background color', 5),
('appearance', 'text_color', '#111827', 'color', 'Text Color', 'Main text color', 6),
('appearance', 'theme_mode', 'light', 'select', 'Theme Mode', 'Light or dark theme', 7),
('appearance', 'font_family', 'Sarabun', 'select', 'Font Family', 'Primary font family', 8),
('appearance', 'border_radius', '0.5rem', 'text', 'Border Radius', 'Default border radius', 9),
('appearance', 'font_size_base', '16px', 'text', 'Base Font Size', 'Base font size', 10),
('appearance', 'header_height', '64px', 'text', 'Header Height', 'Navigation header height', 11),
('appearance', 'sidebar_width', '256px', 'text', 'Sidebar Width', 'Sidebar width', 12),
('appearance', 'enable_animations', 'true', 'boolean', 'Enable Animations', 'Enable UI animations', 13),
('appearance', 'enable_shadows', 'true', 'boolean', 'Enable Shadows', 'Enable box shadows', 14),
('appearance', 'compact_mode', 'false', 'boolean', 'Compact Mode', 'Use compact spacing', 15),
('appearance', 'logo_url', '/images/logo.png', 'image', 'Logo URL', 'Main logo image', 16),
('appearance', 'favicon_url', '/favicon.ico', 'image', 'Favicon URL', 'Browser tab icon', 17),

-- Email Settings
('email', 'smtp_host', 'smtp.gmail.com', 'text', 'SMTP Host', 'Email server host', 1),
('email', 'smtp_port', '587', 'number', 'SMTP Port', 'Email server port', 2),
('email', 'smtp_user', '', 'text', 'SMTP Username', 'Email username', 3),
('email', 'smtp_password', '', 'password', 'SMTP Password', 'Email password', 4),
('email', 'from_email', 'noreply@yourcompany.com', 'email', 'From Email', 'Sender email address', 5),
('email', 'from_name', 'LearnHub', 'text', 'From Name', 'Sender name', 6),

-- Security Settings
('security', 'session_timeout', '480', 'number', 'Session Timeout (minutes)', 'User session timeout', 1),
('security', 'password_min_length', '8', 'number', 'Min Password Length', 'Minimum password length', 2),
('security', 'require_password_change', '90', 'number', 'Password Change Days', 'Days before password change required', 3),
('security', 'max_login_attempts', '5', 'number', 'Max Login Attempts', 'Max failed login attempts', 4),
('security', 'lockout_duration', '30', 'number', 'Lockout Duration (minutes)', 'Account lockout duration', 5),

-- Course Settings
('course', 'default_passing_score', '80', 'number', 'Default Passing Score', 'Default course passing score percentage', 1),
('course', 'allow_retake', 'true', 'boolean', 'Allow Course Retake', 'Allow users to retake courses', 2),
('course', 'max_retake_attempts', '3', 'number', 'Max Retake Attempts', 'Maximum course retake attempts', 3),
('course', 'certificate_enabled', 'true', 'boolean', 'Enable Certificates', 'Enable course completion certificates', 4),
('course', 'auto_enroll', 'false', 'boolean', 'Auto Enrollment', 'Automatically enroll users in mandatory courses', 5);
