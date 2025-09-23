-- Rukchai Hongyen LearnHub Database - Complete SQL Server Setup Script
-- This script creates the complete database with all tables, procedures, and initial data
-- Run this script on SQL Server to set up the entire LearnHub system

-- Create Database (run this if database doesn't exist)
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'RC_LearnHub')
BEGIN
    CREATE DATABASE RC_LearnHub;
END
GO

USE RC_LearnHub;
GO

-- Drop existing tables if they exist (for re-run capability)
DROP TABLE IF EXISTS [user_activities];
DROP TABLE IF EXISTS [test_results];
DROP TABLE IF EXISTS [test_questions];
DROP TABLE IF EXISTS [test_sessions];
DROP TABLE IF EXISTS [proctoring_screenshots];
DROP TABLE IF EXISTS [proctoring_violations];
DROP TABLE IF EXISTS [proctoring_sessions];
DROP TABLE IF EXISTS [proctoring_reports];
DROP TABLE IF EXISTS [user_achievements];
DROP TABLE IF EXISTS [leaderboards];
DROP TABLE IF EXISTS [points_transactions];
DROP TABLE IF EXISTS [user_profiles];
DROP TABLE IF EXISTS [user_courses];
DROP TABLE IF EXISTS [course_materials];
DROP TABLE IF EXISTS [refresh_tokens];
DROP TABLE IF EXISTS [api_keys];
DROP TABLE IF EXISTS [notifications];
DROP TABLE IF EXISTS [articles];
DROP TABLE IF EXISTS [tests];
DROP TABLE IF EXISTS [courses];
DROP TABLE IF EXISTS [users];
DROP TABLE IF EXISTS [badges];
DROP TABLE IF EXISTS [departments];
DROP TABLE IF EXISTS [positions];
DROP TABLE IF EXISTS [roles];
DROP TABLE IF EXISTS [system_settings];
DROP TABLE IF EXISTS [security_policies];
DROP TABLE IF EXISTS [audit_logs];

-- Drop stored procedures if they exist
DROP PROCEDURE IF EXISTS [sp_UpdateLeaderboards];
DROP PROCEDURE IF EXISTS [sp_CalculateIntegrityScore];

-- Drop view if exists
DROP VIEW IF EXISTS [vw_ProctoringDashboard];

-- =============================================================================
-- CORE SYSTEM TABLES
-- =============================================================================

-- Roles table
CREATE TABLE [roles] (
    [role_id] INT IDENTITY(1,1) PRIMARY KEY,
    [role_name] NVARCHAR(50) NOT NULL UNIQUE,
    [description] NVARCHAR(255),
    [permissions] NVARCHAR(MAX), -- JSON string of permissions
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
);

-- Departments table
CREATE TABLE [departments] (
    [department_id] INT IDENTITY(1,1) PRIMARY KEY,
    [department_name] NVARCHAR(100) NOT NULL UNIQUE,
    [description] NVARCHAR(255),
    [head_user_id] INT,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
);

-- Positions table
CREATE TABLE [positions] (
    [position_id] INT IDENTITY(1,1) PRIMARY KEY,
    [position_name] NVARCHAR(100) NOT NULL,
    [department_id] INT NOT NULL,
    [description] NVARCHAR(255),
    [level] INT DEFAULT 1,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([department_id]) REFERENCES [departments]([department_id])
);

-- Users table
CREATE TABLE [users] (
    [user_id] INT IDENTITY(1,1) PRIMARY KEY,
    [username] NVARCHAR(50) NOT NULL UNIQUE,
    [email] NVARCHAR(100) NOT NULL UNIQUE,
    [password] NVARCHAR(255) NOT NULL,
    [first_name] NVARCHAR(50) NOT NULL,
    [last_name] NVARCHAR(50) NOT NULL,
    [role_id] INT NOT NULL,
    [department_id] INT,
    [position_id] INT,
    [employee_id] NVARCHAR(20),
    [phone] NVARCHAR(20),
    [profile_image] NVARCHAR(255),
    [is_active] BIT DEFAULT 1,
    [email_verified] BIT DEFAULT 0,
    [last_login] DATETIME2,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([role_id]) REFERENCES [roles]([role_id]),
    FOREIGN KEY ([department_id]) REFERENCES [departments]([department_id]),
    FOREIGN KEY ([position_id]) REFERENCES [positions]([position_id])
);

-- Add foreign key constraint for department head
ALTER TABLE [departments]
ADD FOREIGN KEY ([head_user_id]) REFERENCES [users]([user_id]);

-- =============================================================================
-- LEARNING MANAGEMENT SYSTEM TABLES
-- =============================================================================

-- Courses table
CREATE TABLE [courses] (
    [course_id] INT IDENTITY(1,1) PRIMARY KEY,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [category] NVARCHAR(100),
    [difficulty_level] NVARCHAR(20) DEFAULT 'beginner',
    [instructor_id] INT NOT NULL,
    [thumbnail] NVARCHAR(255),
    [duration_hours] INT DEFAULT 0,
    [price] DECIMAL(10,2) DEFAULT 0.00,
    [is_free] BIT DEFAULT 1,
    [status] NVARCHAR(20) DEFAULT 'draft',
    [enrollment_limit] INT,
    [start_date] DATETIME2,
    [end_date] DATETIME2,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([instructor_id]) REFERENCES [users]([user_id])
);

-- Course materials table
CREATE TABLE [course_materials] (
    [material_id] INT IDENTITY(1,1) PRIMARY KEY,
    [course_id] INT NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [type] NVARCHAR(50) NOT NULL, -- video, document, quiz, assignment
    [content] NVARCHAR(MAX),
    [file_path] NVARCHAR(500),
    [file_size] BIGINT,
    [mime_type] NVARCHAR(100),
    [order_index] INT DEFAULT 0,
    [duration_minutes] INT,
    [is_downloadable] BIT DEFAULT 0,
    [is_required] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([course_id]) REFERENCES [courses]([course_id]) ON DELETE CASCADE
);

-- User courses enrollment table
CREATE TABLE [user_courses] (
    [enrollment_id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL,
    [course_id] INT NOT NULL,
    [enrollment_date] DATETIME2 DEFAULT GETDATE(),
    [completion_date] DATETIME2,
    [progress] DECIMAL(5,2) DEFAULT 0.00,
    [status] NVARCHAR(20) DEFAULT 'enrolled',
    [last_access_date] DATETIME2,
    [certificate_issued] BIT DEFAULT 0,
    [grade] DECIMAL(5,2),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]),
    FOREIGN KEY ([course_id]) REFERENCES [courses]([course_id]),
    UNIQUE ([user_id], [course_id])
);

-- Tests table
CREATE TABLE [tests] (
    [test_id] INT IDENTITY(1,1) PRIMARY KEY,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [course_id] INT,
    [instructor_id] INT NOT NULL,
    [type] NVARCHAR(50) DEFAULT 'quiz',
    [time_limit] INT, -- minutes
    [total_marks] INT DEFAULT 0,
    [passing_marks] INT DEFAULT 0,
    [attempts_allowed] INT DEFAULT 1,
    [randomize_questions] BIT DEFAULT 0,
    [show_results] BIT DEFAULT 1,
    [status] NVARCHAR(20) DEFAULT 'draft',
    [start_date] DATETIME2,
    [end_date] DATETIME2,
    [proctoring_enabled] BIT DEFAULT 0,
    [proctoring_strictness] NVARCHAR(20) DEFAULT 'medium',
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([course_id]) REFERENCES [courses]([course_id]),
    FOREIGN KEY ([instructor_id]) REFERENCES [users]([user_id])
);

-- Test questions table
CREATE TABLE [test_questions] (
    [question_id] INT IDENTITY(1,1) PRIMARY KEY,
    [test_id] INT NOT NULL,
    [question_text] NVARCHAR(MAX) NOT NULL,
    [question_type] NVARCHAR(50) DEFAULT 'multiple_choice',
    [options] NVARCHAR(MAX), -- JSON string for multiple choice options
    [correct_answer] NVARCHAR(MAX) NOT NULL,
    [explanation] NVARCHAR(MAX),
    [marks] INT DEFAULT 1,
    [order_index] INT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([test_id]) REFERENCES [tests]([test_id]) ON DELETE CASCADE
);

-- Test sessions table
CREATE TABLE [test_sessions] (
    [session_id] INT IDENTITY(1,1) PRIMARY KEY,
    [test_id] INT NOT NULL,
    [user_id] INT NOT NULL,
    [start_time] DATETIME2 DEFAULT GETDATE(),
    [end_time] DATETIME2,
    [time_taken] INT, -- minutes
    [status] NVARCHAR(20) DEFAULT 'in_progress',
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(500),
    [browser_info] NVARCHAR(MAX), -- JSON
    [screen_resolution] NVARCHAR(20),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([test_id]) REFERENCES [tests]([test_id]),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id])
);

-- Test results table
CREATE TABLE [test_results] (
    [result_id] INT IDENTITY(1,1) PRIMARY KEY,
    [test_id] INT NOT NULL,
    [user_id] INT NOT NULL,
    [session_id] INT,
    [score] DECIMAL(5,2) NOT NULL,
    [total_marks] INT NOT NULL,
    [percentage] DECIMAL(5,2) NOT NULL,
    [answers] NVARCHAR(MAX), -- JSON string of user answers
    [time_taken] INT, -- minutes
    [attempt_number] INT DEFAULT 1,
    [passed] BIT DEFAULT 0,
    [started_at] DATETIME2,
    [completed_at] DATETIME2 DEFAULT GETDATE(),
    [reviewed] BIT DEFAULT 0,
    [feedback] NVARCHAR(MAX),
    FOREIGN KEY ([test_id]) REFERENCES [tests]([test_id]),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]),
    FOREIGN KEY ([session_id]) REFERENCES [test_sessions]([session_id])
);

-- =============================================================================
-- CONTENT MANAGEMENT SYSTEM TABLES
-- =============================================================================

-- Articles table
CREATE TABLE [articles] (
    [article_id] INT IDENTITY(1,1) PRIMARY KEY,
    [title] NVARCHAR(255) NOT NULL,
    [slug] NVARCHAR(255) UNIQUE,
    [content] NVARCHAR(MAX) NOT NULL,
    [excerpt] NVARCHAR(500),
    [author_id] INT NOT NULL,
    [category] NVARCHAR(100),
    [tags] NVARCHAR(500), -- comma-separated tags
    [featured_image] NVARCHAR(255),
    [status] NVARCHAR(20) DEFAULT 'draft',
    [published_at] DATETIME2,
    [views_count] INT DEFAULT 0,
    [likes_count] INT DEFAULT 0,
    [comments_enabled] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([author_id]) REFERENCES [users]([user_id])
);

-- =============================================================================
-- GAMIFICATION SYSTEM TABLES
-- =============================================================================

-- User profiles for gamification
CREATE TABLE [user_profiles] (
    [profile_id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL UNIQUE,
    [level] INT DEFAULT 1,
    [experience_points] INT DEFAULT 0,
    [total_points] INT DEFAULT 0,
    [streak_days] INT DEFAULT 0,
    [last_activity] DATETIME2,
    [achievements_count] INT DEFAULT 0,
    [courses_completed] INT DEFAULT 0,
    [tests_passed] INT DEFAULT 0,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]) ON DELETE CASCADE
);

-- Badges table
CREATE TABLE [badges] (
    [badge_id] INT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(255),
    [icon] NVARCHAR(255),
    [color] NVARCHAR(7), -- hex color code
    [criteria] NVARCHAR(MAX), -- JSON string describing how to earn
    [points_reward] INT DEFAULT 0,
    [rarity] NVARCHAR(20) DEFAULT 'common',
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
);

-- Points transactions table
CREATE TABLE [points_transactions] (
    [transaction_id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL,
    [points] INT NOT NULL,
    [transaction_type] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(255),
    [reference_id] INT, -- course_id, test_id, etc.
    [reference_type] NVARCHAR(50), -- course, test, badge, etc.
    [created_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id])
);

-- User achievements table
CREATE TABLE [user_achievements] (
    [achievement_id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL,
    [badge_id] INT NOT NULL,
    [earned_at] DATETIME2 DEFAULT GETDATE(),
    [points_earned] INT DEFAULT 0,
    [progress] DECIMAL(5,2) DEFAULT 100.00,
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]),
    FOREIGN KEY ([badge_id]) REFERENCES [badges]([badge_id]),
    UNIQUE ([user_id], [badge_id])
);

-- Leaderboards table
CREATE TABLE [leaderboards] (
    [leaderboard_id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL,
    [category] NVARCHAR(50) NOT NULL, -- overall, monthly, course_specific
    [points] INT DEFAULT 0,
    [rank] INT,
    [department_id] INT,
    [course_id] INT,
    [period_start] DATETIME2,
    [period_end] DATETIME2,
    [last_updated] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]),
    FOREIGN KEY ([department_id]) REFERENCES [departments]([department_id]),
    FOREIGN KEY ([course_id]) REFERENCES [courses]([course_id])
);

-- =============================================================================
-- PROCTORING SYSTEM TABLES
-- =============================================================================

-- Proctoring sessions table
CREATE TABLE [proctoring_sessions] (
    [session_id] INT IDENTITY(1,1) PRIMARY KEY,
    [test_session_id] INT NOT NULL,
    [user_id] INT NOT NULL,
    [test_id] INT NOT NULL,
    [start_time] DATETIME2 DEFAULT GETDATE(),
    [end_time] DATETIME2,
    [status] NVARCHAR(20) DEFAULT 'active',
    [webcam_enabled] BIT DEFAULT 0,
    [screen_share_enabled] BIT DEFAULT 0,
    [audio_enabled] BIT DEFAULT 0,
    [browser_lock_enabled] BIT DEFAULT 0,
    [tab_switches] INT DEFAULT 0,
    [face_detections] INT DEFAULT 0,
    [violations_count] INT DEFAULT 0,
    [integrity_score] DECIMAL(5,2) DEFAULT 100.00,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([test_session_id]) REFERENCES [test_sessions]([session_id]),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]),
    FOREIGN KEY ([test_id]) REFERENCES [tests]([test_id])
);

-- Proctoring violations table
CREATE TABLE [proctoring_violations] (
    [violation_id] INT IDENTITY(1,1) PRIMARY KEY,
    [session_id] INT NOT NULL,
    [violation_type] NVARCHAR(100) NOT NULL,
    [severity] NVARCHAR(20) DEFAULT 'medium',
    [description] NVARCHAR(500),
    [timestamp] DATETIME2 DEFAULT GETDATE(),
    [metadata] NVARCHAR(MAX), -- JSON string with additional data
    [screenshot_path] NVARCHAR(500),
    [auto_detected] BIT DEFAULT 1,
    [reviewed] BIT DEFAULT 0,
    [reviewer_id] INT,
    [action_taken] NVARCHAR(255),
    FOREIGN KEY ([session_id]) REFERENCES [proctoring_sessions]([session_id]),
    FOREIGN KEY ([reviewer_id]) REFERENCES [users]([user_id])
);

-- Proctoring screenshots table
CREATE TABLE [proctoring_screenshots] (
    [screenshot_id] INT IDENTITY(1,1) PRIMARY KEY,
    [session_id] INT NOT NULL,
    [file_path] NVARCHAR(500) NOT NULL,
    [file_size] BIGINT,
    [capture_type] NVARCHAR(50) DEFAULT 'periodic',
    [violation_id] INT,
    [timestamp] DATETIME2 DEFAULT GETDATE(),
    [face_detected] BIT DEFAULT 0,
    [multiple_faces] BIT DEFAULT 0,
    [suspicious_activity] BIT DEFAULT 0,
    FOREIGN KEY ([session_id]) REFERENCES [proctoring_sessions]([session_id]),
    FOREIGN KEY ([violation_id]) REFERENCES [proctoring_violations]([violation_id])
);

-- Proctoring reports table
CREATE TABLE [proctoring_reports] (
    [report_id] INT IDENTITY(1,1) PRIMARY KEY,
    [session_id] INT NOT NULL,
    [test_id] INT NOT NULL,
    [user_id] INT NOT NULL,
    [integrity_score] DECIMAL(5,2) NOT NULL,
    [total_violations] INT DEFAULT 0,
    [severe_violations] INT DEFAULT 0,
    [moderate_violations] INT DEFAULT 0,
    [minor_violations] INT DEFAULT 0,
    [recommendations] NVARCHAR(MAX),
    [risk_level] NVARCHAR(20) DEFAULT 'low',
    [generated_at] DATETIME2 DEFAULT GETDATE(),
    [reviewed_by] INT,
    [reviewed_at] DATETIME2,
    [final_decision] NVARCHAR(100),
    FOREIGN KEY ([session_id]) REFERENCES [proctoring_sessions]([session_id]),
    FOREIGN KEY ([test_id]) REFERENCES [tests]([test_id]),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]),
    FOREIGN KEY ([reviewed_by]) REFERENCES [users]([user_id])
);

-- =============================================================================
-- AUTHENTICATION & SECURITY TABLES
-- =============================================================================

-- Refresh tokens table for JWT authentication
CREATE TABLE [refresh_tokens] (
    [token_id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL,
    [token] NVARCHAR(500) NOT NULL UNIQUE,
    [expires_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [revoked] BIT DEFAULT 0,
    [revoked_at] DATETIME2,
    [replaced_by_token] NVARCHAR(500),
    [created_by_ip] NVARCHAR(45),
    [revoked_by_ip] NVARCHAR(45),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]) ON DELETE CASCADE
);

-- API keys table
CREATE TABLE [api_keys] (
    [key_id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL,
    [api_key] NVARCHAR(255) NOT NULL UNIQUE,
    [name] NVARCHAR(100) NOT NULL,
    [permissions] NVARCHAR(MAX), -- JSON string
    [is_active] BIT DEFAULT 1,
    [expires_at] DATETIME2,
    [last_used_at] DATETIME2,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]) ON DELETE CASCADE
);

-- Security policies table
CREATE TABLE [security_policies] (
    [policy_id] INT IDENTITY(1,1) PRIMARY KEY,
    [policy_name] NVARCHAR(100) NOT NULL UNIQUE,
    [description] NVARCHAR(255),
    [rules] NVARCHAR(MAX) NOT NULL, -- JSON string
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
);

-- =============================================================================
-- NOTIFICATION & ACTIVITY TABLES
-- =============================================================================

-- Notifications table
CREATE TABLE [notifications] (
    [notification_id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [message] NVARCHAR(MAX) NOT NULL,
    [type] NVARCHAR(50) DEFAULT 'info',
    [priority] NVARCHAR(20) DEFAULT 'normal',
    [is_read] BIT DEFAULT 0,
    [action_url] NVARCHAR(500),
    [expires_at] DATETIME2,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [read_at] DATETIME2,
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]) ON DELETE CASCADE
);

-- User activities table
CREATE TABLE [user_activities] (
    [activity_id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL,
    [activity_type] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(255) NOT NULL,
    [metadata] NVARCHAR(MAX), -- JSON string
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(500),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id])
);

-- =============================================================================
-- SYSTEM CONFIGURATION TABLES
-- =============================================================================

-- System settings table
CREATE TABLE [system_settings] (
    [setting_id] INT IDENTITY(1,1) PRIMARY KEY,
    [setting_key] NVARCHAR(100) NOT NULL UNIQUE,
    [setting_value] NVARCHAR(MAX),
    [setting_type] NVARCHAR(50) DEFAULT 'string',
    [description] NVARCHAR(255),
    [is_public] BIT DEFAULT 0,
    [category] NVARCHAR(50) DEFAULT 'general',
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
);

-- Audit logs table
CREATE TABLE [audit_logs] (
    [log_id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT,
    [action] NVARCHAR(100) NOT NULL,
    [table_name] NVARCHAR(100),
    [record_id] INT,
    [old_values] NVARCHAR(MAX), -- JSON string
    [new_values] NVARCHAR(MAX), -- JSON string
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(500),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id])
);

-- =============================================================================
-- STORED PROCEDURES
-- =============================================================================
GO

-- Stored procedure to update leaderboards
CREATE PROCEDURE [sp_UpdateLeaderboards]
AS
BEGIN
    SET NOCOUNT ON;

    -- Update overall leaderboard
    MERGE [leaderboards] AS target
    USING (
        SELECT
            up.[user_id],
            'overall' as category,
            up.[total_points] as points,
            NULL as [department_id],
            NULL as [course_id],
            NULL as [period_start],
            NULL as [period_end]
        FROM [user_profiles] up
        INNER JOIN [users] u ON up.[user_id] = u.[user_id]
        WHERE u.[is_active] = 1
    ) AS source ON target.[user_id] = source.[user_id] AND target.[category] = source.[category]
    WHEN MATCHED THEN
        UPDATE SET
            [points] = source.[points],
            [last_updated] = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT ([user_id], [category], [points], [department_id], [course_id], [period_start], [period_end])
        VALUES (source.[user_id], source.[category], source.[points], source.[department_id], source.[course_id], source.[period_start], source.[period_end]);

    -- Update ranks
    WITH RankedLeaderboard AS (
        SELECT
            [leaderboard_id],
            ROW_NUMBER() OVER (PARTITION BY [category] ORDER BY [points] DESC) as new_rank
        FROM [leaderboards]
        WHERE [category] = 'overall'
    )
    UPDATE l
    SET [rank] = r.new_rank
    FROM [leaderboards] l
    INNER JOIN RankedLeaderboard r ON l.[leaderboard_id] = r.[leaderboard_id];
END;
GO

-- Stored procedure to calculate integrity score
CREATE PROCEDURE [sp_CalculateIntegrityScore]
    @SessionId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TotalViolations INT;
    DECLARE @SevereViolations INT;
    DECLARE @ModerateViolations INT;
    DECLARE @MinorViolations INT;
    DECLARE @IntegrityScore DECIMAL(5,2);

    -- Count violations by severity
    SELECT
        @TotalViolations = COUNT(*),
        @SevereViolations = SUM(CASE WHEN [severity] = 'severe' THEN 1 ELSE 0 END),
        @ModerateViolations = SUM(CASE WHEN [severity] = 'moderate' THEN 1 ELSE 0 END),
        @MinorViolations = SUM(CASE WHEN [severity] = 'minor' THEN 1 ELSE 0 END)
    FROM [proctoring_violations]
    WHERE [session_id] = @SessionId;

    -- Calculate integrity score (100 - penalties)
    SET @IntegrityScore = 100.0 - (@SevereViolations * 25.0) - (@ModerateViolations * 10.0) - (@MinorViolations * 5.0);

    -- Ensure score doesn't go below 0
    IF @IntegrityScore < 0
        SET @IntegrityScore = 0;

    -- Update session with calculated score
    UPDATE [proctoring_sessions]
    SET
        [violations_count] = @TotalViolations,
        [integrity_score] = @IntegrityScore,
        [updated_at] = GETDATE()
    WHERE [session_id] = @SessionId;

    -- Return the calculated score
    SELECT @IntegrityScore as [integrity_score];
END;
GO

-- =============================================================================
-- VIEWS
-- =============================================================================
GO

-- Proctoring dashboard view
CREATE VIEW [vw_ProctoringDashboard] AS
SELECT
    ps.[session_id],
    ps.[test_session_id],
    u.[username],
    u.[first_name],
    u.[last_name],
    t.[title] as [test_title],
    c.[title] as [course_title],
    ps.[start_time],
    ps.[end_time],
    ps.[status],
    ps.[integrity_score],
    ps.[violations_count],
    ps.[webcam_enabled],
    ps.[screen_share_enabled],
    CASE
        WHEN ps.[integrity_score] >= 90 THEN 'Low Risk'
        WHEN ps.[integrity_score] >= 70 THEN 'Medium Risk'
        ELSE 'High Risk'
    END as [risk_level]
FROM [proctoring_sessions] ps
INNER JOIN [users] u ON ps.[user_id] = u.[user_id]
INNER JOIN [tests] t ON ps.[test_id] = t.[test_id]
LEFT JOIN [courses] c ON t.[course_id] = c.[course_id];
GO

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
GO

-- User indexes
CREATE INDEX IX_users_email ON [users]([email]);
CREATE INDEX IX_users_username ON [users]([username]);
CREATE INDEX IX_users_role_id ON [users]([role_id]);
CREATE INDEX IX_users_department_id ON [users]([department_id]);

-- Course indexes
CREATE INDEX IX_courses_instructor_id ON [courses]([instructor_id]);
CREATE INDEX IX_courses_status ON [courses]([status]);
CREATE INDEX IX_courses_category ON [courses]([category]);

-- Test indexes
CREATE INDEX IX_tests_course_id ON [tests]([course_id]);
CREATE INDEX IX_tests_instructor_id ON [tests]([instructor_id]);
CREATE INDEX IX_tests_status ON [tests]([status]);
CREATE INDEX IX_tests_start_date ON [tests]([start_date]);
CREATE INDEX IX_tests_end_date ON [tests]([end_date]);

-- Test results indexes
CREATE INDEX IX_test_results_user_id ON [test_results]([user_id]);
CREATE INDEX IX_test_results_test_id ON [test_results]([test_id]);
CREATE INDEX IX_test_results_completed_at ON [test_results]([completed_at]);

-- Proctoring indexes
CREATE INDEX IX_proctoring_sessions_user_id ON [proctoring_sessions]([user_id]);
CREATE INDEX IX_proctoring_sessions_test_id ON [proctoring_sessions]([test_id]);
CREATE INDEX IX_proctoring_violations_session_id ON [proctoring_violations]([session_id]);
CREATE INDEX IX_proctoring_violations_timestamp ON [proctoring_violations]([timestamp]);

-- Notification indexes
CREATE INDEX IX_notifications_user_id ON [notifications]([user_id]);
CREATE INDEX IX_notifications_is_read ON [notifications]([is_read]);
CREATE INDEX IX_notifications_created_at ON [notifications]([created_at]);

-- Activity indexes
CREATE INDEX IX_user_activities_user_id ON [user_activities]([user_id]);
CREATE INDEX IX_user_activities_created_at ON [user_activities]([created_at]);
CREATE INDEX IX_user_activities_activity_type ON [user_activities]([activity_type]);

-- =============================================================================
-- INITIAL DATA
-- =============================================================================
GO

-- Insert default roles
INSERT INTO [roles] ([role_name], [description], [permissions]) VALUES
('SuperAdmin', 'Full system access', '{"all": true}'),
('Admin', 'System administration', '{"users": ["create", "read", "update", "delete"], "courses": ["create", "read", "update", "delete"], "tests": ["create", "read", "update", "delete"], "reports": ["read"]}'),
('Instructor', 'Course and test management', '{"courses": ["create", "read", "update"], "tests": ["create", "read", "update", "delete"], "students": ["read"]}'),
('Student', 'Course access and test taking', '{"courses": ["read", "enroll"], "tests": ["take", "view_results"]}'),
('HR', 'HR management functions', '{"users": ["create", "read", "update"], "reports": ["read"]}'),
('Viewer', 'Limited view access', '{"courses": ["read"], "tests": ["read"]}');

-- Insert default departments
INSERT INTO [departments] ([department_name], [description]) VALUES
('Information Technology', 'IT and Software Development'),
('Human Resources', 'HR and Personnel Management'),
('Finance', 'Financial Operations'),
('Marketing', 'Marketing and Communications'),
('Operations', 'Daily Operations Management'),
('Training', 'Learning and Development');

-- Insert default positions
INSERT INTO [positions] ([position_name], [department_id], [description], [level]) VALUES
('System Administrator', 1, 'IT System Administration', 3),
('Software Developer', 1, 'Software Development', 2),
('IT Support', 1, 'IT Technical Support', 1),
('HR Manager', 2, 'Human Resources Management', 3),
('HR Specialist', 2, 'HR Operations', 2),
('Finance Manager', 3, 'Financial Management', 3),
('Accountant', 3, 'Accounting Operations', 2),
('Marketing Manager', 4, 'Marketing Strategy', 3),
('Marketing Specialist', 4, 'Marketing Operations', 2),
('Operations Manager', 5, 'Operations Management', 3),
('Training Manager', 6, 'Training and Development', 3),
('Instructor', 6, 'Course Instruction', 2);

-- Insert default admin user
INSERT INTO [users] ([username], [email], [password], [first_name], [last_name], [role_id], [department_id], [position_id], [employee_id], [is_active], [email_verified])
VALUES ('admin', 'admin@learnhub.com', '$2b$10$rVF8v1gT7E6nQs9xZzX3Z.K8cP4w3p2K8cP4w3p2K8cP4w3p2K8cP4', 'Admin', 'User', 1, 1, 1, 'EMP001', 1, 1);

-- Insert user profile for admin
INSERT INTO [user_profiles] ([user_id], [level], [experience_points], [total_points])
VALUES (1, 10, 5000, 5000);

-- Insert default badges
INSERT INTO [badges] ([name], [description], [icon], [color], [criteria], [points_reward], [rarity]) VALUES
('First Login', 'Welcome to the platform!', 'fas fa-star', '#FFD700', '{"action": "first_login"}', 50, 'common'),
('Course Completionist', 'Complete your first course', 'fas fa-graduation-cap', '#28a745', '{"action": "complete_course", "count": 1}', 100, 'common'),
('Test Ace', 'Score 100% on a test', 'fas fa-trophy', '#ffc107', '{"action": "perfect_test_score"}', 200, 'uncommon'),
('Consistent Learner', '7-day learning streak', 'fas fa-fire', '#dc3545', '{"action": "learning_streak", "days": 7}', 150, 'uncommon'),
('Knowledge Seeker', 'Complete 10 courses', 'fas fa-book', '#17a2b8', '{"action": "complete_course", "count": 10}', 500, 'rare'),
('Master Student', 'Complete 50 courses', 'fas fa-crown', '#6f42c1', '{"action": "complete_course", "count": 50}', 1000, 'epic'),
('Perfect Attendance', '30-day learning streak', 'fas fa-calendar-check', '#fd7e14', '{"action": "learning_streak", "days": 30}', 750, 'rare'),
('Quick Learner', 'Complete a course in under 2 hours', 'fas fa-bolt', '#20c997', '{"action": "quick_course_completion", "hours": 2}', 300, 'uncommon');

-- Insert system settings
INSERT INTO [system_settings] ([setting_key], [setting_value], [setting_type], [description], [category]) VALUES
('site_name', 'Rukchai Hongyen LearnHub', 'string', 'Application name', 'general'),
('site_description', 'Online Learning Management System', 'string', 'Application description', 'general'),
('default_language', 'th', 'string', 'Default system language', 'general'),
('timezone', 'Asia/Bangkok', 'string', 'Default timezone', 'general'),
('max_file_upload_size', '10485760', 'number', 'Maximum file upload size in bytes', 'uploads'),
('allowed_file_types', '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.mp3', 'string', 'Allowed file extensions', 'uploads'),
('session_timeout', '86400', 'number', 'Session timeout in seconds', 'security'),
('password_min_length', '8', 'number', 'Minimum password length', 'security'),
('max_login_attempts', '5', 'number', 'Maximum login attempts before lockout', 'security'),
('lockout_duration', '1800', 'number', 'Account lockout duration in seconds', 'security'),
('jwt_expiry', '3600', 'number', 'JWT token expiry in seconds', 'security'),
('refresh_token_expiry', '2592000', 'number', 'Refresh token expiry in seconds', 'security'),
('enable_email_verification', 'true', 'boolean', 'Require email verification for new accounts', 'email'),
('smtp_host', '', 'string', 'SMTP server hostname', 'email'),
('smtp_port', '587', 'number', 'SMTP server port', 'email'),
('smtp_secure', 'false', 'boolean', 'Use SSL for SMTP', 'email'),
('smtp_user', '', 'string', 'SMTP username', 'email'),
('smtp_password', '', 'string', 'SMTP password', 'email'),
('proctoring_enabled', 'true', 'boolean', 'Enable proctoring system', 'proctoring'),
('proctoring_webcam_required', 'true', 'boolean', 'Require webcam for proctoring', 'proctoring'),
('proctoring_screenshot_interval', '30', 'number', 'Screenshot interval in seconds', 'proctoring'),
('gamification_enabled', 'true', 'boolean', 'Enable gamification features', 'gamification'),
('points_per_course_completion', '100', 'number', 'Points awarded for course completion', 'gamification'),
('points_per_test_pass', '50', 'number', 'Points awarded for passing a test', 'gamification');

-- Insert security policies
INSERT INTO [security_policies] ([policy_name], [description], [rules]) VALUES
('Password Policy', 'Default password requirements', '{"min_length": 8, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_special": false, "max_age_days": 90}'),
('Account Lockout Policy', 'Account lockout rules', '{"max_attempts": 5, "lockout_duration": 1800, "reset_after": 86400}'),
('Session Policy', 'Session management rules', '{"timeout": 86400, "max_concurrent": 3, "require_secure": true}'),
('File Upload Policy', 'File upload restrictions', '{"max_size": 10485760, "allowed_types": [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mp3"], "scan_uploads": true}');

PRINT 'RC_LearnHub database setup completed successfully!';
PRINT 'Default admin credentials: admin / admin123';
PRINT 'Please change the default password after first login.';