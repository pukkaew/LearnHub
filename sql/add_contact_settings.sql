-- Add Contact Settings to System Settings
-- These settings will be used in footer and contact pages

USE RC_LearnHub;
GO

-- Update or Insert Contact Settings

-- Update facebook_url if exists
UPDATE dbo.Settings
SET setting_value = 'https://www.facebook.com/rukchaicoldroom',
    description = 'ลิงก์ Facebook Page',
    updated_at = GETDATE()
WHERE setting_key = 'facebook_url';

-- Insert other settings if they don't exist
IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'contact_phone')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('contact_phone', '02-000-0000', 'string', 'general', 'เบอร์โทรศัพท์สำหรับติดต่อ', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'contact_email')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('contact_email', 'hr@rukchaihongyen.co.th', 'string', 'general', 'อีเมลสำหรับติดต่อ', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'line_id')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('line_id', '@rukchaicoldroom', 'string', 'general', 'LINE Official Account ID', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE setting_key = 'info_email')
BEGIN
    INSERT INTO dbo.Settings (setting_key, setting_value, setting_type, category, description, created_at, updated_at)
    VALUES ('info_email', 'info@rukchaicoldroom.com', 'string', 'general', 'อีเมลสำหรับสอบถามข้อมูล', GETDATE(), GETDATE());
END

GO

PRINT 'Contact settings added successfully!';
