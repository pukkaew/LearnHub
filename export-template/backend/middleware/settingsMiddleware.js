/**
 * Settings Middleware
 * Loads and injects settings into res.locals for all views
 */

const Setting = require('../models/Setting');

// Cache settings to reduce database queries
let settingsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 1000; // 30 seconds

/**
 * Load all system settings and make them available to views
 */
async function loadSystemSettings(req, res, next) {
    try {
        // Check if cache is still valid
        const now = Date.now();
        if (settingsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
            res.locals.systemSettings = settingsCache;
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

        next();
    } catch (error) {
        console.error('Error loading system settings:', error);

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
        if (req.session?.user?.user_id) {
            const userId = req.session.user.user_id;

            if (typeof userId === 'number' && userId > 0) {
                const userSettings = await Setting.getAllUserSettings(userId);
                res.locals.userSettings = userSettings || {};
            } else {
                res.locals.userSettings = {};
            }
        } else {
            res.locals.userSettings = {};
        }

        next();
    } catch (error) {
        console.error('Error loading user settings:', error);
        res.locals.userSettings = {};
        next();
    }
}

/**
 * Get effective setting (User > Department > System)
 */
async function loadEffectiveSettings(req, res, next) {
    try {
        // Get system settings (already loaded)
        const systemSettings = res.locals.systemSettings || {};

        // Get user settings
        const userSettings = res.locals.userSettings || {};

        // Merge settings (user overrides system)
        const effectiveSettings = { ...systemSettings, ...userSettings };

        res.locals.settings = effectiveSettings;

        next();
    } catch (error) {
        console.error('Error loading effective settings:', error);
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
    console.log('Settings cache cleared');
}

/**
 * Default settings fallback
 */
function getDefaultSettings() {
    return {
        // General
        'site_name': 'LearnHub',
        'site_description': 'Learning Management System',
        'site_language': 'en',
        'timezone': 'UTC',

        // Appearance
        'logo_url': '/images/logo.png',
        'favicon_url': '/favicon.ico',
        'primary_color': '#0090D3',
        'secondary_color': '#3AAA35',
        'accent_color': '#3b82f6',
        'sidebar_color': '#1f2937',
        'topbar_color': '#ffffff',

        // Features
        'enable_registration': 'false',
        'enable_social_login': 'false',
        'enable_notifications': 'true',
        'enable_gamification': 'true',

        // Security
        'session_timeout': '3600',
        'max_login_attempts': '5',
        'password_min_length': '8',
        'require_password_complexity': 'true',

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
