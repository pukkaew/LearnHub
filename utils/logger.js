const winston = require('winston');
const path = require('path');
const fs = require('fs');

class Logger {
    constructor() {
        // Ensure logs directory exists
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        // Create winston logger
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'ruxchai-learning-hub' },
            transports: [
                // Error log file
                new winston.transports.File({
                    filename: path.join(logsDir, 'error.log'),
                    level: 'error',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    )
                }),

                // Combined log file
                new winston.transports.File({
                    filename: path.join(logsDir, 'combined.log'),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    )
                }),

                // Authentication log file
                new winston.transports.File({
                    filename: path.join(logsDir, 'auth.log'),
                    level: 'info',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    )
                }),

                // API access log file
                new winston.transports.File({
                    filename: path.join(logsDir, 'api.log'),
                    level: 'info',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    )
                })
            ]
        });

        // Add console transport for development
        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }));
        }

        // Create specific loggers for different components
        this.authLogger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({
                    filename: path.join(logsDir, 'auth.log'),
                    maxsize: 5242880,
                    maxFiles: 5
                })
            ]
        });

        this.apiLogger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({
                    filename: path.join(logsDir, 'api.log'),
                    maxsize: 5242880,
                    maxFiles: 5
                })
            ]
        });

        this.securityLogger = winston.createLogger({
            level: 'warn',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({
                    filename: path.join(logsDir, 'security.log'),
                    maxsize: 5242880,
                    maxFiles: 5
                })
            ]
        });
    }

    // General logging methods
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    error(message, meta = {}) {
        this.logger.error(message, meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    // Authentication logging
    logLogin(user, req, success = true) {
        const logData = {
            event: 'user_login',
            user_id: user.user_id,
            email: user.email,
            ip_address: this.getClientIP(req),
            user_agent: req.get('User-Agent'),
            success: success,
            timestamp: new Date().toISOString()
        };

        if (success) {
            this.authLogger.info('User login successful', logData);
        } else {
            this.authLogger.warn('User login failed', logData);
        }
    }

    logLogout(user, req) {
        const logData = {
            event: 'user_logout',
            user_id: user.user_id,
            email: user.email,
            ip_address: this.getClientIP(req),
            user_agent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        };

        this.authLogger.info('User logout', logData);
    }

    logPasswordReset(email, req, success = true) {
        const logData = {
            event: 'password_reset_request',
            email: email,
            ip_address: this.getClientIP(req),
            user_agent: req.get('User-Agent'),
            success: success,
            timestamp: new Date().toISOString()
        };

        this.authLogger.info('Password reset requested', logData);
    }

    logPasswordChange(user, req, success = true) {
        const logData = {
            event: 'password_change',
            user_id: user.user_id,
            email: user.email,
            ip_address: this.getClientIP(req),
            user_agent: req.get('User-Agent'),
            success: success,
            timestamp: new Date().toISOString()
        };

        this.authLogger.info('Password changed', logData);
    }

    // API logging
    logAPIRequest(req, res, responseTime) {
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status_code: res.statusCode,
            response_time: responseTime,
            ip_address: this.getClientIP(req),
            user_agent: req.get('User-Agent'),
            user_id: req.user ? req.user.user_id : null,
            timestamp: new Date().toISOString()
        };

        if (res.statusCode >= 400) {
            this.apiLogger.warn('API request error', logData);
        } else {
            this.apiLogger.info('API request', logData);
        }
    }

    // Security logging
    logSecurityEvent(event, details, req = null) {
        const logData = {
            event: event,
            details: details,
            ip_address: req ? this.getClientIP(req) : null,
            user_agent: req ? req.get('User-Agent') : null,
            user_id: req && req.user ? req.user.user_id : null,
            timestamp: new Date().toISOString()
        };

        this.securityLogger.warn('Security event', logData);
    }

    logSuspiciousActivity(activity, req, details = {}) {
        const logData = {
            event: 'suspicious_activity',
            activity: activity,
            details: details,
            ip_address: this.getClientIP(req),
            user_agent: req.get('User-Agent'),
            user_id: req.user ? req.user.user_id : null,
            timestamp: new Date().toISOString()
        };

        this.securityLogger.warn('Suspicious activity detected', logData);
    }

    logTestCheatingAttempt(user, test, activity, details = {}) {
        const logData = {
            event: 'test_cheating_attempt',
            user_id: user.user_id,
            test_id: test.test_id,
            activity: activity,
            details: details,
            timestamp: new Date().toISOString()
        };

        this.securityLogger.warn('Test cheating attempt', logData);
    }

    // Database logging
    logDatabaseError(operation, table, error, query = null) {
        const logData = {
            event: 'database_error',
            operation: operation,
            table: table,
            error: error.message,
            stack: error.stack,
            query: query,
            timestamp: new Date().toISOString()
        };

        this.logger.error('Database error', logData);
    }

    logDatabaseQuery(query, duration, success = true) {
        const logData = {
            event: 'database_query',
            query: query,
            duration: duration,
            success: success,
            timestamp: new Date().toISOString()
        };

        if (duration > 1000) { // Log slow queries (>1 second)
            this.logger.warn('Slow query detected', logData);
        } else {
            this.logger.debug('Database query', logData);
        }
    }

    // File upload logging
    logFileUpload(user, file, success = true, error = null) {
        const logData = {
            event: 'file_upload',
            user_id: user ? user.user_id : null,
            filename: file ? file.originalname : null,
            mimetype: file ? file.mimetype : null,
            size: file ? file.size : null,
            success: success,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        };

        if (success) {
            this.logger.info('File uploaded', logData);
        } else {
            this.logger.warn('File upload failed', logData);
        }
    }

    // Course activity logging
    logCourseEnrollment(user, course) {
        const logData = {
            event: 'course_enrollment',
            user_id: user.user_id,
            course_id: course.course_id,
            course_title: course.title,
            timestamp: new Date().toISOString()
        };

        this.logger.info('Course enrollment', logData);
    }

    logCourseCompletion(user, course, score = null) {
        const logData = {
            event: 'course_completion',
            user_id: user.user_id,
            course_id: course.course_id,
            course_title: course.title,
            score: score,
            timestamp: new Date().toISOString()
        };

        this.logger.info('Course completed', logData);
    }

    // Test activity logging
    logTestStart(user, test) {
        const logData = {
            event: 'test_start',
            user_id: user.user_id,
            test_id: test.test_id,
            test_title: test.title,
            timestamp: new Date().toISOString()
        };

        this.logger.info('Test started', logData);
    }

    logTestSubmission(user, test, score, passed) {
        const logData = {
            event: 'test_submission',
            user_id: user.user_id,
            test_id: test.test_id,
            test_title: test.title,
            score: score,
            passed: passed,
            timestamp: new Date().toISOString()
        };

        this.logger.info('Test submitted', logData);
    }

    // Error logging with context
    logError(error, context = {}) {
        const logData = {
            error: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString()
        };

        this.logger.error('Application error', logData);
    }

    // System logging
    logSystemEvent(event, details = {}) {
        const logData = {
            event: event,
            details: details,
            timestamp: new Date().toISOString()
        };

        this.logger.info('System event', logData);
    }

    logServerStart() {
        this.logger.info('Server started', {
            event: 'server_start',
            node_env: process.env.NODE_ENV,
            port: process.env.PORT,
            timestamp: new Date().toISOString()
        });
    }

    logServerShutdown() {
        this.logger.info('Server shutdown', {
            event: 'server_shutdown',
            timestamp: new Date().toISOString()
        });
    }

    // Express middleware for request logging
    requestLogger() {
        return (req, res, next) => {
            const start = Date.now();

            res.on('finish', () => {
                const responseTime = Date.now() - start;
                this.logAPIRequest(req, res, responseTime);
            });

            next();
        };
    }

    // Express middleware for error logging
    errorLogger() {
        return (error, req, res, next) => {
            this.logError(error, {
                method: req.method,
                url: req.originalUrl,
                ip_address: this.getClientIP(req),
                user_agent: req.get('User-Agent'),
                user_id: req.user ? req.user.user_id : null
            });

            next(error);
        };
    }

    // Helper methods
    getClientIP(req) {
        return req.ip ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'];
    }

    formatLogMessage(level, message, meta = {}) {
        return {
            level: level,
            message: message,
            ...meta,
            timestamp: new Date().toISOString()
        };
    }

    // Log analysis methods
    async getRecentErrors(hours = 24) {
        // This would typically query the log files or a log aggregation service
        // For now, we'll return a placeholder
        return {
            count: 0,
            errors: []
        };
    }

    async getLoginStats(days = 7) {
        // This would typically analyze auth logs
        // For now, we'll return a placeholder
        return {
            total_logins: 0,
            unique_users: 0,
            failed_attempts: 0
        };
    }

    // Cleanup old log files
    cleanupLogs(daysToKeep = 30) {
        const logsDir = path.join(__dirname, '../logs');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        fs.readdir(logsDir, (err, files) => {
            if (err) {
                this.logger.error('Error reading logs directory', { error: err.message });
                return;
            }

            files.forEach(file => {
                const filePath = path.join(logsDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;

                    if (stats.mtime < cutoffDate) {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                this.logger.error('Error deleting old log file', {
                                    file: file,
                                    error: err.message
                                });
                            } else {
                                this.logger.info('Old log file deleted', { file: file });
                            }
                        });
                    }
                });
            });
        });
    }
}

module.exports = new Logger();