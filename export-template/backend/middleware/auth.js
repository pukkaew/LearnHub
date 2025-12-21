/**
 * Authentication Middleware
 * Handles route protection and role-based access control
 */

const authMiddleware = {
    /**
     * Check if user is authenticated
     */
    isAuthenticated: function(req, res, next) {
        // Check session
        if (req.session && req.session.user) {
            return next();
        }

        // Check JWT from cookies (optional)
        const accessToken = req.cookies?.accessToken;
        if (accessToken) {
            try {
                // Verify JWT token here if using JWT
                // const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
                // req.user = decoded;
                // return next();
            } catch (error) {
                // Token invalid, continue to error
            }
        }

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(401).json({
                success: false,
                message: 'Please login first'
            });
        }

        req.flash('error_msg', 'Please login first');
        return res.redirect('/auth/login');
    },

    /**
     * Check if user is admin
     */
    isAdmin: function(req, res, next) {
        if (!req.session || !req.session.user) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    message: 'Please login first'
                });
            }
            req.flash('error_msg', 'Please login first');
            return res.redirect('/auth/login');
        }

        // Support both 'role' and 'role_name' fields
        const userRole = (req.session.user.role || req.session.user.role_name || '').toUpperCase();
        const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];

        if (!allowedRoles.includes(userRole)) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this page'
                });
            }
            req.flash('error_msg', 'You do not have permission to access this page');
            return res.redirect('/dashboard');
        }

        next();
    },

    /**
     * Check if user is admin or manager
     */
    isAdminOrManager: function(req, res, next) {
        if (!req.session || !req.session.user) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    message: 'Please login first'
                });
            }
            req.flash('error_msg', 'Please login first');
            return res.redirect('/auth/login');
        }

        // Support both 'role' and 'role_name' fields
        const userRole = (req.session.user.role || req.session.user.role_name || '').toUpperCase();
        const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'];

        if (!allowedRoles.includes(userRole)) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this page'
                });
            }
            req.flash('error_msg', 'You do not have permission to access this page');
            return res.redirect('/dashboard');
        }

        next();
    },

    /**
     * Require specific role(s)
     * @param {string|string[]} roles - Role or array of roles
     */
    requireRole: function(roles) {
        return function(req, res, next) {
            if (!req.session || !req.session.user) {
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(401).json({
                        success: false,
                        message: 'Please login first'
                    });
                }
                req.flash('error_msg', 'Please login first');
                return res.redirect('/auth/login');
            }

            const allowedRoles = Array.isArray(roles) ? roles : [roles];
            const userRole = (req.session.user.role || req.session.user.role_name || '').toUpperCase();

            if (!allowedRoles.map(r => r.toUpperCase()).includes(userRole)) {
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to access this page'
                    });
                }
                req.flash('error_msg', 'You do not have permission to access this page');
                return res.redirect('/dashboard');
            }

            next();
        };
    },

    /**
     * Require guest (not authenticated)
     */
    requireGuest: function(req, res, next) {
        if (req.session && req.session.user) {
            return res.redirect('/dashboard');
        }
        next();
    },

    /**
     * Set user data in response locals
     */
    setUserData: function(req, res, next) {
        if (req.session && req.session.user) {
            res.locals.user = req.session.user;
            res.locals.isAuthenticated = true;
        } else {
            res.locals.user = null;
            res.locals.isAuthenticated = false;
        }
        next();
    }
};

module.exports = authMiddleware;
