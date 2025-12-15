const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const JWTUtils = require('../utils/jwtUtils');

const authMiddleware = {
    // Require authentication for routes
    requireAuth: async (req, res, next) => {
        // Check session first
        if (req.session && req.session.user) {
            req.user = req.session.user;
            return next();
        }

        // Check JWT token for API requests
        const authHeader = req.get('Authorization');
        if (authHeader) {
            try {
                const token = JWTUtils.extractTokenFromHeader(authHeader);
                if (token) {
                    const decoded = JWTUtils.verifyAccessToken(token);
                    req.user = decoded;
                    req.session = req.session || {};
                    req.session.user = decoded;
                    return next();
                }
            } catch (error) {
                // Token invalid, continue to error response
            }
        }

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
            });
        }

        // Only use flash if session exists
        if (req.session && req.flash) {
            req.flash('error_msg', 'กรุณาเข้าสู่ระบบก่อนใช้งาน');
        }
        res.redirect('/login');
    },

    // Check if user is already authenticated
    requireGuest: (req, res, next) => {
        if (req.session && req.session.user) {
            return res.redirect('/dashboard');
        }
        next();
    },

    // Require specific role
    requireRole: (roles) => {
        return async (req, res, next) => {
            try {
                if (!req.session || !req.session.user) {
                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                        return res.status(401).json({
                            success: false,
                            message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
                        });
                    }
                    req.flash('error_msg', 'กรุณาเข้าสู่ระบบก่อนใช้งาน');
                    return res.redirect('/login');
                }

                // Get fresh user data with role
                const user = await User.findById(req.session.user.user_id);
                if (!user) {
                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                        return res.status(401).json({
                            success: false,
                            message: 'ไม่พบข้อมูลผู้ใช้'
                        });
                    }
                    req.flash('error_msg', 'ไม่พบข้อมูลผู้ใช้');
                    return res.redirect('/login');
                }

                // Check if user role matches required roles
                const allowedRoles = Array.isArray(roles) ? roles : [roles];
                if (!allowedRoles.includes(user.role_name)) {
                    await ActivityLog.logUnauthorizedAccess(
                        user.user_id,
                        req.originalUrl,
                        req.ip,
                        req.get('User-Agent')
                    );

                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                        return res.status(403).json({
                            success: false,
                            message: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้'
                        });
                    }
                    req.flash('error_msg', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
                    return res.redirect('/dashboard');
                }

                // Update user session with fresh data
                req.session.user = user;
                req.user = user;
                next();
            } catch (error) {
                console.error('Role check error:', error);
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(500).json({
                        success: false,
                        message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
                    });
                }
                req.flash('error_msg', 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
                res.redirect('/dashboard');
            }
        };
    },

    // Admin only access
    requireAdmin: function() {
        return this.requireRole(['Admin']);
    },

    // HR access
    requireHR: function() {
        return this.requireRole(['Admin', 'HR']);
    },

    // Manager access
    requireManager: function() {
        return this.requireRole(['Admin', 'HR', 'Manager']);
    },

    // Instructor access
    requireInstructor: function() {
        return this.requireRole(['Admin', 'HR', 'Manager', 'Instructor']);
    },

    // Set user data in request
    setUserData: async (req, res, next) => {
        if (req.session && req.session.user) {
            try {
                const user = await User.findById(req.session.user.user_id);
                if (user && user.is_active) {
                    req.session.user = user;
                    req.user = user;
                    res.locals.user = user;
                    res.locals.isAuthenticated = true;
                } else {
                    // User no longer exists or is inactive
                    if (req.session && typeof req.session.destroy === 'function') {
                        req.session.destroy(() => {});
                    }
                    res.locals.user = null;
                    res.locals.isAuthenticated = false;
                }
            } catch (error) {
                console.error('User data fetch error:', error);
                req.session.destroy();
                res.locals.user = null;
                res.locals.isAuthenticated = false;
            }
        } else {
            res.locals.user = null;
            res.locals.isAuthenticated = false;
        }
        next();
    },

    // Check if user can access specific resource
    canAccessResource: (resourceType) => {
        return async (req, res, next) => {
            try {
                if (!req.session || !req.session.user) {
                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                        return res.status(401).json({
                            success: false,
                            message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
                        });
                    }
                    req.flash('error_msg', 'กรุณาเข้าสู่ระบบก่อนใช้งาน');
                    return res.redirect('/login');
                }

                const user = req.session.user;
                const resourceId = req.params.id;

                // Admin can access everything
                if (user.role_name === 'Admin') {
                    return next();
                }

                // Resource-specific access control
                switch (resourceType) {
                case 'user':
                    // Users can only edit their own profile
                    if (user.user_id === resourceId ||
                            ['Admin', 'HR', 'Manager'].includes(user.role_name)) {
                        return next();
                    }
                    break;

                case 'course':
                    // Instructors can edit their own courses
                    if (['Admin', 'HR', 'Manager', 'Instructor'].includes(user.role_name)) {
                        return next();
                    }
                    break;

                case 'test':
                    // Instructors can edit their own tests
                    if (['Admin', 'HR', 'Manager', 'Instructor'].includes(user.role_name)) {
                        return next();
                    }
                    break;

                case 'article':
                    // Authors can edit their own articles
                    if (['Admin', 'HR', 'Manager', 'Instructor'].includes(user.role_name)) {
                        return next();
                    }
                    break;

                case 'applicant':
                    // HR can manage applicants
                    if (['Admin', 'HR'].includes(user.role_name)) {
                        return next();
                    }
                    break;

                default:
                    return next();
                }

                // Access denied
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(403).json({
                        success: false,
                        message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
                    });
                }
                req.flash('error_msg', 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
                res.redirect('/dashboard');

            } catch (error) {
                console.error('Resource access check error:', error);
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(500).json({
                        success: false,
                        message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
                    });
                }
                req.flash('error_msg', 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
                res.redirect('/dashboard');
            }
        };
    },

    // API authentication middleware
    requireApiAuth: async (req, res, next) => {
        try {
            // Check for session authentication first
            if (req.session && req.session.user) {
                const user = await User.findById(req.session.user.user_id);
                if (user && user.is_active) {
                    req.user = user;
                    return next();
                }
            }

            // Check for API key authentication
            const apiKey = req.headers['x-api-key'];
            if (apiKey) {
                // Validate API key format
                if (!apiKey.startsWith('ruxchai_') || apiKey.length < 32) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid API key format'
                    });
                }

                // In production, validate against database
                // For now, accept any properly formatted key
                req.apiAuth = true;
                return next();
            }

            // No valid authentication found
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });

        } catch (error) {
            console.error('API auth error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authentication error'
            });
        }
    },

    // Check if user must change password
    checkPasswordChange: (req, res, next) => {
        if (req.session && req.session.user && req.session.user.must_change_password) {
            // Allow access to change password page and logout
            if (req.path === '/change-password' || req.path === '/logout' || req.path.startsWith('/api/')) {
                return next();
            }

            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(403).json({
                    success: false,
                    message: 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน',
                    redirect: '/change-password'
                });
            }

            req.flash('error_msg', 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน');
            return res.redirect('/change-password');
        }
        next();
    },

    // Helper middlewares
    isAuthenticated: function(req, res, next) {
        // Check session first
        if (req.session && req.session.user) {
            return next();
        }

        // Check JWT from cookies
        const accessToken = req.cookies?.accessToken;
        if (accessToken) {
            try {
                const decoded = JWTUtils.verifyAccessToken(accessToken);
                req.user = decoded;
                req.session = req.session || {};
                req.session.user = {
                    user_id: decoded.userId,
                    username: decoded.email,
                    role: decoded.role,
                    role_name: decoded.role,
                    email: decoded.email,
                    first_name: decoded.firstName,
                    last_name: decoded.lastName
                };
                return next();
            } catch (error) {
                // Token invalid, continue to error
            }
        }

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
            });
        }
        req.flash('error_msg', 'กรุณาเข้าสู่ระบบก่อนใช้งาน');
        return res.redirect('/auth/login');
    },

    isAdmin: function(req, res, next) {
        // Check session first
        if (!req.session || !req.session.user) {
            // Try JWT from cookies
            const accessToken = req.cookies?.accessToken;
            if (accessToken) {
                try {
                    const decoded = JWTUtils.verifyAccessToken(accessToken);
                    req.user = decoded;
                    req.session = req.session || {};
                    req.session.user = {
                        user_id: decoded.userId,
                        username: decoded.email,
                        role: decoded.role,
                        role_name: decoded.role,
                        email: decoded.email,
                        first_name: decoded.firstName,
                        last_name: decoded.lastName
                    };
                } catch (error) {
                    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                        return res.status(401).json({
                            success: false,
                            message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
                        });
                    }
                    req.flash('error_msg', 'กรุณาเข้าสู่ระบบก่อนใช้งาน');
                    return res.redirect('/auth/login');
                }
            } else {
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(401).json({
                        success: false,
                        message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
                    });
                }
                req.flash('error_msg', 'กรุณาเข้าสู่ระบบก่อนใช้งาน');
                return res.redirect('/auth/login');
            }
        }

        // Support both 'role' and 'role_name' fields
        const userRole = (req.session.user.role || req.session.user.role_name || '').toUpperCase();
        const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];

        if (!allowedRoles.includes(userRole)) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({
                    success: false,
                    message: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้'
                });
            }
            req.flash('error_msg', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (Admin Only)');
            return res.redirect('/dashboard');
        }

        next();
    },

    isAdminOrManager: function(req, res, next) {
        if (!req.session || !req.session.user) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
                });
            }
            req.flash('error_msg', 'กรุณาเข้าสู่ระบบก่อนใช้งาน');
            return res.redirect('/auth/login');
        }

        // Support both 'role' and 'role_name' fields
        const userRole = req.session.user.role || req.session.user.role_name || '';
        const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'];

        if (!allowedRoles.includes(userRole)) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(403).json({
                    success: false,
                    message: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้'
                });
            }
            req.flash('error_msg', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            return res.redirect('/dashboard');
        }

        next();
    }
};

module.exports = authMiddleware;
