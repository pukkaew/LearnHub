const Setting = require('../models/Setting');
const logger = require('../utils/logger');

/**
 * Settings Middleware
 * โหลดและ inject settings เข้าไปใน res.locals เพื่อให้ view ทั้งหมดเข้าถึงได้
 */

// Cache settings to reduce database queries
let settingsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 1000; // 30 seconds (reduced from 5 minutes for Settings updates)

/**
 * Load all system settings and make them available to views
 */
async function loadSystemSettings(req, res, next) {
    try {
        // Check if cache is still valid
        const now = Date.now();
        if (settingsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
            res.locals.systemSettings = settingsCache;
            logger.info('Settings loaded from cache:', {
                count: Object.keys(settingsCache).length,
                system_name: settingsCache.system_name,
                site_name: settingsCache.site_name,
                primary_color: settingsCache.primary_color,
                secondary_color: settingsCache.secondary_color,
                cached: true,
                cacheAge: Math.floor((now - cacheTimestamp) / 1000) + 's'
            });
            return next();
        }

        // Load fresh settings from database
        const allSettings = await Setting.getAllSystemSettings();

        // Convert to flat key-value object for easier access
        const settingsFlat = {};
        Object.values(allSettings).forEach(categorySettings => {
            categorySettings.forEach(setting => {
                // Use setting_value if not null/empty, otherwise use default_value
                const value = (setting.setting_value !== null && setting.setting_value !== '')
                    ? setting.setting_value
                    : setting.default_value;
                settingsFlat[setting.setting_key] = value;
            });
        });

        // Update cache
        settingsCache = settingsFlat;
        cacheTimestamp = now;

        // Make settings available to all views
        res.locals.systemSettings = settingsFlat;

        // Debug logging
        logger.info('Settings loaded from database:', {
            count: Object.keys(settingsFlat).length,
            system_name: settingsFlat.system_name,
            site_name: settingsFlat.site_name,
            primary_color: settingsFlat.primary_color,
            secondary_color: settingsFlat.secondary_color,
            cached: false
        });

        next();
    } catch (error) {
        logger.error('Error loading system settings:', error);

        // Don't fail the request, just use defaults
        res.locals.systemSettings = getDefaultSettings();
        next();
    }
}

/**
 * Load user-specific settings
 */
async function loadUserSettings(req, res, next) {
    try {
        // Check if user is authenticated and has user_id
        if (req.session?.user?.user_id) {
            const userId = req.session.user.user_id;

            // Validate user_id is a number before calling database
            if (typeof userId === 'number' && userId > 0) {
                const userSettings = await Setting.getAllUserSettings(userId);
                res.locals.userSettings = userSettings || {};
            } else {
                logger.warn('Invalid user_id type or value:', { userId, type: typeof userId });
                res.locals.userSettings = {};
            }
        } else {
            // No user session, use empty settings
            res.locals.userSettings = {};
        }

        next();
    } catch (error) {
        logger.error('Error loading user settings:', {
            error: error.message,
            userId: req.session?.user?.user_id,
            stack: error.stack
        });
        // Don't fail the request, just use empty settings
        res.locals.userSettings = {};
        next();
    }
}

/**
 * Get effective setting (User > Department > System)
 */
async function loadEffectiveSettings(req, res, next) {
    try {
        const userId = req.session?.user?.user_id;
        const departmentId = req.session?.user?.department_id;

        // Get system settings (already loaded)
        const systemSettings = res.locals.systemSettings || {};

        // Get user settings
        const userSettings = res.locals.userSettings || {};

        // Merge settings (user overrides system)
        const effectiveSettings = { ...systemSettings, ...userSettings };

        res.locals.settings = effectiveSettings;

        next();
    } catch (error) {
        logger.error('Error loading effective settings:', error);
        res.locals.settings = getDefaultSettings();
        next();
    }
}

/**
 * Clear settings cache (call this after updating settings)
 */
function clearSettingsCache() {
    settingsCache = null;
    cacheTimestamp = null;
    logger.info('Settings cache cleared');
}

/**
 * Default settings fallback
 */
function getDefaultSettings() {
    return {
        // General
        'site_name': 'Rukchai Hongyen LearnHub',
        'site_description': 'ระบบจัดการการเรียนรู้ บริษัท รักชัยห้องเย็น จำกัด',
        'site_language': 'th',
        'timezone': 'Asia/Bangkok',

        // Appearance
        'logo_url': '/images/rukchai-logo.png',
        'favicon_url': '/favicon.ico',
        'primary_color': '#0090D3',
        'secondary_color': '#3AAA35',
        'accent_color': '#006BA6',
        'sidebar_color': '#1f2937',
        'topbar_color': '#ffffff',

        // Features
        'enable_registration': 'false',
        'enable_social_login': 'false',
        'enable_notifications': 'true',
        'enable_gamification': 'true',

        // Email
        'smtp_host': '',
        'smtp_port': '587',
        'smtp_user': '',
        'email_from_name': 'Rukchai LearnHub',
        'email_from_address': 'noreply@rukchai.com',

        // Security
        'session_timeout': '3600',
        'max_login_attempts': '5',
        'password_min_length': '8',
        'require_password_complexity': 'true',
        'enable_two_factor_auth': 'false',

        // System
        'maintenance_mode': 'false',
        'debug_mode': 'false',
        'enable_logging': 'true',
        'log_level': 'info'
    };
}

/**
 * Helper function to get setting value with fallback
 */
function getSetting(settings, key, defaultValue = null) {
    return settings[key] !== undefined ? settings[key] : defaultValue;
}

/**
 * Middleware to make helper functions available in views
 */
function injectHelpers(req, res, next) {
    res.locals.getSetting = (key, defaultValue) => {
        return getSetting(res.locals.settings || {}, key, defaultValue);
    };

    res.locals.getSystemSetting = (key, defaultValue) => {
        return getSetting(res.locals.systemSettings || {}, key, defaultValue);
    };

    res.locals.getUserSetting = (key, defaultValue) => {
        return getSetting(res.locals.userSettings || {}, key, defaultValue);
    };

    next();
}

module.exports = {
    loadSystemSettings,
    loadUserSettings,
    loadEffectiveSettings,
    clearSettingsCache,
    getDefaultSettings,
    getSetting,
    injectHelpers
};
