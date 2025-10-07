const Setting = require('../models/Setting');
const logger = require('../utils/logger');
const { clearSettingsCache } = require('../middleware/settingsMiddleware');

/**
 * Settings Controller
 * จัดการ CRUD operations สำหรับ System Settings, User Settings และ Department Settings
 */

/**
 * ========================
 * SYSTEM SETTINGS
 * ========================
 */

/**
 * GET /settings
 * แสดงหน้า System Settings
 */
exports.getSystemSettingsPage = async (req, res) => {
    try {
        // Check admin permission
        if (!req.session || !req.session.user) {
            req.flash('error_msg', 'กรุณาเข้าสู่ระบบก่อนใช้งาน');
            return res.redirect('/auth/login');
        }

        // Debug: log user session
        logger.info('=== Settings Access Attempt ===');
        logger.info('User ID:', req.session.user.user_id);
        logger.info('Username:', req.session.user.username);
        logger.info('Role field:', req.session.user.role);
        logger.info('Role Name field:', req.session.user.role_name);
        logger.info('Full user object:', JSON.stringify(req.session.user, null, 2));
        logger.info('===============================');

        const userRole = (req.session.user.role || req.session.user.role_name || '').toUpperCase();

        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            logger.warn(`Access denied for user ${req.session.user.username} with role: ${userRole}`);
            req.flash('error_msg', `คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องเป็น Admin หรือ Super Admin) - Role ของคุณคือ: ${userRole}`);
            return res.redirect('/dashboard');
        }

        logger.info(`Loading system settings page for user: ${req.session.user.user_id}, role: ${userRole}`);

        const categories = await Setting.getCategories();
        const allSettings = await Setting.getAllSystemSettings();

        logger.info(`Loaded ${categories.length} categories and ${Object.keys(allSettings).length} setting groups`);

        // Debug: Log first few settings to verify data
        if (allSettings && allSettings.general && allSettings.general.length > 0) {
            console.log('\n🔍 ===== DATA BEING SENT TO EJS TEMPLATE =====');
            console.log('First 3 general settings:');
            allSettings.general.slice(0, 3).forEach((s, i) => {
                console.log(`\n  ${i + 1}. ${s.setting_key}:`);
                console.log(`     - setting_value: "${s.setting_value}" (${s.setting_value === null ? 'NULL' : s.setting_value === '' ? 'EMPTY_STRING' : 'HAS_VALUE'})`);
                console.log(`     - default_value: "${s.default_value}" (${s.default_value === null ? 'NULL' : s.default_value === '' ? 'EMPTY_STRING' : 'HAS_VALUE'})`);
                console.log(`     - Should display: "${(s.setting_value !== null && s.setting_value !== '') ? s.setting_value : s.default_value}"`);
            });
            console.log('\n==============================================\n');
        }

        res.render('settings/system', {
            title: 'การตั้งค่าระบบ',
            categories,
            settings: allSettings,
            activeTab: req.query.tab || 'general',
            user: req.session.user,
            currentLanguage: req.session.language || 'th',
            csrfToken: res.locals.csrfToken || req.session.csrfToken || '',
            additionalJS: '<script src="/js/settings.js"></script>'
        });
    } catch (error) {
        logger.error('Error loading system settings page:', error);
        logger.error('Error stack:', error.stack);
        req.flash('error_msg', `เกิดข้อผิดพลาดในการโหลดหน้าการตั้งค่า: ${error.message}`);
        res.redirect('/dashboard');
    }
};

/**
 * GET /settings/category/:category
 * ดึง settings ตาม category
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
        logger.error('Error fetching settings by category:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /settings/:key
 * ดึง setting เดียวตาม key
 */
exports.getSettingByKey = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await Setting.getSystemSetting(key);

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบการตั้งค่าที่ระบุ'
            });
        }

        res.json({
            success: true,
            data: setting
        });
    } catch (error) {
        logger.error('Error fetching setting by key:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * PUT /settings/:key
 * อัพเดท single setting
 */
exports.updateSetting = async (req, res) => {
    try {
        // Check admin permission
        const userRole = (req.session.user.role || req.session.user.role_name || '').toUpperCase();
        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์ในการแก้ไขการตั้งค่า'
            });
        }

        const { key } = req.params;
        const { value, reason } = req.body;

        // Get setting to validate
        const setting = await Setting.getSystemSetting(key);
        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบการตั้งค่าที่ระบุ'
            });
        }

        // Validate value
        const validation = Setting.validateSettingValue(value, setting.validation_rules);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลไม่ถูกต้อง',
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
            logger.info(`Setting updated: ${key} by user ${req.session.user.user_id}`);

            // Clear settings cache to reflect changes immediately
            clearSettingsCache();

            res.json({
                success: true,
                message: 'อัพเดทการตั้งค่าเรียบร้อยแล้ว'
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message || 'ไม่สามารถอัพเดทการตั้งค่าได้'
            });
        }
    } catch (error) {
        logger.error('Error updating setting:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัพเดทการตั้งค่า'
        });
    }
};

/**
 * POST /settings/batch
 * อัพเดทหลาย settings พร้อมกัน
 */
exports.batchUpdateSettings = async (req, res) => {
    try {
        // Check session exists
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
            });
        }

        // Check admin permission
        const userRole = (req.session.user.role || req.session.user.role_name || '').toUpperCase();
        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์ในการแก้ไขการตั้งค่า'
            });
        }

        // CSRF token validation
        const csrfToken = req.body._csrf || req.headers['x-csrf-token'];
        if (req.session.csrfToken) {
            if (!csrfToken) {
                logger.warn('CSRF token missing in request');
                return res.status(403).json({
                    success: false,
                    message: 'CSRF token is required'
                });
            }
            if (csrfToken !== req.session.csrfToken) {
                logger.warn('CSRF token mismatch', {
                    sessionToken: req.session.csrfToken,
                    providedToken: csrfToken
                });
                return res.status(403).json({
                    success: false,
                    message: 'Invalid CSRF token'
                });
            }
        }

        const { settings } = req.body; // Array of {key, value, reason}

        logger.info('Batch update request received', {
            settingsCount: settings?.length,
            firstFewSettings: settings?.slice(0, 3),
            firstSettingDetailed: settings?.[0] ? JSON.stringify(settings[0]) : 'none',
            hasValues: settings?.some(s => s.value !== undefined && s.value !== null)
        });

        // Debug: Log first few settings with full details
        if (settings && settings.length > 0) {
            console.log('\n🔍 ===== SETTINGS RECEIVED =====');
            console.log(`Total: ${settings.length} settings`);
            console.log('\nFirst 5 settings with full details:');
            settings.slice(0, 5).forEach((s, i) => {
                console.log(`\n  ${i + 1}. ${s.key}:`);
                console.log(`     - value: "${s.value}"`);
                console.log(`     - type: ${typeof s.value}`);
                console.log(`     - has value: ${s.value !== undefined && s.value !== null && s.value !== ''}`);
                console.log(`     - full object: ${JSON.stringify(s)}`);
            });
            console.log('\n===============================\n');
        }

        if (!Array.isArray(settings) || settings.length === 0) {
            logger.warn('Invalid settings data in batch update request', { settings });
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลไม่ถูกต้อง'
            });
        }

        // Validate all settings first
        const validationErrors = [];
        for (const item of settings) {
            const setting = await Setting.getSystemSetting(item.key);
            if (!setting) {
                validationErrors.push({
                    key: item.key,
                    error: 'ไม่พบการตั้งค่า'
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
            logger.warn('Validation errors in batch update', { validationErrors });
            return res.status(400).json({
                success: false,
                message: 'มีข้อมูลบางส่วนไม่ถูกต้อง',
                errors: validationErrors
            });
        }

        // Update all settings
        logger.info('Calling batchUpdateSystemSettings with:', {
            settingsCount: settings.length,
            userId: req.session.user.user_id,
            settings: settings
        });

        const result = await Setting.batchUpdateSystemSettings(
            settings,
            req.session.user.user_id,
            req.ip,
            req.headers['user-agent']
        );

        logger.info('Batch update result:', result);

        if (result.success) {
            logger.info(`✅ Batch settings updated successfully by user ${req.session.user.user_id}`);

            // Clear settings cache to reflect changes immediately
            clearSettingsCache();

            res.json({
                success: true,
                message: 'อัพเดทการตั้งค่าทั้งหมดเรียบร้อยแล้ว'
            });
        } else {
            logger.error('❌ Batch update failed:', result);
            res.status(400).json({
                success: false,
                message: 'ไม่สามารถอัพเดทการตั้งค่าได้'
            });
        }
    } catch (error) {
        logger.error('Error batch updating settings:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัพเดทการตั้งค่า'
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
 * แสดงหน้า User Settings
 */
exports.getUserSettingsPage = async (req, res) => {
    try {
        const userSettings = await Setting.getAllUserSettings(req.session.user.user_id);
        const currentLanguage = req.session.language || 'th';

        res.render('settings/user', {
            title: currentLanguage === 'en' ? 'Personal Settings' : 'การตั้งค่าส่วนตัว',
            settings: userSettings,
            user: req.session.user,
            currentLanguage: currentLanguage
        });
    } catch (error) {
        logger.error('Error loading user settings page:', error);
        req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดหน้าการตั้งค่า');
        res.redirect('/dashboard');
    }
};

/**
 * GET /settings/user/all
 * ดึง user settings ทั้งหมด
 */
exports.getAllUserSettings = async (req, res) => {
    try {
        const settings = await Setting.getAllUserSettings(req.session.user.user_id);

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        logger.error('Error fetching user settings:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /settings/user/:key
 * ดึง user setting เดียว
 */
exports.getUserSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await Setting.getUserSetting(req.session.user.user_id, key);

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบการตั้งค่าที่ระบุ'
            });
        }

        res.json({
            success: true,
            data: setting
        });
    } catch (error) {
        logger.error('Error fetching user setting:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * POST /settings/user
 * บันทึก user setting
 */
exports.saveUserSetting = async (req, res) => {
    try {
        const { key, value } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลไม่ครบถ้วน'
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
                message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว'
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message || 'ไม่สามารถบันทึกการตั้งค่าได้'
            });
        }
    } catch (error) {
        logger.error('Error saving user setting:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า'
        });
    }
};

/**
 * POST /settings/user/batch
 * บันทึกหลาย user settings
 */
exports.batchSaveUserSettings = async (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลไม่ถูกต้อง'
            });
        }

        const result = await Setting.batchSaveUserSettings(
            req.session.user.user_id,
            settings
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'บันทึกการตั้งค่าทั้งหมดเรียบร้อยแล้ว'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'ไม่สามารถบันทึกการตั้งค่าได้'
            });
        }
    } catch (error) {
        logger.error('Error batch saving user settings:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า'
        });
    }
};

/**
 * DELETE /settings/user/:key
 * ลบ user setting
 */
exports.deleteUserSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const result = await Setting.deleteUserSetting(req.session.user.user_id, key);

        if (result.success) {
            res.json({
                success: true,
                message: 'ลบการตั้งค่าเรียบร้อยแล้ว'
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message || 'ไม่พบการตั้งค่าที่ระบุ'
            });
        }
    } catch (error) {
        logger.error('Error deleting user setting:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบการตั้งค่า'
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
 * ดึง department settings
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
                message: 'คุณไม่มีสิทธิ์เข้าถึงการตั้งค่าแผนกนี้'
            });
        }

        const settings = await Setting.getAllDepartmentSettings(parseInt(departmentId));

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        logger.error('Error fetching department settings:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * POST /settings/department/:departmentId
 * บันทึก department setting
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
                message: 'คุณไม่มีสิทธิ์แก้ไขการตั้งค่าแผนกนี้'
            });
        }

        if (!key || value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลไม่ครบถ้วน'
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
                message: 'บันทึกการตั้งค่าแผนกเรียบร้อยแล้ว'
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message || 'ไม่สามารถบันทึกการตั้งค่าได้'
            });
        }
    } catch (error) {
        logger.error('Error saving department setting:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า'
        });
    }
};

/**
 * ========================
 * AUDIT LOG
 * ========================
 */

/**
 * GET /settings/audit-log
 * ดูประวัติการเปลี่ยนแปลง settings
 */
exports.getAuditLog = async (req, res) => {
    try {
        // Check admin permission
        const userRole = (req.session.user.role || req.session.user.role_name || '').toUpperCase();
        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
            });
        }

        const filters = {
            settingType: req.query.type,
            settingKey: req.query.key,
            changedBy: req.query.user,
            days: req.query.days || 30
        };

        const auditLog = await Setting.getAuditLog(filters);

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.json({
                success: true,
                data: auditLog
            });
        } else {
            res.render('settings/audit-log', {
                title: 'ประวัติการเปลี่ยนแปลงการตั้งค่า',
                auditLog,
                filters,
                user: req.session.user
            });
        }
    } catch (error) {
        logger.error('Error fetching audit log:', error);

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
            });
        } else {
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการดึงข้อมูล');
            res.redirect('/settings');
        }
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

        // Validate input
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
                message: 'ไม่พบการตั้งค่าที่ระบุ'
            });
        }

        const validation = Setting.validateSettingValue(value, setting.validation_rules);

        res.json({
            success: true,
            valid: validation.valid,
            errors: validation.errors
        });
    } catch (error) {
        logger.error('Error validating setting:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล'
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
                message: 'ไม่พบการตั้งค่าที่ระบุ'
            });
        }

        res.json({
            success: true,
            data: effectiveSetting
        });
    } catch (error) {
        logger.error('Error fetching effective setting:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

module.exports = exports;
