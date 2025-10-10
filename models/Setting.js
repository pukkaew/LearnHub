const { poolPromise, sql } = require('../config/database');

/**
 * Setting Model
 * จัดการ System Settings, User Settings, และ Department Settings
 */
class Setting {
    /**
     * ========================
     * SYSTEM SETTINGS
     * ========================
     */

    /**
     * Get single system setting by key
     */
    static async getSystemSetting(settingKey) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('setting_key', sql.NVarChar(100), settingKey)
                .execute('sp_GetSystemSetting');

            if (result.recordset.length === 0) {
                return null;
            }

            const setting = result.recordset[0];

            // Parse JSON fields
            if (setting.validation_rules) {
                try {
                    setting.validation_rules = JSON.parse(setting.validation_rules);
                } catch (e) {
                    setting.validation_rules = {};
                }
            }

            if (setting.options) {
                try {
                    setting.options = JSON.parse(setting.options);
                } catch (e) {
                    setting.options = null;
                }
            }

            return setting;
        } catch (error) {
            throw new Error(`Error fetching system setting: ${error.message}`);
        }
    }

    /**
     * Get system settings by category
     */
    static async getSystemSettingsByCategory(category) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('category', sql.NVarChar(50), category)
                .execute('sp_GetSystemSettingsByCategory');

            // Parse JSON fields
            const settings = result.recordset.map(setting => {
                if (setting.validation_rules) {
                    try {
                        setting.validation_rules = JSON.parse(setting.validation_rules);
                    } catch (e) {
                        setting.validation_rules = {};
                    }
                }

                if (setting.options) {
                    try {
                        setting.options = JSON.parse(setting.options);
                    } catch (e) {
                        setting.options = null;
                    }
                }

                return setting;
            });

            return settings;
        } catch (error) {
            throw new Error(`Error fetching system settings by category: ${error.message}`);
        }
    }

    /**
     * Get all system settings grouped by category
     */
    static async getAllSystemSettings() {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .query(`
                    SELECT
                        setting_id,
                        setting_category,
                        setting_key,
                        setting_value,
                        setting_type,
                        setting_label,
                        setting_description,
                        default_value,
                        validation_rules,
                        options,
                        is_sensitive,
                        is_editable,
                        display_order,
                        is_active
                    FROM SystemSettings
                    WHERE is_active = 1
                    ORDER BY setting_category, display_order, setting_key
                `);

            // Group by category
            const grouped = {};
            result.recordset.forEach(setting => {
                if (!grouped[setting.setting_category]) {
                    grouped[setting.setting_category] = [];
                }

                // Parse JSON fields
                if (setting.validation_rules) {
                    try {
                        setting.validation_rules = JSON.parse(setting.validation_rules);
                    } catch (e) {
                        setting.validation_rules = {};
                    }
                }

                if (setting.options) {
                    try {
                        setting.options = JSON.parse(setting.options);
                    } catch (e) {
                        setting.options = null;
                    }
                }

                grouped[setting.setting_category].push(setting);
            });

            return grouped;
        } catch (error) {
            throw new Error(`Error fetching all system settings: ${error.message}`);
        }
    }

    /**
     * Update system setting
     */
    static async updateSystemSetting(settingKey, newValue, userId, ipAddress = null, userAgent = null, changeReason = null) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('setting_key', sql.NVarChar(100), settingKey)
                .input('new_value', sql.NVarChar(sql.MAX), newValue)
                .input('modified_by', sql.Int, userId)
                .input('ip_address', sql.NVarChar(45), ipAddress)
                .input('user_agent', sql.NVarChar(500), userAgent)
                .input('change_reason', sql.NVarChar(500), changeReason)
                .execute('sp_UpdateSystemSetting');

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error updating system setting: ${error.message}`);
        }
    }

    /**
     * Batch update system settings
     */
    static async batchUpdateSystemSettings(settings, userId, ipAddress = null, userAgent = null) {
        try {
            const pool = await poolPromise;
            const transaction = pool.transaction();

            await transaction.begin();

            try {
                const results = [];

                console.log(`\n🔄 Processing ${settings.length} settings in transaction...`);

                for (let i = 0; i < settings.length; i++) {
                    const setting = settings[i];

                    // Debug first 3 settings
                    if (i < 3) {
                        console.log(`\n  Setting ${i + 1}:`);
                        console.log(`    key: "${setting.key}"`);
                        console.log(`    value: "${setting.value}"`);
                        console.log(`    has value: ${setting.value !== undefined && setting.value !== null}`);
                    }

                    const result = await transaction.request()
                        .input('setting_key', sql.NVarChar(100), setting.key)
                        .input('new_value', sql.NVarChar(sql.MAX), setting.value)
                        .input('modified_by', sql.Int, userId)
                        .input('ip_address', sql.NVarChar(45), ipAddress)
                        .input('user_agent', sql.NVarChar(500), userAgent)
                        .input('change_reason', sql.NVarChar(500), setting.reason || null)
                        .execute('sp_UpdateSystemSetting');

                    results.push(result.recordset[0]);
                }

                console.log(`\n✅ All ${settings.length} settings processed\n`);

                await transaction.commit();

                return {
                    success: true,
                    message: 'Settings updated successfully',
                    results: results
                };
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            throw new Error(`Error batch updating system settings: ${error.message}`);
        }
    }

    /**
     * Get setting categories
     */
    static async getCategories() {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .query(`
                    SELECT
                        setting_category,
                        COUNT(*) as setting_count
                    FROM SystemSettings
                    WHERE is_active = 1
                    GROUP BY setting_category
                    ORDER BY setting_category
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching setting categories: ${error.message}`);
        }
    }

    /**
     * ========================
     * USER SETTINGS
     * ========================
     */

    /**
     * Get user setting by key
     */
    static async getUserSetting(userId, settingKey) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('settingKey', sql.NVarChar(100), settingKey)
                .execute('sp_GetUserSetting');

            if (result.recordset.length === 0) {
                return null;
            }

            const setting = result.recordset[0];

            // Try to parse JSON value
            try {
                setting.setting_value = JSON.parse(setting.setting_value);
            } catch (e) {
                // Keep as string if not valid JSON
            }

            return setting;
        } catch (error) {
            throw new Error(`Error fetching user setting: ${error.message}`);
        }
    }

    /**
     * Get all user settings
     */
    static async getAllUserSettings(userId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('user_id', sql.Int, userId)
                .execute('sp_GetAllUserSettings');

            // Convert to key-value object
            const settings = {};
            result.recordset.forEach(setting => {
                try {
                    settings[setting.setting_key] = JSON.parse(setting.setting_value);
                } catch (e) {
                    settings[setting.setting_key] = setting.setting_value;
                }
            });

            return settings;
        } catch (error) {
            throw new Error(`Error fetching all user settings: ${error.message}`);
        }
    }

    /**
     * Save/Update user setting
     */
    static async saveUserSetting(userId, settingKey, settingValue) {
        try {
            const pool = await poolPromise;

            // Convert value to JSON string if it's an object
            let valueToStore = settingValue;
            if (typeof settingValue === 'object') {
                valueToStore = JSON.stringify(settingValue);
            }

            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('settingKey', sql.NVarChar(100), settingKey)
                .input('settingValue', sql.NVarChar(sql.MAX), valueToStore)
                .execute('sp_UpsertUserSetting');

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error saving user setting: ${error.message}`);
        }
    }

    /**
     * Batch save user settings
     */
    static async batchSaveUserSettings(userId, settings) {
        try {
            const pool = await poolPromise;
            const transaction = pool.transaction();

            await transaction.begin();

            try {
                const results = [];

                for (const [key, value] of Object.entries(settings)) {
                    let valueToStore = value;
                    if (typeof value === 'object') {
                        valueToStore = JSON.stringify(value);
                    }

                    const result = await transaction.request()
                        .input('userId', sql.Int, userId)
                        .input('settingKey', sql.NVarChar(100), key)
                        .input('settingValue', sql.NVarChar(sql.MAX), valueToStore)
                        .execute('sp_UpsertUserSetting');

                    results.push(result.recordset[0]);
                }

                await transaction.commit();

                return {
                    success: true,
                    message: 'User settings saved successfully',
                    results: results
                };
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            throw new Error(`Error batch saving user settings: ${error.message}`);
        }
    }

    /**
     * Delete user setting
     */
    static async deleteUserSetting(userId, settingKey) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('settingKey', sql.NVarChar(100), settingKey)
                .query(`
                    DELETE FROM UserSettings
                    WHERE user_id = @userId AND setting_key = @settingKey
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0
                    ? 'User setting deleted successfully'
                    : 'User setting not found'
            };
        } catch (error) {
            throw new Error(`Error deleting user setting: ${error.message}`);
        }
    }

    /**
     * ========================
     * DEPARTMENT SETTINGS
     * ========================
     */

    /**
     * Get department setting
     */
    static async getDepartmentSetting(departmentId, settingKey) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('departmentId', sql.Int, departmentId)
                .input('settingKey', sql.NVarChar(100), settingKey)
                .query(`
                    SELECT
                        dept_setting_id,
                        department_id,
                        setting_key,
                        setting_value,
                        created_by,
                        created_date,
                        modified_by,
                        modified_date
                    FROM DepartmentSettings
                    WHERE department_id = @departmentId
                        AND setting_key = @settingKey
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const setting = result.recordset[0];

            // Try to parse JSON value
            try {
                setting.setting_value = JSON.parse(setting.setting_value);
            } catch (e) {
                // Keep as string if not valid JSON
            }

            return setting;
        } catch (error) {
            throw new Error(`Error fetching department setting: ${error.message}`);
        }
    }

    /**
     * Get all department settings
     */
    static async getAllDepartmentSettings(departmentId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('departmentId', sql.Int, departmentId)
                .query(`
                    SELECT
                        setting_key,
                        setting_value
                    FROM DepartmentSettings
                    WHERE department_id = @departmentId
                    ORDER BY setting_key
                `);

            // Convert to key-value object
            const settings = {};
            result.recordset.forEach(setting => {
                try {
                    settings[setting.setting_key] = JSON.parse(setting.setting_value);
                } catch (e) {
                    settings[setting.setting_key] = setting.setting_value;
                }
            });

            return settings;
        } catch (error) {
            throw new Error(`Error fetching all department settings: ${error.message}`);
        }
    }

    /**
     * Save/Update department setting
     */
    static async saveDepartmentSetting(departmentId, settingKey, settingValue, userId) {
        try {
            const pool = await poolPromise;

            // Convert value to JSON string if it's an object
            let valueToStore = settingValue;
            if (typeof settingValue === 'object') {
                valueToStore = JSON.stringify(settingValue);
            }

            const existing = await this.getDepartmentSetting(departmentId, settingKey);

            if (existing) {
                await pool.request()
                    .input('departmentId', sql.Int, departmentId)
                    .input('settingKey', sql.NVarChar(100), settingKey)
                    .input('settingValue', sql.NVarChar(sql.MAX), valueToStore)
                    .input('modifiedBy', sql.Int, userId)
                    .query(`
                        UPDATE DepartmentSettings
                        SET
                            setting_value = @settingValue,
                            modified_by = @modifiedBy,
                            modified_date = GETDATE()
                        WHERE department_id = @departmentId
                            AND setting_key = @settingKey
                    `);
            } else {
                await pool.request()
                    .input('departmentId', sql.Int, departmentId)
                    .input('settingKey', sql.NVarChar(100), settingKey)
                    .input('settingValue', sql.NVarChar(sql.MAX), valueToStore)
                    .input('createdBy', sql.Int, userId)
                    .query(`
                        INSERT INTO DepartmentSettings (
                            department_id,
                            setting_key,
                            setting_value,
                            created_by,
                            created_date
                        ) VALUES (
                            @departmentId,
                            @settingKey,
                            @settingValue,
                            @createdBy,
                            GETDATE()
                        )
                    `);
            }

            return {
                success: true,
                message: 'Department setting saved successfully'
            };
        } catch (error) {
            throw new Error(`Error saving department setting: ${error.message}`);
        }
    }

    /**
     * ========================
     * AUDIT LOG
     * ========================
     */

    /**
     * Get setting audit log
     */
    static async getAuditLog(filters = {}) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('setting_type', sql.NVarChar(20), filters.settingType || null)
                .input('setting_key', sql.NVarChar(100), filters.settingKey || null)
                .input('changed_by', sql.Int, filters.changedBy || null)
                .input('days', sql.Int, filters.days || 30)
                .execute('sp_GetSettingAuditLog');

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching audit log: ${error.message}`);
        }
    }

    /**
     * ========================
     * UTILITY METHODS
     * ========================
     */

    /**
     * Get effective setting value (System -> Department -> User priority)
     */
    static async getEffectiveSetting(settingKey, userId = null, departmentId = null) {
        try {
            // Priority: User Setting > Department Setting > System Setting

            // 1. Check user setting
            if (userId) {
                const userSetting = await this.getUserSetting(userId, settingKey);
                if (userSetting) {
                    return {
                        source: 'user',
                        value: userSetting.setting_value
                    };
                }
            }

            // 2. Check department setting
            if (departmentId) {
                const deptSetting = await this.getDepartmentSetting(departmentId, settingKey);
                if (deptSetting) {
                    return {
                        source: 'department',
                        value: deptSetting.setting_value
                    };
                }
            }

            // 3. Check system setting
            const systemSetting = await this.getSystemSetting(settingKey);
            if (systemSetting) {
                return {
                    source: 'system',
                    value: systemSetting.setting_value
                };
            }

            return null;
        } catch (error) {
            throw new Error(`Error getting effective setting: ${error.message}`);
        }
    }

    /**
     * Validate setting value against validation rules
     */
    static validateSettingValue(value, validationRules) {
        const errors = [];

        if (!validationRules) {
            return { valid: true, errors: [] };
        }

        // Required check
        if (validationRules.required && (!value || value === '')) {
            errors.push('This field is required');
        }

        // Type-specific validations
        if (value) {
            // Min/Max for numbers
            if (validationRules.min !== undefined) {
                const numValue = parseFloat(value);
                if (numValue < validationRules.min) {
                    errors.push(`Value must be at least ${validationRules.min}`);
                }
            }

            if (validationRules.max !== undefined) {
                const numValue = parseFloat(value);
                if (numValue > validationRules.max) {
                    errors.push(`Value must be at most ${validationRules.max}`);
                }
            }

            // Length for strings
            if (validationRules.minLength && value.length < validationRules.minLength) {
                errors.push(`Must be at least ${validationRules.minLength} characters`);
            }

            if (validationRules.maxLength && value.length > validationRules.maxLength) {
                errors.push(`Must be at most ${validationRules.maxLength} characters`);
            }

            // Email validation
            if (validationRules.email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    errors.push('Invalid email format');
                }
            }

            // URL validation
            if (validationRules.url) {
                try {
                    new URL(value);
                } catch (e) {
                    errors.push('Invalid URL format');
                }
            }

            // Pattern validation
            if (validationRules.pattern) {
                const regex = new RegExp(validationRules.pattern);
                if (!regex.test(value)) {
                    errors.push('Invalid format');
                }
            }

            // Enum validation
            if (validationRules.enum && !validationRules.enum.includes(value)) {
                errors.push(`Value must be one of: ${validationRules.enum.join(', ')}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

module.exports = Setting;
