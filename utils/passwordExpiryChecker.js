const Setting = require('../models/Setting');
const User = require('../models/User');

class PasswordExpiryChecker {
    constructor() {
        this.settings = null;
        this.lastSettingsFetch = null;
        this.settingsCacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    async getPasswordSettings() {
        const now = Date.now();

        // Return cached settings if still valid
        if (this.settings && this.lastSettingsFetch && (now - this.lastSettingsFetch < this.settingsCacheDuration)) {
            return this.settings;
        }

        try {
            const allSettings = await Setting.getAllSystemSettings();
            const securitySettings = allSettings.SECURITY || [];

            // Get force_password_change_days setting
            const forcePasswordChangeDays = parseInt(this.getSettingValue(securitySettings, 'force_password_change_days', '90'));

            this.settings = {
                forcePasswordChangeDays,
                enabled: forcePasswordChangeDays > 0 // 0 means disabled
            };

            this.lastSettingsFetch = now;
            return this.settings;

        } catch (error) {
            console.error('Failed to fetch password expiry settings:', error);
            // Fallback to 90 days
            return {
                forcePasswordChangeDays: 90,
                enabled: true
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

    // Check if password has expired
    async isPasswordExpired(userId) {
        try {
            const settings = await this.getPasswordSettings();

            // If feature is disabled, password never expires
            if (!settings.enabled) {
                return {
                    expired: false,
                    daysOld: 0,
                    maxDays: settings.forcePasswordChangeDays
                };
            }

            const user = await User.findById(userId);
            if (!user) {
                return { expired: false, daysOld: 0, maxDays: settings.forcePasswordChangeDays };
            }

            // If password_changed_at is null, consider it as created_at
            const passwordChangedAt = user.password_changed_at || user.created_at;

            if (!passwordChangedAt) {
                // No date available, assume not expired
                return { expired: false, daysOld: 0, maxDays: settings.forcePasswordChangeDays };
            }

            // Calculate days since password was last changed
            const now = new Date();
            const passwordDate = new Date(passwordChangedAt);
            const daysSinceChange = Math.floor((now - passwordDate) / (1000 * 60 * 60 * 24));

            const expired = daysSinceChange >= settings.forcePasswordChangeDays;

            return {
                expired,
                daysOld: daysSinceChange,
                maxDays: settings.forcePasswordChangeDays,
                daysRemaining: Math.max(0, settings.forcePasswordChangeDays - daysSinceChange)
            };

        } catch (error) {
            console.error('Error checking password expiry:', error);
            return { expired: false, daysOld: 0, maxDays: 90 };
        }
    }

    // Middleware to check password expiry on login
    checkPasswordExpiryMiddleware() {
        return async (req, res, next) => {
            // Skip for public routes and password change routes
            if (!req.session || !req.session.user) {
                return next();
            }

            // Skip check for password change routes to avoid infinite loop
            if (req.path.includes('/change-password') || req.path.includes('/force-change-password')) {
                return next();
            }

            // Skip for API routes and static files
            if (req.path.startsWith('/api/') ||
                req.path.startsWith('/css/') ||
                req.path.startsWith('/js/') ||
                req.path.startsWith('/images/')) {
                return next();
            }

            try {
                const userId = req.session.user.user_id;
                const expiryStatus = await this.isPasswordExpired(userId);

                if (expiryStatus.expired) {
                    // Password has expired - redirect to force change password page
                    const ActivityLog = require('../models/ActivityLog');
                    await ActivityLog.create({
                        user_id: userId,
                        action: 'Password_Expired_Warning',
                        table_name: 'users',
                        record_id: userId,
                        ip_address: req.ip,
                        user_agent: req.get('User-Agent'),
                        session_id: req.sessionID,
                        description: `Password expired after ${expiryStatus.daysOld} days (max: ${expiryStatus.maxDays} days)`,
                        severity: 'Warning',
                        module: 'Authentication'
                    });

                    // Store expiry info in session for the change password page
                    req.session.passwordExpired = true;
                    req.session.passwordExpiryInfo = expiryStatus;

                    // Redirect to force change password
                    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                        return res.status(403).json({
                            success: false,
                            message: `รหัสผ่านของคุณหมดอายุแล้ว (ใช้มา ${expiryStatus.daysOld} วัน) กรุณาเปลี่ยนรหัสผ่านใหม่`,
                            passwordExpired: true,
                            expiryInfo: expiryStatus
                        });
                    } else {
                        req.flash('error_msg', `รหัสผ่านของคุณหมดอายุแล้ว (ใช้มา ${expiryStatus.daysOld} วัน) กรุณาเปลี่ยนรหัสผ่านใหม่`);
                        return res.redirect('/auth/force-change-password');
                    }
                }

                // Check if password is expiring soon (within 7 days)
                if (expiryStatus.daysRemaining <= 7 && expiryStatus.daysRemaining > 0) {
                    req.flash('warning_msg', `รหัสผ่านของคุณจะหมดอายุใน ${expiryStatus.daysRemaining} วัน กรุณาเปลี่ยนรหัสผ่านโดยเร็ว`);
                }

                next();

            } catch (error) {
                console.error('Password expiry check error:', error);
                // On error, just proceed without check
                next();
            }
        };
    }

    // Clear cache (useful for testing or after settings update)
    clearCache() {
        this.settings = null;
        this.lastSettingsFetch = null;
        console.log('🔄 Password expiry settings cache cleared');
    }
}

// Export singleton instance
const passwordExpiryChecker = new PasswordExpiryChecker();

module.exports = passwordExpiryChecker;
