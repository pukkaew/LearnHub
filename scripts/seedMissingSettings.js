const { poolPromise, sql } = require('../config/database');

/**
 * Seed Missing Settings Script
 * Adds SystemSettings, OrganizationLevels, and OrganizationUnits if they don't exist
 */

async function seedMissingSettings() {
    console.log('\n========================================');
    console.log('   SEEDING MISSING SETTINGS');
    console.log('========================================\n');

    const pool = await poolPromise;
    console.log('Connected to database');

    // Check if SystemSettings is empty
    const settingsCount = await pool.request().query('SELECT COUNT(*) as count FROM SystemSettings');

    if (settingsCount.recordset[0].count === 0) {
        console.log('\nSeeding SystemSettings...');

        const settings = [
            // General Settings
            { setting_category: 'general', setting_key: 'company_name', setting_value: 'LearnHub', setting_type: 'text', setting_label: 'Company Name', setting_description: 'Company name displayed in the system', default_value: 'LearnHub', display_order: 1, group_name: 'company' },
            { setting_category: 'general', setting_key: 'company_name_en', setting_value: 'LearnHub Learning Management System', setting_type: 'text', setting_label: 'Company Name (English)', setting_description: 'Company name in English', default_value: 'LearnHub LMS', display_order: 2, group_name: 'company' },
            { setting_category: 'general', setting_key: 'company_logo', setting_value: '/images/logo.png', setting_type: 'file', setting_label: 'Company Logo', setting_description: 'Logo displayed in the header', default_value: '/images/logo.png', display_order: 3, group_name: 'company' },
            { setting_category: 'general', setting_key: 'company_address', setting_value: 'Bangkok, Thailand', setting_type: 'textarea', setting_label: 'Company Address', setting_description: 'Company address', default_value: '', display_order: 4, group_name: 'company' },
            { setting_category: 'general', setting_key: 'company_phone', setting_value: '+66 2 123 4567', setting_type: 'text', setting_label: 'Company Phone', setting_description: 'Company phone number', default_value: '', display_order: 5, group_name: 'company' },
            { setting_category: 'general', setting_key: 'company_email', setting_value: 'info@learnhub.com', setting_type: 'email', setting_label: 'Company Email', setting_description: 'Company contact email', default_value: '', display_order: 6, group_name: 'company' },
            { setting_category: 'general', setting_key: 'timezone', setting_value: 'Asia/Bangkok', setting_type: 'select', setting_label: 'Timezone', setting_description: 'System timezone', default_value: 'Asia/Bangkok', display_order: 7, group_name: 'localization' },
            { setting_category: 'general', setting_key: 'date_format', setting_value: 'DD/MM/YYYY', setting_type: 'select', setting_label: 'Date Format', setting_description: 'Date display format', default_value: 'DD/MM/YYYY', display_order: 8, group_name: 'localization' },
            { setting_category: 'general', setting_key: 'time_format', setting_value: 'HH:mm', setting_type: 'select', setting_label: 'Time Format', setting_description: 'Time display format', default_value: 'HH:mm', display_order: 9, group_name: 'localization' },
            { setting_category: 'general', setting_key: 'default_language', setting_value: 'th', setting_type: 'select', setting_label: 'Default Language', setting_description: 'System default language', default_value: 'th', display_order: 10, group_name: 'localization' },

            // Email Settings
            { setting_category: 'email', setting_key: 'smtp_host', setting_value: 'smtp.gmail.com', setting_type: 'text', setting_label: 'SMTP Host', setting_description: 'SMTP server hostname', default_value: '', display_order: 1, group_name: 'smtp' },
            { setting_category: 'email', setting_key: 'smtp_port', setting_value: '587', setting_type: 'number', setting_label: 'SMTP Port', setting_description: 'SMTP server port', default_value: '587', display_order: 2, group_name: 'smtp' },
            { setting_category: 'email', setting_key: 'smtp_user', setting_value: '', setting_type: 'text', setting_label: 'SMTP Username', setting_description: 'SMTP authentication username', default_value: '', display_order: 3, group_name: 'smtp' },
            { setting_category: 'email', setting_key: 'smtp_password', setting_value: '', setting_type: 'password', setting_label: 'SMTP Password', setting_description: 'SMTP authentication password', default_value: '', display_order: 4, group_name: 'smtp', is_sensitive: true },
            { setting_category: 'email', setting_key: 'smtp_secure', setting_value: 'true', setting_type: 'boolean', setting_label: 'Use TLS/SSL', setting_description: 'Enable TLS/SSL encryption', default_value: 'true', display_order: 5, group_name: 'smtp' },
            { setting_category: 'email', setting_key: 'email_from_name', setting_value: 'LearnHub', setting_type: 'text', setting_label: 'From Name', setting_description: 'Email sender name', default_value: 'LearnHub', display_order: 6, group_name: 'sender' },
            { setting_category: 'email', setting_key: 'email_from_address', setting_value: 'noreply@learnhub.com', setting_type: 'email', setting_label: 'From Address', setting_description: 'Email sender address', default_value: '', display_order: 7, group_name: 'sender' },

            // Security Settings
            { setting_category: 'security', setting_key: 'password_min_length', setting_value: '8', setting_type: 'number', setting_label: 'Minimum Password Length', setting_description: 'Minimum characters required for password', default_value: '8', display_order: 1, group_name: 'password' },
            { setting_category: 'security', setting_key: 'password_require_uppercase', setting_value: 'true', setting_type: 'boolean', setting_label: 'Require Uppercase', setting_description: 'Password must contain uppercase letter', default_value: 'true', display_order: 2, group_name: 'password' },
            { setting_category: 'security', setting_key: 'password_require_lowercase', setting_value: 'true', setting_type: 'boolean', setting_label: 'Require Lowercase', setting_description: 'Password must contain lowercase letter', default_value: 'true', display_order: 3, group_name: 'password' },
            { setting_category: 'security', setting_key: 'password_require_number', setting_value: 'true', setting_type: 'boolean', setting_label: 'Require Number', setting_description: 'Password must contain number', default_value: 'true', display_order: 4, group_name: 'password' },
            { setting_category: 'security', setting_key: 'password_require_special', setting_value: 'false', setting_type: 'boolean', setting_label: 'Require Special Character', setting_description: 'Password must contain special character', default_value: 'false', display_order: 5, group_name: 'password' },
            { setting_category: 'security', setting_key: 'session_timeout', setting_value: '480', setting_type: 'number', setting_label: 'Session Timeout (minutes)', setting_description: 'Session expiration time in minutes', default_value: '480', display_order: 6, group_name: 'session' },
            { setting_category: 'security', setting_key: 'max_login_attempts', setting_value: '5', setting_type: 'number', setting_label: 'Max Login Attempts', setting_description: 'Maximum failed login attempts before lockout', default_value: '5', display_order: 7, group_name: 'session' },
            { setting_category: 'security', setting_key: 'lockout_duration', setting_value: '30', setting_type: 'number', setting_label: 'Lockout Duration (minutes)', setting_description: 'Account lockout duration in minutes', default_value: '30', display_order: 8, group_name: 'session' },
            { setting_category: 'security', setting_key: 'two_factor_enabled', setting_value: 'false', setting_type: 'boolean', setting_label: 'Enable Two-Factor Authentication', setting_description: 'Enable 2FA for all users', default_value: 'false', display_order: 9, group_name: 'authentication' },

            // Appearance Settings
            { setting_category: 'appearance', setting_key: 'primary_color', setting_value: '#1976D2', setting_type: 'color', setting_label: 'Primary Color', setting_description: 'Primary theme color', default_value: '#1976D2', display_order: 1, group_name: 'theme' },
            { setting_category: 'appearance', setting_key: 'secondary_color', setting_value: '#424242', setting_type: 'color', setting_label: 'Secondary Color', setting_description: 'Secondary theme color', default_value: '#424242', display_order: 2, group_name: 'theme' },
            { setting_category: 'appearance', setting_key: 'accent_color', setting_value: '#FF5722', setting_type: 'color', setting_label: 'Accent Color', setting_description: 'Accent theme color', default_value: '#FF5722', display_order: 3, group_name: 'theme' },
            { setting_category: 'appearance', setting_key: 'sidebar_style', setting_value: 'expanded', setting_type: 'select', setting_label: 'Sidebar Style', setting_description: 'Default sidebar display style', default_value: 'expanded', display_order: 4, group_name: 'layout' },
            { setting_category: 'appearance', setting_key: 'items_per_page', setting_value: '10', setting_type: 'select', setting_label: 'Items Per Page', setting_description: 'Default pagination size', default_value: '10', display_order: 5, group_name: 'layout' },

            // Notification Settings
            { setting_category: 'notification', setting_key: 'email_notifications_enabled', setting_value: 'true', setting_type: 'boolean', setting_label: 'Enable Email Notifications', setting_description: 'Send email notifications to users', default_value: 'true', display_order: 1, group_name: 'email' },
            { setting_category: 'notification', setting_key: 'course_enrollment_notification', setting_value: 'true', setting_type: 'boolean', setting_label: 'Course Enrollment Notification', setting_description: 'Notify when enrolled in course', default_value: 'true', display_order: 2, group_name: 'email' },
            { setting_category: 'notification', setting_key: 'test_reminder_notification', setting_value: 'true', setting_type: 'boolean', setting_label: 'Test Reminder Notification', setting_description: 'Send test reminder notifications', default_value: 'true', display_order: 3, group_name: 'email' },
            { setting_category: 'notification', setting_key: 'certificate_notification', setting_value: 'true', setting_type: 'boolean', setting_label: 'Certificate Notification', setting_description: 'Notify when certificate is issued', default_value: 'true', display_order: 4, group_name: 'email' },

            // Course Settings
            { setting_category: 'course', setting_key: 'default_passing_score', setting_value: '70', setting_type: 'number', setting_label: 'Default Passing Score (%)', setting_description: 'Default passing score for courses', default_value: '70', display_order: 1, group_name: 'default' },
            { setting_category: 'course', setting_key: 'default_max_attempts', setting_value: '3', setting_type: 'number', setting_label: 'Default Max Attempts', setting_description: 'Default max test attempts', default_value: '3', display_order: 2, group_name: 'default' },
            { setting_category: 'course', setting_key: 'certificate_enabled', setting_value: 'true', setting_type: 'boolean', setting_label: 'Enable Certificates', setting_description: 'Issue certificates on course completion', default_value: 'true', display_order: 3, group_name: 'default' },
            { setting_category: 'course', setting_key: 'allow_course_reviews', setting_value: 'true', setting_type: 'boolean', setting_label: 'Allow Course Reviews', setting_description: 'Allow users to review courses', default_value: 'true', display_order: 4, group_name: 'default' },
            { setting_category: 'course', setting_key: 'show_course_progress', setting_value: 'true', setting_type: 'boolean', setting_label: 'Show Course Progress', setting_description: 'Display progress bar in courses', default_value: 'true', display_order: 5, group_name: 'default' }
        ];

        for (const setting of settings) {
            try {
                await pool.request()
                    .input('settingCategory', sql.NVarChar(50), setting.setting_category)
                    .input('settingKey', sql.NVarChar(100), setting.setting_key)
                    .input('settingValue', sql.NVarChar(sql.MAX), setting.setting_value)
                    .input('settingType', sql.NVarChar(50), setting.setting_type)
                    .input('settingLabel', sql.NVarChar(200), setting.setting_label)
                    .input('settingDescription', sql.NVarChar(500), setting.setting_description || '')
                    .input('defaultValue', sql.NVarChar(sql.MAX), setting.default_value || '')
                    .input('displayOrder', sql.Int, setting.display_order)
                    .input('isSensitive', sql.Bit, setting.is_sensitive ? 1 : 0)
                    .query(`
                        INSERT INTO SystemSettings (
                            setting_category, setting_key, setting_value,
                            setting_type, setting_label, setting_description, default_value,
                            display_order, is_sensitive, is_editable, is_active, created_date
                        ) VALUES (
                            @settingCategory, @settingKey, @settingValue,
                            @settingType, @settingLabel, @settingDescription, @defaultValue,
                            @displayOrder, @isSensitive, 1, 1, GETDATE()
                        )
                    `);
            } catch (error) {
                console.log(`Skipped setting ${setting.setting_key}: ${error.message.substring(0, 50)}`);
            }
        }
        console.log(`Seeded ${settings.length} system settings`);
    } else {
        console.log(`SystemSettings already has ${settingsCount.recordset[0].count} records`);
    }

    // Check if OrganizationLevels is empty
    const levelsCount = await pool.request().query('SELECT COUNT(*) as count FROM OrganizationLevels');

    if (levelsCount.recordset[0].count === 0) {
        console.log('\nSeeding OrganizationLevels...');

        const levels = [
            { level_code: 'COMPANY', level_name_th: 'บริษัท', level_name_en: 'Company', level_order: 1 },
            { level_code: 'DIVISION', level_name_th: 'ฝ่าย', level_name_en: 'Division', level_order: 2 },
            { level_code: 'DEPARTMENT', level_name_th: 'แผนก', level_name_en: 'Department', level_order: 3 },
            { level_code: 'SECTION', level_name_th: 'หน่วยงาน', level_name_en: 'Section', level_order: 4 },
            { level_code: 'TEAM', level_name_th: 'ทีม', level_name_en: 'Team', level_order: 5 }
        ];

        for (const level of levels) {
            try {
                await pool.request()
                    .input('levelCode', sql.NVarChar(50), level.level_code)
                    .input('levelNameTh', sql.NVarChar(100), level.level_name_th)
                    .input('levelNameEn', sql.NVarChar(100), level.level_name_en)
                    .input('levelOrder', sql.Int, level.level_order)
                    .query(`
                        INSERT INTO OrganizationLevels (level_code, level_name_th, level_name_en, level_order, is_active, created_at)
                        VALUES (@levelCode, @levelNameTh, @levelNameEn, @levelOrder, 1, GETDATE())
                    `);
            } catch (error) {
                console.log(`Skipped level ${level.level_code}: ${error.message.substring(0, 50)}`);
            }
        }
        console.log(`Seeded ${levels.length} organization levels`);
    } else {
        console.log(`OrganizationLevels already has ${levelsCount.recordset[0].count} records`);
    }

    // Check if OrganizationUnits is empty
    const unitsCount = await pool.request().query('SELECT COUNT(*) as count FROM OrganizationUnits');

    if (unitsCount.recordset[0].count === 0) {
        console.log('\nSeeding OrganizationUnits...');

        // Get level IDs
        const levelIds = await pool.request().query('SELECT level_id, level_code FROM OrganizationLevels');
        const levelMap = {};
        for (const level of levelIds.recordset) {
            levelMap[level.level_code] = level.level_id;
        }

        const units = [
            { unit_code: 'LH', unit_name_th: 'LearnHub', unit_name_en: 'LearnHub', level_code: 'COMPANY', parent_code: null },
            { unit_code: 'IT-DIV', unit_name_th: 'ฝ่ายเทคโนโลยีสารสนเทศ', unit_name_en: 'IT Division', level_code: 'DIVISION', parent_code: 'LH' },
            { unit_code: 'HR-DIV', unit_name_th: 'ฝ่ายทรัพยากรบุคคล', unit_name_en: 'HR Division', level_code: 'DIVISION', parent_code: 'LH' },
            { unit_code: 'FIN-DIV', unit_name_th: 'ฝ่ายการเงิน', unit_name_en: 'Finance Division', level_code: 'DIVISION', parent_code: 'LH' },
            { unit_code: 'DEV-DEPT', unit_name_th: 'แผนกพัฒนาระบบ', unit_name_en: 'Development Department', level_code: 'DEPARTMENT', parent_code: 'IT-DIV' },
            { unit_code: 'INFRA-DEPT', unit_name_th: 'แผนกโครงสร้างพื้นฐาน', unit_name_en: 'Infrastructure Department', level_code: 'DEPARTMENT', parent_code: 'IT-DIV' },
            { unit_code: 'REC-DEPT', unit_name_th: 'แผนกสรรหา', unit_name_en: 'Recruitment Department', level_code: 'DEPARTMENT', parent_code: 'HR-DIV' },
            { unit_code: 'TRAIN-DEPT', unit_name_th: 'แผนกฝึกอบรม', unit_name_en: 'Training Department', level_code: 'DEPARTMENT', parent_code: 'HR-DIV' }
        ];

        const unitIds = {};

        for (const unit of units) {
            try {
                const parentId = unit.parent_code ? unitIds[unit.parent_code] : null;
                const result = await pool.request()
                    .input('unitCode', sql.NVarChar(50), unit.unit_code)
                    .input('unitNameTh', sql.NVarChar(200), unit.unit_name_th)
                    .input('unitNameEn', sql.NVarChar(200), unit.unit_name_en)
                    .input('levelId', sql.Int, levelMap[unit.level_code])
                    .input('parentId', sql.Int, parentId)
                    .query(`
                        INSERT INTO OrganizationUnits (unit_code, unit_name_th, unit_name_en, level_id, parent_id, is_active, created_at)
                        OUTPUT INSERTED.unit_id
                        VALUES (@unitCode, @unitNameTh, @unitNameEn, @levelId, @parentId, 1, GETDATE())
                    `);
                unitIds[unit.unit_code] = result.recordset[0].unit_id;
            } catch (error) {
                console.log(`Skipped unit ${unit.unit_code}: ${error.message.substring(0, 50)}`);
            }
        }
        console.log(`Seeded ${units.length} organization units`);
    } else {
        console.log(`OrganizationUnits already has ${unitsCount.recordset[0].count} records`);
    }

    console.log('\n========================================');
    console.log('   SEEDING COMPLETED!');
    console.log('========================================\n');
}

// Run
seedMissingSettings()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Seeding failed:', err);
        process.exit(1);
    });
