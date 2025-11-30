const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const validator = require('validator');
const logger = require('../utils/logger');
const cryptoUtils = require('../utils/cryptoUtils');

class SecurityMiddleware {
    constructor() {
        this.trustedProxies = ['127.0.0.1', 'localhost'];
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.loginAttempts = new Map(); // In production, use Redis
    }

    // Basic security headers
    basicSecurity() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ['\'self\''],
                    styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://use.fontawesome.com', 'https://fonts.googleapis.com'],
                    scriptSrc: ['\'self\'', '\'unsafe-inline\'', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://use.fontawesome.com'],
                    scriptSrcAttr: ['\'unsafe-inline\''],
                    imgSrc: ['\'self\'', 'data:', 'blob:', 'https:', 'https://img.youtube.com', 'https://i.ytimg.com'],
                    fontSrc: ['\'self\'', 'https://fonts.gstatic.com', 'https://use.fontawesome.com', 'https://cdnjs.cloudflare.com'],
                    connectSrc: ['\'self\''],
                    mediaSrc: ['\'self\''],
                    objectSrc: ['\'none\''],
                    frameSrc: ['\'self\'', 'https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://player.vimeo.com']
                }
            },
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        });
    }

    // CORS configuration
    corsPolicy() {
        return cors({
            origin: function (origin, callback) {
                // Allow same-origin requests (no origin header)
                if (!origin) {
                    callback(null, true);
                    return;
                }

                const allowedOrigins = [
                    'http://localhost:3000',
                    'http://localhost:3001',
                    'http://localhost:3002',
                    'http://localhost:8080',
                    process.env.FRONTEND_URL
                ].filter(Boolean);

                // Check if origin matches any allowed origins
                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    // For development, be more permissive with localhost
                    if (origin && origin.startsWith('http://localhost:')) {
                        callback(null, true);
                    } else {
                        // In development mode, allow all origins for testing
                        if (process.env.NODE_ENV !== 'production') {
                            callback(null, true);
                        } else {
                            logger.logSecurityEvent('cors_blocked', { origin: origin }, null);
                            callback(new Error('Not allowed by CORS'));
                        }
                    }
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
            maxAge: 86400 // 24 hours
        });
    }

    // Rate limiting
    generalRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10000, // limit each IP to 10000 requests per windowMs (increased for development)
            message: {
                success: false,
                message: 'Too many requests, please try again later.'
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.logSecurityEvent('rate_limit_exceeded', {
                    ip: req.ip,
                    endpoint: req.originalUrl
                }, req);

                res.status(429).json({
                    success: false,
                    message: 'Too many requests, please try again later.'
                });
            }
        });
    }

    // Strict rate limiting for auth endpoints
    authRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // limit each IP to 5 auth requests per windowMs
            message: {
                success: false,
                message: 'Too many authentication attempts, please try again later.'
            },
            skipSuccessfulRequests: true,
            handler: (req, res) => {
                logger.logSecurityEvent('auth_rate_limit_exceeded', {
                    ip: req.ip,
                    endpoint: req.originalUrl,
                    email: req.body.email
                }, req);

                res.status(429).json({
                    success: false,
                    message: 'Too many authentication attempts, please try again later.'
                });
            }
        });
    }

    // API rate limiting
    apiRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10000, // Higher limit for API endpoints
            message: {
                success: false,
                message: 'API rate limit exceeded.'
            }
        });
    }

    // Input validation and sanitization
    validateInput() {
        return (req, res, next) => {
            // Skip validation for routes that have their own validation or use parameterized queries
            const skipPaths = [
                '/settings',
                '/api/create',
                '/api/update'
            ];

            const fullPath = req.baseUrl + req.path;
            const shouldSkip = skipPaths.some(path => req.path.startsWith(path) || fullPath.includes(path));

            if (shouldSkip) {
                console.log(`✅ Security validation SKIPPED for path: ${req.path} (full: ${fullPath})`);
                return next();
            }

            // Sanitize all string inputs
            this.sanitizeObject(req.body);
            this.sanitizeObject(req.query);
            this.sanitizeObject(req.params);

            // Check for potential XSS attempts
            if (this.detectXSS(req.body) || this.detectXSS(req.query)) {
                logger.logSecurityEvent('xss_attempt', {
                    body: req.body,
                    query: req.query,
                    ip: req.ip
                }, req);

                return res.status(400).json({
                    success: false,
                    message: 'Invalid input detected.'
                });
            }

            // Check for SQL injection patterns
            if (this.detectSQLInjection(req.body) || this.detectSQLInjection(req.query)) {
                logger.logSecurityEvent('sql_injection_attempt', {
                    body: req.body,
                    query: req.query,
                    ip: req.ip
                }, req);

                return res.status(400).json({
                    success: false,
                    message: 'Invalid input detected.'
                });
            }

            next();
        };
    }

    // Anti-CSRF protection
    csrfProtection() {
        return (req, res, next) => {
            // Skip CSRF for API endpoints that use proper authentication
            if (req.path.startsWith('/api/') && req.headers.authorization) {
                return next();
            }

            // Check for CSRF token in session-based requests
            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
                const token = req.body._csrf || req.headers['x-csrf-token'];
                const sessionToken = req.session?.csrfToken;

                if (!token || !sessionToken || !cryptoUtils.secureCompare(token, sessionToken)) {
                    logger.logSecurityEvent('csrf_token_mismatch', {
                        provided_token: token ? 'present' : 'missing',
                        session_token: sessionToken ? 'present' : 'missing'
                    }, req);

                    return res.status(403).json({
                        success: false,
                        message: 'CSRF token mismatch.'
                    });
                }
            }

            next();
        };
    }

    // Login attempt tracking
    trackLoginAttempts() {
        return (req, res, next) => {
            const ip = req.ip;
            const email = req.body.email;
            const key = `${ip}_${email}`;

            const attempts = this.loginAttempts.get(key) || { count: 0, lockedUntil: null };

            // Check if account is locked
            if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
                const remainingTime = Math.ceil((attempts.lockedUntil - Date.now()) / 1000 / 60);

                logger.logSecurityEvent('login_attempt_while_locked', {
                    ip: ip,
                    email: email,
                    remaining_lockout_minutes: remainingTime
                }, req);

                return res.status(423).json({
                    success: false,
                    message: `Account locked. Try again in ${remainingTime} minutes.`
                });
            }

            // Reset if lockout period has passed
            if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
                this.loginAttempts.delete(key);
            }

            req.loginAttemptKey = key;
            next();
        };
    }

    // Handle failed login
    handleFailedLogin() {
        return (req, res, next) => {
            const key = req.loginAttemptKey;
            if (!key) {return next();}

            const attempts = this.loginAttempts.get(key) || { count: 0, lockedUntil: null };
            attempts.count += 1;

            if (attempts.count >= this.maxLoginAttempts) {
                attempts.lockedUntil = Date.now() + this.lockoutDuration;

                logger.logSecurityEvent('account_locked_due_to_failed_attempts', {
                    ip: req.ip,
                    email: req.body.email,
                    attempts: attempts.count
                }, req);
            }

            this.loginAttempts.set(key, attempts);
            next();
        };
    }

    // Handle successful login
    handleSuccessfulLogin() {
        return (req, res, next) => {
            const key = req.loginAttemptKey;
            if (key) {
                this.loginAttempts.delete(key);
            }
            next();
        };
    }

    // File upload security
    fileUploadSecurity() {
        return (req, res, next) => {
            if (req.file) {
                // Check file type
                const allowedMimeTypes = [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ];

                if (!allowedMimeTypes.includes(req.file.mimetype)) {
                    logger.logSecurityEvent('unauthorized_file_type_upload', {
                        filename: req.file.originalname,
                        mimetype: req.file.mimetype,
                        user_id: req.user?.user_id
                    }, req);

                    return res.status(400).json({
                        success: false,
                        message: 'File type not allowed.'
                    });
                }

                // Check file size (10MB limit)
                if (req.file.size > 10 * 1024 * 1024) {
                    logger.logSecurityEvent('oversized_file_upload', {
                        filename: req.file.originalname,
                        size: req.file.size,
                        user_id: req.user?.user_id
                    }, req);

                    return res.status(400).json({
                        success: false,
                        message: 'File size too large.'
                    });
                }

                // Scan filename for malicious patterns
                if (this.detectMaliciousFilename(req.file.originalname)) {
                    logger.logSecurityEvent('malicious_filename_detected', {
                        filename: req.file.originalname,
                        user_id: req.user?.user_id
                    }, req);

                    return res.status(400).json({
                        success: false,
                        message: 'Invalid filename.'
                    });
                }
            }

            next();
        };
    }

    // API key validation
    validateApiKey() {
        return (req, res, next) => {
            const apiKey = req.headers['x-api-key'];

            if (!apiKey) {
                return res.status(401).json({
                    success: false,
                    message: 'API key required.'
                });
            }

            // Validate API key format
            if (!apiKey.startsWith('ruxchai_') || apiKey.length < 32) {
                logger.logSecurityEvent('invalid_api_key_format', {
                    provided_key: apiKey.substring(0, 10) + '...'
                }, req);

                return res.status(401).json({
                    success: false,
                    message: 'Invalid API key format.'
                });
            }

            // In production, validate against database
            // For now, just check if it matches expected pattern
            next();
        };
    }

    // Request size limiting
    requestSizeLimit() {
        return (req, res, next) => {
            const contentLength = parseInt(req.headers['content-length'] || 0);
            const maxSize = 50 * 1024 * 1024; // 50MB

            if (contentLength > maxSize) {
                logger.logSecurityEvent('oversized_request', {
                    content_length: contentLength,
                    max_allowed: maxSize
                }, req);

                return res.status(413).json({
                    success: false,
                    message: 'Request too large.'
                });
            }

            next();
        };
    }

    // Path traversal protection
    pathTraversalProtection() {
        return (req, res, next) => {
            const decodedPath = decodeURIComponent(req.path);

            // Check for path traversal patterns
            const pathTraversalPatterns = [
                /\.\./g,           // ..
                /%2e%2e/gi,        // URL encoded ..
                /%252e%252e/gi,    // Double URL encoded ..
                /\.%2e/gi,         // Mixed encoding
                /%2e\./gi,         // Mixed encoding
                /etc\/passwd/gi,   // Common target
                /etc\/shadow/gi,   // Common target
                /windows\/system/gi // Windows target
            ];

            const hasPathTraversal = pathTraversalPatterns.some(pattern =>
                pattern.test(req.path) || pattern.test(decodedPath)
            );

            if (hasPathTraversal) {
                logger.logSecurityEvent('path_traversal_attempt', {
                    path: req.path,
                    decoded_path: decodedPath,
                    ip: req.ip
                }, req);

                return res.status(400).json({
                    success: false,
                    message: 'Invalid request path.'
                });
            }

            next();
        };
    }

    // Detect suspicious patterns
    detectXSS(obj) {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /onload\s*=/gi,
            /onerror\s*=/gi,
            /onclick\s*=/gi,
            /<iframe/gi,
            /<object/gi,
            /<embed/gi
        ];

        return this.checkPatterns(obj, xssPatterns);
    }

    detectSQLInjection(obj) {
        const sqlPatterns = [
            /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b|\bexec\b|\bexecute\b)/gi,
            /(\b(and|or)\b\s+\d+\s*=\s*\d+)/gi,
            /(['"])\s*;\s*(drop|delete|insert|update|create|alter)\b/gi,
            /\/\*.*\*\//gi,
            /--\s/gi,
            // MySQL comment detection: # followed by non-hex chars (exclude #abc123 color codes)
            /#(?![0-9a-fA-F]{3,8}\b)[^\n]*/gm
        ];

        return this.checkPatterns(obj, sqlPatterns);
    }

    detectMaliciousFilename(filename) {
        const maliciousPatterns = [
            /\.\./g, // Directory traversal
            /[<>:"|?*]/g, // Invalid filename characters
            /\.(exe|bat|cmd|com|scr|vbs|js|jar)$/gi, // Executable extensions
            /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/gi // Reserved names
        ];

        return maliciousPatterns.some(pattern => pattern.test(filename));
    }

    checkPatterns(obj, patterns) {
        if (typeof obj === 'string') {
            return patterns.some(pattern => pattern.test(obj));
        }

        if (typeof obj === 'object' && obj !== null) {
            return Object.values(obj).some(value => this.checkPatterns(value, patterns));
        }

        return false;
    }

    // Sanitize object recursively
    sanitizeObject(obj) {
        if (typeof obj === 'string') {
            return validator.escape(obj.trim());
        }

        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    obj[key] = this.sanitizeObject(obj[key]);
                }
            }
        }

        return obj;
    }

    // IP whitelist/blacklist
    ipFilter(whitelist = [], blacklist = []) {
        return (req, res, next) => {
            const clientIP = req.ip;

            // Check blacklist first
            if (blacklist.length > 0 && blacklist.includes(clientIP)) {
                logger.logSecurityEvent('blocked_ip_access_attempt', {
                    ip: clientIP,
                    endpoint: req.originalUrl
                }, req);

                return res.status(403).json({
                    success: false,
                    message: 'Access denied.'
                });
            }

            // Check whitelist if provided
            if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
                logger.logSecurityEvent('non_whitelisted_ip_access', {
                    ip: clientIP,
                    endpoint: req.originalUrl
                }, req);

                return res.status(403).json({
                    success: false,
                    message: 'Access denied.'
                });
            }

            next();
        };
    }

    // User agent validation
    validateUserAgent() {
        return (req, res, next) => {
            const userAgent = req.get('User-Agent');

            if (!userAgent) {
                logger.logSecurityEvent('missing_user_agent', {
                    ip: req.ip,
                    endpoint: req.originalUrl
                }, req);

                return res.status(400).json({
                    success: false,
                    message: 'User agent required.'
                });
            }

            // Check for suspicious user agents
            const suspiciousPatterns = [
                /bot/gi,
                /crawler/gi,
                /spider/gi,
                /scan/gi,
                /curl/gi,
                /wget/gi
            ];

            if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
                logger.logSecurityEvent('suspicious_user_agent', {
                    user_agent: userAgent,
                    ip: req.ip
                }, req);

                // Don't block, just log for now
            }

            next();
        };
    }

    // Session security
    secureSession() {
        return (req, res, next) => {
            if (req.session) {
                // Regenerate session ID periodically
                if (!req.session.lastRegeneration ||
                    Date.now() - req.session.lastRegeneration > 30 * 60 * 1000) { // 30 minutes
                    req.session.regenerate(() => {
                        req.session.lastRegeneration = Date.now();
                        next();
                    });
                } else {
                    next();
                }
            } else {
                next();
            }
        };
    }

    // Cleanup expired login attempts
    cleanupLoginAttempts() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, attempts] of this.loginAttempts.entries()) {
                if (attempts.lockedUntil && now >= attempts.lockedUntil) {
                    this.loginAttempts.delete(key);
                }
            }
        }, 5 * 60 * 1000); // Clean up every 5 minutes
    }
}

module.exports = new SecurityMiddleware();