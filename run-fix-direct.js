/**
 * Direct Fix - Update stored procedure and fix data
 */

const { poolPromise, sql } = require('./config/database');

async function runFix() {
    try {
        console.log('🔧 Starting direct fix...\n');

        const pool = await poolPromise;

        // Step 1: Update stored procedure
        console.log('📝 Step 1: Updating sp_UpdateSystemSetting stored procedure...');

        await pool.request().query(`
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
        `);

        console.log('✅ Stored procedure updated successfully!\n');

        // Step 2: Fix existing data
        console.log('📝 Step 2: Fixing existing empty string values...');

        const updateResult = await pool.request().query(`
            UPDATE [SystemSettings]
            SET [setting_value] = NULL
            WHERE [setting_value] = ''
                AND [default_value] IS NOT NULL
        `);

        console.log(`✅ Updated ${updateResult.rowsAffected[0]} settings from empty string to NULL\n`);

        // Step 3: Verify
        console.log('📊 Step 3: Verifying fix...\n');

        const result = await pool.request().query(`
            SELECT
                setting_key,
                setting_value,
                default_value,
                CASE
                    WHEN setting_value IS NULL THEN 'Will use DEFAULT ✅'
                    WHEN setting_value = '' THEN 'EMPTY (Problem!) ❌'
                    ELSE 'Custom value ✓'
                END AS [Status]
            FROM [SystemSettings]
            WHERE setting_category = 'general'
            ORDER BY display_order
        `);

        console.log('General Settings Status (after fix):');
        console.table(result.recordset);

        console.log('\n✅ All fixes completed successfully!');
        console.log('🔄 Please restart your application to clear the cache.\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error running fix:', error);
        process.exit(1);
    }
}

runFix();
