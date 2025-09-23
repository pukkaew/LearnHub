const { poolPromise, sql } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Badge {
    constructor(data) {
        this.badge_id = data.badge_id;
        this.badge_name = data.badge_name;
        this.badge_description = data.badge_description;
        this.badge_type = data.badge_type;
        this.badge_image = data.badge_image;
        this.criteria = data.criteria;
        this.points_required = data.points_required;
        this.is_active = data.is_active;
    }

    // Create new badge
    static async create(badgeData) {
        try {
            const pool = await poolPromise;
            const badgeId = uuidv4();

            const result = await pool.request()
                .input('badgeId', sql.Int, badgeId)
                .input('badgeName', sql.NVarChar(100), badgeData.badge_name)
                .input('badgeDescription', sql.NVarChar(500), badgeData.badge_description || null)
                .input('badgeType', sql.NVarChar(50), badgeData.badge_type)
                .input('badgeImage', sql.NVarChar(500), badgeData.badge_image || null)
                .input('criteria', sql.NVarChar(500), badgeData.criteria || null)
                .input('pointsRequired', sql.Int, badgeData.points_required || 0)
                .query(`
                    INSERT INTO Badges (
                        badge_id, badge_name, badge_description, badge_type,
                        badge_image, criteria, points_required, is_active, created_date
                    ) VALUES (
                        @badgeId, @badgeName, @badgeDescription, @badgeType,
                        @badgeImage, @criteria, @pointsRequired, 1, GETDATE()
                    )
                `);

            return {
                success: true,
                badgeId: badgeId
            };
        } catch (error) {
            throw new Error(`Error creating badge: ${error.message}`);
        }
    }

    // Get all badges
    static async findAll(filters = {}) {
        try {
            const pool = await poolPromise;
            const request = pool.request();

            let whereClause = 'WHERE b.is_active = 1';

            if (filters.badge_type) {
                whereClause += ' AND b.badge_type = @badgeType';
                request.input('badgeType', sql.NVarChar(50), filters.badge_type);
            }

            const result = await request.query(`
                SELECT b.*,
                       COUNT(ub.user_badge_id) as earned_count
                FROM Badges b
                LEFT JOIN UserBadges ub ON b.badge_id = ub.badge_id
                ${whereClause}
                GROUP BY b.badge_id, b.badge_name, b.badge_description, b.badge_type,
                         b.badge_image, b.criteria, b.points_required, b.is_active, b.created_date
                ORDER BY b.badge_type, b.created_date
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching badges: ${error.message}`);
        }
    }

    // Award badge to user
    static async awardToUser(badgeId, userId) {
        try {
            const pool = await poolPromise;

            // Check if user already has this badge
            const existingCheck = await pool.request()
                .input('badgeId', sql.Int, badgeId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT user_badge_id
                    FROM UserBadges
                    WHERE badge_id = @badgeId AND user_id = @userId
                `);

            if (existingCheck.recordset.length > 0) {
                return { success: false, message: 'User already has this badge' };
            }

            // Get badge info
            const badgeInfo = await pool.request()
                .input('badgeId', sql.Int, badgeId)
                .query(`
                    SELECT badge_name, badge_type
                    FROM Badges
                    WHERE badge_id = @badgeId AND is_active = 1
                `);

            if (badgeInfo.recordset.length === 0) {
                return { success: false, message: 'Badge not found' };
            }

            // Award badge
            const userBadgeId = uuidv4();
            await pool.request()
                .input('userBadgeId', sql.Int, userBadgeId)
                .input('userId', sql.Int, userId)
                .input('badgeId', sql.Int, badgeId)
                .query(`
                    INSERT INTO UserBadges (user_badge_id, user_id, badge_id, earned_date)
                    VALUES (@userBadgeId, @userId, @badgeId, GETDATE())
                `);

            // Send notification
            await pool.request()
                .input('notificationId', sql.Int, uuidv4())
                .input('userId', sql.Int, userId)
                .input('title', sql.NVarChar(200), 'New Badge Earned!')
                .input('message', sql.NVarChar(1000),
                    `Congratulations! You've earned the "${badgeInfo.recordset[0].badge_name}" badge.`)
                .input('link', sql.NVarChar(500), '/profile/badges')
                .query(`
                    INSERT INTO Notifications (
                        notification_id, user_id, notification_type, title, message, link
                    ) VALUES (
                        @notificationId, @userId, 'BADGE_EARNED', @title, @message, @link
                    )
                `);

            return {
                success: true,
                userBadgeId: userBadgeId,
                badgeName: badgeInfo.recordset[0].badge_name
            };
        } catch (error) {
            throw new Error(`Error awarding badge: ${error.message}`);
        }
    }

    // Check and award automatic badges based on user activity
    static async checkAndAwardAutomaticBadges(userId) {
        try {
            const pool = await poolPromise;

            // Get user statistics
            const userStats = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT
                        (SELECT ISNULL(SUM(points_earned), 0) FROM UserPoints WHERE user_id = @userId) as total_points,
                        (SELECT COUNT(*) FROM user_courses WHERE user_id = @userId AND status = 'completed') as completed_courses,
                        (SELECT COUNT(*) FROM Articles WHERE author_id = @userId AND is_published = 1 AND is_active = 1) as published_articles,
                        (SELECT COUNT(*) FROM ArticleComments WHERE user_id = @userId AND is_deleted = 0) as comments_count,
                        (SELECT COUNT(*) FROM TestAttempts WHERE user_id = @userId AND passed = 1) as passed_tests,
                        (SELECT COUNT(*) FROM TestAttempts WHERE user_id = @userId AND percentage = 100) as perfect_scores,
                        (SELECT COUNT(DISTINCT CAST(created_date AS DATE))
                         FROM (SELECT created_date FROM CourseProgress WHERE user_id = @userId
                               UNION ALL
                               SELECT created_date FROM ArticleComments WHERE user_id = @userId
                               UNION ALL
                               SELECT start_time as created_date FROM TestAttempts WHERE user_id = @userId) as activities) as active_days
                `);

            const stats = userStats.recordset[0];

            // Define badge criteria and check each one
            const badgeCriteria = [
                // Learning Badges
                { name: 'First Course', type: 'LEARNING', condition: stats.completed_courses >= 1 },
                { name: 'Learning Enthusiast', type: 'LEARNING', condition: stats.completed_courses >= 5 },
                { name: 'Learning Expert', type: 'LEARNING', condition: stats.completed_courses >= 20 },
                { name: 'Perfect Score', type: 'PERFORMANCE', condition: stats.perfect_scores >= 1 },
                { name: 'Test Master', type: 'PERFORMANCE', condition: stats.passed_tests >= 10 },

                // Sharing Badges
                { name: 'First Article', type: 'SHARING', condition: stats.published_articles >= 1 },
                { name: 'Knowledge Sharer', type: 'SHARING', condition: stats.published_articles >= 5 },
                { name: 'Content Creator', type: 'SHARING', condition: stats.published_articles >= 20 },

                // Engagement Badges
                { name: 'Active Participant', type: 'ENGAGEMENT', condition: stats.comments_count >= 10 },
                { name: 'Community Helper', type: 'ENGAGEMENT', condition: stats.comments_count >= 50 },
                { name: 'Daily Learner', type: 'ENGAGEMENT', condition: stats.active_days >= 30 },

                // Points-based Badges
                { name: 'Point Collector', type: 'SPECIAL', condition: stats.total_points >= 1000 },
                { name: 'Point Master', type: 'SPECIAL', condition: stats.total_points >= 5000 },
                { name: 'Point Legend', type: 'SPECIAL', condition: stats.total_points >= 10000 }
            ];

            const awardedBadges = [];

            // Check each badge criteria
            for (const criteria of badgeCriteria) {
                if (criteria.condition) {
                    // Find badge by name and type
                    const badgeResult = await pool.request()
                        .input('badgeName', sql.NVarChar(100), criteria.name)
                        .input('badgeType', sql.NVarChar(50), criteria.type)
                        .query(`
                            SELECT badge_id
                            FROM Badges
                            WHERE badge_name = @badgeName
                            AND badge_type = @badgeType
                            AND is_active = 1
                        `);

                    if (badgeResult.recordset.length > 0) {
                        const badgeId = badgeResult.recordset[0].badge_id;
                        const awardResult = await this.awardToUser(badgeId, userId);

                        if (awardResult.success) {
                            awardedBadges.push(awardResult.badgeName);
                        }
                    }
                }
            }

            return {
                success: true,
                awardedBadges: awardedBadges
            };
        } catch (error) {
            throw new Error(`Error checking automatic badges: ${error.message}`);
        }
    }

    // Get user's badges
    static async getUserBadges(userId, displayedOnly = false) {
        try {
            const pool = await poolPromise;
            const request = pool.request()
                .input('userId', sql.Int, userId);

            let whereClause = 'WHERE ub.user_id = @userId';
            if (displayedOnly) {
                whereClause += ' AND ub.is_displayed = 1';
            }

            const result = await request.query(`
                SELECT ub.*, b.badge_name, b.badge_description, b.badge_type,
                       b.badge_image, b.criteria
                FROM UserBadges ub
                JOIN Badges b ON ub.badge_id = b.badge_id
                ${whereClause}
                ORDER BY ub.display_order, ub.earned_date DESC
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error getting user badges: ${error.message}`);
        }
    }

    // Update displayed badges for user
    static async updateDisplayedBadges(userId, badgeIds) {
        try {
            const pool = await poolPromise;

            // Limit to maximum 5 displayed badges
            if (badgeIds.length > 5) {
                return { success: false, message: 'Maximum 5 badges can be displayed' };
            }

            // First, set all badges as not displayed
            await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    UPDATE UserBadges
                    SET is_displayed = 0, display_order = 0
                    WHERE user_id = @userId
                `);

            // Then, set selected badges as displayed with order
            for (let i = 0; i < badgeIds.length; i++) {
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('badgeId', sql.Int, badgeIds[i])
                    .input('displayOrder', sql.Int, i + 1)
                    .query(`
                        UPDATE UserBadges
                        SET is_displayed = 1, display_order = @displayOrder
                        WHERE user_id = @userId AND badge_id = @badgeId
                    `);
            }

            return { success: true, message: 'Displayed badges updated successfully' };
        } catch (error) {
            throw new Error(`Error updating displayed badges: ${error.message}`);
        }
    }

    // Get badge leaderboard
    static async getLeaderboard(badgeType = null, limit = 10) {
        try {
            const pool = await poolPromise;
            const request = pool.request()
                .input('limit', sql.Int, limit);

            let whereClause = '';
            if (badgeType) {
                whereClause = 'AND b.badge_type = @badgeType';
                request.input('badgeType', sql.NVarChar(50), badgeType);
            }

            const result = await request.query(`
                SELECT TOP (@limit)
                    u.user_id,
                    CONCAT(u.first_name, ' ', u.last_name) as user_name,
                    u.profile_image,
                    d.department_name,
                    COUNT(ub.badge_id) as badge_count,
                    STRING_AGG(b.badge_name, ', ') as badge_names
                FROM Users u
                JOIN UserBadges ub ON u.user_id = ub.user_id
                JOIN Badges b ON ub.badge_id = b.badge_id
                LEFT JOIN Departments d ON u.department_id = d.department_id
                WHERE u.is_active = 1 ${whereClause}
                GROUP BY u.user_id, u.first_name, u.last_name, u.profile_image, d.department_name
                ORDER BY COUNT(ub.badge_id) DESC, MIN(ub.earned_date) ASC
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error getting badge leaderboard: ${error.message}`);
        }
    }

    // Get badge statistics
    static async getStatistics() {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .query(`
                    SELECT
                        COUNT(*) as total_badges,
                        COUNT(CASE WHEN badge_type = 'LEARNING' THEN 1 END) as learning_badges,
                        COUNT(CASE WHEN badge_type = 'SHARING' THEN 1 END) as sharing_badges,
                        COUNT(CASE WHEN badge_type = 'PERFORMANCE' THEN 1 END) as performance_badges,
                        COUNT(CASE WHEN badge_type = 'ENGAGEMENT' THEN 1 END) as engagement_badges,
                        COUNT(CASE WHEN badge_type = 'SPECIAL' THEN 1 END) as special_badges,
                        (SELECT COUNT(*) FROM UserBadges) as total_awarded,
                        (SELECT COUNT(DISTINCT user_id) FROM UserBadges) as users_with_badges
                    FROM Badges
                    WHERE is_active = 1
                `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error getting badge statistics: ${error.message}`);
        }
    }

    // Create default badges for system
    static async createDefaultBadges() {
        try {
            const defaultBadges = [
                // Learning Badges
                { name: 'First Course', description: 'Complete your first course', type: 'LEARNING', criteria: 'Complete 1 course' },
                { name: 'Learning Enthusiast', description: 'Complete 5 courses', type: 'LEARNING', criteria: 'Complete 5 courses' },
                { name: 'Learning Expert', description: 'Complete 20 courses', type: 'LEARNING', criteria: 'Complete 20 courses' },

                // Sharing Badges
                { name: 'First Article', description: 'Publish your first article', type: 'SHARING', criteria: 'Publish 1 article' },
                { name: 'Knowledge Sharer', description: 'Publish 5 articles', type: 'SHARING', criteria: 'Publish 5 articles' },
                { name: 'Content Creator', description: 'Publish 20 articles', type: 'SHARING', criteria: 'Publish 20 articles' },

                // Performance Badges
                { name: 'Perfect Score', description: 'Get 100% on any test', type: 'PERFORMANCE', criteria: 'Score 100% on a test' },
                { name: 'Test Master', description: 'Pass 10 tests', type: 'PERFORMANCE', criteria: 'Pass 10 tests' },

                // Engagement Badges
                { name: 'Active Participant', description: 'Post 10 comments', type: 'ENGAGEMENT', criteria: 'Post 10 comments' },
                { name: 'Community Helper', description: 'Post 50 comments', type: 'ENGAGEMENT', criteria: 'Post 50 comments' },
                { name: 'Daily Learner', description: 'Be active for 30 days', type: 'ENGAGEMENT', criteria: 'Active for 30 days' },

                // Special Badges
                { name: 'Point Collector', description: 'Earn 1,000 points', type: 'SPECIAL', criteria: 'Earn 1,000 points', points_required: 1000 },
                { name: 'Point Master', description: 'Earn 5,000 points', type: 'SPECIAL', criteria: 'Earn 5,000 points', points_required: 5000 },
                { name: 'Point Legend', description: 'Earn 10,000 points', type: 'SPECIAL', criteria: 'Earn 10,000 points', points_required: 10000 }
            ];

            const results = [];
            for (const badge of defaultBadges) {
                try {
                    const result = await this.create(badge);
                    results.push({ success: true, name: badge.name, badgeId: result.badgeId });
                } catch (error) {
                    results.push({ success: false, name: badge.name, error: error.message });
                }
            }

            return results;
        } catch (error) {
            throw new Error(`Error creating default badges: ${error.message}`);
        }
    }

    // Update badge
    static async update(badgeId, updateData) {
        try {
            const pool = await poolPromise;

            const updateFields = [];
            const request = pool.request()
                .input('badgeId', sql.Int, badgeId);

            if (updateData.badge_name !== undefined) {
                updateFields.push('badge_name = @badgeName');
                request.input('badgeName', sql.NVarChar(100), updateData.badge_name);
            }
            if (updateData.badge_description !== undefined) {
                updateFields.push('badge_description = @badgeDescription');
                request.input('badgeDescription', sql.NVarChar(500), updateData.badge_description);
            }
            if (updateData.criteria !== undefined) {
                updateFields.push('criteria = @criteria');
                request.input('criteria', sql.NVarChar(500), updateData.criteria);
            }
            if (updateData.badge_image !== undefined) {
                updateFields.push('badge_image = @badgeImage');
                request.input('badgeImage', sql.NVarChar(500), updateData.badge_image);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            const updateQuery = `
                UPDATE Badges
                SET ${updateFields.join(', ')}
                WHERE badge_id = @badgeId
            `;

            const result = await request.query(updateQuery);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Badge updated successfully' : 'Badge not found'
            };
        } catch (error) {
            throw new Error(`Error updating badge: ${error.message}`);
        }
    }

    // Delete badge (soft delete)
    static async delete(badgeId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('badgeId', sql.Int, badgeId)
                .query(`
                    UPDATE Badges
                    SET is_active = 0
                    WHERE badge_id = @badgeId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Badge deleted successfully' : 'Badge not found'
            };
        } catch (error) {
            throw new Error(`Error deleting badge: ${error.message}`);
        }
    }
}

module.exports = Badge;