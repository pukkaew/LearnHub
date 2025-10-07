-- =============================================
-- Fix Settings Empty String Issue
-- แก้ปัญหา Save แล้วไม่จดจำค่า
-- =============================================

USE RC_LearnHub;
GO

-- =============================================
-- Step 1: แก้ Stored Procedure ให้แปลง empty string เป็น NULL
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
        DECLARE @value_to_save NVARCHAR(MAX);

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

        -- 🔧 FIX: แปลง empty string เป็น NULL
        -- ถ้าค่าว่างเปล่า ให้บันทึกเป็น NULL เพื่อให้ใช้ default_value
        SET @value_to_save = CASE
            WHEN @new_value = '' OR @new_value IS NULL THEN NULL
            ELSE @new_value
        END;

        -- Update setting
        UPDATE [SystemSettings]
        SET
            [setting_value] = @value_to_save,
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
            @value_to_save,
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
-- Step 2: อัพเดทข้อมูลเดิมที่เป็น empty string ให้เป็น NULL
-- =============================================

PRINT '🔧 Fixing existing empty string values...';

UPDATE [SystemSettings]
SET [setting_value] = NULL
WHERE [setting_value] = ''
    AND [default_value] IS NOT NULL;

DECLARE @updated_count INT = @@ROWCOUNT;
PRINT CONCAT('✅ Updated ', @updated_count, ' settings from empty string to NULL');

-- =============================================
-- Step 3: แสดงข้อมูลที่แก้ไขแล้ว
-- =============================================

PRINT '';
PRINT '📊 Current settings status:';
SELECT
    setting_key,
    setting_value,
    default_value,
    CASE
        WHEN setting_value IS NULL THEN 'Will use DEFAULT'
        WHEN setting_value = '' THEN 'EMPTY (Problem!)'
        ELSE 'Custom value'
    END AS [Status]
FROM [SystemSettings]
WHERE setting_category = 'general'
ORDER BY display_order;

PRINT '';
PRINT '✅ Fix completed!';
PRINT '🔄 Please restart your application to clear the cache.';
