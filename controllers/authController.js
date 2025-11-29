const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const JWTUtils = require('../utils/jwtUtils');
const { poolPromise } = require('../config/database');
const passwordValidator = require('../utils/passwordValidator');
const loginAttemptTracker = require('../utils/loginAttemptTracker');

const authController = {
    async renderLogin(req, res) {
        const { getCurrentLanguage, getTranslation } = require('../utils/languages');
        const currentLang = getCurrentLanguage(req);
        const t = res.locals.t || ((key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue);

        res.render('auth/login', {
            layout: false,
            title: t('login'),
            currentLanguage: currentLang,
            t: t,
            message: req.flash('message'),
            error: req.flash('error_msg')
        });
    },

    async login(req, res) {
        try {
            console.log('Login attempt - Content-Type:', req.get('Content-Type'));
            console.log('Login attempt - Body:', req.body);
            const { employee_id, password, remember } = req.body;

            if (!employee_id || !password) {
                console.log('Missing credentials - employee_id:', employee_id, 'password:', password ? '[REDACTED]' : 'undefined');
                return res.status(400).json({
                    success: false,
                    message: req.t('pleaseEnterEmployeeIdAndPassword')
                });
            }

            // Check if account is locked
            const lockStatus = await loginAttemptTracker.isAccountLocked(employee_id);
            if (lockStatus.locked) {
                await loginAttemptTracker.recordAttempt(employee_id, null, req.ip, req.get('User-Agent'), false, 'Account locked');
                return res.status(401).json({
                    success: false,
                    message: req.t('authAccountLockedWaitMinutes', { minutes: lockStatus.minutesRemaining }),
                    locked: true,
                    lockedUntil: lockStatus.lockedUntil
                });
            }

            // Try to find user by employee_id first (for EMPLOYEE)
            let user = await User.findByEmployeeId(employee_id);
            let loginType = 'employee';

            // If not found, try ID card number (for APPLICANT)
            if (!user) {
                // Check if it's a valid ID card format (13 digits)
                if (/^\d{13}$/.test(employee_id)) {
                    user = await User.findByIdCardNumber(employee_id);
                    loginType = 'applicant';
                }
            }

            if (!user) {
                await loginAttemptTracker.recordAttempt(employee_id, null, req.ip, req.get('User-Agent'), false, 'User not found');
                await ActivityLog.logLogin(null, req.ip, req.get('User-Agent'), req.sessionID, false);
                return res.status(401).json({
                    success: false,
                    message: req.t('invalidEmployeeIdOrPassword')
                });
            }

            if (!user.is_active) {
                await loginAttemptTracker.recordAttempt(employee_id, user.user_id, req.ip, req.get('User-Agent'), false, 'Account inactive');
                return res.status(401).json({
                    success: false,
                    message: req.t('accountSuspended')
                });
            }

            // Check status for applicants (DISABLED status)
            if (loginType === 'applicant' && user.status === 'DISABLED') {
                await loginAttemptTracker.recordAttempt(employee_id, user.user_id, req.ip, req.get('User-Agent'), false, 'Account disabled');
                return res.status(401).json({
                    success: false,
                    message: req.t('accountDisabledContactHR')
                });
            }

            if (user.is_locked) {
                await loginAttemptTracker.recordAttempt(employee_id, user.user_id, req.ip, req.get('User-Agent'), false, 'Account locked');
                return res.status(401).json({
                    success: false,
                    message: req.t('accountLockedContactAdmin')
                });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                // Record failed attempt
                await loginAttemptTracker.recordAttempt(employee_id, user.user_id, req.ip, req.get('User-Agent'), false, 'Invalid password');
                await ActivityLog.logLogin(user.user_id, req.ip, req.get('User-Agent'), req.sessionID, false);

                // Check if should lock account
                const lockCheck = await loginAttemptTracker.checkAndLockIfNeeded(employee_id, user.user_id);

                if (lockCheck.shouldLock) {
                    return res.status(401).json({
                        success: false,
                        message: req.t('authPasswordIncorrectAccountLocked', { duration: lockCheck.lockDuration, maxAttempts: lockCheck.maxAttempts }),
                        locked: true
                    });
                }

                return res.status(401).json({
                    success: false,
                    message: req.t('authInvalidCredentialsAttemptsRemaining', { remaining: lockCheck.remainingAttempts }),
                    remainingAttempts: lockCheck.remainingAttempts
                });
            }

            // Successful login - record and clear failed attempts
            await loginAttemptTracker.recordAttempt(employee_id, user.user_id, req.ip, req.get('User-Agent'), true);
            await loginAttemptTracker.clearFailedAttempts(employee_id);

            await User.updateLoginInfo(user.user_id);

            // Prepare user data for JWT
            const userData = {
                userId: user.user_id,
                employeeId: user.employee_id || null,
                idCardNumber: user.id_card_number || null,
                userType: user.user_type || 'EMPLOYEE',
                email: user.email,
                role: user.role_name,
                firstName: user.first_name,
                lastName: user.last_name,
                profileImage: user.profile_image,
                departmentId: user.department_id,
                positionId: user.position_id,
                departmentName: user.department_name,
                positionName: user.position_name,
                appliedPosition: user.applied_position || null,
                isActive: user.is_active,
                status: user.status || 'ACTIVE'
            };

            // Generate JWT tokens
            const tokens = JWTUtils.generateTokenPair(userData);

            // Store refresh token in database
            const pool = await poolPromise;
            await pool.request()
                .input('userId', user.user_id)
                .input('refreshToken', tokens.refreshToken)
                .input('expiresAt', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days
                .input('deviceInfo', JSON.stringify({
                    userAgent: req.get('User-Agent'),
                    ip: req.ip,
                    fingerprint: JWTUtils.createFingerprint(req)
                }))
                .query(`
                    INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
                    VALUES (@userId, @refreshToken, @expiresAt, GETDATE())
                `);

            // Set cookies for web interface
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            };

            if (remember) {
                cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            } else {
                cookieOptions.maxAge = 24 * 60 * 60 * 1000; // 24 hours
            }

            res.cookie('accessToken', tokens.accessToken, cookieOptions);
            res.cookie('refreshToken', tokens.refreshToken, {
                ...cookieOptions,
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for refresh token
            });

            // Preserve existing language setting before updating session
            const existingLanguage = req.session.language;

            // Also store user data in session for compatibility
            req.session.user = {
                user_id: user.user_id,
                employee_id: user.employee_id || null,
                id_card_number: user.id_card_number || null,
                user_type: user.user_type || 'EMPLOYEE',
                username: user.employee_id || user.id_card_number, // Add username for compatibility
                email: user.email,
                role: user.role_name, // Add role field (same as role_name)
                role_name: user.role_name,
                first_name: user.first_name,
                last_name: user.last_name,
                profile_image: user.profile_image,
                department_id: user.department_id,
                position_id: user.position_id,
                department_name: user.department_name,
                position_name: user.position_name,
                applied_position: user.applied_position || null,
                status: user.status || 'ACTIVE'
            };

            // Restore language setting if it existed
            if (existingLanguage) {
                req.session.language = existingLanguage;
                console.log(`🌐 Preserved language setting during login: ${existingLanguage}`);
            }

            await ActivityLog.logLogin(user.user_id, req.ip, req.get('User-Agent'), req.sessionID, true);

            // Determine redirect URL based on user type
            const redirectTo = loginType === 'applicant' ? '/applicant/dashboard' : '/dashboard';

            res.json({
                success: true,
                message: req.t('loginSuccess'),
                data: {
                    user: userData,
                    tokens: tokens,
                    userType: loginType
                },
                redirectTo: redirectTo
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoggingIn')
            });
        }
    },

    async logout(req, res) {
        try {
            const userId = req.session?.user?.user_id || req.user?.userId;
            const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

            if (userId) {
                await ActivityLog.logLogout(userId, req.ip, req.get('User-Agent'), req.sessionID);

                // Invalidate refresh token if it exists
                if (refreshToken) {
                    const pool = await poolPromise;
                    await pool.request()
                        .input('refreshToken', refreshToken)
                        .input('userId', userId)
                        .query(`
                            UPDATE refresh_tokens
                            SET revoked = 1, revoked_at = GETDATE()
                            WHERE token = @refreshToken AND user_id = @userId
                        `);
                }
            }

            // Clear JWT cookies but preserve language cookies
            res.clearCookie('accessToken', { path: '/' });
            res.clearCookie('refreshToken', { path: '/' });
            res.clearCookie('connect.sid', { path: '/' }); // Clear session cookie with correct path

            // Note: We deliberately DO NOT clear language cookies (ruxchai_language, language, preferred_language)
            // to preserve language preference across login sessions

            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                }

                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    res.json({
                        success: true,
                        message: req.t('logoutSuccess')
                    });
                } else {
                    res.redirect('/auth/login');
                }
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: req.t('authLogoutError')
            });
        }
    },


    async register(req, res) {
        try {
            const {
                employee_id,
                email,
                password,
                confirm_password,
                first_name,
                last_name,
                phone,
                department_id,
                position_id,
                supervisor_id
            } = req.body;

            if (password !== confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: req.t('passwordMismatch')
                });
            }

            // Validate password strength
            const passwordValidation = await passwordValidator.validate(password);
            if (!passwordValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: req.t('passwordDoesNotMeetSecurityRequirements'),
                    errors: passwordValidation.errors,
                    requirements: await passwordValidator.getRequirements()
                });
            }

            const userData = {
                employee_id,
                email,
                password,
                first_name,
                last_name,
                phone,
                department_id,
                position_id,
                supervisor_id,
                role: 'Learner',
                is_active: true
            };

            const result = await User.create(userData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: result.data.user_id,
                action: 'Register',
                table_name: 'users',
                record_id: result.data.user_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: 'User registered successfully',
                severity: 'Info',
                module: 'Authentication'
            });

            const userData_response = {
                user_id: result.data.user_id,
                employee_id: result.data.employee_id,
                email: result.data.email,
                first_name: result.data.first_name,
                last_name: result.data.last_name,
                role: result.data.role
            };

            res.status(201).json({
                success: true,
                message: req.t('registrationSuccess'),
                data: userData_response
            });

        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorEnrolling')
            });
        }
    },

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: req.t('authPleaseEnterEmail')
                });
            }

            const user = await User.findByEmail(email);
            if (!user) {
                return res.json({
                    success: true,
                    message: req.t('authPasswordResetEmailSent')
                });
            }

            const resetToken = jwt.sign(
                { userId: user.user_id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            await User.setPasswordResetToken(user.user_id, resetToken);

            await ActivityLog.create({
                user_id: user.user_id,
                action: 'Password_Reset_Request',
                table_name: 'users',
                record_id: user.user_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: 'Password reset requested',
                severity: 'Info',
                module: 'Authentication'
            });

            res.json({
                success: true,
                message: req.t('authPasswordResetEmailSent')
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                success: false,
                message: req.t('authPasswordResetError')
            });
        }
    },

    async resetPassword(req, res) {
        try {
            const { token, password, confirm_password } = req.body;

            if (!token || !password || !confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: req.t('authPleaseEnterAllFields')
                });
            }

            if (password !== confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: req.t('passwordMismatch')
                });
            }

            // Validate password strength
            const passwordValidation = await passwordValidator.validate(password);
            if (!passwordValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: req.t('passwordDoesNotMeetSecurityRequirements'),
                    errors: passwordValidation.errors,
                    requirements: await passwordValidator.getRequirements()
                });
            }

            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: req.t('authPasswordResetLinkInvalidOrExpired')
                });
            }

            const user = await User.findById(decoded.userId);
            if (!user || user.password_reset_token !== token) {
                return res.status(400).json({
                    success: false,
                    message: req.t('authPasswordResetLinkInvalidOrExpired')
                });
            }

            const result = await User.updatePassword(user.user_id, password);
            if (!result.success) {
                return res.status(400).json(result);
            }

            await User.clearPasswordResetToken(user.user_id);

            await ActivityLog.create({
                user_id: user.user_id,
                action: 'Password_Reset',
                table_name: 'users',
                record_id: user.user_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: 'Password reset successfully',
                severity: 'Info',
                module: 'Authentication'
            });

            res.json({
                success: true,
                message: req.t('passwordResetSuccess')
            });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                message: req.t('passwordResetFailed')
            });
        }
    },

    async changePassword(req, res) {
        try {
            const { current_password, new_password, confirm_password } = req.body;
            const userId = req.user.user_id;

            if (!current_password || !new_password || !confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: req.t('authPleaseEnterAllFields')
                });
            }

            if (new_password !== confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: req.t('authNewPasswordMismatch')
                });
            }

            // Validate new password strength
            const passwordValidation = await passwordValidator.validate(new_password);
            if (!passwordValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: req.t('authNewPasswordDoesNotMeetRequirements'),
                    errors: passwordValidation.errors,
                    requirements: await passwordValidator.getRequirements()
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: req.t('authUserNotFound')
                });
            }

            const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: req.t('authCurrentPasswordIncorrect')
                });
            }

            const result = await User.updatePassword(userId, new_password);
            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'Password_Change',
                table_name: 'users',
                record_id: userId,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: 'Password changed successfully',
                severity: 'Info',
                module: 'Authentication'
            });

            res.json({
                success: true,
                message: req.t('authPasswordChangeSuccess')
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: req.t('authPasswordChangeError')
            });
        }
    },

    async verifyToken(req, res) {
        try {
            const user = await User.findById(req.user.user_id);
            if (!user || !user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: req.t('authTokenInvalidOrAccountSuspended')
                });
            }

            const userData = {
                user_id: user.user_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                profile_image: user.profile_image,
                department_id: user.department_id,
                position_id: user.position_id
            };

            res.json({
                success: true,
                data: userData
            });

        } catch (error) {
            console.error('Verify token error:', error);
            res.status(500).json({
                success: false,
                message: req.t('authTokenVerificationError')
            });
        }
    },

    renderLogin(req, res) {
        if (req.session.user) {
            return res.redirect('/dashboard');
        }

        // Import language helpers
        const { getTranslation, getCurrentLanguage } = require('../utils/languages');
        const currentLang = getCurrentLanguage(req);
        const t = res.locals.t || ((key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue);

        res.render('auth/login', {
            title: `${t('login')} - Rukchai Hongyen LearnHub`,
            currentLanguage: currentLang,
            t: t,
            language: currentLang
        });
    },

    renderRegister(req, res) {
        if (req.session.user) {
            return res.redirect('/dashboard');
        }
        res.render('auth/register', {
            title: `${req.t('register')} - Rukchai Hongyen LearnHub`
        });
    },

    renderForgotPassword(req, res) {
        res.render('auth/forgot-password', {
            title: `${req.t('forgotPassword')} - Rukchai Hongyen LearnHub`
        });
    },

    renderResetPassword(req, res) {
        const { token } = req.query;
        if (!token) {
            return res.redirect('/auth/forgot-password');
        }

        res.render('auth/reset-password', {
            title: `${req.t('resetPassword')} - Rukchai Hongyen LearnHub`,
            token: token
        });
    },

    // JWT-specific methods
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: req.t('authRefreshTokenNotFound'),
                    error: 'NO_REFRESH_TOKEN'
                });
            }

            // Verify refresh token
            const decoded = JWTUtils.verifyRefreshToken(refreshToken);

            // Check if refresh token exists in database and is valid
            const pool = await poolPromise;
            const tokenResult = await pool.request()
                .input('userId', decoded.userId)
                .input('refreshToken', refreshToken)
                .query(`
                    SELECT rt.token_id, rt.revoked, rt.expires_at
                    FROM refresh_tokens rt
                    WHERE rt.user_id = @userId
                    AND rt.token = @refreshToken
                    AND rt.revoked = 0
                    AND rt.expires_at > GETDATE()
                `);

            if (tokenResult.recordset.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: req.t('authRefreshTokenInvalidOrExpired'),
                    error: 'INVALID_REFRESH_TOKEN'
                });
            }

            // Get user data
            const userResult = await pool.request()
                .input('userId', decoded.userId)
                .query(`
                    SELECT
                        u.userId,
                        u.email,
                        u.firstName,
                        u.lastName,
                        u.role,
                        u.departmentId,
                        u.isActive
                    FROM Users u
                    WHERE u.userId = @userId AND u.isActive = 1
                `);

            if (userResult.recordset.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: req.t('authUserNotFound'),
                    error: 'USER_NOT_FOUND'
                });
            }

            const user = userResult.recordset[0];

            // Generate new token pair
            const tokens = JWTUtils.generateTokenPair(user);

            // Store new refresh token in database
            await pool.request()
                .input('userId', user.userId)
                .input('refreshToken', tokens.refreshToken)
                .input('expiresAt', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days
                .query(`
                    INSERT INTO refresh_tokens (userId, token, expiresAt, createdAt, isActive)
                    VALUES (@userId, @refreshToken, @expiresAt, GETDATE(), 1)
                `);

            // Invalidate old refresh token
            await pool.request()
                .input('refreshToken', refreshToken)
                .query(`
                    UPDATE refresh_tokens
                    SET revoked = 1, revoked_at = GETDATE()
                    WHERE token = @refreshToken
                `);

            res.json({
                success: true,
                message: req.t('authTokenRefreshSuccess'),
                data: tokens
            });

        } catch (error) {
            console.error('Refresh token error:', error);
            return res.status(401).json({
                success: false,
                message: req.t('authTokenRefreshError'),
                error: 'REFRESH_TOKEN_ERROR'
            });
        }
    },

    async generateApiKey(req, res) {
        try {
            const userId = req.user.user_id;
            const { name, permissions, expiresIn } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: req.t('authPleaseProvideApiKeyName')
                });
            }

            const apiKey = JWTUtils.generateApiKey();
            const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null;

            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', userId)
                .input('apiKey', apiKey)
                .input('name', name)
                .input('permissions', JSON.stringify(permissions || []))
                .input('expiresAt', expiresAt)
                .query(`
                    INSERT INTO ApiKeys (userId, apiKey, name, permissions, expiresAt, createdAt, isActive)
                    OUTPUT INSERTED.apiKeyId
                    VALUES (@userId, @apiKey, @name, @permissions, @expiresAt, GETDATE(), 1)
                `);

            await ActivityLog.create({
                user_id: userId,
                action: 'API_Key_Generated',
                table_name: 'api_keys',
                record_id: result.recordset[0].apiKeyId,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                description: `Generated API key: ${name}`,
                severity: 'Info',
                module: 'API'
            });

            res.json({
                success: true,
                message: req.t('authApiKeyGeneratedSuccess'),
                data: {
                    apiKeyId: result.recordset[0].apiKeyId,
                    apiKey: apiKey,
                    name: name,
                    expiresAt: expiresAt
                }
            });

        } catch (error) {
            console.error('Generate API key error:', error);
            res.status(500).json({
                success: false,
                message: req.t('authApiKeyGenerationError')
            });
        }
    }
};

module.exports = authController;