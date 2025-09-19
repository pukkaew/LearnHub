-- LearnHub Complete Database Schema
-- Consolidated database file for easy server deployment
-- Created: 2025-09-19
-- Version: 1.0.0

PRINT 'Starting LearnHub database initialization...';
PRINT 'This script will create all necessary tables, indexes, and stored procedures.';
PRINT '';

-- ================================================================
-- SECTION 1: JWT AUTHENTICATION SYSTEM TABLES
-- ================================================================

PRINT 'Creating JWT Authentication System Tables...';

-- Refresh Tokens Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RefreshTokens]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[RefreshTokens] (
        [tokenId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [token] NVARCHAR(500) NOT NULL UNIQUE,
        [deviceInfo] NVARCHAR(MAX),
        [expiresAt] DATETIME2 NOT NULL,
        [isActive] BIT DEFAULT 1,
        [createdAt] DATETIME2 DEFAULT GETDATE(),
        [updatedAt] DATETIME2,
        [lastUsedAt] DATETIME2,

        CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE
    );

    -- Create indexes for better performance
    CREATE NONCLUSTERED INDEX IX_RefreshTokens_UserId ON [dbo].[RefreshTokens] ([userId]);
    CREATE NONCLUSTERED INDEX IX_RefreshTokens_Token ON [dbo].[RefreshTokens] ([token]);
    CREATE NONCLUSTERED INDEX IX_RefreshTokens_ExpiresAt ON [dbo].[RefreshTokens] ([expiresAt]);
    CREATE NONCLUSTERED INDEX IX_RefreshTokens_IsActive ON [dbo].[RefreshTokens] ([isActive]);

    PRINT 'RefreshTokens table created successfully.';
END
ELSE
BEGIN
    PRINT 'RefreshTokens table already exists.';
END;

-- API Keys Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ApiKeys]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ApiKeys] (
        [apiKeyId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [apiKey] NVARCHAR(100) NOT NULL UNIQUE,
        [name] NVARCHAR(100) NOT NULL,
        [description] NVARCHAR(500),
        [permissions] NVARCHAR(MAX), -- JSON array of permissions
        [expiresAt] DATETIME2,
        [isActive] BIT DEFAULT 1,
        [createdAt] DATETIME2 DEFAULT GETDATE(),
        [updatedAt] DATETIME2,
        [lastUsedAt] DATETIME2,
        [usageCount] INT DEFAULT 0,
        [rateLimitCount] INT DEFAULT 0,
        [rateLimitResetAt] DATETIME2,

        CONSTRAINT FK_ApiKeys_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE
    );

    -- Create indexes for better performance
    CREATE NONCLUSTERED INDEX IX_ApiKeys_UserId ON [dbo].[ApiKeys] ([userId]);
    CREATE NONCLUSTERED INDEX IX_ApiKeys_ApiKey ON [dbo].[ApiKeys] ([apiKey]);
    CREATE NONCLUSTERED INDEX IX_ApiKeys_IsActive ON [dbo].[ApiKeys] ([isActive]);
    CREATE NONCLUSTERED INDEX IX_ApiKeys_ExpiresAt ON [dbo].[ApiKeys] ([expiresAt]);

    PRINT 'ApiKeys table created successfully.';
END
ELSE
BEGIN
    PRINT 'ApiKeys table already exists.';
END;

-- JWT Blacklist Table (for revoked tokens)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[JwtBlacklist]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[JwtBlacklist] (
        [blacklistId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [tokenId] NVARCHAR(50) NOT NULL UNIQUE, -- JWT 'jti' claim
        [userId] UNIQUEIDENTIFIER,
        [reason] NVARCHAR(100), -- 'logout', 'revoked', 'security_breach', etc.
        [createdAt] DATETIME2 DEFAULT GETDATE(),
        [expiresAt] DATETIME2 NOT NULL,

        CONSTRAINT FK_JwtBlacklist_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE SET NULL
    );

    -- Create indexes for better performance
    CREATE NONCLUSTERED INDEX IX_JwtBlacklist_TokenId ON [dbo].[JwtBlacklist] ([tokenId]);
    CREATE NONCLUSTERED INDEX IX_JwtBlacklist_UserId ON [dbo].[JwtBlacklist] ([userId]);
    CREATE NONCLUSTERED INDEX IX_JwtBlacklist_ExpiresAt ON [dbo].[JwtBlacklist] ([expiresAt]);

    PRINT 'JwtBlacklist table created successfully.';
END
ELSE
BEGIN
    PRINT 'JwtBlacklist table already exists.';
END;

-- Login Sessions Table (for tracking user sessions)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LoginSessions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[LoginSessions] (
        [sessionId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [sessionToken] NVARCHAR(500) UNIQUE,
        [deviceInfo] NVARCHAR(MAX), -- JSON with device details
        [ipAddress] NVARCHAR(45),
        [userAgent] NVARCHAR(500),
        [fingerprint] NVARCHAR(64),
        [location] NVARCHAR(100),
        [isActive] BIT DEFAULT 1,
        [createdAt] DATETIME2 DEFAULT GETDATE(),
        [lastActivityAt] DATETIME2 DEFAULT GETDATE(),
        [expiresAt] DATETIME2,
        [logoutAt] DATETIME2,
        [logoutReason] NVARCHAR(50), -- 'manual', 'timeout', 'security', 'admin'

        CONSTRAINT FK_LoginSessions_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE
    );

    -- Create indexes for better performance
    CREATE NONCLUSTERED INDEX IX_LoginSessions_UserId ON [dbo].[LoginSessions] ([userId]);
    CREATE NONCLUSTERED INDEX IX_LoginSessions_SessionToken ON [dbo].[LoginSessions] ([sessionToken]);
    CREATE NONCLUSTERED INDEX IX_LoginSessions_IsActive ON [dbo].[LoginSessions] ([isActive]);
    CREATE NONCLUSTERED INDEX IX_LoginSessions_LastActivityAt ON [dbo].[LoginSessions] ([lastActivityAt]);
    CREATE NONCLUSTERED INDEX IX_LoginSessions_ExpiresAt ON [dbo].[LoginSessions] ([expiresAt]);

    PRINT 'LoginSessions table created successfully.';
END
ELSE
BEGIN
    PRINT 'LoginSessions table already exists.';
END;

-- Security Policies Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SecurityPolicies]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SecurityPolicies] (
        [policyId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [policyName] NVARCHAR(100) NOT NULL UNIQUE,
        [policyType] NVARCHAR(50) NOT NULL, -- 'password', 'session', 'api', 'mfa'
        [rules] NVARCHAR(MAX) NOT NULL, -- JSON rules
        [isActive] BIT DEFAULT 1,
        [createdAt] DATETIME2 DEFAULT GETDATE(),
        [updatedAt] DATETIME2,
        [createdBy] UNIQUEIDENTIFIER,
        [updatedBy] UNIQUEIDENTIFIER,

        CONSTRAINT FK_SecurityPolicies_CreatedBy FOREIGN KEY ([createdBy])
            REFERENCES [dbo].[Users]([userId]) ON DELETE SET NULL,
        CONSTRAINT FK_SecurityPolicies_UpdatedBy FOREIGN KEY ([updatedBy])
            REFERENCES [dbo].[Users]([userId]) ON DELETE SET NULL
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_SecurityPolicies_PolicyType ON [dbo].[SecurityPolicies] ([policyType]);
    CREATE NONCLUSTERED INDEX IX_SecurityPolicies_IsActive ON [dbo].[SecurityPolicies] ([isActive]);

    PRINT 'SecurityPolicies table created successfully.';
END
ELSE
BEGIN
    PRINT 'SecurityPolicies table already exists.';
END;

-- Insert default security policies
IF NOT EXISTS (SELECT * FROM [dbo].[SecurityPolicies] WHERE [policyName] = 'DefaultPasswordPolicy')
BEGIN
    INSERT INTO [dbo].[SecurityPolicies] ([policyName], [policyType], [rules], [isActive]) VALUES
    ('DefaultPasswordPolicy', 'password', N'{
        "minLength": 8,
        "maxLength": 128,
        "requireUppercase": true,
        "requireLowercase": true,
        "requireNumbers": true,
        "requireSpecialChars": false,
        "preventCommonPasswords": true,
        "preventUserInfo": true,
        "maxAge": 90,
        "historyCount": 5
    }', 1),
    ('DefaultSessionPolicy', 'session', N'{
        "accessTokenExpiry": "15m",
        "refreshTokenExpiry": "7d",
        "maxConcurrentSessions": 3,
        "sessionTimeoutWarning": "5m",
        "requireReauthForSensitive": true,
        "trackDeviceFingerprint": true,
        "lockAfterFailedAttempts": 5,
        "lockDuration": "15m"
    }', 1),
    ('DefaultApiPolicy', 'api', N'{
        "rateLimit": {
            "requests": 1000,
            "window": "1h"
        },
        "maxApiKeys": 5,
        "defaultExpiry": "90d",
        "requireWhitelist": false,
        "logAllRequests": true,
        "blockSuspiciousActivity": true
    }', 1);

    PRINT 'Default security policies inserted successfully.';
END;

-- ================================================================
-- SECTION 2: GAMIFICATION SYSTEM TABLES
-- ================================================================

PRINT 'Creating Gamification System Tables...';

-- User Profiles Extension for Gamification
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('UserProfiles') AND name = 'totalPoints')
BEGIN
    ALTER TABLE [dbo].[UserProfiles] ADD
        [totalPoints] INT DEFAULT 0,
        [currentLevel] INT DEFAULT 1,
        [lastLevelUp] DATETIME2,
        [loginStreak] INT DEFAULT 0,
        [maxLoginStreak] INT DEFAULT 0,
        [lastLoginDate] DATETIME2,
        [weeklyPoints] INT DEFAULT 0,
        [monthlyPoints] INT DEFAULT 0,
        [yearlyPoints] INT DEFAULT 0;

    PRINT 'Added gamification columns to UserProfiles table.';
END
ELSE
BEGIN
    PRINT 'Gamification columns already exist in UserProfiles table.';
END;

-- Points Transactions Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PointsTransactions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PointsTransactions] (
        [transactionId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [action] NVARCHAR(100) NOT NULL,
        [points] INT NOT NULL,
        [metadata] NVARCHAR(MAX), -- JSON data about the action
        [createdAt] DATETIME2 DEFAULT GETDATE(),
        [relatedId] UNIQUEIDENTIFIER, -- ID of related object (course, test, etc.)
        [relatedType] NVARCHAR(50), -- Type of related object

        CONSTRAINT FK_PointsTransactions_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_PointsTransactions_UserId ON [dbo].[PointsTransactions] ([userId]);
    CREATE NONCLUSTERED INDEX IX_PointsTransactions_Action ON [dbo].[PointsTransactions] ([action]);
    CREATE NONCLUSTERED INDEX IX_PointsTransactions_CreatedAt ON [dbo].[PointsTransactions] ([createdAt]);

    PRINT 'PointsTransactions table created successfully.';
END
ELSE
BEGIN
    PRINT 'PointsTransactions table already exists.';
END;

-- User Achievements Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserAchievements]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserAchievements] (
        [userAchievementId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [achievementId] NVARCHAR(100) NOT NULL,
        [unlockedAt] DATETIME2 DEFAULT GETDATE(),
        [progress] INT DEFAULT 100, -- Percentage progress (100 = completed)
        [metadata] NVARCHAR(MAX), -- Additional data about the achievement

        CONSTRAINT FK_UserAchievements_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE,

        CONSTRAINT UQ_UserAchievements_UserAchievement UNIQUE ([userId], [achievementId])
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_UserAchievements_UserId ON [dbo].[UserAchievements] ([userId]);
    CREATE NONCLUSTERED INDEX IX_UserAchievements_AchievementId ON [dbo].[UserAchievements] ([achievementId]);
    CREATE NONCLUSTERED INDEX IX_UserAchievements_UnlockedAt ON [dbo].[UserAchievements] ([unlockedAt]);

    PRINT 'UserAchievements table created successfully.';
END
ELSE
BEGIN
    PRINT 'UserAchievements table already exists.';
END;

-- Leaderboards Table (for periodic snapshots)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Leaderboards]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Leaderboards] (
        [leaderboardId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [leaderboardType] NVARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'yearly', 'department'
        [period] NVARCHAR(20) NOT NULL, -- '2024-W01', '2024-01', '2024', etc.
        [rank] INT NOT NULL,
        [score] INT NOT NULL,
        [departmentId] UNIQUEIDENTIFIER,
        [createdAt] DATETIME2 DEFAULT GETDATE(),

        CONSTRAINT FK_Leaderboards_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE,
        CONSTRAINT FK_Leaderboards_Departments FOREIGN KEY ([departmentId])
            REFERENCES [dbo].[Departments]([departmentId]) ON DELETE SET NULL
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_Leaderboards_Type_Period ON [dbo].[Leaderboards] ([leaderboardType], [period]);
    CREATE NONCLUSTERED INDEX IX_Leaderboards_UserId ON [dbo].[Leaderboards] ([userId]);
    CREATE NONCLUSTERED INDEX IX_Leaderboards_DepartmentId ON [dbo].[Leaderboards] ([departmentId]);
    CREATE NONCLUSTERED INDEX IX_Leaderboards_Rank ON [dbo].[Leaderboards] ([rank]);

    PRINT 'Leaderboards table created successfully.';
END
ELSE
BEGIN
    PRINT 'Leaderboards table already exists.';
END;

-- Badges Table (for special recognitions)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Badges]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Badges] (
        [badgeId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [name] NVARCHAR(100) NOT NULL,
        [description] NVARCHAR(500),
        [icon] NVARCHAR(100), -- CSS class for icon
        [color] NVARCHAR(20), -- Hex color code
        [rarity] NVARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
        [category] NVARCHAR(50), -- 'learning', 'social', 'achievement', 'special'
        [isActive] BIT DEFAULT 1,
        [createdAt] DATETIME2 DEFAULT GETDATE(),
        [createdBy] UNIQUEIDENTIFIER,

        CONSTRAINT FK_Badges_CreatedBy FOREIGN KEY ([createdBy])
            REFERENCES [dbo].[Users]([userId]) ON DELETE SET NULL
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_Badges_Category ON [dbo].[Badges] ([category]);
    CREATE NONCLUSTERED INDEX IX_Badges_Rarity ON [dbo].[Badges] ([rarity]);
    CREATE NONCLUSTERED INDEX IX_Badges_IsActive ON [dbo].[Badges] ([isActive]);

    PRINT 'Badges table created successfully.';
END
ELSE
BEGIN
    PRINT 'Badges table already exists.';
END;

-- User Badges Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserBadges]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserBadges] (
        [userBadgeId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [badgeId] UNIQUEIDENTIFIER NOT NULL,
        [earnedAt] DATETIME2 DEFAULT GETDATE(),
        [awardedBy] UNIQUEIDENTIFIER,
        [reason] NVARCHAR(500),
        [isVisible] BIT DEFAULT 1,

        CONSTRAINT FK_UserBadges_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE,
        CONSTRAINT FK_UserBadges_Badges FOREIGN KEY ([badgeId])
            REFERENCES [dbo].[Badges]([badgeId]) ON DELETE CASCADE,
        CONSTRAINT FK_UserBadges_AwardedBy FOREIGN KEY ([awardedBy])
            REFERENCES [dbo].[Users]([userId]) ON DELETE SET NULL,

        CONSTRAINT UQ_UserBadges_UserBadge UNIQUE ([userId], [badgeId])
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_UserBadges_UserId ON [dbo].[UserBadges] ([userId]);
    CREATE NONCLUSTERED INDEX IX_UserBadges_BadgeId ON [dbo].[UserBadges] ([badgeId]);
    CREATE NONCLUSTERED INDEX IX_UserBadges_EarnedAt ON [dbo].[UserBadges] ([earnedAt]);

    PRINT 'UserBadges table created successfully.';
END
ELSE
BEGIN
    PRINT 'UserBadges table already exists.';
END;

-- Daily Points Summary (for analytics)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DailyPointsSummary]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DailyPointsSummary] (
        [summaryId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [date] DATE NOT NULL,
        [pointsEarned] INT NOT NULL,
        [actionsCount] INT NOT NULL,
        [coursesCompleted] INT DEFAULT 0,
        [testsCompleted] INT DEFAULT 0,
        [achievementsUnlocked] INT DEFAULT 0,
        [createdAt] DATETIME2 DEFAULT GETDATE(),

        CONSTRAINT FK_DailyPointsSummary_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE,

        CONSTRAINT UQ_DailyPointsSummary_UserDate UNIQUE ([userId], [date])
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_DailyPointsSummary_UserId ON [dbo].[DailyPointsSummary] ([userId]);
    CREATE NONCLUSTERED INDEX IX_DailyPointsSummary_Date ON [dbo].[DailyPointsSummary] ([date]);

    PRINT 'DailyPointsSummary table created successfully.';
END
ELSE
BEGIN
    PRINT 'DailyPointsSummary table already exists.';
END;

-- Insert default badges
IF NOT EXISTS (SELECT * FROM [dbo].[Badges] WHERE [name] = 'ผู้เริ่มต้น')
BEGIN
    INSERT INTO [dbo].[Badges] ([name], [description], [icon], [color], [rarity], [category]) VALUES
    ('ผู้เริ่มต้น', 'เริ่มต้นการเดินทางในการเรียนรู้', 'fas fa-seedling', '#10b981', 'common', 'learning'),
    ('นักเรียน', 'ลงทะเบียนหลักสูตรแรก', 'fas fa-book', '#3b82f6', 'common', 'learning'),
    ('นักสอบ', 'ทำแบบทดสอบครั้งแรก', 'fas fa-clipboard-check', '#8b5cf6', 'common', 'learning'),
    ('คะแนนเต็ม', 'ได้คะแนนเต็มในการทดสอบ', 'fas fa-bullseye', '#f59e0b', 'rare', 'achievement'),
    ('นักวิ่งมาราธอน', 'ผ่านการทดสอบมากมาย', 'fas fa-running', '#ef4444', 'epic', 'achievement'),
    ('ผู้ช่วยเหลือ', 'ช่วยเหลือเพื่อนร่วมเรียน', 'fas fa-hands-helping', '#06b6d4', 'rare', 'social'),
    ('นกตัวแรก', 'ทำงานก่อนกำหนดเสมอ', 'fas fa-sun', '#fbbf24', 'rare', 'special'),
    ('นกฮูก', 'เรียนยามดึก', 'fas fa-moon', '#6366f1', 'rare', 'special'),
    ('ผู้ซื่อสัตย์', 'เข้าระบบต่อเนื่อง', 'fas fa-calendar-check', '#10b981', 'rare', 'special'),
    ('ตำนาน', 'ผู้ที่มีความสำเร็จสูงสุด', 'fas fa-crown', '#dc2626', 'legendary', 'achievement');

    PRINT 'Default badges inserted successfully.';
END;

-- ================================================================
-- SECTION 2: PROCTORING SYSTEM TABLES
-- ================================================================

PRINT 'Creating Proctoring System Tables...';

-- Test Sessions Table Enhancement
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TestSessions') AND name = 'enableProctoring')
BEGIN
    ALTER TABLE [dbo].[TestSessions] ADD
        [enableProctoring] BIT DEFAULT 0,
        [requireFullscreen] BIT DEFAULT 0,
        [requireWebcam] BIT DEFAULT 0,
        [proctoringStartTime] DATETIME2,
        [proctoringEndTime] DATETIME2,
        [integrityScore] INT DEFAULT 100,
        [proctoringStatus] NVARCHAR(50) DEFAULT 'pending'; -- 'pending', 'active', 'completed', 'terminated'

    PRINT 'Added proctoring columns to TestSessions table.';
END
ELSE
BEGIN
    PRINT 'Proctoring columns already exist in TestSessions table.';
END;

-- Proctoring Sessions Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProctoringSessions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ProctoringSessions] (
        [sessionId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [testSessionId] UNIQUEIDENTIFIER NOT NULL,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [testId] UNIQUEIDENTIFIER NOT NULL,
        [startTime] DATETIME2 DEFAULT GETDATE(),
        [endTime] DATETIME2,
        [status] NVARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'terminated'
        [endReason] NVARCHAR(100), -- 'completed', 'excessive_violations', 'webcam_disabled', etc.
        [webcamEnabled] BIT DEFAULT 0,
        [fullscreenEnabled] BIT DEFAULT 0,
        [totalViolations] INT DEFAULT 0,
        [integrityScore] INT DEFAULT 100,
        [screenshots] INT DEFAULT 0,
        [createdAt] DATETIME2 DEFAULT GETDATE(),
        [updatedAt] DATETIME2 DEFAULT GETDATE(),

        CONSTRAINT FK_ProctoringSessions_TestSessions FOREIGN KEY ([testSessionId])
            REFERENCES [dbo].[TestSessions]([sessionId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringSessions_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringSessions_Tests FOREIGN KEY ([testId])
            REFERENCES [dbo].[Tests]([testId]) ON DELETE CASCADE
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_ProctoringSessions_TestSessionId ON [dbo].[ProctoringSessions] ([testSessionId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringSessions_UserId ON [dbo].[ProctoringSessions] ([userId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringSessions_Status ON [dbo].[ProctoringSessions] ([status]);
    CREATE NONCLUSTERED INDEX IX_ProctoringSessions_StartTime ON [dbo].[ProctoringSessions] ([startTime]);

    PRINT 'ProctoringSessions table created successfully.';
END
ELSE
BEGIN
    PRINT 'ProctoringSessions table already exists.';
END;

-- Proctoring Violations Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProctoringViolations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ProctoringViolations] (
        [violationId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [sessionId] UNIQUEIDENTIFIER NOT NULL,
        [testSessionId] UNIQUEIDENTIFIER NOT NULL,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [violationType] NVARCHAR(100) NOT NULL,
        [severity] NVARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
        [description] NVARCHAR(MAX),
        [metadata] NVARCHAR(MAX), -- JSON data with violation details
        [screenshot] NVARCHAR(MAX), -- Base64 screenshot if applicable
        [timestamp] DATETIME2 DEFAULT GETDATE(),
        [resolved] BIT DEFAULT 0,
        [reviewedBy] UNIQUEIDENTIFIER,
        [reviewedAt] DATETIME2,
        [reviewNotes] NVARCHAR(MAX),

        CONSTRAINT FK_ProctoringViolations_ProctoringSessions FOREIGN KEY ([sessionId])
            REFERENCES [dbo].[ProctoringSessions]([sessionId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringViolations_TestSessions FOREIGN KEY ([testSessionId])
            REFERENCES [dbo].[TestSessions]([sessionId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringViolations_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringViolations_ReviewedBy FOREIGN KEY ([reviewedBy])
            REFERENCES [dbo].[Users]([userId]) ON DELETE SET NULL
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_ProctoringViolations_SessionId ON [dbo].[ProctoringViolations] ([sessionId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringViolations_TestSessionId ON [dbo].[ProctoringViolations] ([testSessionId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringViolations_UserId ON [dbo].[ProctoringViolations] ([userId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringViolations_ViolationType ON [dbo].[ProctoringViolations] ([violationType]);
    CREATE NONCLUSTERED INDEX IX_ProctoringViolations_Severity ON [dbo].[ProctoringViolations] ([severity]);
    CREATE NONCLUSTERED INDEX IX_ProctoringViolations_Timestamp ON [dbo].[ProctoringViolations] ([timestamp]);
    CREATE NONCLUSTERED INDEX IX_ProctoringViolations_Resolved ON [dbo].[ProctoringViolations] ([resolved]);

    PRINT 'ProctoringViolations table created successfully.';
END
ELSE
BEGIN
    PRINT 'ProctoringViolations table already exists.';
END;

-- Proctoring Screenshots Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProctoringScreenshots]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ProctoringScreenshots] (
        [screenshotId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [sessionId] UNIQUEIDENTIFIER NOT NULL,
        [testSessionId] UNIQUEIDENTIFIER NOT NULL,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [imageData] NVARCHAR(MAX) NOT NULL, -- Base64 encoded image
        [violationType] NVARCHAR(100), -- Associated violation type if any
        [timestamp] DATETIME2 DEFAULT GETDATE(),
        [fileSize] INT, -- Size in bytes
        [processed] BIT DEFAULT 0,
        [analysisResults] NVARCHAR(MAX), -- JSON with analysis results

        CONSTRAINT FK_ProctoringScreenshots_ProctoringSessions FOREIGN KEY ([sessionId])
            REFERENCES [dbo].[ProctoringSessions]([sessionId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringScreenshots_TestSessions FOREIGN KEY ([testSessionId])
            REFERENCES [dbo].[TestSessions]([sessionId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringScreenshots_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_ProctoringScreenshots_SessionId ON [dbo].[ProctoringScreenshots] ([sessionId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringScreenshots_TestSessionId ON [dbo].[ProctoringScreenshots] ([testSessionId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringScreenshots_UserId ON [dbo].[ProctoringScreenshots] ([userId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringScreenshots_Timestamp ON [dbo].[ProctoringScreenshots] ([timestamp]);
    CREATE NONCLUSTERED INDEX IX_ProctoringScreenshots_ViolationType ON [dbo].[ProctoringScreenshots] ([violationType]);

    PRINT 'ProctoringScreenshots table created successfully.';
END
ELSE
BEGIN
    PRINT 'ProctoringScreenshots table already exists.';
END;

-- Proctoring Warnings Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProctoringWarnings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ProctoringWarnings] (
        [warningId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [sessionId] UNIQUEIDENTIFIER NOT NULL,
        [testSessionId] UNIQUEIDENTIFIER NOT NULL,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [warningType] NVARCHAR(100) NOT NULL,
        [message] NVARCHAR(MAX) NOT NULL,
        [count] INT DEFAULT 1, -- How many times this type of warning has been issued
        [acknowledged] BIT DEFAULT 0,
        [acknowledgedAt] DATETIME2,
        [timestamp] DATETIME2 DEFAULT GETDATE(),

        CONSTRAINT FK_ProctoringWarnings_ProctoringSessions FOREIGN KEY ([sessionId])
            REFERENCES [dbo].[ProctoringSessions]([sessionId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringWarnings_TestSessions FOREIGN KEY ([testSessionId])
            REFERENCES [dbo].[TestSessions]([sessionId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringWarnings_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_ProctoringWarnings_SessionId ON [dbo].[ProctoringWarnings] ([sessionId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringWarnings_TestSessionId ON [dbo].[ProctoringWarnings] ([testSessionId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringWarnings_UserId ON [dbo].[ProctoringWarnings] ([userId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringWarnings_WarningType ON [dbo].[ProctoringWarnings] ([warningType]);
    CREATE NONCLUSTERED INDEX IX_ProctoringWarnings_Timestamp ON [dbo].[ProctoringWarnings] ([timestamp]);

    PRINT 'ProctoringWarnings table created successfully.';
END
ELSE
BEGIN
    PRINT 'ProctoringWarnings table already exists.';
END;

-- Proctoring Reports Table (Summary reports for each session)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProctoringReports]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ProctoringReports] (
        [reportId] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [sessionId] UNIQUEIDENTIFIER NOT NULL,
        [testSessionId] UNIQUEIDENTIFIER NOT NULL,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [testId] UNIQUEIDENTIFIER NOT NULL,
        [duration] INT, -- Duration in seconds
        [totalViolations] INT DEFAULT 0,
        [violationsByType] NVARCHAR(MAX), -- JSON object with violation counts by type
        [totalWarnings] INT DEFAULT 0,
        [totalScreenshots] INT DEFAULT 0,
        [integrityScore] INT DEFAULT 100,
        [riskLevel] NVARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
        [recommendations] NVARCHAR(MAX), -- JSON array of recommendations
        [summary] NVARCHAR(MAX), -- Text summary of the session
        [createdAt] DATETIME2 DEFAULT GETDATE(),
        [createdBy] UNIQUEIDENTIFIER, -- System or admin who generated the report

        CONSTRAINT FK_ProctoringReports_ProctoringSessions FOREIGN KEY ([sessionId])
            REFERENCES [dbo].[ProctoringSessions]([sessionId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringReports_TestSessions FOREIGN KEY ([testSessionId])
            REFERENCES [dbo].[TestSessions]([sessionId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringReports_Users FOREIGN KEY ([userId])
            REFERENCES [dbo].[Users]([userId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringReports_Tests FOREIGN KEY ([testId])
            REFERENCES [dbo].[Tests]([testId]) ON DELETE CASCADE,
        CONSTRAINT FK_ProctoringReports_CreatedBy FOREIGN KEY ([createdBy])
            REFERENCES [dbo].[Users]([userId]) ON DELETE SET NULL
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_ProctoringReports_SessionId ON [dbo].[ProctoringReports] ([sessionId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringReports_TestSessionId ON [dbo].[ProctoringReports] ([testSessionId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringReports_UserId ON [dbo].[ProctoringReports] ([userId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringReports_TestId ON [dbo].[ProctoringReports] ([testId]);
    CREATE NONCLUSTERED INDEX IX_ProctoringReports_IntegrityScore ON [dbo].[ProctoringReports] ([integrityScore]);
    CREATE NONCLUSTERED INDEX IX_ProctoringReports_RiskLevel ON [dbo].[ProctoringReports] ([riskLevel]);
    CREATE NONCLUSTERED INDEX IX_ProctoringReports_CreatedAt ON [dbo].[ProctoringReports] ([createdAt]);

    PRINT 'ProctoringReports table created successfully.';
END
ELSE
BEGIN
    PRINT 'ProctoringReports table already exists.';
END;

-- ================================================================
-- SECTION 3: SCHEMA COMPATIBILITY FIXES
-- ================================================================

PRINT 'Applying Schema Compatibility Fixes...';

-- Test Banks table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[test_banks]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[test_banks] (
        [bank_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [bank_name] NVARCHAR(200) NOT NULL,
        [description] NVARCHAR(500),
        [category_id] UNIQUEIDENTIFIER,
        [owner_id] UNIQUEIDENTIFIER NOT NULL,
        [sharing_level] NVARCHAR(20) DEFAULT 'PRIVATE', -- 'PRIVATE', 'DEPARTMENT', 'PUBLIC'
        [question_count] INT DEFAULT 0,
        [created_date] DATETIME2 DEFAULT GETDATE(),
        [modified_date] DATETIME2,
        [is_active] BIT DEFAULT 1,
        CONSTRAINT FK_test_banks_categories FOREIGN KEY ([category_id])
            REFERENCES [dbo].[CourseCategories]([category_id]),
        CONSTRAINT FK_test_banks_owner FOREIGN KEY ([owner_id])
            REFERENCES [dbo].[Users]([user_id])
    );

    CREATE NONCLUSTERED INDEX IX_test_banks_owner_id ON [dbo].[test_banks] ([owner_id]);
    CREATE NONCLUSTERED INDEX IX_test_banks_category_id ON [dbo].[test_banks] ([category_id]);

    PRINT 'Created test_banks table.';
END;

-- Question Options table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[question_options]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[question_options] (
        [option_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [question_id] UNIQUEIDENTIFIER NOT NULL,
        [option_text] NVARCHAR(500) NOT NULL,
        [option_image] NVARCHAR(500),
        [is_correct] BIT DEFAULT 0,
        [option_order] INT DEFAULT 0,
        [created_date] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_question_options_questions FOREIGN KEY ([question_id])
            REFERENCES [dbo].[TestQuestions]([question_id]) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_question_options_question_id ON [dbo].[question_options] ([question_id]);
    CREATE NONCLUSTERED INDEX IX_question_options_is_correct ON [dbo].[question_options] ([is_correct]);

    PRINT 'Created question_options table.';
END;

-- Test Answers table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[test_answers]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[test_answers] (
        [answer_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [attempt_id] UNIQUEIDENTIFIER NOT NULL,
        [question_id] UNIQUEIDENTIFIER NOT NULL,
        [answer_text] NVARCHAR(MAX),
        [selected_option_id] UNIQUEIDENTIFIER,
        [is_correct] BIT,
        [points_earned] DECIMAL(5,2) DEFAULT 0,
        [time_spent_seconds] INT,
        [answered_date] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_test_answers_attempts FOREIGN KEY ([attempt_id])
            REFERENCES [dbo].[TestAttempts]([attempt_id]) ON DELETE CASCADE,
        CONSTRAINT FK_test_answers_questions FOREIGN KEY ([question_id])
            REFERENCES [dbo].[TestQuestions]([question_id]),
        CONSTRAINT FK_test_answers_options FOREIGN KEY ([selected_option_id])
            REFERENCES [dbo].[question_options]([option_id])
    );

    CREATE NONCLUSTERED INDEX IX_test_answers_attempt_id ON [dbo].[test_answers] ([attempt_id]);
    CREATE NONCLUSTERED INDEX IX_test_answers_question_id ON [dbo].[test_answers] ([question_id]);
    CREATE NONCLUSTERED INDEX IX_test_answers_is_correct ON [dbo].[test_answers] ([is_correct]);

    PRINT 'Created test_answers table.';
END;

-- Course Lessons table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[course_lessons]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[course_lessons] (
        [lesson_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [course_id] UNIQUEIDENTIFIER NOT NULL,
        [lesson_order] INT NOT NULL,
        [lesson_title] NVARCHAR(200) NOT NULL,
        [lesson_description] NVARCHAR(MAX),
        [lesson_type] NVARCHAR(50) DEFAULT 'VIDEO', -- 'VIDEO', 'TEXT', 'PDF', 'QUIZ', 'INTERACTIVE'
        [content_url] NVARCHAR(500),
        [content_text] NVARCHAR(MAX),
        [duration_minutes] INT DEFAULT 0,
        [is_mandatory] BIT DEFAULT 1,
        [min_time_minutes] INT DEFAULT 0,
        [created_date] DATETIME2 DEFAULT GETDATE(),
        [modified_date] DATETIME2,
        [is_active] BIT DEFAULT 1,
        CONSTRAINT FK_course_lessons_courses FOREIGN KEY ([course_id])
            REFERENCES [dbo].[Courses]([course_id]) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_course_lessons_course_id ON [dbo].[course_lessons] ([course_id]);
    CREATE NONCLUSTERED INDEX IX_course_lessons_lesson_order ON [dbo].[course_lessons] ([lesson_order]);

    PRINT 'Created course_lessons table.';
END;

-- ================================================================
-- SECTION 4: SYSTEM SETTINGS AND DATA INITIALIZATION
-- ================================================================

PRINT 'Creating System Tables and Initializing Data...';

-- System Settings Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[system_settings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[system_settings] (
        [setting_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [setting_key] NVARCHAR(100) NOT NULL UNIQUE,
        [setting_value] NVARCHAR(MAX),
        [description] NVARCHAR(500),
        [data_type] NVARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
        [is_public] BIT DEFAULT 0,
        [created_date] DATETIME2 DEFAULT GETDATE(),
        [modified_date] DATETIME2
    );

    INSERT INTO [dbo].[system_settings] ([setting_key], [setting_value], [description], [data_type]) VALUES
    ('system_name', 'Ruxchai LearnHub', 'ชื่อระบบการเรียนรู้', 'string'),
    ('system_version', '1.0.0', 'เวอร์ชันของระบบ', 'string'),
    ('default_points_per_course', '100', 'คะแนนเริ่มต้นสำหรับการเรียนจบหลักสูตร', 'number'),
    ('default_points_per_test', '50', 'คะแนนเริ่มต้นสำหรับการทำแบบทดสอบ', 'number'),
    ('login_streak_bonus', '10', 'คะแนนโบนัสสำหรับการเข้าสู่ระบบต่อเนื่อง', 'number'),
    ('max_login_attempts', '5', 'จำนวนครั้งสูงสุดในการพยายามเข้าสู่ระบบ', 'number'),
    ('session_timeout_minutes', '60', 'เวลาหมดอายุของเซสชัน (นาที)', 'number'),
    ('file_upload_max_size_mb', '10', 'ขนาดไฟล์สูงสุดที่อนุญาตให้อัปโหลด (MB)', 'number'),
    ('enable_email_notifications', 'true', 'เปิดใช้งานการแจ้งเตือนทางอีเมล', 'boolean'),
    ('enable_gamification', 'true', 'เปิดใช้งานระบบเกมมิฟิเคชัน', 'boolean'),
    ('enable_proctoring', 'true', 'เปิดใช้งานระบบควบคุมการสอบ', 'boolean'),
    ('maintenance_mode', 'false', 'โหมดปรับปรุงระบบ', 'boolean');

    PRINT 'Created system settings table and inserted default values.';
END;

-- Audit Logs Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[audit_logs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[audit_logs] (
        [log_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [user_id] UNIQUEIDENTIFIER,
        [action] NVARCHAR(100) NOT NULL,
        [table_name] NVARCHAR(100),
        [record_id] UNIQUEIDENTIFIER,
        [old_values] NVARCHAR(MAX), -- JSON
        [new_values] NVARCHAR(MAX), -- JSON
        [ip_address] NVARCHAR(45),
        [user_agent] NVARCHAR(500),
        [timestamp] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_audit_logs_users FOREIGN KEY ([user_id])
            REFERENCES [dbo].[Users]([user_id]) ON DELETE SET NULL
    );

    CREATE NONCLUSTERED INDEX IX_audit_logs_user_id ON [dbo].[audit_logs] ([user_id]);
    CREATE NONCLUSTERED INDEX IX_audit_logs_action ON [dbo].[audit_logs] ([action]);
    CREATE NONCLUSTERED INDEX IX_audit_logs_timestamp ON [dbo].[audit_logs] ([timestamp]);
    CREATE NONCLUSTERED INDEX IX_audit_logs_table_name ON [dbo].[audit_logs] ([table_name]);

    PRINT 'Created audit logs table.';
END;

-- File Uploads Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[file_uploads]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[file_uploads] (
        [file_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [original_name] NVARCHAR(255) NOT NULL,
        [stored_name] NVARCHAR(255) NOT NULL,
        [file_path] NVARCHAR(500) NOT NULL,
        [file_size] BIGINT NOT NULL,
        [mime_type] NVARCHAR(100),
        [file_type] NVARCHAR(50), -- 'image', 'document', 'video', 'audio', 'other'
        [uploaded_by] UNIQUEIDENTIFIER NOT NULL,
        [related_table] NVARCHAR(100), -- 'courses', 'tests', 'questions', 'users', etc.
        [related_id] UNIQUEIDENTIFIER,
        [upload_purpose] NVARCHAR(100), -- 'profile_image', 'course_material', 'question_image', etc.
        [is_public] BIT DEFAULT 0,
        [download_count] INT DEFAULT 0,
        [upload_date] DATETIME2 DEFAULT GETDATE(),
        [last_accessed] DATETIME2,
        [is_active] BIT DEFAULT 1,
        CONSTRAINT FK_file_uploads_users FOREIGN KEY ([uploaded_by])
            REFERENCES [dbo].[Users]([user_id]) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_file_uploads_uploaded_by ON [dbo].[file_uploads] ([uploaded_by]);
    CREATE NONCLUSTERED INDEX IX_file_uploads_related ON [dbo].[file_uploads] ([related_table], [related_id]);
    CREATE NONCLUSTERED INDEX IX_file_uploads_file_type ON [dbo].[file_uploads] ([file_type]);
    CREATE NONCLUSTERED INDEX IX_file_uploads_upload_date ON [dbo].[file_uploads] ([upload_date]);

    PRINT 'Created file uploads table.';
END;

-- ================================================================
-- SECTION 5: STORED PROCEDURES AND VIEWS
-- ================================================================

PRINT 'Creating Stored Procedures and Views...';

-- Create stored procedure for calculating leaderboards
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_UpdateLeaderboards]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_UpdateLeaderboards];
GO

CREATE PROCEDURE [dbo].[sp_UpdateLeaderboards]
    @LeaderboardType NVARCHAR(50),
    @Period NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    -- Clear existing leaderboard for this period
    DELETE FROM [dbo].[Leaderboards]
    WHERE [leaderboardType] = @LeaderboardType AND [period] = @Period;

    -- Calculate new leaderboard based on type
    IF @LeaderboardType = 'weekly' OR @LeaderboardType = 'monthly' OR @LeaderboardType = 'yearly'
    BEGIN
        INSERT INTO [dbo].[Leaderboards] ([userId], [leaderboardType], [period], [rank], [score], [departmentId])
        SELECT
            up.userId,
            @LeaderboardType,
            @Period,
            ROW_NUMBER() OVER (ORDER BY
                CASE
                    WHEN @LeaderboardType = 'weekly' THEN up.weeklyPoints
                    WHEN @LeaderboardType = 'monthly' THEN up.monthlyPoints
                    WHEN @LeaderboardType = 'yearly' THEN up.yearlyPoints
                    ELSE up.totalPoints
                END DESC
            ) as rank,
            CASE
                WHEN @LeaderboardType = 'weekly' THEN up.weeklyPoints
                WHEN @LeaderboardType = 'monthly' THEN up.monthlyPoints
                WHEN @LeaderboardType = 'yearly' THEN up.yearlyPoints
                ELSE up.totalPoints
            END as score,
            u.departmentId
        FROM [dbo].[UserProfiles] up
        INNER JOIN [dbo].[Users] u ON up.userId = u.userId
        WHERE u.isActive = 1
        ORDER BY score DESC;
    END
    ELSE IF @LeaderboardType = 'department'
    BEGIN
        INSERT INTO [dbo].[Leaderboards] ([userId], [leaderboardType], [period], [rank], [score], [departmentId])
        SELECT
            up.userId,
            @LeaderboardType,
            @Period,
            ROW_NUMBER() OVER (PARTITION BY u.departmentId ORDER BY up.totalPoints DESC) as rank,
            up.totalPoints as score,
            u.departmentId
        FROM [dbo].[UserProfiles] up
        INNER JOIN [dbo].[Users] u ON up.userId = u.userId
        WHERE u.isActive = 1 AND u.departmentId IS NOT NULL
        ORDER BY u.departmentId, score DESC;
    END;

    PRINT 'Leaderboard updated for ' + @LeaderboardType + ' period: ' + @Period;
END;
GO

-- Create stored procedure to calculate integrity score
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_CalculateIntegrityScore]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_CalculateIntegrityScore];
GO

CREATE PROCEDURE [dbo].[sp_CalculateIntegrityScore]
    @SessionId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IntegrityScore INT = 100;
    DECLARE @HighViolations INT = 0;
    DECLARE @MediumViolations INT = 0;
    DECLARE @LowViolations INT = 0;
    DECLARE @WebcamDisabled BIT = 0;

    -- Count violations by severity
    SELECT
        @HighViolations = SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END),
        @MediumViolations = SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END),
        @LowViolations = SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END)
    FROM [dbo].[ProctoringViolations]
    WHERE sessionId = @SessionId;

    -- Check if webcam was disabled
    SELECT @WebcamDisabled = CASE WHEN webcamEnabled = 0 THEN 1 ELSE 0 END
    FROM [dbo].[ProctoringSessions]
    WHERE sessionId = @SessionId;

    -- Calculate score deductions
    SET @IntegrityScore = @IntegrityScore - (@HighViolations * 15);
    SET @IntegrityScore = @IntegrityScore - (@MediumViolations * 10);
    SET @IntegrityScore = @IntegrityScore - (@LowViolations * 5);

    IF @WebcamDisabled = 1
        SET @IntegrityScore = @IntegrityScore - 30;

    -- Ensure score doesn't go below 0
    IF @IntegrityScore < 0
        SET @IntegrityScore = 0;

    -- Update the session with the calculated score
    UPDATE [dbo].[ProctoringSessions]
    SET
        integrityScore = @IntegrityScore,
        totalViolations = @HighViolations + @MediumViolations + @LowViolations,
        updatedAt = GETDATE()
    WHERE sessionId = @SessionId;

    SELECT @IntegrityScore as IntegrityScore;
END;
GO

-- Create view for proctoring dashboard
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[vw_ProctoringDashboard]'))
    DROP VIEW [dbo].[vw_ProctoringDashboard];
GO

CREATE VIEW [dbo].[vw_ProctoringDashboard]
AS
SELECT
    ps.sessionId,
    ps.testSessionId,
    ps.userId,
    u.firstName + ' ' + u.lastName as studentName,
    u.email as studentEmail,
    t.title as testTitle,
    d.name as departmentName,
    ps.startTime,
    ps.endTime,
    ps.status,
    ps.integrityScore,
    ps.totalViolations,
    ps.webcamEnabled,
    ps.fullscreenEnabled,
    pr.riskLevel,
    pr.summary,
    CASE
        WHEN ps.integrityScore >= 90 THEN 'เชื่อถือได้'
        WHEN ps.integrityScore >= 70 THEN 'ปานกลาง'
        ELSE 'เสี่ยงสูง'
    END as trustLevel
FROM [dbo].[ProctoringSessions] ps
INNER JOIN [dbo].[Users] u ON ps.userId = u.userId
INNER JOIN [dbo].[Tests] t ON ps.testId = t.testId
LEFT JOIN [dbo].[Departments] d ON u.departmentId = d.departmentId
LEFT JOIN [dbo].[ProctoringReports] pr ON ps.sessionId = pr.sessionId;
GO

PRINT '';
PRINT '================================================================';
PRINT 'LearnHub Database Initialization Complete!';
PRINT '================================================================';
PRINT '';
PRINT 'Summary of created components:';
PRINT '- Gamification System: Points, Badges, Leaderboards, Achievements';
PRINT '- Proctoring System: Sessions, Violations, Screenshots, Reports';
PRINT '- System Management: Settings, Audit Logs, File Uploads';
PRINT '- Supporting Tables: Test Banks, Question Options, Course Lessons';
PRINT '- Stored Procedures: Leaderboard updates, Integrity scoring';
PRINT '- Views: Proctoring dashboard';
PRINT '';
PRINT 'Database is now ready for deployment and use.';
PRINT 'Please ensure to configure system settings according to your requirements.';
PRINT '';