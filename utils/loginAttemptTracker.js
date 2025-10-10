const { poolPromise } = require('../config/database');
const Setting = require('../models/Setting');

class LoginAttemptTracker {
    constructor() {
        this.settings = null;
        this.lastFetched = null;
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        this.initTable();
    }

    async initTable() {
        try {
            const pool = await poolPromise;

            // Create login_attempts table if not exists
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'login_attempts')
                BEGIN
                    CREATE TABLE login_attempts (
                        attempt_id INT IDENTITY(1,1) PRIMARY KEY,
                        user_id INT NULL,
                        employee_id NVARCHAR(50),
                        ip_address NVARCHAR(45),
                        user_agent NVARCHAR(500),
                        attempt_time DATETIME DEFAULT GETDATE(),
                        success BIT DEFAULT 0,
                        failure_reason NVARCHAR(200),
                        INDEX idx_employee_id (employee_id),
                        INDEX idx_ip_address (ip_address),
                        INDEX idx_attempt_time (attempt_time)
                    );

                    CREATE TABLE account_locks (
                        lock_id INT IDENTITY(1,1) PRIMARY KEY,
                        user_id INT,
                        employee_id NVARCHAR(50),
                        locked_at DATETIME DEFAULT GETDATE(),
                        locked_until DATETIME,
                        reason NVARCHAR(200),
                        unlocked_at DATETIME NULL,
                        unlocked_by INT NULL,
                        INDEX idx_employee_id (employee_id),
                        INDEX idx_locked_until (locked_until)
                    );
                END
            `);

            console.log('✅ Login attempt tables initialized');

        } catch (error) {
            console.error('Failed to initialize login attempt tables:', error);
        }
    }

    async getSettings() {
        const now = Date.now();

        if (this.settings && this.lastFetched && (now - this.lastFetched < this.cacheDuration)) {
            return this.settings;
        }

        try {
            const allSettings = await Setting.getAllSystemSettings();
            const securitySettings = allSettings.SECURITY || [];

            this.settings = {
                maxLoginAttempts: this.getSettingValue(securitySettings, 'max_login_attempts', 5),
                lockoutDuration: this.getSettingValue(securitySettings, 'lockout_duration', 15)
            };

            this.lastFetched = now;
            return this.settings;

        } catch (error) {
            console.error('Failed to fetch security settings:', error);
            return {
                maxLoginAttempts: 5,
                lockoutDuration: 15
            };
        }
    }

    getSettingValue(settings, key, defaultValue) {
        const setting = settings.find(s => s.setting_key === key);
        if (!setting) return defaultValue;

        const value = setting.setting_value !== null && setting.setting_value !== ''
            ? setting.setting_value
            : setting.default_value;

        if (typeof defaultValue === 'number') {
            return parseInt(value, 10);
        }

        return value;
    }

    async recordAttempt(employeeId, userId, ipAddress, userAgent, success, failureReason = null) {
        try {
            const pool = await poolPromise;

            await pool.request()
                .input('userId', userId)
                .input('employeeId', employeeId)
                .input('ipAddress', ipAddress)
                .input('userAgent', userAgent)
                .input('success', success)
                .input('failureReason', failureReason)
                .query(`
                    INSERT INTO login_attempts (user_id, employee_id, ip_address, user_agent, success, failure_reason)
                    VALUES (@userId, @employeeId, @ipAddress, @userAgent, @success, @failureReason)
                `);

        } catch (error) {
            console.error('Failed to record login attempt:', error);
        }
    }

    async getRecentFailedAttempts(employeeId, minutes = 30) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('employeeId', employeeId)
                .input('minutes', minutes)
                .query(`
                    SELECT COUNT(*) as count
                    FROM login_attempts
                    WHERE employee_id = @employeeId
                    AND success = 0
                    AND attempt_time >= DATEADD(MINUTE, -@minutes, GETDATE())
                `);

            return result.recordset[0]?.count || 0;

        } catch (error) {
            console.error('Failed to get failed attempts:', error);
            return 0;
        }
    }

    async isAccountLocked(employeeId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('employeeId', employeeId)
                .query(`
                    SELECT TOP 1 *
                    FROM account_locks
                    WHERE employee_id = @employeeId
                    AND locked_until > GETDATE()
                    AND unlocked_at IS NULL
                    ORDER BY locked_at DESC
                `);

            if (result.recordset.length > 0) {
                const lock = result.recordset[0];
                return {
                    locked: true,
                    lockedUntil: lock.locked_until,
                    reason: lock.reason,
                    minutesRemaining: Math.ceil((new Date(lock.locked_until) - new Date()) / 60000)
                };
            }

            return { locked: false };

        } catch (error) {
            console.error('Failed to check account lock:', error);
            return { locked: false };
        }
    }

    async lockAccount(employeeId, userId, reason = 'Too many failed login attempts') {
        try {
            const settings = await this.getSettings();
            const pool = await poolPromise;

            const lockedUntil = new Date();
            lockedUntil.setMinutes(lockedUntil.getMinutes() + settings.lockoutDuration);

            await pool.request()
                .input('userId', userId)
                .input('employeeId', employeeId)
                .input('lockedUntil', lockedUntil)
                .input('reason', reason)
                .query(`
                    INSERT INTO account_locks (user_id, employee_id, locked_until, reason)
                    VALUES (@userId, @employeeId, @lockedUntil, @reason)
                `);

            console.log(`🔒 Account locked: ${employeeId} until ${lockedUntil.toISOString()}`);

            return {
                success: true,
                lockedUntil,
                duration: settings.lockoutDuration
            };

        } catch (error) {
            console.error('Failed to lock account:', error);
            return { success: false };
        }
    }

    async unlockAccount(employeeId, unlockedBy = null) {
        try {
            const pool = await poolPromise;

            await pool.request()
                .input('employeeId', employeeId)
                .input('unlockedBy', unlockedBy)
                .query(`
                    UPDATE account_locks
                    SET unlocked_at = GETDATE(),
                        unlocked_by = @unlockedBy
                    WHERE employee_id = @employeeId
                    AND unlocked_at IS NULL
                `);

            console.log(`🔓 Account unlocked: ${employeeId}`);

            return { success: true };

        } catch (error) {
            console.error('Failed to unlock account:', error);
            return { success: false };
        }
    }

    async clearFailedAttempts(employeeId) {
        try {
            const pool = await poolPromise;

            await pool.request()
                .input('employeeId', employeeId)
                .query(`
                    DELETE FROM login_attempts
                    WHERE employee_id = @employeeId
                    AND success = 0
                `);

            return { success: true };

        } catch (error) {
            console.error('Failed to clear failed attempts:', error);
            return { success: false };
        }
    }

    async checkAndLockIfNeeded(employeeId, userId = null) {
        const settings = await this.getSettings();

        // Check current failed attempts
        const failedAttempts = await this.getRecentFailedAttempts(employeeId, settings.lockoutDuration);

        if (failedAttempts >= settings.maxLoginAttempts) {
            // Lock the account
            await this.lockAccount(employeeId, userId, `เกินจำนวนครั้งที่กำหนด (${settings.maxLoginAttempts} ครั้ง)`);

            return {
                shouldLock: true,
                failedAttempts,
                maxAttempts: settings.maxLoginAttempts,
                lockDuration: settings.lockoutDuration
            };
        }

        return {
            shouldLock: false,
            failedAttempts,
            remainingAttempts: settings.maxLoginAttempts - failedAttempts
        };
    }

    // Clean up old attempts (run periodically)
    async cleanupOldAttempts(daysOld = 30) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('daysOld', daysOld)
                .query(`
                    DELETE FROM login_attempts
                    WHERE attempt_time < DATEADD(DAY, -@daysOld, GETDATE())
                `);

            console.log(`🧹 Cleaned up ${result.rowsAffected[0]} old login attempts`);

            return { success: true, deletedCount: result.rowsAffected[0] };

        } catch (error) {
            console.error('Failed to cleanup old attempts:', error);
            return { success: false };
        }
    }

    clearCache() {
        this.settings = null;
        this.lastFetched = null;
    }
}

// Export singleton instance
const loginAttemptTracker = new LoginAttemptTracker();

module.exports = loginAttemptTracker;
