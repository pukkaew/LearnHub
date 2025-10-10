-- Add Missing Settings that are used in the application
USE RC_LearnHub;
GO

-- Add missing settings if they don't exist
IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'site_name')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('site_name', 'Rukchai Hongyen LearnHub', 'string', 'general', 'ชื่อเว็บไซต์', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'site_description')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('site_description', 'ระบบจัดการการเรียนรู้', 'string', 'general', 'คำอธิบายเว็บไซต์', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'logo_url')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('logo_url', '/images/rukchai-logo.png', 'string', 'appearance', 'URL ของโลโก้', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'favicon_url')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('favicon_url', '/favicon.ico', 'string', 'appearance', 'URL ของ favicon', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'primary_color')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('primary_color', '#0090D3', 'string', 'appearance', 'สีหลักของระบบ', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'secondary_color')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('secondary_color', '#3AAA35', 'string', 'appearance', 'สีรองของระบบ', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'accent_color')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('accent_color', '#006BA6', 'string', 'appearance', 'สีเสริมของระบบ', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'sidebar_color')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('sidebar_color', '#1f2937', 'string', 'appearance', 'สี sidebar', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'topbar_color')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('topbar_color', '#ffffff', 'string', 'appearance', 'สี topbar', GETDATE(), GETDATE());
END

GO

PRINT 'Missing settings added successfully!';
