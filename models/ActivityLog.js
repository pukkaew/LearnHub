const sql = require('mssql');
const { poolPromise } = require('../config/database');

class ActivityLog {
    static async create(logData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('user_id', sql.Int, logData.user_id)
                .input('action', sql.VarChar(100), logData.action)
                .input('table_name', sql.VarChar(100), logData.table_name)
                .input('record_id', sql.Int, logData.record_id)
                .input('old_values', sql.NText, logData.old_values ? JSON.stringify(logData.old_values) : null)
                .input('new_values', sql.NText, logData.new_values ? JSON.stringify(logData.new_values) : null)
                .input('ip_address', sql.VarChar(45), logData.ip_address)
                .input('user_agent', sql.NVarChar(500), logData.user_agent)
                .input('session_id', sql.VarChar(255), logData.session_id)
                .input('description', sql.NVarChar(500), logData.description)
                .input('severity', sql.VarChar(20), logData.severity || 'Info')
                .input('module', sql.VarChar(50), logData.module)
                .query(`
                    INSERT INTO audit_logs
                    (user_id, action, table_name, record_id, old_values, new_values,
                     ip_address, user_agent, session_id, description, severity, module)
                    OUTPUT INSERTED.*
                    VALUES
                    (@user_id, @action, @table_name, @record_id, @old_values, @new_values,
                     @ip_address, @user_agent, @session_id, @description, @severity, @module)
                `);

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error creating activity log:', error);
            return { success: false, message: 'Failed to create activity log' };
        }
    }

    static async findById(logId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('log_id', sql.Int, logId)
                .query(`
                    SELECT al.*,
                           u.first_name + ' ' + u.last_name as user_name,
                           u.employee_id
                    FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.user_id
                    WHERE al.log_id = @log_id
                `);

            const log = result.recordset[0];
            if (log) {
                log.old_values = log.old_values ? JSON.parse(log.old_values) : null;
                log.new_values = log.new_values ? JSON.parse(log.new_values) : null;
            }

            return log || null;
        } catch (error) {
            console.error('Error finding activity log:', error);
            return null;
        }
    }

    static async findByUser(userId, filters = {}) {
        try {
            const pool = await poolPromise;
            let query = `
                SELECT al.*,
                       u.first_name + ' ' + u.last_name as user_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.user_id
                WHERE al.user_id = @user_id
            `;

            const request = pool.request()
                .input('user_id', sql.Int, userId);

            if (filters.action) {
                query += ' AND al.action = @action';
                request.input('action', sql.VarChar(100), filters.action);
            }

            if (filters.table_name) {
                query += ' AND al.table_name = @table_name';
                request.input('table_name', sql.VarChar(100), filters.table_name);
            }

            if (filters.module) {
                query += ' AND al.module = @module';
                request.input('module', sql.VarChar(50), filters.module);
            }

            if (filters.severity) {
                query += ' AND al.severity = @severity';
                request.input('severity', sql.VarChar(20), filters.severity);
            }

            if (filters.date_from) {
                query += ' AND al.created_at >= @date_from';
                request.input('date_from', sql.DateTime2, filters.date_from);
            }

            if (filters.date_to) {
                query += ' AND al.created_at <= @date_to';
                request.input('date_to', sql.DateTime2, filters.date_to);
            }

            query += ' ORDER BY al.created_at DESC';

            if (filters.limit) {
                query += ` OFFSET ${filters.offset || 0} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
            }

            const result = await request.query(query);
            return result.recordset.map(log => {
                log.old_values = log.old_values ? JSON.parse(log.old_values) : null;
                log.new_values = log.new_values ? JSON.parse(log.new_values) : null;
                return log;
            });
        } catch (error) {
            console.error('Error finding activity logs by user:', error);
            return [];
        }
    }

    static async findAll(filters = {}) {
        try {
            const pool = await poolPromise;
            let query = `
                SELECT al.*,
                       u.first_name + ' ' + u.last_name as user_name,
                       u.employee_id
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.user_id
                WHERE 1=1
            `;

            const request = pool.request();

            if (filters.user_id) {
                query += ' AND al.user_id = @user_id';
                request.input('user_id', sql.Int, filters.user_id);
            }

            if (filters.action) {
                query += ' AND al.action = @action';
                request.input('action', sql.VarChar(100), filters.action);
            }

            if (filters.table_name) {
                query += ' AND al.table_name = @table_name';
                request.input('table_name', sql.VarChar(100), filters.table_name);
            }

            if (filters.module) {
                query += ' AND al.module = @module';
                request.input('module', sql.VarChar(50), filters.module);
            }

            if (filters.severity) {
                query += ' AND al.severity = @severity';
                request.input('severity', sql.VarChar(20), filters.severity);
            }

            if (filters.ip_address) {
                query += ' AND al.ip_address = @ip_address';
                request.input('ip_address', sql.VarChar(45), filters.ip_address);
            }

            if (filters.date_from) {
                query += ' AND al.created_at >= @date_from';
                request.input('date_from', sql.DateTime2, filters.date_from);
            }

            if (filters.date_to) {
                query += ' AND al.created_at <= @date_to';
                request.input('date_to', sql.DateTime2, filters.date_to);
            }

            if (filters.search) {
                query += ' AND (al.description LIKE @search OR u.first_name LIKE @search OR u.last_name LIKE @search OR u.employee_id LIKE @search)';
                request.input('search', sql.NVarChar(255), `%${filters.search}%`);
            }

            query += ' ORDER BY al.created_at DESC';

            if (filters.limit) {
                query += ` OFFSET ${filters.offset || 0} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
            }

            const result = await request.query(query);
            return result.recordset.map(log => {
                log.old_values = log.old_values ? JSON.parse(log.old_values) : null;
                log.new_values = log.new_values ? JSON.parse(log.new_values) : null;
                return log;
            });
        } catch (error) {
            console.error('Error finding all activity logs:', error);
            return [];
        }
    }

    static async logLogin(userId, ipAddress, userAgent, sessionId, success = true) {
        try {
            const logData = {
                user_id: userId,
                action: success ? 'Login' : 'Login_Failed',
                table_name: 'Users',
                record_id: userId,
                ip_address: ipAddress,
                user_agent: userAgent,
                session_id: sessionId,
                description: success ? 'User logged in successfully' : 'Failed login attempt',
                severity: success ? 'Info' : 'Warning',
                module: 'Authentication'
            };

            return await this.create(logData);
        } catch (error) {
            console.error('Error logging login activity:', error);
            return { success: false, message: 'Failed to log login activity' };
        }
    }

    static async logLogout(userId, ipAddress, userAgent, sessionId) {
        try {
            const logData = {
                user_id: userId,
                action: 'Logout',
                table_name: 'Users',
                record_id: userId,
                ip_address: ipAddress,
                user_agent: userAgent,
                session_id: sessionId,
                description: 'User logged out',
                severity: 'Info',
                module: 'Authentication'
            };

            return await this.create(logData);
        } catch (error) {
            console.error('Error logging logout activity:', error);
            return { success: false, message: 'Failed to log logout activity' };
        }
    }

    static async logDataChange(userId, action, tableName, recordId, oldValues, newValues, ipAddress, userAgent, sessionId, description) {
        try {
            const logData = {
                user_id: userId,
                action: action,
                table_name: tableName,
                record_id: recordId,
                old_values: oldValues,
                new_values: newValues,
                ip_address: ipAddress,
                user_agent: userAgent,
                session_id: sessionId,
                description: description,
                severity: 'Info',
                module: this.getModuleFromTable(tableName)
            };

            return await this.create(logData);
        } catch (error) {
            console.error('Error logging data change:', error);
            return { success: false, message: 'Failed to log data change' };
        }
    }

    static async logSecurityEvent(userId, action, description, severity, ipAddress, userAgent, sessionId) {
        try {
            const logData = {
                user_id: userId,
                action: action,
                table_name: 'security_events',
                ip_address: ipAddress,
                user_agent: userAgent,
                session_id: sessionId,
                description: description,
                severity: severity,
                module: 'Security'
            };

            return await this.create(logData);
        } catch (error) {
            console.error('Error logging security event:', error);
            return { success: false, message: 'Failed to log security event' };
        }
    }

    static async log(logData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('user_id', sql.Int, logData.user_id)
                .input('action', sql.VarChar(100), logData.action)
                .input('description', sql.NVarChar(500), logData.description)
                .input('ip_address', sql.VarChar(45), logData.ip_address || null)
                .query(`
                    INSERT INTO audit_logs
                    (user_id, action, description, ip_address, severity, module)
                    OUTPUT INSERTED.*
                    VALUES
                    (@user_id, @action, @description, @ip_address, 'Info', 'Organization')
                `);

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error creating activity log:', error);
            return { success: false, message: 'Failed to create activity log' };
        }
    }

    static async getActivitySummary(userId, days = 30) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('user_id', sql.Int, userId)
                .input('days', sql.Int, days)
                .query(`
                    SELECT
                        COUNT(*) as total_activities,
                        COUNT(CASE WHEN action LIKE '%Login%' THEN 1 END) as login_count,
                        COUNT(CASE WHEN action = 'Create' THEN 1 END) as create_count,
                        COUNT(CASE WHEN action = 'Update' THEN 1 END) as update_count,
                        COUNT(CASE WHEN action = 'Delete' THEN 1 END) as delete_count,
                        COUNT(CASE WHEN severity = 'Warning' THEN 1 END) as warning_count,
                        COUNT(CASE WHEN severity = 'Error' THEN 1 END) as error_count,
                        COUNT(DISTINCT module) as modules_used,
                        MIN(created_at) as first_activity,
                        MAX(created_at) as last_activity
                    FROM audit_logs
                    WHERE user_id = @user_id
                    AND created_at >= DATEADD(day, -@days, GETDATE())
                `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting activity summary:', error);
            return null;
        }
    }

    static async getSystemActivitySummary(days = 7) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('days', sql.Int, days)
                .query(`
                    SELECT
                        COUNT(*) as total_activities,
                        COUNT(DISTINCT user_id) as active_users,
                        COUNT(CASE WHEN action LIKE '%Login%' THEN 1 END) as total_logins,
                        COUNT(CASE WHEN severity = 'Warning' THEN 1 END) as warning_count,
                        COUNT(CASE WHEN severity = 'Error' THEN 1 END) as error_count,
                        module,
                        COUNT(*) as module_activities
                    FROM audit_logs
                    WHERE created_at >= DATEADD(day, -@days, GETDATE())
                    GROUP BY module
                    ORDER BY module_activities DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting system activity summary:', error);
            return [];
        }
    }

    static async cleanupOldLogs(daysOld = 365) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('days_old', sql.Int, daysOld)
                .query(`
                    DELETE FROM audit_logs
                    WHERE created_at < DATEADD(day, -@days_old, GETDATE())
                    AND severity NOT IN ('Error', 'Critical')
                `);

            return { success: true, deleted_count: result.rowsAffected[0] };
        } catch (error) {
            console.error('Error cleaning up old logs:', error);
            return { success: false, message: 'Failed to cleanup old logs' };
        }
    }

    static async getLoginHistory(userId, limit = 50) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('user_id', sql.Int, userId)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit)
                        created_at,
                        action,
                        ip_address,
                        user_agent,
                        description
                    FROM audit_logs
                    WHERE user_id = @user_id
                    AND action IN ('Login', 'Login_Failed', 'Logout')
                    ORDER BY created_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting login history:', error);
            return [];
        }
    }

    static getModuleFromTable(tableName) {
        const moduleMap = {
            'Users': 'User Management',
            'Courses': 'Course Management',
            'user_courses': 'Course Management',
            'Tests': 'Assessment',
            'TestAttempts': 'Assessment',
            'Questions': 'Assessment',
            'Articles': 'Knowledge Sharing',
            'Comments': 'Knowledge Sharing',
            'Applicants': 'HR Testing',
            'JobPositions': 'HR Management',
            'Departments': 'Organization',
            'Badges': 'Gamification',
            'UserBadges': 'Gamification',
            'Notifications': 'System'
        };

        return moduleMap[tableName] || 'Unknown';
    }

    static async getAuditTrail(tableName, recordId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('table_name', sql.VarChar(100), tableName)
                .input('record_id', sql.Int, recordId)
                .query(`
                    SELECT al.*,
                           u.first_name + ' ' + u.last_name as user_name,
                           u.employee_id
                    FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.user_id
                    WHERE al.table_name = @table_name AND al.record_id = @record_id
                    ORDER BY al.created_at ASC
                `);

            return result.recordset.map(log => {
                log.old_values = log.old_values ? JSON.parse(log.old_values) : null;
                log.new_values = log.new_values ? JSON.parse(log.new_values) : null;
                return log;
            });
        } catch (error) {
            console.error('Error getting audit trail:', error);
            return [];
        }
    }
}

module.exports = ActivityLog;