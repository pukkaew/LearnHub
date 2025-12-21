/**
 * LearnHub Settings Module
 * Manages system settings, themes, and user preferences
 * Version: 1.0.0
 */

const LearnHubSettings = (function() {
    'use strict';

    // Configuration
    const config = {
        apiBase: '/api/settings',
        endpoints: {
            system: '/system',
            user: '/user',
            department: '/department',
            batch: '/batch'
        },
        cacheKey: 'learnhub_settings',
        cacheDuration: 5 * 60 * 1000 // 5 minutes
    };

    // State
    let cache = {};
    let cacheTimestamp = 0;
    let isInitialized = false;

    /**
     * Initialize settings module
     * @param {Object} options - Configuration overrides
     */
    function init(options = {}) {
        Object.assign(config, options);

        // Load cached settings
        loadFromCache();

        // Apply theme on init
        applyTheme();

        isInitialized = true;
        console.log('[LearnHubSettings] Initialized');
    }

    /**
     * Get a setting value
     * @param {string} category - Setting category
     * @param {string} key - Setting key
     * @param {*} defaultValue - Default value if not found
     * @returns {Promise<*>} Setting value
     */
    async function get(category, key, defaultValue = null) {
        // Check cache first
        const cacheKey = `${category}.${key}`;
        if (cache[cacheKey] !== undefined && !isCacheExpired()) {
            return cache[cacheKey];
        }

        try {
            const response = await fetch(`${config.apiBase}${config.endpoints.system}/${category}/${key}`);
            if (response.ok) {
                const data = await response.json();
                cache[cacheKey] = data.value;
                saveToCache();
                return data.value;
            }
        } catch (error) {
            console.error('[LearnHubSettings] Error getting setting:', error);
        }

        return defaultValue;
    }

    /**
     * Set a setting value
     * @param {string} category - Setting category
     * @param {string} key - Setting key
     * @param {*} value - New value
     * @returns {Promise<boolean>} Success status
     */
    async function set(category, key, value) {
        try {
            const response = await fetch(`${config.apiBase}${config.endpoints.system}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ category, key, value })
            });

            if (response.ok) {
                // Update cache
                const cacheKey = `${category}.${key}`;
                cache[cacheKey] = value;
                saveToCache();

                // Apply theme if it's an appearance setting
                if (category === 'appearance') {
                    applyTheme();
                }

                emitEvent('settingChanged', { category, key, value });
                return true;
            }
        } catch (error) {
            console.error('[LearnHubSettings] Error setting value:', error);
        }

        return false;
    }

    /**
     * Get all settings in a category
     * @param {string} category - Setting category
     * @returns {Promise<Object>} Settings object
     */
    async function getCategory(category) {
        try {
            const response = await fetch(`${config.apiBase}${config.endpoints.system}/${category}`);
            if (response.ok) {
                const data = await response.json();

                // Update cache
                Object.entries(data).forEach(([key, value]) => {
                    cache[`${category}.${key}`] = value;
                });
                saveToCache();

                return data;
            }
        } catch (error) {
            console.error('[LearnHubSettings] Error getting category:', error);
        }

        return {};
    }

    /**
     * Batch update multiple settings
     * @param {Object} settings - Object with key-value pairs (keys in format "category.key")
     * @returns {Promise<boolean>} Success status
     */
    async function batchUpdate(settings) {
        try {
            const response = await fetch(`${config.apiBase}${config.endpoints.batch}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ settings })
            });

            if (response.ok) {
                // Update cache
                Object.entries(settings).forEach(([key, value]) => {
                    cache[key] = value;
                });
                saveToCache();

                // Check if any appearance settings changed
                const hasAppearanceChange = Object.keys(settings).some(key =>
                    key.startsWith('appearance.')
                );
                if (hasAppearanceChange) {
                    applyTheme();
                }

                emitEvent('settingsBatchUpdated', { settings });
                return true;
            }
        } catch (error) {
            console.error('[LearnHubSettings] Error batch updating:', error);
        }

        return false;
    }

    /**
     * Reset settings in a category to defaults
     * @param {string} category - Setting category
     * @returns {Promise<boolean>} Success status
     */
    async function reset(category) {
        try {
            const response = await fetch(`${config.apiBase}${config.endpoints.system}/${category}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Clear category from cache
                Object.keys(cache).forEach(key => {
                    if (key.startsWith(`${category}.`)) {
                        delete cache[key];
                    }
                });
                saveToCache();

                if (category === 'appearance') {
                    applyTheme();
                }

                emitEvent('settingsReset', { category });
                return true;
            }
        } catch (error) {
            console.error('[LearnHubSettings] Error resetting category:', error);
        }

        return false;
    }

    /**
     * Apply theme settings to CSS variables
     */
    function applyTheme() {
        const root = document.documentElement;

        // Apply cached appearance settings
        const themeSettings = {
            '--primary-color': cache['appearance.primary_color'],
            '--secondary-color': cache['appearance.secondary_color'],
            '--accent-color': cache['appearance.accent_color'],
            '--font-family': cache['appearance.font_family'],
            '--sidebar-color': cache['appearance.sidebar_color'],
            '--background-color': cache['appearance.background_color']
        };

        Object.entries(themeSettings).forEach(([property, value]) => {
            if (value) {
                if (property === '--font-family') {
                    root.style.setProperty(property, `'${value}', 'Prompt', 'Noto Sans Thai', sans-serif`);
                } else {
                    root.style.setProperty(property, value);
                }
            }
        });

        // Apply dark mode
        if (cache['appearance.dark_mode'] === 'true' || cache['appearance.dark_mode'] === true) {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }

        // Apply compact mode
        if (cache['appearance.compact_mode'] === 'true' || cache['appearance.compact_mode'] === true) {
            root.setAttribute('data-compact', 'true');
        } else {
            root.removeAttribute('data-compact');
        }

        emitEvent('themeApplied');
    }

    /**
     * Toggle dark mode
     * @returns {Promise<boolean>} New dark mode state
     */
    async function toggleDarkMode() {
        const isDark = cache['appearance.dark_mode'] === 'true' || cache['appearance.dark_mode'] === true;
        const newValue = !isDark;

        await set('appearance', 'dark_mode', newValue);
        return newValue;
    }

    /**
     * Toggle compact mode
     * @returns {Promise<boolean>} New compact mode state
     */
    async function toggleCompactMode() {
        const isCompact = cache['appearance.compact_mode'] === 'true' || cache['appearance.compact_mode'] === true;
        const newValue = !isCompact;

        await set('appearance', 'compact_mode', newValue);
        return newValue;
    }

    /**
     * Set language/locale
     * @param {string} locale - Locale code (e.g., 'th', 'en')
     */
    async function setLocale(locale) {
        await set('language', 'locale', locale);
        emitEvent('localeChanged', { locale });
    }

    /**
     * Get current locale
     * @returns {string} Current locale
     */
    function getLocale() {
        return cache['language.locale'] || 'th';
    }

    /**
     * Load settings from localStorage cache
     */
    function loadFromCache() {
        try {
            const stored = localStorage.getItem(config.cacheKey);
            if (stored) {
                const data = JSON.parse(stored);
                cache = data.settings || {};
                cacheTimestamp = data.timestamp || 0;
            }
        } catch (error) {
            console.warn('[LearnHubSettings] Error loading cache:', error);
            cache = {};
            cacheTimestamp = 0;
        }
    }

    /**
     * Save settings to localStorage cache
     */
    function saveToCache() {
        try {
            localStorage.setItem(config.cacheKey, JSON.stringify({
                settings: cache,
                timestamp: Date.now()
            }));
            cacheTimestamp = Date.now();
        } catch (error) {
            console.warn('[LearnHubSettings] Error saving cache:', error);
        }
    }

    /**
     * Check if cache is expired
     * @returns {boolean} Is expired
     */
    function isCacheExpired() {
        return Date.now() - cacheTimestamp > config.cacheDuration;
    }

    /**
     * Clear settings cache
     */
    function clearCache() {
        cache = {};
        cacheTimestamp = 0;
        localStorage.removeItem(config.cacheKey);
    }

    /**
     * Pre-load settings from server-rendered data
     * @param {Object} settings - Settings object
     */
    function preload(settings) {
        Object.entries(settings).forEach(([key, value]) => {
            cache[key] = value;
        });
        saveToCache();
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    function emitEvent(eventName, detail = {}) {
        const event = new CustomEvent('learnhub:settings:' + eventName, {
            detail: detail,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Public API
    return {
        init: init,
        get: get,
        set: set,
        getCategory: getCategory,
        batchUpdate: batchUpdate,
        reset: reset,
        applyTheme: applyTheme,
        toggleDarkMode: toggleDarkMode,
        toggleCompactMode: toggleCompactMode,
        setLocale: setLocale,
        getLocale: getLocale,
        clearCache: clearCache,
        preload: preload,
        get cache() { return { ...cache }; },
        get isInitialized() { return isInitialized; }
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LearnHubSettings;
}
