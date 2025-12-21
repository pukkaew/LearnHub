const { poolPromise, sql } = require('../config/database');

class Notification {
    static async create(notificationData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('recipient_id', sql.Int, notificationData.recipient_id)
                .input('sender_id', sql.Int, notificationData.sender_id)
                .input('type', sql.VarChar(50), notificationData.type)
                .input('title', sql.NVarChar(255), notificationData.title)
                .input('message', sql.NText, notificationData.message)
                .input('related_table', sql.VarChar(100), notificationData.related_table)
                .input('related_id', sql.Int, notificationData.related_id)
                .input('priority', sql.VarChar(20), notificationData.priority || 'Normal')
                .input('is_system', sql.Bit, notificationData.is_system || false)
                .query(`
                    INSERT INTO Notifications
                    (recipient_id, sender_id, type, title, message, related_table,
                     related_id, priority, is_system)
                    OUTPUT INSERTED.*
                    VALUES
                    (@recipient_id, @sender_id, @type, @title, @message, @related_table,
                     @related_id, @priority, @is_system)
                `);

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error creating notification:', error);
            return { success: false, message: 'Failed to create notification' };
        }
    }

    static async findById(notificationId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('notification_id', sql.Int, notificationId)
                .query(`
                    SELECT n.*,
                           r.first_name + ' ' + r.last_name as recipient_name,
                           s.first_name + ' ' + s.last_name as sender_name
                    FROM Notifications n
                    LEFT JOIN Users r ON n.recipient_id = r.user_id
                    LEFT JOIN Users s ON n.sender_id = s.user_id
                    WHERE n.notification_id = @notification_id
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error finding notification:', error);
            return null;
        }
    }

    static async findByRecipient(recipientId, filters = {}) {
        try {
            const pool = await poolPromise;
            let query = `
                SELECT n.*,
                       s.first_name + ' ' + s.last_name as sender_name,
                       s.profile_image as sender_avatar
                FROM Notifications n
                LEFT JOIN Users s ON n.sender_id = s.user_id
                WHERE n.recipient_id = @recipient_id
            `;

            const request = pool.request()
                .input('recipient_id', sql.Int, recipientId);

            if (filters.is_read !== undefined) {
                query += ' AND n.is_read = @is_read';
                request.input('is_read', sql.Bit, filters.is_read);
            }

            if (filters.type) {
                query += ' AND n.type = @type';
                request.input('type', sql.VarChar(50), filters.type);
            }

            if (filters.priority) {
                query += ' AND n.priority = @priority';
                request.input('priority', sql.VarChar(20), filters.priority);
            }

            query += ' ORDER BY n.priority DESC, n.created_at DESC';

            if (filters.limit) {
                query += ` OFFSET ${filters.offset || 0} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
            }

            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error finding notifications by recipient:', error);
            return [];
        }
    }

    static async markAsRead(notificationId, recipientId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('notification_id', sql.Int, notificationId)
                .input('recipient_id', sql.Int, recipientId)
                .query(`
                    UPDATE Notifications
                    SET is_read = 1, read_at = GETDATE()
                    OUTPUT INSERTED.*
                    WHERE notification_id = @notification_id AND recipient_id = @recipient_id
                `);

            if (result.recordset.length === 0) {
                return { success: false, message: 'Notification not found' };
            }

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return { success: false, message: 'Failed to mark notification as read' };
        }
    }

    static async markAllAsRead(recipientId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('recipient_id', sql.Int, recipientId)
                .query(`
                    UPDATE Notifications
                    SET is_read = 1, read_at = GETDATE()
                    WHERE recipient_id = @recipient_id AND is_read = 0
                `);

            return { success: true, affected_rows: result.rowsAffected[0] };
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return { success: false, message: 'Failed to mark notifications as read' };
        }
    }

    static async delete(notificationId, recipientId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('notification_id', sql.Int, notificationId)
                .input('recipient_id', sql.Int, recipientId)
                .query(`
                    DELETE FROM Notifications
                    WHERE notification_id = @notification_id AND recipient_id = @recipient_id
                `);

            if (result.rowsAffected[0] === 0) {
                return { success: false, message: 'Notification not found' };
            }

            return { success: true, message: 'Notification deleted successfully' };
        } catch (error) {
            console.error('Error deleting notification:', error);
            return { success: false, message: 'Failed to delete notification' };
        }
    }

    static async getUnreadCount(recipientId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('recipient_id', sql.Int, recipientId)
                .query(`
                    SELECT
                        COUNT(*) as total_unread,
                        COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_priority,
                        COUNT(CASE WHEN priority = 'Medium' THEN 1 END) as medium_priority,
                        COUNT(CASE WHEN priority = 'Normal' THEN 1 END) as normal_priority
                    FROM Notifications
                    WHERE recipient_id = @recipient_id AND is_read = 0
                `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting unread count:', error);
            return { total_unread: 0, high_priority: 0, medium_priority: 0, normal_priority: 0 };
        }
    }

    static async sendSystemNotification(userIds, title, message, priority = 'Normal') {
        try {
            const pool = await poolPromise;
            const createdNotifications = [];

            for (const userId of userIds) {
                const result = await pool.request()
                    .input('recipient_id', sql.Int, userId)
                    .input('type', sql.VarChar(50), 'System')
                    .input('title', sql.NVarChar(255), title)
                    .input('message', sql.NText, message)
                    .input('priority', sql.VarChar(20), priority)
                    .input('is_system', sql.Bit, true)
                    .query(`
                        INSERT INTO Notifications
                        (recipient_id, type, title, message, priority, is_system)
                        OUTPUT INSERTED.*
                        VALUES
                        (@recipient_id, @type, @title, @message, @priority, @is_system)
                    `);

                createdNotifications.push(result.recordset[0]);
            }

            return { success: true, data: createdNotifications };
        } catch (error) {
            console.error('Error sending system notification:', error);
            return { success: false, message: 'Failed to send system notification' };
        }
    }

    static async sendCourseNotification(courseId, type, title, message, senderId) {
        try {
            const pool = await poolPromise;

            const enrolledUsers = await pool.request()
                .input('course_id', sql.Int, courseId)
                .query(`
                    SELECT DISTINCT e.user_id
                    FROM user_courses e
                    WHERE e.course_id = @course_id AND e.status = 'active'
                `);

            const userIds = enrolledUsers.recordset.map(u => u.user_id);

            if (userIds.length === 0) {
                return { success: true, message: 'No enrolled users to notify' };
            }

            const createdNotifications = [];

            for (const userId of userIds) {
                const result = await pool.request()
                    .input('recipient_id', sql.Int, userId)
                    .input('sender_id', sql.Int, senderId)
                    .input('type', sql.VarChar(50), type)
                    .input('title', sql.NVarChar(255), title)
                    .input('message', sql.NText, message)
                    .input('related_table', sql.VarChar(100), 'courses')
                    .input('related_id', sql.Int, courseId)
                    .input('is_system', sql.Bit, true)
                    .query(`
                        INSERT INTO Notifications
                        (recipient_id, sender_id, type, title, message, related_table, related_id, is_system)
                        OUTPUT INSERTED.*
                        VALUES
                        (@recipient_id, @sender_id, @type, @title, @message, @related_table, @related_id, @is_system)
                    `);

                createdNotifications.push(result.recordset[0]);
            }

            return { success: true, data: createdNotifications };
        } catch (error) {
            console.error('Error sending course notification:', error);
            return { success: false, message: 'Failed to send course notification' };
        }
    }

    static async cleanupOldNotifications(daysOld = 90) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('days_old', sql.Int, daysOld)
                .query(`
                    DELETE FROM Notifications
                    WHERE created_at < DATEADD(day, -@days_old, GETDATE())
                    AND is_read = 1
                `);

            return { success: true, deleted_count: result.rowsAffected[0] };
        } catch (error) {
            console.error('Error cleaning up old notifications:', error);
            return { success: false, message: 'Failed to cleanup old notifications' };
        }
    }

    static async getNotificationStatistics(userId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('user_id', sql.Int, userId)
                .query(`
                    SELECT
                        COUNT(*) as total_notifications,
                        COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread_count,
                        COUNT(CASE WHEN type = 'Course' THEN 1 END) as course_notifications,
                        COUNT(CASE WHEN type = 'System' THEN 1 END) as system_notifications,
                        COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_priority
                    FROM Notifications
                    WHERE recipient_id = @user_id
                    AND created_at >= DATEADD(day, -30, GETDATE())
                `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting notification statistics:', error);
            return null;
        }
    }
}

module.exports = Notification;
