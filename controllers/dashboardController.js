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

            const userName = req.session?.user ? `${req.session.user.first_name || ''} ${req.session.user.last_name || ''}`.trim() : 'User';
            await ActivityLog.create({
                user_id: userId,
                action: 'View_Dashboard',
                table_name: 'dashboard',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `${userName || userRole || 'User'} viewed dashboard`,
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

            const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'User';
            await ActivityLog.create({
                user_id: userId,
                action: 'View_Dashboard',
                table_name: 'dashboard',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `${userName || userRole || 'User'} viewed dashboard page`,
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
            const userRole = req.user.role_name || req.user.role;
            const pool = await poolPromise;

            let stats = {};

            switch (userRole) {
                case 'Admin':
                case 'HR':
                    const adminStats = await pool.request().query(`
                        SELECT
                            (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
                            (SELECT COUNT(*) FROM courses WHERE status IN ('active', 'Active', 'Published') OR is_active = 1) as active_courses,
                            (SELECT COUNT(*) FROM user_courses) as active_enrollments,
                            (SELECT COUNT(*) FROM notifications WHERE is_read = 0) as unread_notifications,
                            CAST(
                                CASE WHEN (SELECT COUNT(*) FROM user_courses) = 0 THEN 0
                                ELSE (SELECT COUNT(*) FROM user_courses WHERE status = 'completed') * 100.0 /
                                     (SELECT COUNT(*) FROM user_courses)
                                END AS INT
                            ) as completion_rate,
                            (SELECT COUNT(*) FROM users WHERE is_active = 1
                             AND created_at >= DATEADD(week, -1, GETDATE())) as new_users_week,
                            (SELECT COUNT(*) FROM user_courses
                             WHERE enrollment_date >= DATEADD(month, -1, GETDATE())) as new_enrollments_month
                    `);
                    stats = adminStats.recordset[0];
                    break;

                case 'Instructor':
                case 'Learner':
                default:
                    const learnerStats = await pool.request()
                        .input('user_id', require('mssql').Int, userId)
                        .query(`
                            SELECT
                                (SELECT COUNT(*) FROM user_courses WHERE user_id = @user_id
                                 AND status IN ('enrolled', 'in_progress')) as enrolled_courses,
                                (SELECT COUNT(*) FROM user_courses WHERE user_id = @user_id
                                 AND status = 'completed') as completed_courses,
                                (SELECT COUNT(*) FROM TestAttempts WHERE user_id = @user_id
                                 AND status = 'Completed') as total_tests,
                                (SELECT ISNULL(AVG(CAST(percentage AS FLOAT)), 0) FROM TestAttempts
                                 WHERE user_id = @user_id AND status = 'Completed') as avg_test_score,
                                (SELECT ISNULL(SUM(time_spent_seconds), 0) FROM user_material_progress
                                 WHERE user_id = @user_id) as total_learning_time,
                                (SELECT COUNT(*) FROM user_courses WHERE user_id = @user_id
                                 AND status = 'completed') as certificates_earned
                        `);

                    const rawStats = learnerStats.recordset[0];

                    // Calculate points: 100 per completed course + avg test score * 10
                    const completedCourses = rawStats.completed_courses || 0;
                    const avgScore = rawStats.avg_test_score || 0;
                    const testsCompleted = rawStats.total_tests || 0;
                    const calculatedPoints = (completedCourses * 100) + Math.round(avgScore * testsCompleted);

                    // Calculate level: every 500 points = 1 level
                    const calculatedLevel = Math.max(1, Math.floor(calculatedPoints / 500) + 1);

                    stats = {
                        enrolled_courses: rawStats.enrolled_courses || 0,
                        completed_courses: completedCourses,
                        total_tests: testsCompleted,
                        avg_test_score: Math.round(avgScore),
                        total_learning_time: rawStats.total_learning_time || 0,
                        certificates_earned: rawStats.certificates_earned || 0,
                        total_points: calculatedPoints,
                        user_level: calculatedLevel,
                        total_badges: Math.min(completedCourses, 5) // Badge per completed course, max 5
                    };
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
                .input('user_id', require('mssql').Int, userId)
                .query(`
                    SELECT
                        (SELECT COUNT(*) FROM courses WHERE status IN ('active', 'Active', 'Published') OR is_active = 1) as totalCourses,
                        (SELECT COUNT(*) FROM tests WHERE status = 'active') as totalTests,
                        (SELECT COUNT(*) FROM users WHERE is_active = 1) as totalUsers,
                        (SELECT COUNT(*) FROM user_courses WHERE user_id = @user_id AND status = 'completed') as completedCourses,
                        (SELECT COUNT(*) FROM test_results WHERE user_id = @user_id) as completedTests,
                        (SELECT AVG(CAST(score AS FLOAT)) FROM test_results WHERE user_id = @user_id) as averageScore,
                        (SELECT COUNT(*) FROM notifications WHERE recipient_id = @user_id AND is_read = 0) as unreadNotifications
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
                        u.user_id as userId,
                        u.first_name as firstName,
                        u.last_name as lastName,
                        u.profile_image as profileImage,
                        COUNT(tr.test_result_id) as completedTests,
                        AVG(CAST(tr.score AS FLOAT)) as averageScore,
                        d.department_name as departmentName
                    FROM users u
                    LEFT JOIN test_results tr ON u.user_id = tr.user_id
                    LEFT JOIN departments d ON u.department_id = d.department_id
                    WHERE u.is_active = 1
                    GROUP BY u.user_id, u.first_name, u.last_name, u.profile_image, d.department_name
                    ORDER BY COUNT(tr.test_result_id) DESC, AVG(CAST(tr.score AS FLOAT)) DESC
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
                .input('user_id', require('mssql').Int, userId)
                .query(`
                    SELECT TOP 10
                        'test' as eventType,
                        t.test_id as eventId,
                        t.title,
                        t.description,
                        t.start_date as eventDate,
                        t.end_date as endDate,
                        c.title as courseName,
                        'fas fa-clipboard-check' as icon,
                        'bg-blue-100 text-blue-800' as badgeClass
                    FROM tests t
                    INNER JOIN courses c ON t.course_id = c.course_id
                    LEFT JOIN user_courses uc ON c.course_id = uc.course_id AND uc.user_id = @user_id
                    LEFT JOIN test_results tr ON t.test_id = tr.test_id AND tr.user_id = @user_id
                    WHERE (t.status IN ('active', 'Active', 'Published') OR t.is_active = 1)
                    AND t.start_date > GETDATE()
                    AND (uc.user_id IS NOT NULL OR c.is_public = 1)
                    AND tr.test_id IS NULL

                    UNION ALL

                    SELECT TOP 10
                        'course' as eventType,
                        c.course_id as eventId,
                        c.title,
                        c.description,
                        c.start_date as eventDate,
                        c.end_date as endDate,
                        NULL as courseName,
                        'fas fa-book' as icon,
                        'bg-green-100 text-green-800' as badgeClass
                    FROM courses c
                    LEFT JOIN user_courses uc ON c.course_id = uc.course_id AND uc.user_id = @user_id
                    WHERE (c.status IN ('active', 'Active', 'Published') OR c.is_active = 1)
                    AND c.start_date > GETDATE()
                    AND (uc.user_id IS NULL OR uc.status = 'not_started')
                    AND (c.is_public = 1 OR uc.user_id IS NOT NULL)

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

            const result = await pool.request()
                .input('user_id', require('mssql').Int, userId)
                .query(`
                    SELECT TOP 5
                        c.course_id,
                        c.title,
                        c.thumbnail,
                        c.description,
                        CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                        uc.progress as progress_percentage,
                        uc.status,
                        uc.last_access_date as last_accessed_at
                    FROM user_courses uc
                    INNER JOIN courses c ON uc.course_id = c.course_id
                    LEFT JOIN users u ON c.instructor_id = u.user_id
                    WHERE uc.user_id = @user_id
                        AND uc.status IN ('enrolled', 'in_progress', 'active')
                    ORDER BY uc.last_access_date DESC, uc.enrollment_date DESC
                `);

            res.json({
                success: true,
                data: result.recordset.map(c => ({
                    course_id: c.course_id,
                    title: c.title || 'Untitled Course',
                    thumbnail: c.thumbnail || '/images/course-default.svg',
                    instructor_name: c.instructor_name || '',
                    progress_percentage: c.progress_percentage || 0,
                    status: c.status
                }))
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
            const pool = await poolPromise;

            const result = await pool.request()
                .input('user_id', require('mssql').Int, userId)
                .query(`
                    SELECT TOP 5
                        c.course_id,
                        c.title,
                        uc.progress as progress_percentage,
                        uc.status,
                        uc.enrollment_date,
                        uc.completion_date as completed_at
                    FROM user_courses uc
                    INNER JOIN courses c ON uc.course_id = c.course_id
                    WHERE uc.user_id = @user_id
                        AND uc.status IN ('enrolled', 'in_progress', 'completed', 'active')
                    ORDER BY
                        CASE WHEN uc.status IN ('in_progress', 'active') AND uc.progress > 0 THEN 1
                             WHEN uc.status IN ('enrolled', 'active') AND uc.progress = 0 THEN 2
                             ELSE 3 END,
                        uc.progress DESC
                `);

            res.json({
                success: true,
                data: result.recordset.map(p => ({
                    course_id: p.course_id,
                    title: p.title || 'Untitled Course',
                    progress_percentage: p.progress_percentage || 0,
                    status: p.status
                }))
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
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT TOP 6
                    a.article_id,
                    a.title,
                    a.excerpt,
                    a.featured_image as thumbnail,
                    a.views_count as view_count,
                    a.published_at,
                    a.created_at,
                    CONCAT(u.first_name, ' ', u.last_name) as author_name
                FROM articles a
                LEFT JOIN users u ON a.author_id = u.user_id
                WHERE a.status = 'published'
                ORDER BY a.published_at DESC, a.created_at DESC
            `);

            res.json({
                success: true,
                data: result.recordset.map(a => ({
                    article_id: a.article_id,
                    title: a.title,
                    excerpt: a.excerpt,
                    thumbnail: a.thumbnail,
                    author_name: a.author_name || 'Unknown',
                    published_at: a.published_at || a.created_at,
                    view_count: a.view_count || 0
                }))
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
            // Badge tables not yet implemented - return empty array
            res.json({
                success: true,
                data: []
            });

        } catch (error) {
            console.error('Get my badges error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingBadges')
            });
        }
    },

    async getRecentRegistrations(req, res) {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT TOP 10
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.profile_image,
                    u.created_at,
                    r.role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.role_id
                WHERE u.is_active = 1
                ORDER BY u.created_at DESC
            `);

            res.json({
                success: true,
                data: result.recordset.map(u => ({
                    user_id: u.user_id,
                    name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown',
                    email: u.email,
                    profile_image: u.profile_image,
                    role_name: u.role_name,
                    registered: u.created_at
                }))
            });

        } catch (error) {
            console.error('Get recent registrations error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingRecentRegistrations')
            });
        }
    },

    async getTopCourses(req, res) {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT TOP 5
                    c.course_id,
                    c.title,
                    c.thumbnail,
                    COUNT(uc.user_id) as enrollments,
                    CAST(
                        (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id AND status = 'completed') * 100.0 /
                        NULLIF(COUNT(uc.user_id), 0)
                    AS INT) as completion_rate
                FROM courses c
                LEFT JOIN user_courses uc ON c.course_id = uc.course_id
                WHERE (c.status IN ('active', 'Active', 'Published') OR c.is_active = 1)
                GROUP BY c.course_id, c.title, c.thumbnail
                ORDER BY COUNT(uc.user_id) DESC
            `);

            res.json({
                success: true,
                data: result.recordset.map(c => ({
                    course_id: c.course_id,
                    title: c.title,
                    thumbnail: c.thumbnail,
                    enrollments: c.enrollments || 0,
                    completion_rate: c.completion_rate || 0
                }))
            });

        } catch (error) {
            console.error('Get top courses error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingTopCourses')
            });
        }
    },

    // Get expiring/due training courses for the current user
    async getExpiringCourses(req, res) {
        try {
            const userId = req.user.user_id;
            const pool = await poolPromise;

            const result = await pool.request()
                .input('userId', require('mssql').Int, userId)
                .query(`
                    SELECT
                        uc.enrollment_id,
                        uc.course_id,
                        c.title as course_name,
                        c.thumbnail,
                        uc.completion_date,
                        uc.certificate_expiry_date,
                        uc.renewal_status,
                        uc.training_year,
                        DATEDIFF(day, GETDATE(), uc.certificate_expiry_date) as days_until_expiry,
                        c.recurrence_type,
                        c.recurrence_months
                    FROM user_courses uc
                    JOIN courses c ON uc.course_id = c.course_id
                    WHERE uc.user_id = @userId
                    AND c.is_recurring = 1
                    AND uc.status = 'completed'
                    AND uc.certificate_expiry_date IS NOT NULL
                    AND uc.renewal_status IN ('due_soon', 'expired')
                    ORDER BY uc.certificate_expiry_date ASC
                `);

            res.json({
                success: true,
                data: result.recordset
            });
        } catch (error) {
            console.error('Get expiring courses error:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading expiring courses'
            });
        }
    },

    // Get recurring training compliance stats (for Admin/HR)
    async getComplianceStats(req, res) {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT
                    c.course_id,
                    c.title as course_name,
                    c.recurrence_type,
                    c.recurrence_months,
                    COUNT(DISTINCT uc.user_id) as total_trained,
                    SUM(CASE WHEN uc.renewal_status = 'valid' THEN 1 ELSE 0 END) as valid_certificates,
                    SUM(CASE WHEN uc.renewal_status = 'due_soon' THEN 1 ELSE 0 END) as expiring_soon,
                    SUM(CASE WHEN uc.renewal_status = 'expired' THEN 1 ELSE 0 END) as expired
                FROM courses c
                LEFT JOIN user_courses uc ON c.course_id = uc.course_id AND uc.status = 'completed'
                WHERE c.is_recurring = 1
                AND c.is_published = 1
                GROUP BY c.course_id, c.title, c.recurrence_type, c.recurrence_months
                ORDER BY expired DESC, expiring_soon DESC
            `);

            res.json({
                success: true,
                data: result.recordset
            });
        } catch (error) {
            console.error('Get compliance stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading compliance stats'
            });
        }
    }
};

module.exports = dashboardController;