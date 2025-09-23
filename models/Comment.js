const { poolPromise, sql } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Comment {
    constructor(data) {
        this.comment_id = data.comment_id;
        this.article_id = data.article_id;
        this.user_id = data.user_id;
        this.parent_comment_id = data.parent_comment_id;
        this.comment_text = data.comment_text;
        this.like_count = data.like_count;
        this.is_edited = data.is_edited;
        this.is_deleted = data.is_deleted;
        this.created_date = data.created_date;
        this.modified_date = data.modified_date;
    }

    // Create new comment
    static async create(commentData) {
        try {
            const pool = await poolPromise;
            const commentId = uuidv4();

            // Validate comment text length (max 1000 characters)
            if (!commentData.comment_text || commentData.comment_text.length > 1000) {
                return {
                    success: false,
                    message: 'Comment text is required and must be less than 1000 characters'
                };
            }

            // Check if article exists
            const articleCheck = await pool.request()
                .input('articleId', sql.Int, commentData.article_id)
                .query(`
                    SELECT article_id, is_published, is_active
                    FROM Articles
                    WHERE article_id = @articleId
                `);

            if (articleCheck.recordset.length === 0) {
                return { success: false, message: 'Article not found' };
            }

            const article = articleCheck.recordset[0];
            if (!article.is_published || !article.is_active) {
                return { success: false, message: 'Cannot comment on unpublished article' };
            }

            // Check parent comment if provided
            if (commentData.parent_comment_id) {
                const parentCheck = await pool.request()
                    .input('parentId', sql.Int, commentData.parent_comment_id)
                    .input('articleId', sql.Int, commentData.article_id)
                    .query(`
                        SELECT comment_id
                        FROM ArticleComments
                        WHERE comment_id = @parentId
                        AND article_id = @articleId
                        AND is_deleted = 0
                    `);

                if (parentCheck.recordset.length === 0) {
                    return { success: false, message: 'Parent comment not found' };
                }
            }

            // Create comment
            const result = await pool.request()
                .input('commentId', sql.Int, commentId)
                .input('articleId', sql.Int, commentData.article_id)
                .input('userId', sql.Int, commentData.user_id)
                .input('parentCommentId', sql.Int, commentData.parent_comment_id || null)
                .input('commentText', sql.NVarChar(1000), commentData.comment_text)
                .query(`
                    INSERT INTO ArticleComments (
                        comment_id, article_id, user_id, parent_comment_id,
                        comment_text, like_count, is_edited, is_deleted,
                        created_date
                    ) VALUES (
                        @commentId, @articleId, @userId, @parentCommentId,
                        @commentText, 0, 0, 0,
                        GETDATE()
                    )
                `);

            // Send notification to article author
            await this.notifyArticleAuthor(commentData.article_id, commentData.user_id, commentId);

            // Send notification to parent comment author if replying
            if (commentData.parent_comment_id) {
                await this.notifyParentCommentAuthor(commentData.parent_comment_id, commentData.user_id, commentId);
            }

            // Add gamification points
            await pool.request()
                .input('pointId', sql.Int, uuidv4())
                .input('userId', sql.Int, commentData.user_id)
                .input('activityId', sql.Int, commentId)
                .query(`
                    INSERT INTO UserPoints (point_id, user_id, activity_type, activity_id, points_earned, description)
                    VALUES (@pointId, @userId, 'COMMENT_WRITE', @activityId, 5, 'Posted a comment')
                `);

            return {
                success: true,
                commentId: commentId
            };
        } catch (error) {
            throw new Error(`Error creating comment: ${error.message}`);
        }
    }

    // Get comments for article with threading
    static async getByArticle(articleId, page = 1, limit = 20) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            // Get root comments (not replies)
            const result = await pool.request()
                .input('articleId', sql.Int, articleId)
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT c.*,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image,
                           d.department_name as author_department,
                           p.position_name as author_position,
                           (SELECT COUNT(*) FROM ArticleComments
                            WHERE parent_comment_id = c.comment_id AND is_deleted = 0) as reply_count
                    FROM ArticleComments c
                    JOIN Users u ON c.user_id = u.user_id
                    LEFT JOIN Departments d ON u.department_id = d.department_id
                    LEFT JOIN Positions p ON u.position_id = p.position_id
                    WHERE c.article_id = @articleId
                    AND c.parent_comment_id IS NULL
                    AND c.is_deleted = 0
                    ORDER BY c.created_date DESC
                    OFFSET @offset ROWS
                    FETCH NEXT @limit ROWS ONLY
                `);

            const comments = result.recordset;

            // Get replies for each comment
            for (let comment of comments) {
                const repliesResult = await pool.request()
                    .input('parentId', sql.Int, comment.comment_id)
                    .query(`
                        SELECT c.*,
                               CONCAT(u.first_name, ' ', u.last_name) as author_name,
                               u.profile_image as author_image,
                               d.department_name as author_department,
                               p.position_name as author_position
                        FROM ArticleComments c
                        JOIN Users u ON c.user_id = u.user_id
                        LEFT JOIN Departments d ON u.department_id = d.department_id
                        LEFT JOIN Positions p ON u.position_id = p.position_id
                        WHERE c.parent_comment_id = @parentId
                        AND c.is_deleted = 0
                        ORDER BY c.created_date ASC
                    `);

                comment.replies = repliesResult.recordset;
            }

            // Get total count
            const countResult = await pool.request()
                .input('articleId', sql.Int, articleId)
                .query(`
                    SELECT COUNT(*) as total
                    FROM ArticleComments
                    WHERE article_id = @articleId
                    AND parent_comment_id IS NULL
                    AND is_deleted = 0
                `);

            return {
                data: comments,
                total: countResult.recordset[0].total,
                page: page,
                totalPages: Math.ceil(countResult.recordset[0].total / limit)
            };
        } catch (error) {
            throw new Error(`Error getting comments: ${error.message}`);
        }
    }

    // Update comment (within 30 minutes)
    static async update(commentId, userId, newText) {
        try {
            const pool = await poolPromise;

            // Check ownership and time limit (30 minutes)
            const commentCheck = await pool.request()
                .input('commentId', sql.Int, commentId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT comment_id, created_date, comment_text
                    FROM ArticleComments
                    WHERE comment_id = @commentId
                    AND user_id = @userId
                    AND is_deleted = 0
                    AND DATEDIFF(MINUTE, created_date, GETDATE()) <= 30
                `);

            if (commentCheck.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Comment not found or edit time limit exceeded (30 minutes)'
                };
            }

            // Validate new text
            if (!newText || newText.length > 1000) {
                return {
                    success: false,
                    message: 'Comment text is required and must be less than 1000 characters'
                };
            }

            // Update comment
            const result = await pool.request()
                .input('commentId', sql.Int, commentId)
                .input('commentText', sql.NVarChar(1000), newText)
                .query(`
                    UPDATE ArticleComments
                    SET comment_text = @commentText,
                        is_edited = 1,
                        modified_date = GETDATE()
                    WHERE comment_id = @commentId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Comment updated successfully' : 'Failed to update comment'
            };
        } catch (error) {
            throw new Error(`Error updating comment: ${error.message}`);
        }
    }

    // Delete comment (soft delete within 30 minutes)
    static async delete(commentId, userId) {
        try {
            const pool = await poolPromise;

            // Check ownership and time limit
            const commentCheck = await pool.request()
                .input('commentId', sql.Int, commentId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT comment_id, created_date
                    FROM ArticleComments
                    WHERE comment_id = @commentId
                    AND user_id = @userId
                    AND is_deleted = 0
                    AND DATEDIFF(MINUTE, created_date, GETDATE()) <= 30
                `);

            if (commentCheck.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Comment not found or delete time limit exceeded (30 minutes)'
                };
            }

            // Soft delete comment
            const result = await pool.request()
                .input('commentId', sql.Int, commentId)
                .query(`
                    UPDATE ArticleComments
                    SET is_deleted = 1,
                        modified_date = GETDATE()
                    WHERE comment_id = @commentId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Comment deleted successfully' : 'Failed to delete comment'
            };
        } catch (error) {
            throw new Error(`Error deleting comment: ${error.message}`);
        }
    }

    // Like/Unlike comment
    static async toggleLike(commentId, userId) {
        try {
            const pool = await poolPromise;

            // Check if user already liked this comment
            const likeCheck = await pool.request()
                .input('commentId', sql.Int, commentId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT like_id
                    FROM CommentLikes
                    WHERE comment_id = @commentId AND user_id = @userId
                `);

            if (likeCheck.recordset.length > 0) {
                // Unlike - remove like
                await pool.request()
                    .input('commentId', sql.Int, commentId)
                    .input('userId', sql.Int, userId)
                    .query(`
                        DELETE FROM CommentLikes
                        WHERE comment_id = @commentId AND user_id = @userId
                    `);

                // Decrease like count
                await pool.request()
                    .input('commentId', sql.Int, commentId)
                    .query(`
                        UPDATE ArticleComments
                        SET like_count = like_count - 1
                        WHERE comment_id = @commentId AND like_count > 0
                    `);

                return { success: true, action: 'unliked' };
            } else {
                // Like - add like
                await pool.request()
                    .input('likeId', sql.Int, uuidv4())
                    .input('commentId', sql.Int, commentId)
                    .input('userId', sql.Int, userId)
                    .query(`
                        INSERT INTO CommentLikes (like_id, comment_id, user_id, created_date)
                        VALUES (@likeId, @commentId, @userId, GETDATE())
                    `);

                // Increase like count
                await pool.request()
                    .input('commentId', sql.Int, commentId)
                    .query(`
                        UPDATE ArticleComments
                        SET like_count = like_count + 1
                        WHERE comment_id = @commentId
                    `);

                return { success: true, action: 'liked' };
            }
        } catch (error) {
            throw new Error(`Error toggling like: ${error.message}`);
        }
    }

    // Get user's comments
    static async getUserComments(userId, page = 1, limit = 20) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT c.*,
                           a.title as article_title,
                           a.slug as article_slug,
                           (SELECT COUNT(*) FROM ArticleComments
                            WHERE parent_comment_id = c.comment_id AND is_deleted = 0) as reply_count
                    FROM ArticleComments c
                    JOIN Articles a ON c.article_id = a.article_id
                    WHERE c.user_id = @userId AND c.is_deleted = 0
                    ORDER BY c.created_date DESC
                    OFFSET @offset ROWS
                    FETCH NEXT @limit ROWS ONLY
                `);

            const countResult = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT COUNT(*) as total
                    FROM ArticleComments
                    WHERE user_id = @userId AND is_deleted = 0
                `);

            return {
                data: result.recordset,
                total: countResult.recordset[0].total,
                page: page,
                totalPages: Math.ceil(countResult.recordset[0].total / limit)
            };
        } catch (error) {
            throw new Error(`Error getting user comments: ${error.message}`);
        }
    }

    // Get comment statistics
    static async getStatistics(articleId = null, userId = null) {
        try {
            const pool = await poolPromise;
            const request = pool.request();

            let whereClause = 'WHERE c.is_deleted = 0';
            if (articleId) {
                whereClause += ' AND c.article_id = @articleId';
                request.input('articleId', sql.Int, articleId);
            }
            if (userId) {
                whereClause += ' AND c.user_id = @userId';
                request.input('userId', sql.Int, userId);
            }

            const result = await request.query(`
                SELECT
                    COUNT(*) as total_comments,
                    COUNT(CASE WHEN c.parent_comment_id IS NULL THEN 1 END) as root_comments,
                    COUNT(CASE WHEN c.parent_comment_id IS NOT NULL THEN 1 END) as replies,
                    SUM(c.like_count) as total_likes,
                    AVG(CAST(c.like_count AS FLOAT)) as avg_likes_per_comment,
                    COUNT(CASE WHEN c.is_edited = 1 THEN 1 END) as edited_comments
                FROM ArticleComments c
                ${whereClause}
            `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error getting comment statistics: ${error.message}`);
        }
    }

    // Report inappropriate comment
    static async report(commentId, reporterId, reason) {
        try {
            const pool = await poolPromise;

            // Check if comment exists
            const commentCheck = await pool.request()
                .input('commentId', sql.Int, commentId)
                .query(`
                    SELECT comment_id, article_id, user_id
                    FROM ArticleComments
                    WHERE comment_id = @commentId AND is_deleted = 0
                `);

            if (commentCheck.recordset.length === 0) {
                return { success: false, message: 'Comment not found' };
            }

            // Check if user already reported this comment
            const reportCheck = await pool.request()
                .input('commentId', sql.Int, commentId)
                .input('reporterId', sql.Int, reporterId)
                .query(`
                    SELECT report_id
                    FROM CommentReports
                    WHERE comment_id = @commentId AND reporter_id = @reporterId
                `);

            if (reportCheck.recordset.length > 0) {
                return { success: false, message: 'You have already reported this comment' };
            }

            // Create report
            await pool.request()
                .input('reportId', sql.Int, uuidv4())
                .input('commentId', sql.Int, commentId)
                .input('reporterId', sql.Int, reporterId)
                .input('reason', sql.NVarChar(500), reason)
                .query(`
                    INSERT INTO CommentReports (report_id, comment_id, reporter_id, reason, created_date)
                    VALUES (@reportId, @commentId, @reporterId, @reason, GETDATE())
                `);

            // Notify administrators
            await this.notifyAdminsOfReport(commentId, reason);

            return { success: true, message: 'Report submitted successfully' };
        } catch (error) {
            throw new Error(`Error reporting comment: ${error.message}`);
        }
    }

    // Notify article author of new comment
    static async notifyArticleAuthor(articleId, commenterId, commentId) {
        try {
            const pool = await poolPromise;

            // Get article author (don't notify if commenting on own article)
            const authorResult = await pool.request()
                .input('articleId', sql.Int, articleId)
                .input('commenterId', sql.Int, commenterId)
                .query(`
                    SELECT a.author_id, a.title
                    FROM Articles a
                    WHERE a.article_id = @articleId AND a.author_id != @commenterId
                `);

            if (authorResult.recordset.length === 0) return;

            const article = authorResult.recordset[0];

            // Get commenter name
            const commenterResult = await pool.request()
                .input('commenterId', sql.Int, commenterId)
                .query(`
                    SELECT CONCAT(first_name, ' ', last_name) as commenter_name
                    FROM Users WHERE user_id = @commenterId
                `);

            const commenterName = commenterResult.recordset[0]?.commenter_name || 'Someone';

            // Send notification
            await pool.request()
                .input('notificationId', sql.Int, uuidv4())
                .input('userId', sql.Int, article.author_id)
                .input('title', sql.NVarChar(200), 'New Comment on Your Article')
                .input('message', sql.NVarChar(1000),
                    `${commenterName} commented on your article "${article.title}"`)
                .input('link', sql.NVarChar(500), `/articles/${articleId}#comment-${commentId}`)
                .query(`
                    INSERT INTO Notifications (
                        notification_id, user_id, notification_type, title, message, link
                    ) VALUES (
                        @notificationId, @userId, 'ARTICLE_COMMENT', @title, @message, @link
                    )
                `);
        } catch (error) {
            console.error('Error notifying article author:', error);
        }
    }

    // Notify parent comment author of reply
    static async notifyParentCommentAuthor(parentCommentId, replierId, replyId) {
        try {
            const pool = await poolPromise;

            // Get parent comment author (don't notify if replying to own comment)
            const parentResult = await pool.request()
                .input('parentCommentId', sql.Int, parentCommentId)
                .input('replierId', sql.Int, replierId)
                .query(`
                    SELECT c.user_id, c.article_id, a.title
                    FROM ArticleComments c
                    JOIN Articles a ON c.article_id = a.article_id
                    WHERE c.comment_id = @parentCommentId AND c.user_id != @replierId
                `);

            if (parentResult.recordset.length === 0) return;

            const parent = parentResult.recordset[0];

            // Get replier name
            const replierResult = await pool.request()
                .input('replierId', sql.Int, replierId)
                .query(`
                    SELECT CONCAT(first_name, ' ', last_name) as replier_name
                    FROM Users WHERE user_id = @replierId
                `);

            const replierName = replierResult.recordset[0]?.replier_name || 'Someone';

            // Send notification
            await pool.request()
                .input('notificationId', sql.Int, uuidv4())
                .input('userId', sql.Int, parent.user_id)
                .input('title', sql.NVarChar(200), 'Reply to Your Comment')
                .input('message', sql.NVarChar(1000),
                    `${replierName} replied to your comment on "${parent.title}"`)
                .input('link', sql.NVarChar(500), `/articles/${parent.article_id}#comment-${replyId}`)
                .query(`
                    INSERT INTO Notifications (
                        notification_id, user_id, notification_type, title, message, link
                    ) VALUES (
                        @notificationId, @userId, 'COMMENT_REPLY', @title, @message, @link
                    )
                `);
        } catch (error) {
            console.error('Error notifying parent comment author:', error);
        }
    }

    // Notify admins of reported comment
    static async notifyAdminsOfReport(commentId, reason) {
        try {
            const pool = await poolPromise;

            // Get admin users
            const adminResult = await pool.request()
                .query(`
                    SELECT u.user_id
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.role_id
                    WHERE r.role_name = 'ADMIN' AND u.is_active = 1
                `);

            // Send notification to all admins
            for (const admin of adminResult.recordset) {
                await pool.request()
                    .input('notificationId', sql.Int, uuidv4())
                    .input('userId', sql.Int, admin.user_id)
                    .input('title', sql.NVarChar(200), 'Comment Reported')
                    .input('message', sql.NVarChar(1000),
                        `A comment has been reported for: ${reason}`)
                    .input('link', sql.NVarChar(500), `/admin/comments/reports`)
                    .query(`
                        INSERT INTO Notifications (
                            notification_id, user_id, notification_type, title, message, link
                        ) VALUES (
                            @notificationId, @userId, 'COMMENT_REPORT', @title, @message, @link
                        )
                    `);
            }
        } catch (error) {
            console.error('Error notifying admins:', error);
        }
    }

    // Filter inappropriate words
    static filterInappropriateWords(text) {
        // List of inappropriate words in Thai and English
        const inappropriateWords = [
            // Add your inappropriate words list here
            'spam', 'scam', 'fake', 'แสปม', 'โกง', 'หลอก'
        ];

        let filteredText = text;
        inappropriateWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filteredText = filteredText.replace(regex, '*'.repeat(word.length));
        });

        return filteredText;
    }
}

module.exports = Comment;