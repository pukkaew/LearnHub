/**
 * CourseDiscussion Model
 * Facebook-style discussion system for courses
 */

const { poolPromise, sql } = require('../config/database');

class CourseDiscussion {
    constructor(data) {
        this.discussion_id = data.discussion_id;
        this.course_id = data.course_id;
        this.user_id = data.user_id;
        this.material_id = data.material_id;
        this.parent_id = data.parent_id;
        this.comment_text = data.comment_text;
        this.status = data.status;
        this.is_pinned = data.is_pinned;
        this.pinned_at = data.pinned_at;
        this.reply_to_user_id = data.reply_to_user_id;
        this.reply_to_discussion_id = data.reply_to_discussion_id;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create new discussion comment
    static async create(data) {
        try {
            const pool = await poolPromise;

            // Validate comment text
            if (!data.comment_text || data.comment_text.trim().length === 0) {
                return { success: false, message: 'Comment text is required' };
            }

            if (data.comment_text.length > 2000) {
                return { success: false, message: 'Comment must be less than 2000 characters' };
            }

            const result = await pool.request()
                .input('courseId', sql.Int, data.course_id)
                .input('userId', sql.Int, data.user_id)
                .input('materialId', sql.Int, data.material_id || null)
                .input('parentId', sql.Int, data.parent_id || null)
                .input('commentText', sql.NVarChar(sql.MAX), data.comment_text.trim())
                .input('replyToUserId', sql.Int, data.reply_to_user_id || null)
                .input('replyToDiscussionId', sql.Int, data.reply_to_discussion_id || null)
                .query(`
                    INSERT INTO CourseDiscussions (
                        course_id, user_id, material_id, parent_id,
                        comment_text, reply_to_user_id, reply_to_discussion_id,
                        status, created_at, updated_at
                    ) VALUES (
                        @courseId, @userId, @materialId, @parentId,
                        @commentText, @replyToUserId, @replyToDiscussionId,
                        'active', GETDATE(), GETDATE()
                    );
                    SELECT SCOPE_IDENTITY() AS discussion_id;
                `);

            const discussionId = result.recordset[0].discussion_id;

            // Get created comment with user info
            const created = await pool.request()
                .input('discussionId', sql.Int, discussionId)
                .query(`
                    SELECT d.*,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image
                    FROM CourseDiscussions d
                    LEFT JOIN users u ON d.user_id = u.user_id
                    WHERE d.discussion_id = @discussionId
                `);

            return {
                success: true,
                discussionId: discussionId,
                data: created.recordset[0]
            };
        } catch (error) {
            console.error('Error creating discussion:', error);
            return { success: false, message: error.message };
        }
    }

    // Get discussions for course with threading
    static async getByCourse(courseId, page = 1, limit = 20, currentUserId = null, sort = 'newest') {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            // Determine ORDER BY based on sort parameter
            let orderBy = 'ISNULL(d.is_pinned, 0) DESC, d.pinned_at DESC, d.created_at DESC'; // newest
            if (sort === 'oldest') {
                orderBy = 'ISNULL(d.is_pinned, 0) DESC, d.pinned_at DESC, d.created_at ASC';
            } else if (sort === 'popular') {
                orderBy = 'ISNULL(d.is_pinned, 0) DESC, d.pinned_at DESC, reactions_count DESC, d.created_at DESC';
            }

            // Get root comments
            const request = pool.request()
                .input('courseId', sql.Int, courseId)
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            if (currentUserId) {
                request.input('currentUserId', sql.Int, currentUserId);
            }

            const result = await request.query(`
                SELECT d.*,
                       CONCAT(u.first_name, ' ', u.last_name) as author_name,
                       u.profile_image as author_image,
                       (SELECT COUNT(*) FROM CourseDiscussions
                        WHERE parent_id = d.discussion_id AND status = 'active') as reply_count,
                       (SELECT COUNT(*) FROM CourseDiscussionReactions WHERE discussion_id = d.discussion_id) as reactions_count,
                       ${currentUserId ? '(SELECT reaction_type FROM CourseDiscussionReactions WHERE discussion_id = d.discussion_id AND user_id = @currentUserId)' : 'NULL'} as user_reaction,
                       (SELECT instructor_id FROM courses WHERE course_id = d.course_id) as course_instructor_id
                FROM CourseDiscussions d
                LEFT JOIN users u ON d.user_id = u.user_id
                WHERE d.course_id = @courseId
                AND d.parent_id IS NULL
                AND d.status = 'active'
                ORDER BY ${orderBy}
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

            const discussions = result.recordset;

            // Get replies for each discussion
            for (let discussion of discussions) {
                const replyRequest = pool.request()
                    .input('parentId', sql.Int, discussion.discussion_id);

                if (currentUserId) {
                    replyRequest.input('currentUserId', sql.Int, currentUserId);
                }

                const repliesResult = await replyRequest.query(`
                    SELECT d.discussion_id, d.course_id, d.user_id, d.parent_id,
                           d.comment_text, d.status, d.created_at, d.updated_at,
                           d.reply_to_user_id, d.reply_to_discussion_id,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image,
                           (SELECT CONCAT(ru.first_name, ' ', ru.last_name) FROM users ru WHERE ru.user_id = d.reply_to_user_id) as reply_to_name,
                           (SELECT COUNT(*) FROM CourseDiscussionReactions WHERE discussion_id = d.discussion_id) as reactions_count,
                           ${currentUserId ? '(SELECT reaction_type FROM CourseDiscussionReactions WHERE discussion_id = d.discussion_id AND user_id = @currentUserId)' : 'NULL'} as user_reaction
                    FROM CourseDiscussions d
                    LEFT JOIN users u ON d.user_id = u.user_id
                    WHERE d.parent_id = @parentId
                    AND d.status = 'active'
                    ORDER BY d.created_at ASC
                `);

                discussion.replies = repliesResult.recordset;
            }

            // Get total count
            const countResult = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT COUNT(*) as total
                    FROM CourseDiscussions
                    WHERE course_id = @courseId
                    AND parent_id IS NULL
                    AND status = 'active'
                `);

            return {
                data: discussions,
                total: countResult.recordset[0].total,
                page: page,
                totalPages: Math.ceil(countResult.recordset[0].total / limit),
                has_next: countResult.recordset[0].total > offset + limit
            };
        } catch (error) {
            console.error('Error getting discussions:', error);
            throw new Error(`Error getting discussions: ${error.message}`);
        }
    }

    // Update discussion
    static async update(discussionId, userId, newText) {
        try {
            const pool = await poolPromise;

            // Check ownership
            const check = await pool.request()
                .input('discussionId', sql.Int, discussionId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT discussion_id FROM CourseDiscussions
                    WHERE discussion_id = @discussionId
                    AND user_id = @userId
                    AND status = 'active'
                `);

            if (check.recordset.length === 0) {
                return { success: false, message: 'Discussion not found or no permission' };
            }

            if (!newText || newText.length > 2000) {
                return { success: false, message: 'Comment must be 1-2000 characters' };
            }

            const result = await pool.request()
                .input('discussionId', sql.Int, discussionId)
                .input('commentText', sql.NVarChar(sql.MAX), newText.trim())
                .query(`
                    UPDATE CourseDiscussions
                    SET comment_text = @commentText, updated_at = GETDATE()
                    WHERE discussion_id = @discussionId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Updated successfully' : 'Failed to update'
            };
        } catch (error) {
            console.error('Error updating discussion:', error);
            return { success: false, message: error.message };
        }
    }

    // Delete discussion (soft delete)
    static async delete(discussionId, userId, isAdmin = false) {
        try {
            const pool = await poolPromise;

            let query = `
                SELECT discussion_id FROM CourseDiscussions
                WHERE discussion_id = @discussionId AND status = 'active'
            `;

            if (!isAdmin) {
                query += ' AND user_id = @userId';
            }

            const check = await pool.request()
                .input('discussionId', sql.Int, discussionId)
                .input('userId', sql.Int, userId)
                .query(query);

            if (check.recordset.length === 0) {
                return { success: false, message: 'Discussion not found or no permission' };
            }

            const result = await pool.request()
                .input('discussionId', sql.Int, discussionId)
                .query(`
                    UPDATE CourseDiscussions
                    SET status = 'deleted', updated_at = GETDATE()
                    WHERE discussion_id = @discussionId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Deleted successfully' : 'Failed to delete'
            };
        } catch (error) {
            console.error('Error deleting discussion:', error);
            return { success: false, message: error.message };
        }
    }

    // ============ Reactions ============

    // Add or toggle reaction
    static async addReaction(discussionId, userId, reactionType) {
        try {
            const pool = await poolPromise;
            const validReactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

            if (!validReactions.includes(reactionType)) {
                return { success: false, message: 'Invalid reaction type' };
            }

            // Check existing reaction
            const existing = await pool.request()
                .input('discussionId', sql.Int, discussionId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT reaction_id, reaction_type FROM CourseDiscussionReactions
                    WHERE discussion_id = @discussionId AND user_id = @userId
                `);

            if (existing.recordset.length > 0) {
                if (existing.recordset[0].reaction_type === reactionType) {
                    // Same reaction - remove (toggle off)
                    await pool.request()
                        .input('discussionId', sql.Int, discussionId)
                        .input('userId', sql.Int, userId)
                        .query(`DELETE FROM CourseDiscussionReactions WHERE discussion_id = @discussionId AND user_id = @userId`);

                    return { success: true, action: 'removed', reaction_type: null };
                } else {
                    // Different reaction - update
                    await pool.request()
                        .input('discussionId', sql.Int, discussionId)
                        .input('userId', sql.Int, userId)
                        .input('reactionType', sql.VarChar(20), reactionType)
                        .query(`
                            UPDATE CourseDiscussionReactions
                            SET reaction_type = @reactionType, created_at = GETDATE()
                            WHERE discussion_id = @discussionId AND user_id = @userId
                        `);

                    return { success: true, action: 'updated', reaction_type: reactionType };
                }
            } else {
                // Add new reaction
                await pool.request()
                    .input('discussionId', sql.Int, discussionId)
                    .input('userId', sql.Int, userId)
                    .input('reactionType', sql.VarChar(20), reactionType)
                    .query(`
                        INSERT INTO CourseDiscussionReactions (discussion_id, user_id, reaction_type)
                        VALUES (@discussionId, @userId, @reactionType)
                    `);

                return { success: true, action: 'added', reaction_type: reactionType };
            }
        } catch (error) {
            console.error('Error adding reaction:', error);
            return { success: false, message: error.message };
        }
    }

    // Get reactions summary
    static async getReactionsSummary(discussionId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('discussionId', sql.Int, discussionId)
                .query(`
                    SELECT reaction_type, COUNT(*) as count
                    FROM CourseDiscussionReactions
                    WHERE discussion_id = @discussionId
                    GROUP BY reaction_type
                `);

            const totalResult = await pool.request()
                .input('discussionId', sql.Int, discussionId)
                .query(`
                    SELECT COUNT(*) as total FROM CourseDiscussionReactions WHERE discussion_id = @discussionId
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

    // ============ Pin ============

    // Toggle pin
    static async togglePin(discussionId, courseId, userId, isAdmin = false) {
        try {
            const pool = await poolPromise;

            // Check if user is course instructor or admin
            const courseCheck = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`SELECT instructor_id FROM courses WHERE course_id = @courseId`);

            if (courseCheck.recordset.length === 0) {
                return { success: false, message: 'Course not found' };
            }

            const isInstructor = courseCheck.recordset[0].instructor_id === userId;
            if (!isInstructor && !isAdmin) {
                return { success: false, message: 'Only course instructor can pin comments' };
            }

            // Check current pin status
            const check = await pool.request()
                .input('discussionId', sql.Int, discussionId)
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT is_pinned FROM CourseDiscussions
                    WHERE discussion_id = @discussionId AND course_id = @courseId AND parent_id IS NULL
                `);

            if (check.recordset.length === 0) {
                return { success: false, message: 'Discussion not found or is a reply' };
            }

            const currentlyPinned = check.recordset[0].is_pinned;
            const newPinned = !currentlyPinned;

            await pool.request()
                .input('discussionId', sql.Int, discussionId)
                .input('isPinned', sql.Bit, newPinned)
                .query(`
                    UPDATE CourseDiscussions
                    SET is_pinned = @isPinned,
                        pinned_at = ${newPinned ? 'GETDATE()' : 'NULL'},
                        updated_at = GETDATE()
                    WHERE discussion_id = @discussionId
                `);

            return {
                success: true,
                is_pinned: newPinned,
                message: newPinned ? 'Comment pinned' : 'Comment unpinned'
            };
        } catch (error) {
            console.error('Error toggling pin:', error);
            return { success: false, message: error.message };
        }
    }
}

module.exports = CourseDiscussion;
