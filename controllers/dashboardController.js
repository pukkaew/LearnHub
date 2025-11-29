const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { poolPromise } = require('../config/database');

const dashboardController = {
    async getDashboard(req, res) {
        try {
            const userId = req.user.user_id;
            const userRole = req.user.role;

            // Simple dashboard data without Dashboard model
            const dashboardData = {
                user_id: userId,
                role: userRole,
                stats: {
                    courses: 0,
                    tests: 0,
                    articles: 0,
                    badges: 0
                }
            };

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
                data: dashboardData
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingDashboard')
            });
        }
    },

    async renderDashboard(req, res) {
        try {
            const userId = req.user.user_id;
            const userRole = req.user.role;
            const user = req.session.user;

            // Ensure translation function exists
            const { getTranslation, getCurrentLanguage } = require('../utils/languages');
            const currentLang = getCurrentLanguage(req);
            const t = res.locals.t || ((key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue);

            // TODO: Implement Dashboard model later
            // const dashboardResult = await Dashboard.getUserDashboardData(userId, userRole);
            const dashboardResult = { success: true, data: { stats: {} } };

            if (!dashboardResult.success) {
                return res.render('dashboard/index', {
                    title: 'แดשบอร์ด - Rukchai Hongyen LearnHub',
                    user: user,
                    userRole: userRole,
                    error: req.t('cannotLoadDashboardData'),
                    t: t,
                    language: currentLang
                });
            }

            const dashboardData = dashboardResult.data;

            let pageTitle = req.t('dashboard');

            switch (userRole) {
                case 'Admin':
                    pageTitle = req.t('adminDashboard');
                    break;
                case 'HR':
                    pageTitle = req.t('hrDashboard');
                    break;
                case 'Instructor':
                    pageTitle = req.t('instructorDashboard');
                    break;
                case 'Learner':
                    pageTitle = req.t('learnerDashboard');
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

            res.render('dashboard/index', {
                title: `${pageTitle} - Rukchai Hongyen LearnHub`,
                user: user,
                userRole: userRole,
                dashboardData: dashboardData,
                t: t,
                language: currentLang
            });

        } catch (error) {
            console.error('Render dashboard error:', error);
            const { getTranslation, getCurrentLanguage } = require('../utils/languages');
            const currentLang = getCurrentLanguage(req);
            const t = (key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue;
            res.render('dashboard/index', {
                title: 'แดชบอร์ด - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: req.user.role,
                error: req.t('errorLoadingDashboard'),
                t: t,
                language: currentLang
            });
        }
    },

    async getQuickStats(req, res) {
        try {
            const userId = req.user.user_id;
            const userRole = req.user.role;

            let stats = {};

            switch (userRole) {
                case 'Admin':
                    const pool = await poolPromise;
                    const adminStats = await pool.request().query(`
                        SELECT
                            (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
                            (SELECT COUNT(*) FROM courses WHERE status = 'active') as active_courses,
                            (SELECT COUNT(*) FROM user_courses WHERE status = 'enrolled') as active_enrollments,
                            (SELECT COUNT(*) FROM notifications WHERE is_read = 0) as unread_notifications
                    `);
                    stats = adminStats.recordset[0];
                    break;

                case 'Learner':
                    const pool2 = await poolPromise;
                    const learnerStats = await pool2.request()
                        .input('user_id', require('mssql').Int, userId)
                        .query(`
                            SELECT
                                (SELECT COUNT(*) FROM user_courses WHERE user_id = @user_id AND status = 'enrolled') as enrolled_courses,
                                (SELECT COUNT(*) FROM user_courses WHERE user_id = @user_id AND status = 'completed') as completed_courses,
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
                message: req.t('errorLoadingStatisticsData')
            });
        }
    },

    async getNotifications(req, res) {
        try {
            const userId = req.user.user_id;
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
                message: req.t('errorLoadingNotifications')
            });
        }
    },

    async markNotificationAsRead(req, res) {
        try {
            const userId = req.user.user_id;
            const { notification_id } = req.params;

            const result = await Notification.markAsRead(notification_id, userId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json({
                success: true,
                message: req.t('notificationRead')
            });

        } catch (error) {
            console.error('Mark notification as read error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorUpdatingNotification')
            });
        }
    },

    async markAllNotificationsAsRead(req, res) {
        try {
            const userId = req.user.user_id;

            const result = await Notification.markAllAsRead(userId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json({
                success: true,
                message: req.t('allNotificationsRead'),
                affected_rows: result.affected_rows
            });

        } catch (error) {
            console.error('Mark all notifications as read error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorUpdatingNotification')
            });
        }
    },

    async getActivityLogs(req, res) {
        try {
            const userId = req.user.user_id;
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
                message: req.t('errorLoadingActivityHistory')
            });
        }
    },

    async getUserStats(req, res) {
        try {
            const userId = req.user.user_id;

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
                message: req.t('errorLoadingUserStats')
            });
        }
    },

    async getSystemHealth(req, res) {
        try {
            const userRole = req.user.role;

            if (userRole !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionAccessData')
                });
            }

            const pool = await poolPromise;

            const healthData = await pool.request().query(`
                SELECT
                    (SELECT COUNT(*) FROM user_activities WHERE activity_type LIKE '%Error%' AND created_at >= DATEADD(hour, -24, GETDATE())) as errors_24h,
                    (SELECT COUNT(*) FROM user_activities WHERE activity_type LIKE '%Warning%' AND created_at >= DATEADD(hour, -24, GETDATE())) as warnings_24h,
                    (SELECT COUNT(*) FROM user_activities WHERE activity_type LIKE '%Login%' AND created_at >= DATEADD(hour, -24, GETDATE())) as logins_24h,
                    (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
                    (SELECT COUNT(*) FROM users WHERE last_login >= DATEADD(day, -7, GETDATE())) as active_users_week
            `);

            await ActivityLog.create({
                user_id: req.user.user_id,
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
                message: req.t('errorLoadingSystemHealth')
            });
        }
    },

    async getRealTimeData(req, res) {
        try {
            const userId = req.user.user_id;
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
                message: req.t('errorLoadingRealtimeData')
            });
        }
    },

    async trackUserActivity(req, res) {
        try {
            const userId = req.user.user_id;
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
                message: req.t('activitySavedSuccess')
            });

        } catch (error) {
            console.error('Track user activity error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorSavingActivity')
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
                        u.user_id as userId,
                        u.first_name as firstName,
                        u.last_name as lastName,
                        u.profile_image as profileImage,
                        up.total_points as totalPoints,
                        up.level as currentLevel,
                        d.department_name as departmentName
                    FROM users u
                    LEFT JOIN user_profiles up ON u.user_id = up.user_id
                    LEFT JOIN departments d ON u.department_id = d.department_id
                    WHERE u.is_active = 1
                    ORDER BY up.total_points DESC
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
                        d.department_name as departmentName
                    FROM Users u
                    LEFT JOIN TestResults tr ON u.userId = tr.userId
                    LEFT JOIN Departments d ON u.departmentId = d.departmentId
                    WHERE u.isActive = 1
                    GROUP BY u.userId, u.firstName, u.lastName, u.profileImage, d.department_name
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
                message: req.t('errorLoadingLeaderboard')
            });
        }
    },

    async getUpcomingEvents(req, res) {
        try {
            const userId = req.user.user_id;
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
                message: req.t('errorLoadingUpcomingEvents')
            });
        }
    },

    async getRecentCourses(req, res) {
        try {
            const userId = req.user?.user_id || req.session.user?.user_id;
            const pool = await poolPromise;

            // Demo data for now
            const courses = [
                {
                    course_id: 1,
                    title: 'Introduction to Node.js',
                    instructor_name: 'John Doe',
                    thumbnail: '/images/course-default.jpg',
                    progress_percentage: 75
                },
                {
                    course_id: 2,
                    title: 'JavaScript Fundamentals',
                    instructor_name: 'Jane Smith',
                    thumbnail: '/images/course-default.jpg',
                    progress_percentage: 45
                }
            ];

            res.json({
                success: true,
                data: courses
            });

        } catch (error) {
            console.error('Get recent courses error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingRecentCourses')
            });
        }
    },

    async getProgress(req, res) {
        try {
            const userId = req.user?.user_id || req.session.user?.user_id;

            // Demo data for now
            const progress = [
                { title: 'Node.js Advanced', progress_percentage: 85 },
                { title: 'React Development', progress_percentage: 60 },
                { title: 'Database Design', progress_percentage: 30 }
            ];

            res.json({
                success: true,
                data: progress
            });

        } catch (error) {
            console.error('Get progress error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingProgress')
            });
        }
    },

    async getRecentArticles(req, res) {
        try {
            // Demo data for now
            const articles = [
                {
                    article_id: 1,
                    title: 'Getting Started with Express.js',
                    excerpt: 'Learn the basics of Express.js framework...',
                    author_name: 'Admin User',
                    published_at: new Date(),
                    view_count: 125
                },
                {
                    article_id: 2,
                    title: 'Best Practices in JavaScript',
                    excerpt: 'Improve your JavaScript coding skills...',
                    author_name: 'Jane Doe',
                    published_at: new Date(),
                    view_count: 89
                }
            ];

            res.json({
                success: true,
                data: articles
            });

        } catch (error) {
            console.error('Get recent articles error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingRecentArticles')
            });
        }
    },

    async getMyBadges(req, res) {
        try {
            // Demo data for now
            const badges = [
                { name: 'First Login', icon: 'fa-star' },
                { name: 'Course Complete', icon: 'fa-graduation-cap' },
                { name: 'Test Master', icon: 'fa-trophy' },
                { name: 'Article Writer', icon: 'fa-pen' }
            ];

            res.json({
                success: true,
                data: badges
            });

        } catch (error) {
            console.error('Get my badges error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingBadges')
            });
        }
    }
};

module.exports = dashboardController;