const Dashboard = require('../models/Dashboard');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

const dashboardController = {
    async getDashboard(req, res) {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;

            const dashboardResult = await Dashboard.getUserDashboardData(userId, userRole);

            if (!dashboardResult.success) {
                return res.status(400).json(dashboardResult);
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'View_Dashboard',
                table_name: 'dashboard',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `${userRole} viewed dashboard`,
                severity: 'Info',
                module: 'Dashboard'
            });

            res.json({
                success: true,
                data: dashboardResult.data
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดแดชบอร์ด'
            });
        }
    },

    async renderDashboard(req, res) {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;
            const user = req.session.user;

            const dashboardResult = await Dashboard.getUserDashboardData(userId, userRole);

            if (!dashboardResult.success) {
                return res.render('dashboard/index', {
                    title: 'แดשบอร์ด - Ruxchai LearnHub',
                    user: user,
                    userRole: userRole,
                    error: 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้'
                });
            }

            const dashboardData = dashboardResult.data;

            let pageTitle = 'แดชบอร์ด';
            let template = 'dashboard/index';

            switch (userRole) {
                case 'Admin':
                    pageTitle = 'แดชบอร์ดผู้ดูแลระบบ';
                    template = 'dashboard/admin';
                    break;
                case 'HR':
                    pageTitle = 'แดชบอร์ดฝ่ายทรัพยากรบุคคล';
                    template = 'dashboard/hr';
                    break;
                case 'Instructor':
                    pageTitle = 'แดชบอร์ดผู้สอน';
                    template = 'dashboard/instructor';
                    break;
                case 'Learner':
                    pageTitle = 'แดชบอร์ดผู้เรียน';
                    template = 'dashboard/learner';
                    break;
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'View_Dashboard',
                table_name: 'dashboard',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `${userRole} viewed dashboard page`,
                severity: 'Info',
                module: 'Dashboard'
            });

            res.render(template, {
                title: `${pageTitle} - Ruxchai LearnHub`,
                user: user,
                userRole: userRole,
                dashboardData: dashboardData
            });

        } catch (error) {
            console.error('Render dashboard error:', error);
            res.render('dashboard/index', {
                title: 'แดชบอร์ด - Ruxchai LearnHub',
                user: req.session.user,
                userRole: req.user.role,
                error: 'เกิดข้อผิดพลาดในการโหลดแดชบอร์ด'
            });
        }
    },

    async getQuickStats(req, res) {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;

            let stats = {};

            switch (userRole) {
                case 'Admin':
                    const pool = await require('../config/database').getConnection();
                    const adminStats = await pool.request().query(`
                        SELECT
                            (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
                            (SELECT COUNT(*) FROM courses WHERE is_active = 1) as active_courses,
                            (SELECT COUNT(*) FROM enrollments WHERE status = 'Active') as active_enrollments,
                            (SELECT COUNT(*) FROM notifications WHERE is_read = 0) as unread_notifications
                    `);
                    stats = adminStats.recordset[0];
                    break;

                case 'Learner':
                    const learnerStats = await pool.request()
                        .input('user_id', require('mssql').UniqueIdentifier, userId)
                        .query(`
                            SELECT
                                (SELECT COUNT(*) FROM enrollments WHERE user_id = @user_id AND status = 'Active') as enrolled_courses,
                                (SELECT COUNT(*) FROM enrollments WHERE user_id = @user_id AND completion_status = 'Completed') as completed_courses,
                                (SELECT COUNT(*) FROM user_badges WHERE user_id = @user_id) as total_badges,
                                (SELECT SUM(points_earned) FROM user_points WHERE user_id = @user_id) as total_points
                        `);
                    stats = learnerStats.recordset[0];
                    break;
            }

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Quick stats error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลสถิติ'
            });
        }
    },

    async getNotifications(req, res) {
        try {
            const userId = req.user.userId;
            const { limit = 10, unread_only = false } = req.query;

            const filters = {
                limit: parseInt(limit)
            };

            if (unread_only === 'true') {
                filters.is_read = false;
            }

            const notifications = await Notification.findByRecipient(userId, filters);

            res.json({
                success: true,
                data: notifications
            });

        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดการแจ้งเตือน'
            });
        }
    },

    async markNotificationAsRead(req, res) {
        try {
            const userId = req.user.userId;
            const { notification_id } = req.params;

            const result = await Notification.markAsRead(notification_id, userId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json({
                success: true,
                message: 'อ่านการแจ้งเตือนแล้ว'
            });

        } catch (error) {
            console.error('Mark notification as read error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการอัพเดทการแจ้งเตือน'
            });
        }
    },

    async markAllNotificationsAsRead(req, res) {
        try {
            const userId = req.user.userId;

            const result = await Notification.markAllAsRead(userId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json({
                success: true,
                message: 'อ่านการแจ้งเตือนทั้งหมดแล้ว',
                affected_rows: result.affected_rows
            });

        } catch (error) {
            console.error('Mark all notifications as read error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการอัพเดทการแจ้งเตือน'
            });
        }
    },

    async getActivityLogs(req, res) {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;
            const { limit = 20, offset = 0 } = req.query;

            const filters = {
                limit: parseInt(limit),
                offset: parseInt(offset)
            };

            let activities = [];

            if (userRole === 'Admin') {
                activities = await ActivityLog.findAll(filters);
            } else {
                activities = await ActivityLog.findByUser(userId, filters);
            }

            res.json({
                success: true,
                data: activities
            });

        } catch (error) {
            console.error('Get activity logs error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดประวัติกิจกรรม'
            });
        }
    },

    async getUserStats(req, res) {
        try {
            const userId = req.user.userId;

            const stats = await ActivityLog.getActivitySummary(userId, 30);
            const notifications = await Notification.getUnreadCount(userId);

            res.json({
                success: true,
                data: {
                    activity_summary: stats,
                    notifications: notifications
                }
            });

        } catch (error) {
            console.error('Get user stats error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดสถิติผู้ใช้'
            });
        }
    },

    async getSystemHealth(req, res) {
        try {
            const userRole = req.user.role;

            if (userRole !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
                });
            }

            const pool = await require('../config/database').getConnection();

            const healthData = await pool.request().query(`
                SELECT
                    (SELECT COUNT(*) FROM activity_logs WHERE severity = 'Error' AND created_at >= DATEADD(hour, -24, GETDATE())) as errors_24h,
                    (SELECT COUNT(*) FROM activity_logs WHERE severity = 'Warning' AND created_at >= DATEADD(hour, -24, GETDATE())) as warnings_24h,
                    (SELECT COUNT(*) FROM activity_logs WHERE action LIKE '%Login%' AND created_at >= DATEADD(hour, -24, GETDATE())) as logins_24h,
                    (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
                    (SELECT COUNT(*) FROM users WHERE last_login >= DATEADD(day, -7, GETDATE())) as active_users_week
            `);

            await ActivityLog.create({
                user_id: req.user.userId,
                action: 'View_System_Health',
                table_name: 'system',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: 'Admin viewed system health',
                severity: 'Info',
                module: 'Admin'
            });

            res.json({
                success: true,
                data: healthData.recordset[0]
            });

        } catch (error) {
            console.error('Get system health error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลสุขภาพระบบ'
            });
        }
    }
};

module.exports = dashboardController;