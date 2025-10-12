/**
 * Applicant Authentication Middleware
 * ตรวจสอบว่าผู้ใช้เป็น Applicant และมีสิทธิ์เข้าถึงหรือไม่
 */

const User = require('../models/User');

const applicantAuth = {
    /**
     * ตรวจสอบว่าผู้ใช้เป็น Applicant
     */
    isApplicant: (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบ'
            });
        }

        const userType = req.session.user.user_type;

        if (userType !== 'APPLICANT') {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้'
                });
            } else {
                req.flash('error_msg', 'ไม่มีสิทธิ์เข้าถึงส่วนนี้');
                return res.redirect('/dashboard');
            }
        }

        next();
    },

    /**
     * ตรวจสอบว่าผู้ใช้เป็น Employee (ไม่ใช่ Applicant)
     */
    isEmployee: (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบ'
            });
        }

        const userType = req.session.user.user_type;

        if (userType === 'APPLICANT') {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้'
                });
            } else {
                req.flash('error_msg', 'ไม่มีสิทธิ์เข้าถึงส่วนนี้');
                return res.redirect('/applicant/dashboard');
            }
        }

        next();
    },

    /**
     * ตรวจสอบว่าผู้ใช้เป็น HR หรือ Admin (สำหรับจัดการ Applicants)
     */
    isHR: (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบ'
            });
        }

        const role = req.session.user.role_name || req.session.user.role;

        // อนุญาตเฉพาะ Admin และ HR
        const allowedRoles = ['Admin', 'HR', 'Administrator'];

        if (!allowedRoles.includes(role)) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้ (ต้องเป็น HR หรือ Admin)'
                });
            } else {
                req.flash('error_msg', 'ไม่มีสิทธิ์เข้าถึงส่วนนี้ (ต้องเป็น HR หรือ Admin)');
                return res.redirect('/dashboard');
            }
        }

        next();
    },

    /**
     * ตรวจสอบสถานะ Account (ไม่ถูก Disable)
     */
    checkAccountStatus: async (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบ'
            });
        }

        try {
            const userId = req.session.user.user_id;
            const user = await User.findById(userId);

            if (!user) {
                req.session.destroy();
                return res.status(401).json({
                    success: false,
                    message: 'ไม่พบข้อมูลผู้ใช้'
                });
            }

            // ตรวจสอบสถานะ DISABLED (สำหรับ Applicant)
            if (user.user_type === 'APPLICANT' && user.status === 'DISABLED') {
                req.session.destroy();
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(403).json({
                        success: false,
                        message: 'บัญชีของคุณถูกปิดการใช้งานแล้ว กรุณาติดต่อฝ่าย HR'
                    });
                } else {
                    req.flash('error_msg', 'บัญชีของคุณถูกปิดการใช้งานแล้ว กรุณาติดต่อฝ่าย HR');
                    return res.redirect('/auth/login');
                }
            }

            // ตรวจสอบ is_active
            if (!user.is_active) {
                req.session.destroy();
                return res.status(403).json({
                    success: false,
                    message: 'บัญชีของคุณถูกระงับการใช้งาน'
                });
            }

            next();
        } catch (error) {
            console.error('Error checking account status:', error);
            next();
        }
    },

    /**
     * Redirect ตาม user_type หากเข้า root path
     */
    redirectByUserType: (req, res, next) => {
        if (!req.session || !req.session.user) {
            return next();
        }

        const userType = req.session.user.user_type;

        // ถ้าเป็น Applicant และพยายามเข้า /dashboard → redirect ไป /applicant/dashboard
        if (userType === 'APPLICANT' && req.path === '/dashboard') {
            return res.redirect('/applicant/dashboard');
        }

        // ถ้าเป็น Employee และพยายามเข้า /applicant/dashboard → redirect ไป /dashboard
        if (userType !== 'APPLICANT' && req.path.startsWith('/applicant')) {
            return res.redirect('/dashboard');
        }

        next();
    }
};

module.exports = applicantAuth;
