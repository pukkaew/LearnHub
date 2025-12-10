const { poolPromise, sql } = require('../config/database');

class Comment {
    constructor(data) {
        this.comment_id = data.comment_id;
        this.article_id = data.article_id;
        this.user_id = data.user_id;
        this.parent_comment_id = data.parent_comment_id;
        this.comment_text = data.comment_text;
        this.status = data.status;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create new comment
    static async create(commentData) {
        try {
            const pool = await poolPromise;

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
                    SELECT article_id, status
                    FROM articles
                    WHERE article_id = @articleId
                `);

            if (articleCheck.recordset.length === 0) {
                return { success: false, message: 'Article not found' };
            }

            // Check parent comment if provided
            if (commentData.parent_comment_id) {
                const parentCheck = await pool.request()
                    .input('parentId', sql.Int, commentData.parent_comment_id)
                    .input('articleId', sql.Int, commentData.article_id)
                    .query(`
                        SELECT comment_id
                        FROM Comments
                        WHERE comment_id = @parentId
                        AND article_id = @articleId
                        AND status = 'active'
                    `);

                if (parentCheck.recordset.length === 0) {
                    return { success: false, message: 'Parent comment not found' };
                }
            }

            // Create comment
            const result = await pool.request()
                .input('articleId', sql.Int, commentData.article_id)
                .input('userId', sql.Int, commentData.user_id)
                .input('parentCommentId', sql.Int, commentData.parent_comment_id || null)
                .input('commentText', sql.NVarChar(sql.MAX), commentData.comment_text)
                .query(`
                    INSERT INTO Comments (
                        article_id, user_id, parent_comment_id,
                        comment_text, status, created_at, updated_at
                    ) VALUES (
                        @articleId, @userId, @parentCommentId,
                        @commentText, 'active', GETDATE(), GETDATE()
                    );
                    SELECT SCOPE_IDENTITY() AS comment_id;
                `);

            const commentId = result.recordset[0].comment_id;

            // Get created comment with user info
            const createdComment = await pool.request()
                .input('commentId', sql.Int, commentId)
                .query(`
                    SELECT c.*,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image
                    FROM Comments c
                    LEFT JOIN users u ON c.user_id = u.user_id
                    WHERE c.comment_id = @commentId
                `);

            return {
                success: true,
                commentId: commentId,
                data: createdComment.recordset[0]
            };
        } catch (error) {
            console.error('Error creating comment:', error);
            return {
                success: false,
                message: `Error creating comment: ${error.message}`
            };
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
                           (SELECT COUNT(*) FROM Comments
                            WHERE parent_comment_id = c.comment_id AND status = 'active') as reply_count
                    FROM Comments c
                    LEFT JOIN users u ON c.user_id = u.user_id
                    WHERE c.article_id = @articleId
                    AND c.parent_comment_id IS NULL
                    AND c.status = 'active'
                    ORDER BY c.created_at DESC
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
                               u.profile_image as author_image
                        FROM Comments c
                        LEFT JOIN users u ON c.user_id = u.user_id
                        WHERE c.parent_comment_id = @parentId
                        AND c.status = 'active'
                        ORDER BY c.created_at ASC
                    `);

                comment.replies = repliesResult.recordset;
            }

            // Get total count
            const countResult = await pool.request()
                .input('articleId', sql.Int, articleId)
                .query(`
                    SELECT COUNT(*) as total
                    FROM Comments
                    WHERE article_id = @articleId
                    AND parent_comment_id IS NULL
                    AND status = 'active'
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

    // Update comment
    static async update(commentId, userId, newText) {
        try {
            const pool = await poolPromise;

            // Check ownership
            const commentCheck = await pool.request()
                .input('commentId', sql.Int, commentId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT comment_id, created_at, comment_text
                    FROM Comments
                    WHERE comment_id = @commentId
                    AND user_id = @userId
                    AND status = 'active'
                `);

            if (commentCheck.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Comment not found or you do not have permission to edit'
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
                .input('commentText', sql.NVarChar(sql.MAX), newText)
                .query(`
                    UPDATE Comments
                    SET comment_text = @commentText,
                        updated_at = GETDATE()
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

    // Delete comment (soft delete)
    static async delete(commentId, userId, isAdmin = false) {
        try {
            const pool = await poolPromise;

            // Check ownership or admin
            let query = `
                SELECT comment_id
                FROM Comments
                WHERE comment_id = @commentId
                AND status = 'active'
            `;

            if (!isAdmin) {
                query += ' AND user_id = @userId';
            }

            const commentCheck = await pool.request()
                .input('commentId', sql.Int, commentId)
                .input('userId', sql.Int, userId)
                .query(query);

            if (commentCheck.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Comment not found or you do not have permission to delete'
                };
            }

            // Soft delete comment
            const result = await pool.request()
                .input('commentId', sql.Int, commentId)
                .query(`
                    UPDATE Comments
                    SET status = 'deleted',
                        updated_at = GETDATE()
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
                           (SELECT COUNT(*) FROM Comments
                            WHERE parent_comment_id = c.comment_id AND status = 'active') as reply_count
                    FROM Comments c
                    JOIN articles a ON c.article_id = a.article_id
                    WHERE c.user_id = @userId AND c.status = 'active'
                    ORDER BY c.created_at DESC
                    OFFSET @offset ROWS
                    FETCH NEXT @limit ROWS ONLY
                `);

            const countResult = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT COUNT(*) as total
                    FROM Comments
                    WHERE user_id = @userId AND status = 'active'
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

            let whereClause = "WHERE c.status = 'active'";
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
                    COUNT(CASE WHEN c.parent_comment_id IS NOT NULL THEN 1 END) as replies
                FROM Comments c
                ${whereClause}
            `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error getting comment statistics: ${error.message}`);
        }
    }

    // Filter inappropriate words
    static filterInappropriateWords(text) {
        const inappropriateWords = [
            'spam', 'scam', 'fake'
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