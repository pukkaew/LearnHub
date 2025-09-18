const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const authController = {
    async renderLogin(req, res) {
        res.render('auth/login', {
            title: 'เข้าสู่ระบบ',
            message: req.flash('message'),
            error: req.flash('error_msg')
        });
    },

    async login(req, res) {
        try {
            const { employee_id, password, remember } = req.body;

            if (!employee_id || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณากรอกรหัสพนักงานและรหัสผ่าน'
                });
            }

            const user = await User.findByEmployeeId(employee_id);
            if (!user) {
                await ActivityLog.logLogin(null, req.ip, req.get('User-Agent'), req.sessionID, false);
                return res.status(401).json({
                    success: false,
                    message: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง'
                });
            }

            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'บัญชีของคุณถูกระงับการใช้งาน'
                });
            }

            if (user.is_locked) {
                return res.status(401).json({
                    success: false,
                    message: 'บัญชีของคุณถูกล็อค กรุณาติดต่อผู้ดูแลระบบ'
                });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                await User.incrementFailedLogin(user.user_id);
                await ActivityLog.logLogin(user.user_id, req.ip, req.get('User-Agent'), req.sessionID, false);
                return res.status(401).json({
                    success: false,
                    message: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง'
                });
            }

            await User.updateLastLogin(user.user_id, req.ip);
            await User.resetFailedLogin(user.user_id);

            // Store user data in session
            req.session.user = {
                user_id: user.user_id,
                employee_id: user.employee_id,
                email: user.email,
                role_name: user.role_name,
                first_name: user.first_name,
                last_name: user.last_name,
                profile_image: user.profile_image,
                department_id: user.department_id,
                position_id: user.position_id,
                department_name: user.department_name,
                position_name: user.position_name
            };

            // Set session options
            if (remember) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            } else {
                req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
            }

            req.session.lastActivity = Date.now();

            await ActivityLog.logLogin(user.user_id, req.ip, req.get('User-Agent'), req.sessionID, true);

            res.json({
                success: true,
                message: 'เข้าสู่ระบบสำเร็จ',
                redirectTo: '/dashboard'
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
            });
        }
    },

    async logout(req, res) {
        try {
            const userId = req.session?.user?.user_id;

            if (userId) {
                await ActivityLog.logLogout(userId, req.ip, req.get('User-Agent'), req.sessionID);
            }

            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                }

                res.clearCookie('connect.sid'); // Clear session cookie

                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    res.json({
                        success: true,
                        message: 'ออกจากระบบสำเร็จ'
                    });
                } else {
                    res.redirect('/auth/login');
                }
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการออกจากระบบ'
            });
        }
    },

    async renderRegister(req, res) {
        res.render('auth/register', {
            title: 'สมัครสมาชิก'
        });
    },

    async renderForgotPassword(req, res) {
        res.render('auth/forgot-password', {
            title: 'ลืมรหัสผ่าน'
        });
    },

    async renderResetPassword(req, res) {
        const { token } = req.query;

        if (!token) {
            req.flash('error_msg', 'Token ไม่ถูกต้อง');
            return res.redirect('/auth/forgot-password');
        }

        res.render('auth/reset-password', {
            title: 'รีเซ็ตรหัสผ่าน',
            token: token
        });
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
                    message: 'รหัสผ่านไม่ตรงกัน'
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
                message: 'ลงทะเบียนสำเร็จ',
                data: userData_response
            });

        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการลงทะเบียน'
            });
        }
    },

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณากรอกอีเมล'
                });
            }

            const user = await User.findByEmail(email);
            if (!user) {
                return res.json({
                    success: true,
                    message: 'หากอีเมลนี้มีอยู่ในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้คุณ'
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
                message: 'หากอีเมลนี้มีอยู่ในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้คุณ'
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการขอรีเซ็ตรหัสผ่าน'
            });
        }
    },

    async resetPassword(req, res) {
        try {
            const { token, password, confirm_password } = req.body;

            if (!token || !password || !confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
                });
            }

            if (password !== confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: 'รหัสผ่านไม่ตรงกัน'
                });
            }

            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ'
                });
            }

            const user = await User.findById(decoded.userId);
            if (!user || user.password_reset_token !== token) {
                return res.status(400).json({
                    success: false,
                    message: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ'
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
                message: 'รีเซ็ตรหัสผ่านสำเร็จ'
            });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
            });
        }
    },

    async changePassword(req, res) {
        try {
            const { current_password, new_password, confirm_password } = req.body;
            const userId = req.user.userId;

            if (!current_password || !new_password || !confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
                });
            }

            if (new_password !== confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: 'รหัสผ่านใหม่ไม่ตรงกัน'
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบข้อมูลผู้ใช้'
                });
            }

            const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
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
                message: 'เปลี่ยนรหัสผ่านสำเร็จ'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
            });
        }
    },

    async verifyToken(req, res) {
        try {
            const user = await User.findById(req.user.userId);
            if (!user || !user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Token ไม่ถูกต้องหรือบัญชีถูกระงับ'
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
                message: 'เกิดข้อผิดพลาดในการตรวจสอบ Token'
            });
        }
    },

    renderLogin(req, res) {
        if (req.session.user) {
            return res.redirect('/dashboard');
        }
        res.render('auth/login', {
            title: 'เข้าสู่ระบบ - Ruxchai LearnHub',
            layout: 'auth'
        });
    },

    renderRegister(req, res) {
        if (req.session.user) {
            return res.redirect('/dashboard');
        }
        res.render('auth/register', {
            title: 'ลงทะเบียน - Ruxchai LearnHub',
            layout: 'auth'
        });
    },

    renderForgotPassword(req, res) {
        res.render('auth/forgot-password', {
            title: 'ลืมรหัสผ่าน - Ruxchai LearnHub',
            layout: 'auth'
        });
    },

    renderResetPassword(req, res) {
        const { token } = req.query;
        if (!token) {
            return res.redirect('/auth/forgot-password');
        }

        res.render('auth/reset-password', {
            title: 'รีเซ็ตรหัสผ่าน - Ruxchai LearnHub',
            layout: 'auth',
            token: token
        });
    }
};

module.exports = authController;