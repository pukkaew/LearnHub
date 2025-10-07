-- =============================================
-- Rukchai Hongyen LearnHub - Settings System
-- Database Schema Creation Script
-- =============================================

USE RC_LearnHub;
GO

-- =============================================
-- Table: SystemSettings
-- Description: เก็บการตั้งค่าระดับระบบทั้งหมด
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SystemSettings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SystemSettings] (
        [setting_id] INT IDENTITY(1,1) PRIMARY KEY,
        [setting_category] NVARCHAR(50) NOT NULL, -- 'general', 'email', 'security', 'appearance', 'notification', 'backup', 'integration'
        [setting_key] NVARCHAR(100) NOT NULL UNIQUE,
        [setting_value] NVARCHAR(MAX) NULL,
        [setting_type] NVARCHAR(20) NOT NULL, -- 'string', 'number', 'boolean', 'json', 'text', 'file', 'color', 'email', 'url'
        [setting_label] NVARCHAR(200) NOT NULL,
        [setting_description] NVARCHAR(500) NULL,
        [default_value] NVARCHAR(MAX) NULL,
        [validation_rules] NVARCHAR(MAX) NULL, -- JSON format: {"required": true, "min": 0, "max": 100}
        [options] NVARCHAR(MAX) NULL, -- JSON format สำหรับ select/radio options
        [is_sensitive] BIT DEFAULT 0, -- เก็บข้อมูลที่เป็นความลับ (เช่น API keys)
        [is_editable] BIT DEFAULT 1, -- สามารถแก้ไขได้หรือไม่
        [display_order] INT DEFAULT 0,
        [is_active] BIT DEFAULT 1,
        [created_by] INT NULL,
        [created_date] DATETIME DEFAULT GETDATE(),
        [modified_by] INT NULL,
        [modified_date] DATETIME NULL,
        [version] INT DEFAULT 1,
        CONSTRAINT [FK_SystemSettings_CreatedBy] FOREIGN KEY ([created_by]) REFERENCES [Users]([user_id]),
        CONSTRAINT [FK_SystemSettings_ModifiedBy] FOREIGN KEY ([modified_by]) REFERENCES [Users]([user_id])
    );

    CREATE INDEX [IX_SystemSettings_Category] ON [SystemSettings]([setting_category]);
    CREATE INDEX [IX_SystemSettings_Key] ON [SystemSettings]([setting_key]);
    CREATE INDEX [IX_SystemSettings_Active] ON [SystemSettings]([is_active]);
END
GO

-- =============================================
-- Table: UserSettings
-- Description: การตั้งค่าส่วนบุคคลของผู้ใช้แต่ละคน
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserSettings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserSettings] (
        [user_setting_id] INT IDENTITY(1,1) PRIMARY KEY,
        [user_id] INT NOT NULL,
        [setting_key] NVARCHAR(100) NOT NULL,
        [setting_value] NVARCHAR(MAX) NULL,
        [created_date] DATETIME DEFAULT GETDATE(),
        [modified_date] DATETIME NULL,
        CONSTRAINT [FK_UserSettings_User] FOREIGN KEY ([user_id]) REFERENCES [Users]([user_id]) ON DELETE CASCADE,
        CONSTRAINT [UQ_UserSettings_UserKey] UNIQUE ([user_id], [setting_key])
    );

    CREATE INDEX [IX_UserSettings_UserId] ON [UserSettings]([user_id]);
    CREATE INDEX [IX_UserSettings_Key] ON [UserSettings]([setting_key]);
END
GO

-- =============================================
-- Table: DepartmentSettings
-- Description: การตั้งค่าเฉพาะแผนก
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DepartmentSettings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DepartmentSettings] (
        [dept_setting_id] INT IDENTITY(1,1) PRIMARY KEY,
        [department_id] INT NOT NULL,
        [setting_key] NVARCHAR(100) NOT NULL,
        [setting_value] NVARCHAR(MAX) NULL,
        [created_by] INT NULL,
        [created_date] DATETIME DEFAULT GETDATE(),
        [modified_by] INT NULL,
        [modified_date] DATETIME NULL,
        CONSTRAINT [FK_DepartmentSettings_Department] FOREIGN KEY ([department_id]) REFERENCES [Departments]([department_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_DepartmentSettings_CreatedBy] FOREIGN KEY ([created_by]) REFERENCES [Users]([user_id]),
        CONSTRAINT [FK_DepartmentSettings_ModifiedBy] FOREIGN KEY ([modified_by]) REFERENCES [Users]([user_id]),
        CONSTRAINT [UQ_DepartmentSettings_DeptKey] UNIQUE ([department_id], [setting_key])
    );

    CREATE INDEX [IX_DepartmentSettings_DeptId] ON [DepartmentSettings]([department_id]);
END
GO

-- =============================================
-- Table: SettingAuditLog
-- Description: บันทึกการเปลี่ยนแปลง Settings ทั้งหมด
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SettingAuditLog]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SettingAuditLog] (
        [audit_id] INT IDENTITY(1,1) PRIMARY KEY,
        [setting_type] NVARCHAR(20) NOT NULL, -- 'system', 'user', 'department'
        [setting_id] INT NOT NULL,
        [setting_key] NVARCHAR(100) NOT NULL,
        [old_value] NVARCHAR(MAX) NULL,
        [new_value] NVARCHAR(MAX) NULL,
        [changed_by] INT NOT NULL,
        [changed_date] DATETIME DEFAULT GETDATE(),
        [ip_address] NVARCHAR(45) NULL,
        [user_agent] NVARCHAR(500) NULL,
        [change_reason] NVARCHAR(500) NULL,
        CONSTRAINT [FK_SettingAuditLog_User] FOREIGN KEY ([changed_by]) REFERENCES [Users]([user_id])
    );

    CREATE INDEX [IX_SettingAuditLog_SettingType] ON [SettingAuditLog]([setting_type], [setting_id]);
    CREATE INDEX [IX_SettingAuditLog_ChangedBy] ON [SettingAuditLog]([changed_by]);
    CREATE INDEX [IX_SettingAuditLog_Date] ON [SettingAuditLog]([changed_date]);
END
GO

-- =============================================
-- Insert Default System Settings
-- =============================================

-- General Settings
INSERT INTO [SystemSettings] ([setting_category], [setting_key], [setting_value], [setting_type], [setting_label], [setting_description], [default_value], [validation_rules], [display_order], [is_editable])
VALUES
-- General System
('general', 'system_name', 'Rukchai Hongyen LearnHub', 'string', 'ชื่อระบบ', 'ชื่อของระบบที่จะแสดงในหน้าเว็บ', 'Rukchai Hongyen LearnHub', '{"required": true, "maxLength": 200}', 1, 1),
('general', 'system_name_en', 'Rukchai Hongyen LearnHub', 'string', 'ชื่อระบบ (EN)', 'ชื่อของระบบภาษาอังกฤษ', 'Rukchai Hongyen LearnHub', '{"required": true, "maxLength": 200}', 2, 1),
('general', 'company_name', 'Ruxchai Cold Storage', 'string', 'ชื่อบริษัท', 'ชื่อบริษัทหรือองค์กร', 'Ruxchai Cold Storage', '{"required": true, "maxLength": 200}', 3, 1),
('general', 'company_name_en', 'Ruxchai Cold Storage', 'string', 'ชื่อบริษัท (EN)', 'ชื่อบริษัทภาษาอังกฤษ', 'Ruxchai Cold Storage', '{"required": true, "maxLength": 200}', 4, 1),
('general', 'contact_email', 'info@ruxchai.com', 'email', 'อีเมลติดต่อ', 'อีเมลสำหรับการติดต่อทั่วไป', 'info@ruxchai.com', '{"required": true, "email": true}', 5, 1),
('general', 'support_email', 'support@ruxchai.com', 'email', 'อีเมลฝ่ายสนับสนุน', 'อีเมลสำหรับการขอความช่วยเหลือ', 'support@ruxchai.com', '{"required": true, "email": true}', 6, 1),
('general', 'contact_phone', '02-123-4567', 'string', 'เบอร์โทรติดต่อ', 'เบอร์โทรศัพท์สำหรับติดต่อ', '', '{"maxLength": 20}', 7, 1),
('general', 'website_url', 'https://www.ruxchai.com', 'url', 'เว็บไซต์องค์กร', 'URL ของเว็บไซต์หลักองค์กร', '', '{"url": true}', 8, 1),
('general', 'default_language', 'th', 'string', 'ภาษาเริ่มต้น', 'ภาษาเริ่มต้นของระบบ', 'th', '{"required": true, "enum": ["th", "en"]}', 9, 1),
('general', 'timezone', 'Asia/Bangkok', 'string', 'เขตเวลา', 'เขตเวลาของระบบ', 'Asia/Bangkok', '{"required": true}', 10, 1),
('general', 'date_format', 'DD/MM/YYYY', 'string', 'รูปแบบวันที่', 'รูปแบบการแสดงวันที่', 'DD/MM/YYYY', '{"required": true}', 11, 1),
('general', 'time_format', 'HH:mm', 'string', 'รูปแบบเวลา', 'รูปแบบการแสดงเวลา', 'HH:mm', '{"required": true}', 12, 1),

-- Appearance Settings
('appearance', 'logo_url', '/images/rukchai-logo.png', 'file', 'โลโก้ระบบ', 'โลโก้ที่แสดงบนหน้าเว็บ', '/images/logo.png', '{"fileType": ["image/png", "image/jpeg", "image/svg+xml"]}', 1, 1),
('appearance', 'favicon_url', '/favicon.ico', 'file', 'Favicon', 'ไอคอนที่แสดงบน browser tab', '/favicon.ico', '{"fileType": ["image/x-icon", "image/png"]}', 2, 1),
('appearance', 'primary_color', '#3B82F6', 'color', 'สีหลัก', 'สีหลักของระบบ', '#3B82F6', '{"pattern": "^#[0-9A-Fa-f]{6}$"}', 3, 1),
('appearance', 'secondary_color', '#10B981', 'color', 'สีรอง', 'สีรองของระบบ', '#10B981', '{"pattern": "^#[0-9A-Fa-f]{6}$"}', 4, 1),
('appearance', 'theme_mode', 'light', 'string', 'โหมดธีม', 'โหมดสีของระบบ', 'light', '{"enum": ["light", "dark", "auto"]}', 5, 1),
('appearance', 'font_family', 'Sarabun', 'string', 'ฟอนต์', 'ฟอนต์ที่ใช้ในระบบ', 'Sarabun', '{"maxLength": 100}', 6, 1),

-- Security Settings
('security', 'session_timeout', '1440', 'number', 'Session Timeout (นาที)', 'ระยะเวลาก่อน session หมดอายุ', '1440', '{"required": true, "min": 5, "max": 10080}', 1, 1),
('security', 'password_min_length', '8', 'number', 'ความยาวรหัสผ่านขั้นต่ำ', 'จำนวนตัวอักษรขั้นต่ำของรหัสผ่าน', '8', '{"required": true, "min": 6, "max": 32}', 2, 1),
('security', 'password_require_uppercase', 'true', 'boolean', 'ต้องมีตัวพิมพ์ใหญ่', 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่', 'true', '{}', 3, 1),
('security', 'password_require_lowercase', 'true', 'boolean', 'ต้องมีตัวพิมพ์เล็ก', 'รหัสผ่านต้องมีตัวพิมพ์เล็ก', 'true', '{}', 4, 1),
('security', 'password_require_number', 'true', 'boolean', 'ต้องมีตัวเลข', 'รหัสผ่านต้องมีตัวเลข', 'true', '{}', 5, 1),
('security', 'password_require_special', 'false', 'boolean', 'ต้องมีอักขระพิเศษ', 'รหัสผ่านต้องมีอักขระพิเศษ', 'false', '{}', 6, 1),
('security', 'max_login_attempts', '5', 'number', 'จำนวนครั้งเข้าสู่ระบบสูงสุด', 'จำนวนครั้งที่ล็อกอินผิดได้ก่อนถูกล็อค', '5', '{"required": true, "min": 3, "max": 10}', 7, 1),
('security', 'lockout_duration', '15', 'number', 'ระยะเวลาล็อคบัญชี (นาที)', 'ระยะเวลาที่บัญชีถูกล็อคหลังล็อกอินผิด', '15', '{"required": true, "min": 5, "max": 1440}', 8, 1),
('security', 'enable_two_factor', 'false', 'boolean', 'เปิดใช้ Two-Factor Authentication', 'เปิดการยืนยันตัวตน 2 ขั้นตอน', 'false', '{}', 9, 1),
('security', 'force_password_change_days', '90', 'number', 'บังคับเปลี่ยนรหัสผ่าน (วัน)', 'บังคับให้เปลี่ยนรหัสผ่านทุกกี่วัน (0 = ไม่บังคับ)', '90', '{"min": 0, "max": 365}', 10, 1),

-- Email Settings
('email', 'smtp_host', 'smtp.gmail.com', 'string', 'SMTP Host', 'ที่อยู่ SMTP server', 'smtp.gmail.com', '{"required": true}', 1, 1),
('email', 'smtp_port', '587', 'number', 'SMTP Port', 'พอร์ตของ SMTP server', '587', '{"required": true, "min": 1, "max": 65535}', 2, 1),
('email', 'smtp_secure', 'false', 'boolean', 'SMTP Secure (SSL)', 'ใช้ SSL/TLS สำหรับ SMTP', 'false', '{}', 3, 1),
('email', 'smtp_user', '', 'email', 'SMTP Username', 'Username สำหรับ SMTP authentication', '', '{"email": true}', 4, 1),
('email', 'smtp_password', '', 'string', 'SMTP Password', 'Password สำหรับ SMTP authentication', '', '{}', 5, 1),
('email', 'email_from_address', 'noreply@ruxchai.com', 'email', 'อีเมลผู้ส่ง', 'อีเมลที่ใช้เป็นผู้ส่ง', 'noreply@ruxchai.com', '{"required": true, "email": true}', 6, 1),
('email', 'email_from_name', 'Rukchai LearnHub', 'string', 'ชื่อผู้ส่ง', 'ชื่อที่แสดงเป็นผู้ส่งอีเมล', 'Rukchai LearnHub', '{"required": true}', 7, 1),

-- Notification Settings
('notification', 'enable_email_notifications', 'true', 'boolean', 'เปิดการแจ้งเตือนทางอีเมล', 'ส่งการแจ้งเตือนทางอีเมล', 'true', '{}', 1, 1),
('notification', 'enable_browser_notifications', 'true', 'boolean', 'เปิดการแจ้งเตือนบน Browser', 'แสดงการแจ้งเตือนบน browser', 'true', '{}', 2, 1),
('notification', 'enable_sms_notifications', 'false', 'boolean', 'เปิดการแจ้งเตือนทาง SMS', 'ส่งการแจ้งเตือนทาง SMS', 'false', '{}', 3, 1),
('notification', 'notification_retention_days', '30', 'number', 'เก็บการแจ้งเตือน (วัน)', 'เก็บประวัติการแจ้งเตือนกี่วัน', '30', '{"required": true, "min": 7, "max": 365}', 4, 1),

-- Course Settings
('course', 'enable_course_rating', 'true', 'boolean', 'เปิดการให้คะแนนคอร์ส', 'อนุญาตให้ผู้เรียนให้คะแนนคอร์ส', 'true', '{}', 1, 1),
('course', 'enable_course_comments', 'true', 'boolean', 'เปิดการแสดงความคิดเห็น', 'อนุญาตให้แสดงความคิดเห็นในคอร์ส', 'true', '{}', 2, 1),
('course', 'default_passing_score', '60', 'number', 'คะแนนผ่านเริ่มต้น (%)', 'คะแนนขั้นต่ำในการผ่านคอร์ส', '60', '{"required": true, "min": 0, "max": 100}', 3, 1),
('course', 'max_enrollment_per_user', '10', 'number', 'จำนวนคอร์สสูงสุดต่อคน', 'จำนวนคอร์สที่ผู้ใช้สามารถลงทะเบียนพร้อมกันได้', '10', '{"required": true, "min": 1, "max": 100}', 4, 1),
('course', 'enable_certificates', 'true', 'boolean', 'เปิดใช้ใบประกาศนียบัตร', 'ออกใบประกาศนียบัตรเมื่อผ่านคอร์ส', 'true', '{}', 5, 1),

-- File Upload Settings
('upload', 'max_file_size', '104857600', 'number', 'ขนาดไฟล์สูงสุด (bytes)', 'ขนาดไฟล์สูงสุดที่อัพโหลดได้ (100MB)', '104857600', '{"required": true, "min": 1048576, "max": 524288000}', 1, 1),
('upload', 'allowed_file_types', 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,ppt,pptx,zip,mp4,mp3', 'text', 'ประเภทไฟล์ที่อนุญาต', 'ประเภทไฟล์ที่สามารถอัพโหลดได้ (คั่นด้วยจุลภาค)', 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,ppt,pptx,zip,mp4,mp3', '{"required": true}', 2, 1),
('upload', 'upload_path', './uploads', 'string', 'ตำแหน่งจัดเก็บไฟล์', 'โฟลเดอร์สำหรับเก็บไฟล์ที่อัพโหลด', './uploads', '{"required": true}', 3, 1),

-- Gamification Settings
('gamification', 'enable_gamification', 'true', 'boolean', 'เปิดระบบ Gamification', 'เปิดใช้ระบบแต้มและตราสัญลักษณ์', 'true', '{}', 1, 1),
('gamification', 'points_per_lesson', '10', 'number', 'แต้มต่อบทเรียน', 'แต้มที่ได้เมื่อจบบทเรียน', '10', '{"required": true, "min": 0, "max": 1000}', 2, 1),
('gamification', 'points_per_course', '100', 'number', 'แต้มต่อคอร์ส', 'แต้มที่ได้เมื่อจบคอร์ส', '100', '{"required": true, "min": 0, "max": 10000}', 3, 1),
('gamification', 'enable_leaderboard', 'true', 'boolean', 'เปิดกระดานคะแนน', 'แสดงกระดานคะแนนแข่งขัน', 'true', '{}', 4, 1),

-- Backup Settings
('backup', 'enable_auto_backup', 'true', 'boolean', 'เปิด Auto Backup', 'สำรองข้อมูลอัตโนมัติ', 'true', '{}', 1, 1),
('backup', 'backup_frequency', 'daily', 'string', 'ความถี่การสำรอง', 'ความถี่ในการสำรองข้อมูล', 'daily', '{"enum": ["hourly", "daily", "weekly", "monthly"]}', 2, 1),
('backup', 'backup_retention_days', '30', 'number', 'เก็บ Backup (วัน)', 'เก็บไฟล์ backup กี่วัน', '30', '{"required": true, "min": 1, "max": 365}', 3, 1),

-- API Settings
('api', 'enable_api', 'true', 'boolean', 'เปิดใช้ API', 'เปิดการใช้งาน REST API', 'true', '{}', 1, 1),
('api', 'api_rate_limit', '100', 'number', 'API Rate Limit', 'จำนวน request ต่อนาทีสูงสุด', '100', '{"required": true, "min": 10, "max": 10000}', 2, 1),
('api', 'api_key', '', 'string', 'API Key', 'API Key สำหรับ external integration', '', '{}', 3, 1);

-- Update sensitive fields
UPDATE [SystemSettings] SET [is_sensitive] = 1
WHERE [setting_key] IN ('smtp_password', 'api_key');

GO

-- =============================================
-- Stored Procedure: sp_GetSystemSetting
-- Description: ดึงค่า setting แบบ single value
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_GetSystemSetting]
    @setting_key NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        [setting_id],
        [setting_category],
        [setting_key],
        [setting_value],
        [setting_type],
        [setting_label],
        [setting_description],
        [default_value],
        [is_sensitive],
        [is_editable]
    FROM [SystemSettings]
    WHERE [setting_key] = @setting_key
        AND [is_active] = 1;
END
GO

-- =============================================
-- Stored Procedure: sp_GetSystemSettingsByCategory
-- Description: ดึง settings ทั้งหมดตาม category
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_GetSystemSettingsByCategory]
    @category NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        [setting_id],
        [setting_category],
        [setting_key],
        CASE
            WHEN [is_sensitive] = 1 THEN '********'
            ELSE [setting_value]
        END AS [setting_value],
        [setting_type],
        [setting_label],
        [setting_description],
        [default_value],
        [validation_rules],
        [options],
        [is_sensitive],
        [is_editable],
        [display_order]
    FROM [SystemSettings]
    WHERE [setting_category] = @category
        AND [is_active] = 1
    ORDER BY [display_order], [setting_key];
END
GO

-- =============================================
-- Stored Procedure: sp_UpdateSystemSetting
-- Description: อัพเดท system setting พร้อมบันทึก audit log
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_UpdateSystemSetting]
    @setting_key NVARCHAR(100),
    @new_value NVARCHAR(MAX),
    @modified_by INT,
    @ip_address NVARCHAR(45) = NULL,
    @user_agent NVARCHAR(500) = NULL,
    @change_reason NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        DECLARE @old_value NVARCHAR(MAX);
        DECLARE @setting_id INT;
        DECLARE @is_editable BIT;

        -- Get current value
        SELECT
            @setting_id = [setting_id],
            @old_value = [setting_value],
            @is_editable = [is_editable]
        FROM [SystemSettings]
        WHERE [setting_key] = @setting_key
            AND [is_active] = 1;

        IF @setting_id IS NULL
        BEGIN
            THROW 50001, 'Setting not found', 1;
        END

        IF @is_editable = 0
        BEGIN
            THROW 50002, 'Setting is not editable', 1;
        END

        -- Update setting
        UPDATE [SystemSettings]
        SET
            [setting_value] = @new_value,
            [modified_by] = @modified_by,
            [modified_date] = GETDATE(),
            [version] = [version] + 1
        WHERE [setting_key] = @setting_key;

        -- Insert audit log
        INSERT INTO [SettingAuditLog] (
            [setting_type],
            [setting_id],
            [setting_key],
            [old_value],
            [new_value],
            [changed_by],
            [changed_date],
            [ip_address],
            [user_agent],
            [change_reason]
        ) VALUES (
            'system',
            @setting_id,
            @setting_key,
            @old_value,
            @new_value,
            @modified_by,
            GETDATE(),
            @ip_address,
            @user_agent,
            @change_reason
        );

        COMMIT TRANSACTION;

        SELECT 1 AS [success], 'Setting updated successfully' AS [message];
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;

        SELECT 0 AS [success], ERROR_MESSAGE() AS [message];
    END CATCH
END
GO

-- =============================================
-- Stored Procedure: sp_GetUserSetting
-- Description: ดึง user setting
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_GetUserSetting]
    @user_id INT,
    @setting_key NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        [user_setting_id],
        [user_id],
        [setting_key],
        [setting_value]
    FROM [UserSettings]
    WHERE [user_id] = @user_id
        AND [setting_key] = @setting_key;
END
GO

-- =============================================
-- Stored Procedure: sp_UpsertUserSetting
-- Description: เพิ่ม/อัพเดท user setting
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_UpsertUserSetting]
    @user_id INT,
    @setting_key NVARCHAR(100),
    @setting_value NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM [UserSettings] WHERE [user_id] = @user_id AND [setting_key] = @setting_key)
    BEGIN
        UPDATE [UserSettings]
        SET
            [setting_value] = @setting_value,
            [modified_date] = GETDATE()
        WHERE [user_id] = @user_id
            AND [setting_key] = @setting_key;
    END
    ELSE
    BEGIN
        INSERT INTO [UserSettings] ([user_id], [setting_key], [setting_value])
        VALUES (@user_id, @setting_key, @setting_value);
    END

    SELECT 1 AS [success], 'User setting saved successfully' AS [message];
END
GO

-- =============================================
-- Stored Procedure: sp_GetAllUserSettings
-- Description: ดึง user settings ทั้งหมดของ user
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_GetAllUserSettings]
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        [setting_key],
        [setting_value]
    FROM [UserSettings]
    WHERE [user_id] = @user_id
    ORDER BY [setting_key];
END
GO

-- =============================================
-- Stored Procedure: sp_GetSettingAuditLog
-- Description: ดึงประวัติการเปลี่ยนแปลง settings
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_GetSettingAuditLog]
    @setting_type NVARCHAR(20) = NULL,
    @setting_key NVARCHAR(100) = NULL,
    @changed_by INT = NULL,
    @days INT = 30
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        sal.[audit_id],
        sal.[setting_type],
        sal.[setting_id],
        sal.[setting_key],
        sal.[old_value],
        sal.[new_value],
        sal.[changed_by],
        CONCAT(u.[first_name], ' ', u.[last_name]) AS [changed_by_name],
        sal.[changed_date],
        sal.[ip_address],
        sal.[user_agent],
        sal.[change_reason]
    FROM [SettingAuditLog] sal
    LEFT JOIN [Users] u ON sal.[changed_by] = u.[user_id]
    WHERE
        (@setting_type IS NULL OR sal.[setting_type] = @setting_type)
        AND (@setting_key IS NULL OR sal.[setting_key] = @setting_key)
        AND (@changed_by IS NULL OR sal.[changed_by] = @changed_by)
        AND sal.[changed_date] >= DATEADD(DAY, -@days, GETDATE())
    ORDER BY sal.[changed_date] DESC;
END
GO

PRINT 'Settings System Schema created successfully!';
