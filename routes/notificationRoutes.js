const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get user notifications
router.get('/', authMiddleware.requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, type, unreadOnly } = req.query;
        const userId = req.session.user.user_id;

        const filters = { user_id: userId };
        if (type) {filters.type = type;}
        if (unreadOnly === 'true') {filters.is_read = false;}

        const result = await Notification.findAll(page, limit, filters);

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.json({
                success: true,
                ...result
            });
        } else {
            res.render('notifications/index', {
                title: 'การแจ้งเตือน',
                notifications: result.data,
                pagination: {
                    currentPage: result.page,
                    totalPages: result.totalPages,
                    total: result.total
                }
            });
        }
    } catch (error) {
        console.error('Get notifications error:', error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดการแจ้งเตือน'
            });
        } else {
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดการแจ้งเตือน');
            res.redirect('/dashboard');
        }
    }
});

// Get recent notifications (for Dashboard)
router.get('/recent', authMiddleware.requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.user_id || req.user?.userId;
        const { limit = 5 } = req.query;

        // Demo data for now
        const notifications = [
            {
                notification_id: 1,
                title: 'ยินดีต้อนรับสู่ระบบ LearnHub',
                message: 'ยินดีต้อนรับสู่ระบบ LearnHub ของเรา',
                type: 'info',
                is_read: false,
                created_at: new Date()
            },
            {
                notification_id: 2,
                title: 'การทดสอบใหม่พร้อมแล้ว',
                message: 'มีการทดสอบใหม่พร้อมให้ทำ',
                type: 'success',
                is_read: true,
                created_at: new Date()
            }
        ];

        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('Get recent notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการโหลดการแจ้งเตือน'
        });
    }
});

// Get unread notification count
router.get('/count', authMiddleware.requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const count = await Notification.getUnreadCount(userId);

        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Get notification count error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการโหลดจำนวนการแจ้งเตือน'
        });
    }
});

// Mark notification as read
router.put('/:id/read', authMiddleware.requireAuth, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.session.user.user_id;

        const result = await Notification.markAsRead(notificationId, userId);

        res.json({
            success: result.success,
            message: result.message
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัพเดทการแจ้งเตือน'
        });
    }
});

// Mark all notifications as read
router.put('/read-all', authMiddleware.requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const result = await Notification.markAllAsRead(userId);

        res.json({
            success: result.success,
            message: result.message
        });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัพเดทการแจ้งเตือน'
        });
    }
});

// Delete notification
router.delete('/:id', authMiddleware.requireAuth, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.session.user.user_id;

        const result = await Notification.delete(notificationId, userId);

        res.json({
            success: result.success,
            message: result.message
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบการแจ้งเตือน'
        });
    }
});

// Create notification (Admin/HR only)
router.post('/', authMiddleware.requireHR(), async (req, res) => {
    try {
        const { user_ids, title, message, type = 'info', action_url, expires_date } = req.body;
        const createdBy = req.session.user.user_id;

        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกผู้รับการแจ้งเตือน'
            });
        }

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกหัวข้อและข้อความการแจ้งเตือน'
            });
        }

        const results = [];
        for (const userId of user_ids) {
            const result = await Notification.create({
                user_id: userId,
                title,
                message,
                type,
                action_url,
                expires_date,
                created_by: createdBy
            });
            results.push(result);
        }

        res.json({
            success: true,
            message: `ส่งการแจ้งเตือนให้ผู้ใช้ ${user_ids.length} คนเรียบร้อยแล้ว`,
            data: results
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการส่งการแจ้งเตือน'
        });
    }
});

// Send notification to all users (Admin only)
router.post('/broadcast', authMiddleware.requireAdmin(), async (req, res) => {
    try {
        const { title, message, type = 'info', action_url, expires_date } = req.body;
        const createdBy = req.session.user.user_id;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกหัวข้อและข้อความการแจ้งเตือน'
            });
        }

        const result = await Notification.broadcast({
            title,
            message,
            type,
            action_url,
            expires_date,
            created_by: createdBy
        });

        res.json({
            success: result.success,
            message: result.message,
            data: result
        });
    } catch (error) {
        console.error('Broadcast notification error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการส่งการแจ้งเตือน'
        });
    }
});

// Get notification templates (Admin/HR only)
router.get('/templates', authMiddleware.requireHR(), async (req, res) => {
    try {
        const templates = [
            {
                id: 'course_enrollment',
                title: 'แจ้งเตือนการลงทะเบียนหลักสูตร',
                message: 'คุณได้ลงทะเบียนหลักสูตร "{course_name}" เรียบร้อยแล้ว กรุณาเข้าเรียนตามกำหนดเวลา',
                type: 'success'
            },
            {
                id: 'course_deadline',
                title: 'แจ้งเตือนกำหนดเวลาหลักสูตร',
                message: 'หลักสูตร "{course_name}" ของคุณจะสิ้นสุดในวันที่ {deadline} กรุณาเสร็จสิ้นการเรียนให้ทันกำหนด',
                type: 'warning'
            },
            {
                id: 'test_available',
                title: 'แจ้งเตือนการทดสอบใหม่',
                message: 'มีการทดสอบใหม่ "{test_name}" พร้อมให้ทำแล้ว กรุณาเข้าทำการทดสอบ',
                type: 'info'
            },
            {
                id: 'certificate_issued',
                title: 'แจ้งเตือนการออกใบประกาศนียบัตร',
                message: 'ยินดีด้วย! คุณได้รับใบประกาศนียบัตรสำหรับ "{course_name}" แล้ว',
                type: 'success'
            },
            {
                id: 'password_change',
                title: 'แจ้งเตือนการเปลี่ยนรหัสผ่าน',
                message: 'กรุณาเปลี่ยนรหัสผ่านของคุณเนื่องจากมีการอัพเดทนโยบายความปลอดภัย',
                type: 'warning'
            }
        ];

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error('Get notification templates error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการโหลดเทมเพลต'
        });
    }
});

module.exports = router;