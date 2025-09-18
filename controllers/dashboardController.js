const Dashboard = require('../models/Dashboard');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { poolPromise } = require('../config/database');

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
    },

    async getRealTimeData(req, res) {
        try {
            const userId = req.user.userId;
            const pool = await poolPromise;

            const result = await pool.request()
                .input('userId', userId)
                .query(`
                    SELECT
                        (SELECT COUNT(*) FROM Courses WHERE status = 'active') as totalCourses,
                        (SELECT COUNT(*) FROM Tests WHERE status = 'active') as totalTests,
                        (SELECT COUNT(*) FROM Users WHERE isActive = 1) as totalUsers,
                        (SELECT COUNT(*) FROM UserCourses WHERE userId = @userId AND status = 'completed') as completedCourses,
                        (SELECT COUNT(*) FROM TestResults WHERE userId = @userId) as completedTests,
                        (SELECT AVG(CAST(score AS FLOAT)) FROM TestResults WHERE userId = @userId) as averageScore,
                        (SELECT COUNT(*) FROM Notifications WHERE userId = @userId AND isRead = 0) as unreadNotifications
                `);

            res.json({
                success: true,
                data: result.recordset[0],
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Get real-time data error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลแบบเรียลไทม์'
            });
        }
    },

    async trackUserActivity(req, res) {
        try {
            const userId = req.user.userId;
            const { activity, metadata } = req.body;
            const io = req.app.get('io');
            const broadcastDepartmentUpdate = req.app.get('broadcastDepartmentUpdate');

            await ActivityLog.create({
                user_id: userId,
                action: activity.type,
                table_name: activity.table || 'user_activity',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: activity.description,
                severity: 'Info',
                module: activity.module || 'Dashboard',
                metadata: JSON.stringify(metadata)
            });

            // Broadcast to user's department if applicable
            if (req.user.departmentId) {
                broadcastDepartmentUpdate(req.user.departmentId, {
                    type: 'user-activity',
                    userId: userId,
                    activity: activity,
                    timestamp: new Date()
                });
            }

            res.json({
                success: true,
                message: 'บันทึกกิจกรรมเรียบร้อย'
            });

        } catch (error) {
            console.error('Track user activity error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการบันทึกกิจกรรม'
            });
        }
    },

    async getLeaderboard(req, res) {
        try {
            const { type = 'points', limit = 10 } = req.query;
            const pool = await poolPromise;

            let query = '';
            if (type === 'points') {
                query = `
                    SELECT TOP ${parseInt(limit)}
                        u.userId,
                        u.firstName,
                        u.lastName,
                        u.profileImage,
                        up.totalPoints,
                        up.currentLevel,
                        d.name as departmentName
                    FROM Users u
                    LEFT JOIN UserProfiles up ON u.userId = up.userId
                    LEFT JOIN Departments d ON u.departmentId = d.departmentId
                    WHERE u.isActive = 1
                    ORDER BY up.totalPoints DESC
                `;
            } else if (type === 'tests') {
                query = `
                    SELECT TOP ${parseInt(limit)}
                        u.userId,
                        u.firstName,
                        u.lastName,
                        u.profileImage,
                        COUNT(tr.testResultId) as completedTests,
                        AVG(CAST(tr.score AS FLOAT)) as averageScore,
                        d.name as departmentName
                    FROM Users u
                    LEFT JOIN TestResults tr ON u.userId = tr.userId
                    LEFT JOIN Departments d ON u.departmentId = d.departmentId
                    WHERE u.isActive = 1
                    GROUP BY u.userId, u.firstName, u.lastName, u.profileImage, d.name
                    ORDER BY COUNT(tr.testResultId) DESC, AVG(CAST(tr.score AS FLOAT)) DESC
                `;
            }

            const result = await pool.request().query(query);

            res.json({
                success: true,
                data: result.recordset
            });

        } catch (error) {
            console.error('Get leaderboard error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดลีดเดอร์บอร์ด'
            });
        }
    },

    async getUpcomingEvents(req, res) {
        try {
            const userId = req.user.userId;
            const pool = await poolPromise;

            const result = await pool.request()
                .input('userId', userId)
                .query(`
                    SELECT TOP 10
                        'test' as eventType,
                        t.testId as eventId,
                        t.title,
                        t.description,
                        t.startDate as eventDate,
                        t.endDate,
                        c.title as courseName,
                        'fas fa-clipboard-check' as icon,
                        'bg-blue-100 text-blue-800' as badgeClass
                    FROM Tests t
                    INNER JOIN Courses c ON t.courseId = c.courseId
                    LEFT JOIN UserCourses uc ON c.courseId = uc.courseId AND uc.userId = @userId
                    LEFT JOIN TestResults tr ON t.testId = tr.testId AND tr.userId = @userId
                    WHERE t.status = 'active'
                    AND t.startDate > GETDATE()
                    AND (uc.userId IS NOT NULL OR c.isPublic = 1)
                    AND tr.testId IS NULL

                    UNION ALL

                    SELECT TOP 10
                        'course' as eventType,
                        c.courseId as eventId,
                        c.title,
                        c.description,
                        c.startDate as eventDate,
                        c.endDate,
                        NULL as courseName,
                        'fas fa-book' as icon,
                        'bg-green-100 text-green-800' as badgeClass
                    FROM Courses c
                    LEFT JOIN UserCourses uc ON c.courseId = uc.courseId AND uc.userId = @userId
                    WHERE c.status = 'active'
                    AND c.startDate > GETDATE()
                    AND (uc.userId IS NULL OR uc.status = 'not_started')
                    AND (c.isPublic = 1 OR uc.userId IS NOT NULL)

                    ORDER BY eventDate ASC
                `);

            res.json({
                success: true,
                data: result.recordset
            });

        } catch (error) {
            console.error('Get upcoming events error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดกิจกรรมที่กำลังจะมาถึง'
            });
        }
    }
};

module.exports = dashboardController;