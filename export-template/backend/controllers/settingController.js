/**
 * Settings Controller
 * Handles CRUD operations for System Settings, User Settings, and Department Settings
 */

const Setting = require('../models/Setting');
const { clearSettingsCache } = require('../middleware/settingsMiddleware');

/**
 * ========================
 * SYSTEM SETTINGS
 * ========================
 */

/**
 * GET /settings
 * Display System Settings page
 */
exports.getSystemSettingsPage = async (req, res) => {
    try {
        // Check admin permission
        if (!req.session || !req.session.user) {
            req.flash('error_msg', 'Please login first');
            return res.redirect('/auth/login');
        }

        const userRole = (req.session.user.role || req.session.user.role_name || '').toUpperCase();

        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            req.flash('error_msg', 'You do not have permission to access this page');
            return res.redirect('/dashboard');
        }

        const categories = await Setting.getCategories();
        const allSettings = await Setting.getAllSystemSettings();

        res.render('settings/system', {
            title: 'System Settings',
            categories,
            settings: allSettings,
            activeTab: req.query.tab || 'general',
            user: req.session.user,
            csrfToken: res.locals.csrfToken || req.session.csrfToken || ''
        });
    } catch (error) {
        console.error('Error loading system settings page:', error);
        req.flash('error_msg', 'Error loading settings page');
        res.redirect('/dashboard');
    }
};

/**
 * GET /settings/category/:category
 * Get settings by category
 */
exports.getSettingsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const settings = await Setting.getSystemSettingsByCategory(category);

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error fetching settings by category:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching data'
        });
    }
};

/**
 * GET /settings/:key
 * Get single setting by key
 */
exports.getSettingByKey = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await Setting.getSystemSetting(key);

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        res.json({
            success: true,
            data: setting
        });
    } catch (error) {
        console.error('Error fetching setting by key:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching data'
        });
    }
};

/**
 * PUT /settings/:key
 * Update single setting
 */
exports.updateSetting = async (req, res) => {
    try {
        // Check admin permission
        const userRole = (req.session.user.role || req.session.user.role_name || '').toUpperCase();
        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to edit settings'
            });
        }

        const { key } = req.params;
        const { value, reason } = req.body;

        // Get setting to validate
        const setting = await Setting.getSystemSetting(key);
        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        // Validate value
        const validation = Setting.validateSettingValue(value, setting.validation_rules);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid data',
                errors: validation.errors
            });
        }

        // Update setting
        const result = await Setting.updateSystemSetting(
            key,
            value,
            req.session.user.user_id,
            req.ip,
            req.headers['user-agent'],
            reason
        );

        if (result.success) {
            // Clear settings cache to reflect changes immediately
            clearSettingsCache();

            res.json({
                success: true,
                message: 'Settings updated successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message || 'Cannot update settings'
            });
        }
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating settings'
        });
    }
};

/**
 * POST /settings/batch
 * Batch update multiple settings
 */
exports.batchUpdateSettings = async (req, res) => {
    try {
        // Check session exists
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Please login first'
            });
        }

        // Check admin permission
        const userRole = (req.session.user.role || req.session.user.role_name || '').toUpperCase();
        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to edit settings'
            });
        }

        const { settings } = req.body; // Array of {key, value, reason}

        if (!Array.isArray(settings) || settings.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid data'
            });
        }

        // Validate all settings first
        const validationErrors = [];
        for (const item of settings) {
            const setting = await Setting.getSystemSetting(item.key);
            if (!setting) {
                validationErrors.push({
                    key: item.key,
                    error: 'Setting not found'
                });
                continue;
            }

            const validation = Setting.validateSettingValue(item.value, setting.validation_rules);
            if (!validation.valid) {
                validationErrors.push({
                    key: item.key,
                    errors: validation.errors
                });
            }
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Some data is invalid',
                errors: validationErrors
            });
        }

        // Update all settings
        const result = await Setting.batchUpdateSystemSettings(
            settings,
            req.session.user.user_id,
            req.ip,
            req.headers['user-agent']
        );

        if (result.success) {
            // Clear settings cache to reflect changes immediately
            clearSettingsCache();

            res.json({
                success: true,
                message: 'All settings updated successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Cannot update settings'
            });
        }
    } catch (error) {
        console.error('Error batch updating settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating settings'
        });
    }
};

/**
 * ========================
 * USER SETTINGS
 * ========================
 */

/**
 * GET /settings/user
 * Display User Settings page
 */
exports.getUserSettingsPage = async (req, res) => {
    try {
        const userSettings = await Setting.getAllUserSettings(req.session.user.user_id);

        res.render('settings/user', {
            title: 'User Settings',
            settings: userSettings,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading user settings page:', error);
        req.flash('error_msg', 'Error loading settings page');
        res.redirect('/dashboard');
    }
};

/**
 * GET /settings/user/all
 * Get all user settings
 */
exports.getAllUserSettings = async (req, res) => {
    try {
        const settings = await Setting.getAllUserSettings(req.session.user.user_id);

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error fetching user settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching data'
        });
    }
};

/**
 * GET /settings/user/:key
 * Get single user setting
 */
exports.getUserSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await Setting.getUserSetting(req.session.user.user_id, key);

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        res.json({
            success: true,
            data: setting
        });
    } catch (error) {
        console.error('Error fetching user setting:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching data'
        });
    }
};

/**
 * POST /settings/user
 * Save user setting
 */
exports.saveUserSetting = async (req, res) => {
    try {
        const { key, value } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Incomplete data'
            });
        }

        const result = await Setting.saveUserSetting(
            req.session.user.user_id,
            key,
            value
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Settings saved successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message || 'Cannot save settings'
            });
        }
    } catch (error) {
        console.error('Error saving user setting:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving settings'
        });
    }
};

/**
 * POST /settings/user/batch
 * Batch save user settings
 */
exports.batchSaveUserSettings = async (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Invalid data'
            });
        }

        const result = await Setting.batchSaveUserSettings(
            req.session.user.user_id,
            settings
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'All settings updated successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Cannot save settings'
            });
        }
    } catch (error) {
        console.error('Error batch saving user settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving settings'
        });
    }
};

/**
 * DELETE /settings/user/:key
 * Delete user setting
 */
exports.deleteUserSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const result = await Setting.deleteUserSetting(req.session.user.user_id, key);

        if (result.success) {
            res.json({
                success: true,
                message: 'Setting deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message || 'Setting not found'
            });
        }
    } catch (error) {
        console.error('Error deleting user setting:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting setting'
        });
    }
};

/**
 * ========================
 * DEPARTMENT SETTINGS
 * ========================
 */

/**
 * GET /settings/department/:departmentId
 * Get department settings
 */
exports.getDepartmentSettings = async (req, res) => {
    try {
        const { departmentId } = req.params;

        // Check permission - must be admin or department manager
        const user = req.session.user;
        const userRole = (user.role || user.role_name || '').toUpperCase();
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
        const isDepartmentManager = user.department_id === parseInt(departmentId) &&
                                    (userRole === 'MANAGER' || userRole === 'INSTRUCTOR');

        if (!isAdmin && !isDepartmentManager) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access department settings'
            });
        }

        const settings = await Setting.getAllDepartmentSettings(parseInt(departmentId));

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error fetching department settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching data'
        });
    }
};

/**
 * POST /settings/department/:departmentId
 * Save department setting
 */
exports.saveDepartmentSetting = async (req, res) => {
    try {
        const { departmentId } = req.params;
        const { key, value } = req.body;

        // Check permission
        const user = req.session.user;
        const userRole = (user.role || user.role_name || '').toUpperCase();
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
        const isDepartmentManager = user.department_id === parseInt(departmentId) &&
                                    (userRole === 'MANAGER' || userRole === 'INSTRUCTOR');

        if (!isAdmin && !isDepartmentManager) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to edit department settings'
            });
        }

        if (!key || value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Incomplete data'
            });
        }

        const result = await Setting.saveDepartmentSetting(
            parseInt(departmentId),
            key,
            value,
            user.user_id
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Department settings saved successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message || 'Cannot save settings'
            });
        }
    } catch (error) {
        console.error('Error saving department setting:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving settings'
        });
    }
};

/**
 * ========================
 * UTILITY ENDPOINTS
 * ========================
 */

/**
 * POST /settings/validate
 * Validate setting value
 */
exports.validateSetting = async (req, res) => {
    try {
        const { key, value } = req.body;

        if (!key) {
            return res.status(400).json({
                success: false,
                message: 'Missing setting key'
            });
        }

        const setting = await Setting.getSystemSetting(key);
        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        const validation = Setting.validateSettingValue(value, setting.validation_rules);

        res.json({
            success: true,
            valid: validation.valid,
            errors: validation.errors
        });
    } catch (error) {
        console.error('Error validating setting:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating data'
        });
    }
};

/**
 * GET /settings/effective/:key
 * Get effective setting value (cascading: user -> dept -> system)
 */
exports.getEffectiveSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const userId = req.session.user.user_id;
        const departmentId = req.session.user.department_id;

        const effectiveSetting = await Setting.getEffectiveSetting(key, userId, departmentId);

        if (!effectiveSetting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        res.json({
            success: true,
            data: effectiveSetting
        });
    } catch (error) {
        console.error('Error fetching effective setting:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching data'
        });
    }
};

module.exports = exports;
