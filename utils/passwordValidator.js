const Setting = require('../models/Setting');

class PasswordValidator {
    constructor() {
        this.settings = null;
        this.lastFetched = null;
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    async getSettings() {
        const now = Date.now();

        // Return cached settings if still valid
        if (this.settings && this.lastFetched && (now - this.lastFetched < this.cacheDuration)) {
            return this.settings;
        }

        try {
            // Fetch all system settings
            const allSettings = await Setting.getAllSystemSettings();

            // Extract security settings
            const securitySettings = allSettings.SECURITY || [];

            this.settings = {
                minLength: this.getSettingValue(securitySettings, 'password_min_length', 8),
                requireUppercase: this.getSettingValue(securitySettings, 'password_require_uppercase', true),
                requireLowercase: this.getSettingValue(securitySettings, 'password_require_lowercase', true),
                requireNumber: this.getSettingValue(securitySettings, 'password_require_number', true),
                requireSpecial: this.getSettingValue(securitySettings, 'password_require_special', false),
                maxLoginAttempts: this.getSettingValue(securitySettings, 'max_login_attempts', 5),
                lockoutDuration: this.getSettingValue(securitySettings, 'lockout_duration', 15),
                sessionTimeout: this.getSettingValue(securitySettings, 'session_timeout', 1440),
                forcePasswordChangeDays: this.getSettingValue(securitySettings, 'force_password_change_days', 90)
            };

            this.lastFetched = now;
            return this.settings;

        } catch (error) {
            console.error('Failed to fetch password settings:', error);

            // Return defaults if fetch fails
            return {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumber: true,
                requireSpecial: false,
                maxLoginAttempts: 5,
                lockoutDuration: 15,
                sessionTimeout: 1440,
                forcePasswordChangeDays: 90
            };
        }
    }

    getSettingValue(settings, key, defaultValue) {
        const setting = settings.find(s => s.setting_key === key);
        if (!setting) return defaultValue;

        const value = setting.setting_value !== null && setting.setting_value !== ''
            ? setting.setting_value
            : setting.default_value;

        // Parse boolean and number values
        if (typeof defaultValue === 'boolean') {
            return value === 'true' || value === true;
        }
        if (typeof defaultValue === 'number') {
            return parseInt(value, 10);
        }

        return value;
    }

    async validate(password) {
        const settings = await this.getSettings();
        const errors = [];

        // Check minimum length
        if (password.length < settings.minLength) {
            errors.push(`รหัสผ่านต้องมีอย่างน้อย ${settings.minLength} ตัวอักษร`);
        }

        // Check uppercase requirement
        if (settings.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว');
        }

        // Check lowercase requirement
        if (settings.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว');
        }

        // Check number requirement
        if (settings.requireNumber && !/[0-9]/.test(password)) {
            errors.push('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
        }

        // Check special character requirement
        if (settings.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว (!@#$%^&* ฯลฯ)');
        }

        return {
            valid: errors.length === 0,
            errors,
            settings
        };
    }

    async getRequirements() {
        const settings = await this.getSettings();

        const requirements = [
            `อย่างน้อย ${settings.minLength} ตัวอักษร`
        ];

        if (settings.requireUppercase) {
            requirements.push('มีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว (A-Z)');
        }

        if (settings.requireLowercase) {
            requirements.push('มีตัวพิมพ์เล็กอย่างน้อย 1 ตัว (a-z)');
        }

        if (settings.requireNumber) {
            requirements.push('มีตัวเลขอย่างน้อย 1 ตัว (0-9)');
        }

        if (settings.requireSpecial) {
            requirements.push('มีอักขระพิเศษอย่างน้อย 1 ตัว (!@#$%^&* ฯลฯ)');
        }

        return requirements;
    }

    // Clear cache (useful for testing or after settings update)
    clearCache() {
        this.settings = null;
        this.lastFetched = null;
    }
}

// Export singleton instance
const passwordValidator = new PasswordValidator();

module.exports = passwordValidator;
