const Setting = require('../models/Setting');

class SessionConfigService {
    constructor() {
        this.settings = null;
        this.lastSettingsFetch = null;
        this.settingsCacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    async getSessionSettings() {
        const now = Date.now();

        // Return cached settings if still valid
        if (this.settings && this.lastSettingsFetch && (now - this.lastSettingsFetch < this.settingsCacheDuration)) {
            return this.settings;
        }

        try {
            const allSettings = await Setting.getAllSystemSettings();
            const securitySettings = allSettings.SECURITY || [];

            // Get session_timeout setting (in minutes)
            const sessionTimeoutMinutes = parseInt(this.getSettingValue(securitySettings, 'session_timeout', '1440'));

            this.settings = {
                sessionTimeout: sessionTimeoutMinutes,
                sessionTimeoutMs: sessionTimeoutMinutes * 60 * 1000 // Convert to milliseconds
            };

            this.lastSettingsFetch = now;
            return this.settings;

        } catch (error) {
            console.error('Failed to fetch session settings:', error);
            // Fallback to 24 hours (1440 minutes)
            return {
                sessionTimeout: 1440,
                sessionTimeoutMs: 24 * 60 * 60 * 1000
            };
        }
    }

    getSettingValue(settings, key, defaultValue) {
        const setting = settings.find(s => s.setting_key === key);
        if (!setting) return defaultValue;

        const value = setting.setting_value !== null && setting.setting_value !== ''
            ? setting.setting_value
            : setting.default_value;

        return value || defaultValue;
    }

    // Clear cache (useful for testing or after settings update)
    clearCache() {
        this.settings = null;
        this.lastSettingsFetch = null;
        console.log('🔄 Session settings cache cleared');
    }

    // Middleware to check session timeout
    async checkSessionTimeout() {
        return async (req, res, next) => {
            // Skip for public routes
            if (!req.session || !req.session.user) {
                return next();
            }

            try {
                const settings = await this.getSessionSettings();

                // Initialize session timestamp if not exists
                if (!req.session.lastActivity) {
                    req.session.lastActivity = Date.now();
                    return next();
                }

                const now = Date.now();
                const timeSinceLastActivity = now - req.session.lastActivity;

                // Check if session has timed out
                if (timeSinceLastActivity > settings.sessionTimeoutMs) {
                    // Session timed out
                    const userId = req.session.user.user_id;

                    // Log timeout
                    const ActivityLog = require('../models/ActivityLog');
                    await ActivityLog.create({
                        user_id: userId,
                        action: 'Session_Timeout',
                        table_name: 'users',
                        record_id: userId,
                        ip_address: req.ip,
                        user_agent: req.get('User-Agent'),
                        session_id: req.sessionID,
                        description: `Session timed out after ${Math.round(timeSinceLastActivity / 60000)} minutes of inactivity`,
                        severity: 'Info',
                        module: 'Authentication'
                    });

                    // Destroy session
                    req.session.destroy((err) => {
                        if (err) {
                            console.error('Session destroy error:', err);
                        }
                    });

                    // Clear cookies
                    res.clearCookie('accessToken', { path: '/' });
                    res.clearCookie('refreshToken', { path: '/' });
                    res.clearCookie('connect.sid', { path: '/' });

                    // Return timeout response
                    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                        return res.status(401).json({
                            success: false,
                            message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
                            timeout: true
                        });
                    } else {
                        req.flash('error_msg', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
                        return res.redirect('/auth/login');
                    }
                }

                // Update last activity timestamp
                req.session.lastActivity = now;
                next();

            } catch (error) {
                console.error('Session timeout check error:', error);
                // On error, just proceed without timeout check
                next();
            }
        };
    }
}

// Export singleton instance
const sessionConfigService = new SessionConfigService();

module.exports = sessionConfigService;
