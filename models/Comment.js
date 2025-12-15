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
                .input('replyToUserId', sql.Int, commentData.reply_to_user_id || null)
                .input('replyToCommentId', sql.Int, commentData.reply_to_comment_id || null)
                .query(`
                    INSERT INTO Comments (
                        article_id, user_id, parent_comment_id,
                        comment_text, reply_to_user_id, reply_to_comment_id, status, created_at, updated_at
                    ) VALUES (
                        @articleId, @userId, @parentCommentId,
                        @commentText, @replyToUserId, @replyToCommentId, 'active', GETDATE(), GETDATE()
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
    static async getByArticle(articleId, page = 1, limit = 20, currentUserId = null, sort = 'newest') {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            // Determine ORDER BY based on sort parameter
            let orderBy = 'ISNULL(c.is_pinned, 0) DESC, c.pinned_at DESC, c.created_at DESC'; // newest (default)
            if (sort === 'oldest') {
                orderBy = 'ISNULL(c.is_pinned, 0) DESC, c.pinned_at DESC, c.created_at ASC';
            } else if (sort === 'popular') {
                orderBy = 'ISNULL(c.is_pinned, 0) DESC, c.pinned_at DESC, reactions_count DESC, c.created_at DESC';
            }

            // Get root comments (not replies)
            const request = pool.request()
                .input('articleId', sql.Int, articleId)
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            if (currentUserId) {
                request.input('currentUserId', sql.Int, currentUserId);
            }

            const result = await request.query(`
                    SELECT c.*,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image,
                           (SELECT COUNT(*) FROM Comments
                            WHERE parent_comment_id = c.comment_id AND status = 'active') as reply_count,
                           (SELECT COUNT(*) FROM CommentReactions WHERE comment_id = c.comment_id) as reactions_count,
                           ${currentUserId ? '(SELECT reaction_type FROM CommentReactions WHERE comment_id = c.comment_id AND user_id = @currentUserId)' : 'NULL'} as user_reaction,
                           (SELECT article_id FROM articles WHERE article_id = c.article_id) as article_id_check,
                           (SELECT author_id FROM articles WHERE article_id = c.article_id) as article_author_id
                    FROM Comments c
                    LEFT JOIN users u ON c.user_id = u.user_id
                    WHERE c.article_id = @articleId
                    AND c.parent_comment_id IS NULL
                    AND c.status = 'active'
                    ORDER BY ${orderBy}
                    OFFSET @offset ROWS
                    FETCH NEXT @limit ROWS ONLY
                `);

            const comments = result.recordset;

            // Get replies for each comment
            for (let comment of comments) {
                const replyRequest = pool.request()
                    .input('parentId', sql.Int, comment.comment_id);
                
                if (currentUserId) {
                    replyRequest.input('currentUserId', sql.Int, currentUserId);
                }

                const repliesResult = await replyRequest.query(`
                        SELECT c.comment_id, c.article_id, c.user_id, c.parent_comment_id,
                               c.comment_text, c.status, c.created_at, c.updated_at,
                               c.reply_to_user_id, c.reply_to_comment_id,
                               CONCAT(u.first_name, ' ', u.last_name) as author_name,
                               u.profile_image as author_image,
                               (SELECT CONCAT(ru.first_name, ' ', ru.last_name) FROM users ru WHERE ru.user_id = c.reply_to_user_id) as reply_to_name,
                               (SELECT COUNT(*) FROM CommentReactions WHERE comment_id = c.comment_id) as reactions_count,
                               ${currentUserId ? '(SELECT reaction_type FROM CommentReactions WHERE comment_id = c.comment_id AND user_id = @currentUserId)' : 'NULL'} as user_reaction
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


    // ============ Facebook-style Reactions ============

    // Add or update reaction
    static async addReaction(commentId, userId, reactionType) {
        try {
            const pool = await poolPromise;
            const validReactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

            if (!validReactions.includes(reactionType)) {
                return { success: false, message: 'Invalid reaction type' };
            }

            // Check if user already reacted
            const existing = await pool.request()
                .input('commentId', sql.Int, commentId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT reaction_id, reaction_type FROM CommentReactions
                    WHERE comment_id = @commentId AND user_id = @userId
                `);

            if (existing.recordset.length > 0) {
                // Update existing reaction
                if (existing.recordset[0].reaction_type === reactionType) {
                    // Same reaction - remove it (toggle off)
                    await pool.request()
                        .input('commentId', sql.Int, commentId)
                        .input('userId', sql.Int, userId)
                        .query(`DELETE FROM CommentReactions WHERE comment_id = @commentId AND user_id = @userId`);

                    return { success: true, action: 'removed', reaction_type: null };
                } else {
                    // Different reaction - update
                    await pool.request()
                        .input('commentId', sql.Int, commentId)
                        .input('userId', sql.Int, userId)
                        .input('reactionType', sql.VarChar(20), reactionType)
                        .query(`
                            UPDATE CommentReactions
                            SET reaction_type = @reactionType, created_at = GETDATE()
                            WHERE comment_id = @commentId AND user_id = @userId
                        `);

                    return { success: true, action: 'updated', reaction_type: reactionType };
                }
            } else {
                // Add new reaction
                await pool.request()
                    .input('commentId', sql.Int, commentId)
                    .input('userId', sql.Int, userId)
                    .input('reactionType', sql.VarChar(20), reactionType)
                    .query(`
                        INSERT INTO CommentReactions (comment_id, user_id, reaction_type)
                        VALUES (@commentId, @userId, @reactionType)
                    `);

                return { success: true, action: 'added', reaction_type: reactionType };
            }
        } catch (error) {
            console.error('Error adding reaction:', error);
            return { success: false, message: error.message };
        }
    }

    // Get reactions summary for a comment
    static async getReactionsSummary(commentId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('commentId', sql.Int, commentId)
                .query(`
                    SELECT reaction_type, COUNT(*) as count
                    FROM CommentReactions
                    WHERE comment_id = @commentId
                    GROUP BY reaction_type
                `);

            const totalResult = await pool.request()
                .input('commentId', sql.Int, commentId)
                .query(`
                    SELECT COUNT(*) as total FROM CommentReactions WHERE comment_id = @commentId
                `);

            const summary = {
                total: totalResult.recordset[0].total,
                like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0
            };

            result.recordset.forEach(row => {
                summary[row.reaction_type] = row.count;
            });

            return summary;
        } catch (error) {
            console.error('Error getting reactions:', error);
            return { total: 0, like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
        }
    }

    // Get user's reaction for a comment
    static async getUserReaction(commentId, userId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('commentId', sql.Int, commentId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT reaction_type FROM CommentReactions
                    WHERE comment_id = @commentId AND user_id = @userId
                `);

            return result.recordset.length > 0 ? result.recordset[0].reaction_type : null;
        } catch (error) {
            return null;
        }
    }

    // ============ Pin Comment ============

    // Pin/Unpin a comment
    static async togglePin(commentId, articleId, userId, isAdmin = false) {
        try {
            const pool = await poolPromise;

            // Check if user is article author or admin
            const articleCheck = await pool.request()
                .input('articleId', sql.Int, articleId)
                .query(`SELECT author_id FROM articles WHERE article_id = @articleId`);

            if (articleCheck.recordset.length === 0) {
                return { success: false, message: 'Article not found' };
            }

            const isAuthor = articleCheck.recordset[0].author_id === userId;
            if (!isAuthor && !isAdmin) {
                return { success: false, message: 'Only article author can pin comments' };
            }

            // Check current pin status
            const commentCheck = await pool.request()
                .input('commentId', sql.Int, commentId)
                .input('articleId', sql.Int, articleId)
                .query(`
                    SELECT is_pinned FROM Comments
                    WHERE comment_id = @commentId AND article_id = @articleId AND parent_comment_id IS NULL
                `);

            if (commentCheck.recordset.length === 0) {
                return { success: false, message: 'Comment not found or is a reply' };
            }

            const currentlyPinned = commentCheck.recordset[0].is_pinned;

            if (currentlyPinned) {
                // Unpin
                await pool.request()
                    .input('commentId', sql.Int, commentId)
                    .query(`
                        UPDATE Comments SET is_pinned = 0, pinned_at = NULL
                        WHERE comment_id = @commentId
                    `);

                return { success: true, is_pinned: false, message: 'Comment unpinned' };
            } else {
                // Unpin any existing pinned comment for this article first
                await pool.request()
                    .input('articleId', sql.Int, articleId)
                    .query(`
                        UPDATE Comments SET is_pinned = 0, pinned_at = NULL
                        WHERE article_id = @articleId AND is_pinned = 1
                    `);

                // Pin this comment
                await pool.request()
                    .input('commentId', sql.Int, commentId)
                    .query(`
                        UPDATE Comments SET is_pinned = 1, pinned_at = GETDATE()
                        WHERE comment_id = @commentId
                    `);

                return { success: true, is_pinned: true, message: 'Comment pinned' };
            }
        } catch (error) {
            console.error('Error toggling pin:', error);
            return { success: false, message: error.message };
        }
    }

}

module.exports = Comment;