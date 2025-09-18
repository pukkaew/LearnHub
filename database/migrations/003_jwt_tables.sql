-- JWT Authentication Tables Migration
-- Create tables for JWT refresh tokens and API keys

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
    }', 1);

    PRINT 'Default password policy inserted.';
END;

IF NOT EXISTS (SELECT * FROM [dbo].[SecurityPolicies] WHERE [policyName] = 'DefaultSessionPolicy')
BEGIN
    INSERT INTO [dbo].[SecurityPolicies] ([policyName], [policyType], [rules], [isActive]) VALUES
    ('DefaultSessionPolicy', 'session', N'{
        "accessTokenExpiry": "15m",
        "refreshTokenExpiry": "7d",
        "maxConcurrentSessions": 3,
        "sessionTimeoutWarning": "5m",
        "requireReauthForSensitive": true,
        "trackDeviceFingerprint": true,
        "lockAfterFailedAttempts": 5,
        "lockDuration": "15m"
    }', 1);

    PRINT 'Default session policy inserted.';
END;

IF NOT EXISTS (SELECT * FROM [dbo].[SecurityPolicies] WHERE [policyName] = 'DefaultApiPolicy')
BEGIN
    INSERT INTO [dbo].[SecurityPolicies] ([policyName], [policyType], [rules], [isActive]) VALUES
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

    PRINT 'Default API policy inserted.';
END;

-- Add cleanup job for expired tokens (commented out - should be run by a scheduled job)
/*
-- Create stored procedure for cleanup
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_CleanupExpiredTokens]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_CleanupExpiredTokens];
GO

CREATE PROCEDURE [dbo].[sp_CleanupExpiredTokens]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DeletedCount INT = 0;

    -- Clean up expired refresh tokens
    DELETE FROM [dbo].[RefreshTokens]
    WHERE [expiresAt] < GETDATE() OR [isActive] = 0;

    SET @DeletedCount = @DeletedCount + @@ROWCOUNT;

    -- Clean up expired JWT blacklist entries
    DELETE FROM [dbo].[JwtBlacklist]
    WHERE [expiresAt] < GETDATE();

    SET @DeletedCount = @DeletedCount + @@ROWCOUNT;

    -- Clean up expired API keys
    UPDATE [dbo].[ApiKeys]
    SET [isActive] = 0, [updatedAt] = GETDATE()
    WHERE [expiresAt] < GETDATE() AND [isActive] = 1;

    -- Clean up old inactive sessions
    DELETE FROM [dbo].[LoginSessions]
    WHERE [expiresAt] < GETDATE() OR
          ([isActive] = 0 AND [logoutAt] < DATEADD(day, -30, GETDATE()));

    SET @DeletedCount = @DeletedCount + @@ROWCOUNT;

    PRINT 'Cleanup completed. Deleted ' + CAST(@DeletedCount AS NVARCHAR(10)) + ' expired records.';
END;
GO
*/

PRINT 'JWT Authentication tables migration completed successfully.';
PRINT 'Remember to run the cleanup procedure regularly to maintain database performance.';