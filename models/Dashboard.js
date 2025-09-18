const sql = require('mssql');
const database = require('../config/database');

class Dashboard {
    static async getUserDashboardData(userId, userRole) {
        try {
            const pool = await database.getConnection();
            const dashboardData = {};

            switch (userRole) {
                case 'Admin':
                    dashboardData.stats = await this.getAdminStats(pool);
                    dashboardData.recentActivities = await this.getRecentSystemActivities(pool);
                    dashboardData.userAnalytics = await this.getUserAnalytics(pool);
                    dashboardData.systemHealth = await this.getSystemHealth(pool);
                    break;

                case 'HR':
                    dashboardData.stats = await this.getHRStats(pool);
                    dashboardData.recentApplicants = await this.getRecentApplicants(pool);
                    dashboardData.testStatistics = await this.getTestStatistics(pool);
                    dashboardData.departmentStats = await this.getDepartmentStats(pool);
                    break;

                case 'Instructor':
                    dashboardData.stats = await this.getInstructorStats(pool, userId);
                    dashboardData.myCourses = await this.getInstructorCourses(pool, userId);
                    dashboardData.recentEnrollments = await this.getRecentEnrollments(pool, userId);
                    dashboardData.studentProgress = await this.getStudentProgress(pool, userId);
                    break;

                case 'Learner':
                    dashboardData.stats = await this.getLearnerStats(pool, userId);
                    dashboardData.enrolledCourses = await this.getEnrolledCourses(pool, userId);
                    dashboardData.recentAchievements = await this.getRecentAchievements(pool, userId);
                    dashboardData.recommendations = await this.getCourseRecommendations(pool, userId);
                    dashboardData.gamification = await this.getGamificationData(pool, userId);
                    break;

                default:
                    return { success: false, message: 'Invalid user role' };
            }

            dashboardData.notifications = await this.getRecentNotifications(pool, userId);
            return { success: true, data: dashboardData };
        } catch (error) {
            console.error('Error getting dashboard data:', error);
            return { success: false, message: 'Failed to get dashboard data' };
        }
    }

    static async getAdminStats(pool) {
        try {
            const result = await pool.request().query(`
                SELECT
                    (SELECT COUNT(*) FROM Users WHERE is_active = 1) as active_users,
                    (SELECT COUNT(*) FROM Courses WHERE is_active = 1) as active_courses,
                    (SELECT COUNT(*) FROM CourseEnrollments WHERE status = 'Active') as active_enrollments,
                    (SELECT COUNT(*) FROM TestAttempts WHERE created_at >= DATEADD(day, -7, GETDATE())) as tests_this_week,
                    (SELECT COUNT(*) FROM Applicants WHERE created_at >= DATEADD(day, -30, GETDATE())) as applicants_this_month,
                    (SELECT COUNT(*) FROM ActivityLogs WHERE created_at >= DATEADD(day, -1, GETDATE())) as activities_today,
                    (SELECT AVG(CAST(total_score as FLOAT)) FROM TestAttempts WHERE created_at >= DATEADD(day, -30, GETDATE())) as avg_test_score,
                    (SELECT COUNT(*) FROM Notifications WHERE is_read = 0) as unread_notifications
            `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting admin stats:', error);
            return {};
        }
    }

    static async getHRStats(pool) {
        try {
            const result = await pool.request().query(`
                SELECT
                    (SELECT COUNT(*) FROM Applicants WHERE status = 'Pending') as pending_applicants,
                    (SELECT COUNT(*) FROM Applicants WHERE status = 'Passed') as passed_applicants,
                    (SELECT COUNT(*) FROM Applicants WHERE status = 'Failed') as failed_applicants,
                    (SELECT COUNT(*) FROM JobPositions WHERE is_active = 1) as active_positions,
                    (SELECT COUNT(*) FROM TestAttempts ta
                     JOIN Applicants a ON ta.applicant_id = a.applicant_id
                     WHERE ta.created_at >= DATEADD(day, -7, GETDATE())) as tests_this_week,
                    (SELECT AVG(CAST(total_score as FLOAT)) FROM TestAttempts ta
                     JOIN Applicants a ON ta.applicant_id = a.applicant_id
                     WHERE ta.created_at >= DATEADD(day, -30, GETDATE())) as avg_applicant_score,
                    (SELECT COUNT(DISTINCT a.applicant_id) FROM Applicants a
                     WHERE a.created_at >= DATEADD(day, -30, GETDATE())) as new_applicants_this_month
            `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting HR stats:', error);
            return {};
        }
    }

    static async getInstructorStats(pool, userId) {
        try {
            const result = await pool.request()
                .input('user_id', sql.UniqueIdentifier, userId)
                .query(`
                    SELECT
                        (SELECT COUNT(*) FROM Courses WHERE instructor_id = @user_id AND is_active = 1) as my_courses,
                        (SELECT COUNT(*) FROM CourseEnrollments e
                         JOIN Courses c ON e.course_id = c.course_id
                         WHERE c.instructor_id = @user_id AND e.status = 'Active') as total_students,
                        (SELECT COUNT(*) FROM CourseEnrollments e
                         JOIN Courses c ON e.course_id = c.course_id
                         WHERE c.instructor_id = @user_id AND e.completion_status = 'Completed') as completed_enrollments,
                        (SELECT AVG(CAST(e.progress_percentage as FLOAT)) FROM CourseEnrollments e
                         JOIN Courses c ON e.course_id = c.course_id
                         WHERE c.instructor_id = @user_id AND e.status = 'Active') as avg_progress,
                        (SELECT COUNT(*) FROM TestAttempts ta
                         JOIN Tests t ON ta.test_id = t.test_id
                         JOIN Courses c ON t.course_id = c.course_id
                         WHERE c.instructor_id = @user_id AND ta.created_at >= DATEADD(day, -7, GETDATE())) as tests_this_week,
                        (SELECT AVG(CAST(ta.total_score as FLOAT)) FROM TestAttempts ta
                         JOIN Tests t ON ta.test_id = t.test_id
                         JOIN Courses c ON t.course_id = c.course_id
                         WHERE c.instructor_id = @user_id AND ta.created_at >= DATEADD(day, -30, GETDATE())) as avg_test_score
                `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting instructor stats:', error);
            return {};
        }
    }

    static async getLearnerStats(pool, userId) {
        try {
            const result = await pool.request()
                .input('user_id', sql.UniqueIdentifier, userId)
                .query(`
                    SELECT
                        (SELECT COUNT(*) FROM CourseEnrollments WHERE user_id = @user_id AND status = 'Active') as enrolled_courses,
                        (SELECT COUNT(*) FROM CourseEnrollments WHERE user_id = @user_id AND completion_status = 'Completed') as completed_courses,
                        (SELECT COUNT(*) FROM TestAttempts WHERE user_id = @user_id) as total_tests_taken,
                        (SELECT AVG(CAST(total_score as FLOAT)) FROM TestAttempts WHERE user_id = @user_id) as avg_test_score,
                        (SELECT COUNT(*) FROM UserBadges WHERE user_id = @user_id) as total_badges,
                        (SELECT SUM(points_earned) FROM user_points WHERE user_id = @user_id) as total_points,
                        (SELECT AVG(CAST(progress_percentage as FLOAT)) FROM CourseEnrollments WHERE user_id = @user_id AND status = 'Active') as avg_progress,
                        (SELECT COUNT(*) FROM certificates WHERE user_id = @user_id) as certificates_earned
                `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting learner stats:', error);
            return {};
        }
    }

    static async getRecentSystemActivities(pool, limit = 10) {
        try {
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit)
                        al.action,
                        al.description,
                        al.created_at,
                        al.severity,
                        al.module,
                        u.first_name + ' ' + u.last_name as user_name
                    FROM ActivityLogs al
                    LEFT JOIN Users u ON al.user_id = u.user_id
                    WHERE al.severity IN ('Warning', 'Error', 'Critical')
                    ORDER BY al.created_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting recent system activities:', error);
            return [];
        }
    }

    static async getRecentApplicants(pool, limit = 10) {
        try {
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit)
                        a.first_name + ' ' + a.last_name as applicant_name,
                        a.status,
                        a.created_at,
                        jp.position_name,
                        d.name as department_name,
                        (SELECT AVG(CAST(total_score as FLOAT)) FROM TestAttempts ta WHERE ta.applicant_id = a.applicant_id) as avg_score
                    FROM Applicants a
                    JOIN JobPositions jp ON a.position_id = jp.position_id
                    LEFT JOIN Departments d ON jp.department_id = d.department_id
                    ORDER BY a.created_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting recent Applicants:', error);
            return [];
        }
    }

    static async getInstructorCourses(pool, userId, limit = 5) {
        try {
            const result = await pool.request()
                .input('user_id', sql.UniqueIdentifier, userId)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit)
                        c.course_id,
                        c.title,
                        c.description,
                        c.is_active,
                        COUNT(e.enrollment_id) as student_count,
                        AVG(CAST(e.progress_percentage as FLOAT)) as avg_progress
                    FROM Courses c
                    LEFT JOIN CourseEnrollments e ON c.course_id = e.course_id AND e.status = 'Active'
                    WHERE c.instructor_id = @user_id
                    GROUP BY c.course_id, c.title, c.description, c.is_active, c.created_at
                    ORDER BY c.created_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting instructor Courses:', error);
            return [];
        }
    }

    static async getEnrolledCourses(pool, userId, limit = 5) {
        try {
            const result = await pool.request()
                .input('user_id', sql.UniqueIdentifier, userId)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit)
                        c.course_id,
                        c.title,
                        c.description,
                        e.progress_percentage,
                        e.completion_status,
                        e.enrolled_at,
                        u.first_name + ' ' + u.last_name as instructor_name
                    FROM CourseEnrollments e
                    JOIN Courses c ON e.course_id = c.course_id
                    LEFT JOIN Users u ON c.instructor_id = u.user_id
                    WHERE e.user_id = @user_id AND e.status = 'Active'
                    ORDER BY e.enrolled_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting enrolled Courses:', error);
            return [];
        }
    }

    static async getRecentAchievements(pool, userId, limit = 5) {
        try {
            const result = await pool.request()
                .input('user_id', sql.UniqueIdentifier, userId)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) 'Badge' as type,
                           b.name as title,
                           b.description,
                           ub.awarded_at as achieved_at,
                           b.icon_url
                    FROM UserBadges ub
                    JOIN Badges b ON ub.badge_id = b.badge_id
                    WHERE ub.user_id = @user_id

                    UNION ALL

                    SELECT TOP (@limit) 'Certificate' as type,
                           c.certificate_name as title,
                           'Course completion certificate' as description,
                           c.issued_at as achieved_at,
                           null as icon_url
                    FROM certificates c
                    WHERE c.user_id = @user_id

                    ORDER BY achieved_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting recent achievements:', error);
            return [];
        }
    }

    static async getCourseRecommendations(pool, userId, limit = 3) {
        try {
            const result = await pool.request()
                .input('user_id', sql.UniqueIdentifier, userId)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit)
                        c.course_id,
                        c.title,
                        c.description,
                        c.difficulty_level,
                        c.estimated_duration,
                        u.first_name + ' ' + u.last_name as instructor_name,
                        COUNT(e.enrollment_id) as enrollment_count,
                        AVG(CAST(cr.rating as FLOAT)) as avg_rating
                    FROM Courses c
                    LEFT JOIN Users u ON c.instructor_id = u.user_id
                    LEFT JOIN CourseEnrollments e ON c.course_id = e.course_id
                    LEFT JOIN course_ratings cr ON c.course_id = cr.course_id
                    WHERE c.is_active = 1
                    AND c.course_id NOT IN (
                        SELECT course_id FROM CourseEnrollments
                        WHERE user_id = @user_id
                    )
                    GROUP BY c.course_id, c.title, c.description, c.difficulty_level,
                             c.estimated_duration, u.first_name, u.last_name
                    ORDER BY AVG(CAST(cr.rating as FLOAT)) DESC, COUNT(e.enrollment_id) DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting course recommendations:', error);
            return [];
        }
    }

    static async getGamificationData(pool, userId) {
        try {
            const result = await pool.request()
                .input('user_id', sql.UniqueIdentifier, userId)
                .query(`
                    SELECT
                        (SELECT SUM(points_earned) FROM user_points WHERE user_id = @user_id) as total_points,
                        (SELECT COUNT(*) FROM UserBadges WHERE user_id = @user_id) as total_badges,
                        (SELECT level_name FROM user_levels ul
                         WHERE ul.min_points <= (SELECT SUM(points_earned) FROM user_points WHERE user_id = @user_id)
                         AND ul.max_points >= (SELECT SUM(points_earned) FROM user_points WHERE user_id = @user_id)) as current_level,
                        (SELECT ROW_NUMBER() OVER (ORDER BY SUM(points_earned) DESC) as rank
                         FROM user_points
                         GROUP BY user_id
                         HAVING user_id = @user_id) as leaderboard_rank
                `);

            const badges = await pool.request()
                .input('user_id', sql.UniqueIdentifier, userId)
                .query(`
                    SELECT TOP 5 b.name, b.description, b.icon_url, ub.awarded_at
                    FROM UserBadges ub
                    JOIN Badges b ON ub.badge_id = b.badge_id
                    WHERE ub.user_id = @user_id AND ub.is_displayed = 1
                    ORDER BY ub.awarded_at DESC
                `);

            const data = result.recordset[0] || {};
            data.recent_badges = badges.recordset;
            return data;
        } catch (error) {
            console.error('Error getting gamification data:', error);
            return {};
        }
    }

    static async getRecentNotifications(pool, userId, limit = 5) {
        try {
            const result = await pool.request()
                .input('user_id', sql.UniqueIdentifier, userId)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit)
                        n.notification_id,
                        n.title,
                        n.message,
                        n.type,
                        n.priority,
                        n.is_read,
                        n.created_at,
                        s.first_name + ' ' + s.last_name as sender_name
                    FROM Notifications n
                    LEFT JOIN Users s ON n.sender_id = s.user_id
                    WHERE n.recipient_id = @user_id
                    ORDER BY n.created_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting recent Notifications:', error);
            return [];
        }
    }

    static async getUserAnalytics(pool) {
        try {
            const result = await pool.request().query(`
                SELECT
                    role,
                    COUNT(*) as user_count,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count,
                    COUNT(CASE WHEN last_login >= DATEADD(day, -7, GETDATE()) THEN 1 END) as active_last_week,
                    COUNT(CASE WHEN last_login >= DATEADD(day, -30, GETDATE()) THEN 1 END) as active_last_month
                FROM Users
                GROUP BY role
                ORDER BY user_count DESC
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting user analytics:', error);
            return [];
        }
    }

    static async getSystemHealth(pool) {
        try {
            const result = await pool.request().query(`
                SELECT
                    (SELECT COUNT(*) FROM ActivityLogs WHERE severity = 'Error' AND created_at >= DATEADD(hour, -24, GETDATE())) as errors_24h,
                    (SELECT COUNT(*) FROM ActivityLogs WHERE severity = 'Warning' AND created_at >= DATEADD(hour, -24, GETDATE())) as warnings_24h,
                    (SELECT COUNT(*) FROM ActivityLogs WHERE action LIKE '%Login%' AND created_at >= DATEADD(hour, -24, GETDATE())) as logins_24h,
                    (SELECT COUNT(*) FROM Notifications WHERE created_at >= DATEADD(hour, -24, GETDATE())) as notifications_24h
            `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting system health:', error);
            return {};
        }
    }

    static async getTestStatistics(pool) {
        try {
            const result = await pool.request().query(`
                SELECT
                    COUNT(*) as total_tests,
                    COUNT(CASE WHEN ta.created_at >= DATEADD(day, -7, GETDATE()) THEN 1 END) as tests_this_week,
                    COUNT(CASE WHEN ta.created_at >= DATEADD(day, -30, GETDATE()) THEN 1 END) as tests_this_month,
                    AVG(CAST(ta.total_score as FLOAT)) as avg_score,
                    COUNT(CASE WHEN ta.status = 'Passed' THEN 1 END) as passed_count,
                    COUNT(CASE WHEN ta.status = 'Failed' THEN 1 END) as failed_count
                FROM TestAttempts ta
                WHERE ta.created_at >= DATEADD(day, -90, GETDATE())
            `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting test statistics:', error);
            return {};
        }
    }

    static async getDepartmentStats(pool) {
        try {
            const result = await pool.request().query(`
                SELECT
                    d.name as department_name,
                    COUNT(jp.position_id) as active_positions,
                    COUNT(a.applicant_id) as total_applicants,
                    COUNT(CASE WHEN a.status = 'Passed' THEN 1 END) as passed_applicants,
                    AVG(CAST(ta.total_score as FLOAT)) as avg_test_score
                FROM Departments d
                LEFT JOIN JobPositions jp ON d.department_id = jp.department_id AND jp.is_active = 1
                LEFT JOIN Applicants a ON jp.position_id = a.position_id
                LEFT JOIN TestAttempts ta ON a.applicant_id = ta.applicant_id
                GROUP BY d.department_id, d.name
                ORDER BY COUNT(a.applicant_id) DESC
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting department stats:', error);
            return [];
        }
    }

    static async getRecentEnrollments(pool, instructorId, limit = 10) {
        try {
            const result = await pool.request()
                .input('instructor_id', sql.UniqueIdentifier, instructorId)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit)
                        u.first_name + ' ' + u.last_name as student_name,
                        c.title as course_title,
                        e.enrolled_at,
                        e.progress_percentage,
                        e.completion_status
                    FROM CourseEnrollments e
                    JOIN Users u ON e.user_id = u.user_id
                    JOIN Courses c ON e.course_id = c.course_id
                    WHERE c.instructor_id = @instructor_id
                    ORDER BY e.enrolled_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting recent CourseEnrollments:', error);
            return [];
        }
    }

    static async getStudentProgress(pool, instructorId) {
        try {
            const result = await pool.request()
                .input('instructor_id', sql.UniqueIdentifier, instructorId)
                .query(`
                    SELECT
                        c.title as course_title,
                        COUNT(e.enrollment_id) as total_students,
                        COUNT(CASE WHEN e.completion_status = 'Completed' THEN 1 END) as completed_students,
                        AVG(CAST(e.progress_percentage as FLOAT)) as avg_progress,
                        COUNT(CASE WHEN e.progress_percentage = 0 THEN 1 END) as not_started
                    FROM Courses c
                    LEFT JOIN CourseEnrollments e ON c.course_id = e.course_id AND e.status = 'Active'
                    WHERE c.instructor_id = @instructor_id AND c.is_active = 1
                    GROUP BY c.course_id, c.title
                    ORDER BY total_students DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting student progress:', error);
            return [];
        }
    }
}

module.exports = Dashboard;