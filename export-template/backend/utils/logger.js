/**
 * Simple Logger Utility
 * Can be replaced with winston, pino, or other logging libraries
 */

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

/**
 * Format log message
 */
function formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
}

/**
 * Logger object
 */
const logger = {
    error: function(message, data) {
        if (currentLevel >= LOG_LEVELS.error) {
            console.error(formatMessage('error', message, data));
        }
    },

    warn: function(message, data) {
        if (currentLevel >= LOG_LEVELS.warn) {
            console.warn(formatMessage('warn', message, data));
        }
    },

    info: function(message, data) {
        if (currentLevel >= LOG_LEVELS.info) {
            console.log(formatMessage('info', message, data));
        }
    },

    debug: function(message, data) {
        if (currentLevel >= LOG_LEVELS.debug) {
            console.log(formatMessage('debug', message, data));
        }
    },

    /**
     * Log HTTP request
     */
    request: function(req) {
        this.info(`${req.method} ${req.originalUrl}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    },

    /**
     * Log error with stack trace
     */
    errorWithStack: function(message, error) {
        this.error(message, {
            message: error.message,
            stack: error.stack
        });
    }
};

module.exports = logger;
