const { poolPromise, sql } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Article {
    constructor(data) {
        this.article_id = data.article_id;
        this.title = data.title;
        this.slug = data.slug;
        this.category_id = data.category_id;
        this.author_id = data.author_id;
        this.content = data.content;
        this.summary = data.summary;
        this.cover_image = data.cover_image;
        this.tags = data.tags;
        this.view_count = data.view_count;
        this.like_count = data.like_count;
        this.share_count = data.share_count;
        this.is_published = data.is_published;
        this.is_featured = data.is_featured;
        this.requires_review = data.requires_review;
        this.reviewed_by = data.reviewed_by;
        this.reviewed_date = data.reviewed_date;
        this.published_date = data.published_date;
        this.is_active = data.is_active;
    }

    // Generate slug from title
    static generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-')     // Replace spaces with hyphens
            .replace(/-+/g, '-')      // Replace multiple hyphens with single
            .trim();
    }

    // Create new article
    static async create(articleData) {
        try {
            const pool = await poolPromise;
            const articleId = uuidv4();

            // Generate unique slug
            let baseSlug = this.generateSlug(articleData.title);
            let slug = baseSlug;
            let counter = 1;

            while (true) {
                const slugCheck = await pool.request()
                    .input('slug', sql.NVarChar(200), slug)
                    .query('SELECT article_id FROM Articles WHERE slug = @slug');

                if (slugCheck.recordset.length === 0) break;

                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            // Determine if requires review based on user role
            const userResult = await pool.request()
                .input('authorId', sql.UniqueIdentifier, articleData.author_id)
                .query(`
                    SELECT r.role_name
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.role_id
                    WHERE u.user_id = @authorId
                `);

            const requiresReview = userResult.recordset.length > 0
                ? !['ADMIN', 'INSTRUCTOR'].includes(userResult.recordset[0].role_name)
                : true;

            const result = await pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId)
                .input('title', sql.NVarChar(200), articleData.title)
                .input('slug', sql.NVarChar(200), slug)
                .input('categoryId', sql.UniqueIdentifier, articleData.category_id)
                .input('authorId', sql.UniqueIdentifier, articleData.author_id)
                .input('content', sql.NVarChar(sql.MAX), articleData.content)
                .input('summary', sql.NVarChar(500), articleData.summary || null)
                .input('coverImage', sql.NVarChar(500), articleData.cover_image || null)
                .input('tags', sql.NVarChar(500), articleData.tags || null)
                .input('requiresReview', sql.Bit, requiresReview)
                .query(`
                    INSERT INTO Articles (
                        article_id, title, slug, category_id, author_id,
                        content, summary, cover_image, tags, view_count,
                        like_count, share_count, is_published, is_featured,
                        requires_review, is_active, created_date
                    ) VALUES (
                        @articleId, @title, @slug, @categoryId, @authorId,
                        @content, @summary, @coverImage, @tags, 0,
                        0, 0, 0, 0,
                        @requiresReview, 1, GETDATE()
                    )
                `);

            return {
                success: true,
                articleId: articleId,
                slug: slug,
                requiresReview: requiresReview
            };
        } catch (error) {
            throw new Error(`Error creating article: ${error.message}`);
        }
    }

    // Find article by ID
    static async findById(articleId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId)
                .query(`
                    SELECT a.*,
                           ac.category_name,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image,
                           CONCAT(r.first_name, ' ', r.last_name) as reviewer_name,
                           (SELECT AVG(CAST(rating AS FLOAT)) FROM ArticleRatings WHERE article_id = a.article_id) as avg_rating,
                           (SELECT COUNT(*) FROM ArticleRatings WHERE article_id = a.article_id) as rating_count,
                           (SELECT COUNT(*) FROM ArticleComments WHERE article_id = a.article_id AND is_deleted = 0) as comment_count
                    FROM Articles a
                    LEFT JOIN ArticleCategories ac ON a.category_id = ac.category_id
                    LEFT JOIN Users u ON a.author_id = u.user_id
                    LEFT JOIN Users r ON a.reviewed_by = r.user_id
                    WHERE a.article_id = @articleId
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error finding article: ${error.message}`);
        }
    }

    // Find article by slug
    static async findBySlug(slug) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('slug', sql.NVarChar(200), slug)
                .query(`
                    SELECT a.*,
                           ac.category_name,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image,
                           u.department_id as author_department,
                           u.position_id as author_position,
                           (SELECT AVG(CAST(rating AS FLOAT)) FROM ArticleRatings WHERE article_id = a.article_id) as avg_rating,
                           (SELECT COUNT(*) FROM ArticleRatings WHERE article_id = a.article_id) as rating_count,
                           (SELECT COUNT(*) FROM ArticleComments WHERE article_id = a.article_id AND is_deleted = 0) as comment_count
                    FROM Articles a
                    LEFT JOIN ArticleCategories ac ON a.category_id = ac.category_id
                    LEFT JOIN Users u ON a.author_id = u.user_id
                    WHERE a.slug = @slug AND a.is_active = 1
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const article = result.recordset[0];

            // Get attachments
            const attachmentResult = await pool.request()
                .input('articleId', sql.UniqueIdentifier, article.article_id)
                .query(`
                    SELECT *
                    FROM ArticleAttachments
                    WHERE article_id = @articleId
                    ORDER BY created_date
                `);

            article.attachments = attachmentResult.recordset;

            return article;
        } catch (error) {
            throw new Error(`Error finding article by slug: ${error.message}`);
        }
    }

    // Get all articles with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE a.is_active = 1';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.category_id) {
                whereClause += ' AND a.category_id = @categoryId';
                request.input('categoryId', sql.UniqueIdentifier, filters.category_id);
            }
            if (filters.author_id) {
                whereClause += ' AND a.author_id = @authorId';
                request.input('authorId', sql.UniqueIdentifier, filters.author_id);
            }
            if (filters.is_published !== undefined) {
                whereClause += ' AND a.is_published = @isPublished';
                request.input('isPublished', sql.Bit, filters.is_published);
            }
            if (filters.is_featured !== undefined) {
                whereClause += ' AND a.is_featured = @isFeatured';
                request.input('isFeatured', sql.Bit, filters.is_featured);
            }
            if (filters.requires_review !== undefined) {
                whereClause += ' AND a.requires_review = @requiresReview';
                request.input('requiresReview', sql.Bit, filters.requires_review);
            }
            if (filters.search) {
                whereClause += ` AND (
                    a.title LIKE @search OR
                    a.content LIKE @search OR
                    a.tags LIKE @search
                )`;
                request.input('search', sql.NVarChar(500), `%${filters.search}%`);
            }

            // Order by
            let orderBy = 'ORDER BY a.created_date DESC';
            if (filters.sort === 'popular') {
                orderBy = 'ORDER BY a.view_count DESC, a.created_date DESC';
            } else if (filters.sort === 'rating') {
                orderBy = 'ORDER BY avg_rating DESC, a.created_date DESC';
            } else if (filters.sort === 'comments') {
                orderBy = 'ORDER BY comment_count DESC, a.created_date DESC';
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM Articles a
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT a.*,
                       ac.category_name,
                       CONCAT(u.first_name, ' ', u.last_name) as author_name,
                       u.profile_image as author_image,
                       (SELECT AVG(CAST(rating AS FLOAT)) FROM ArticleRatings WHERE article_id = a.article_id) as avg_rating,
                       (SELECT COUNT(*) FROM ArticleRatings WHERE article_id = a.article_id) as rating_count,
                       (SELECT COUNT(*) FROM ArticleComments WHERE article_id = a.article_id AND is_deleted = 0) as comment_count
                FROM Articles a
                LEFT JOIN ArticleCategories ac ON a.category_id = ac.category_id
                LEFT JOIN Users u ON a.author_id = u.user_id
                ${whereClause}
                ${orderBy}
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

            return {
                data: result.recordset,
                total: countResult.recordset[0].total,
                page: page,
                totalPages: Math.ceil(countResult.recordset[0].total / limit)
            };
        } catch (error) {
            throw new Error(`Error fetching articles: ${error.message}`);
        }
    }

    // Update article
    static async update(articleId, updateData) {
        try {
            const pool = await poolPromise;

            // Build dynamic update query
            const updateFields = [];
            const request = pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId);

            if (updateData.title !== undefined) {
                updateFields.push('title = @title');
                request.input('title', sql.NVarChar(200), updateData.title);

                // Update slug if title changed
                const slug = this.generateSlug(updateData.title);
                updateFields.push('slug = @slug');
                request.input('slug', sql.NVarChar(200), slug);
            }
            if (updateData.category_id !== undefined) {
                updateFields.push('category_id = @categoryId');
                request.input('categoryId', sql.UniqueIdentifier, updateData.category_id);
            }
            if (updateData.content !== undefined) {
                updateFields.push('content = @content');
                request.input('content', sql.NVarChar(sql.MAX), updateData.content);
            }
            if (updateData.summary !== undefined) {
                updateFields.push('summary = @summary');
                request.input('summary', sql.NVarChar(500), updateData.summary);
            }
            if (updateData.cover_image !== undefined) {
                updateFields.push('cover_image = @coverImage');
                request.input('coverImage', sql.NVarChar(500), updateData.cover_image);
            }
            if (updateData.tags !== undefined) {
                updateFields.push('tags = @tags');
                request.input('tags', sql.NVarChar(500), updateData.tags);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            updateFields.push('modified_date = GETDATE()');
            updateFields.push('version = version + 1');

            const updateQuery = `
                UPDATE Articles
                SET ${updateFields.join(', ')}
                WHERE article_id = @articleId
            `;

            const result = await request.query(updateQuery);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Article updated successfully' : 'Article not found'
            };
        } catch (error) {
            throw new Error(`Error updating article: ${error.message}`);
        }
    }

    // Publish/unpublish article
    static async togglePublish(articleId, publish = true) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId)
                .input('isPublished', sql.Bit, publish)
                .query(`
                    UPDATE Articles
                    SET is_published = @isPublished,
                        published_date = CASE WHEN @isPublished = 1 THEN GETDATE() ELSE published_date END,
                        modified_date = GETDATE()
                    WHERE article_id = @articleId
                    AND (requires_review = 0 OR reviewed_by IS NOT NULL)
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0
                    ? (publish ? 'Article published successfully' : 'Article unpublished successfully')
                    : 'Article not found or requires review'
            };
        } catch (error) {
            throw new Error(`Error publishing article: ${error.message}`);
        }
    }

    // Review article
    static async review(articleId, reviewerId, approved = true) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId)
                .input('reviewerId', sql.UniqueIdentifier, reviewerId)
                .input('approved', sql.Bit, approved)
                .query(`
                    UPDATE Articles
                    SET reviewed_by = @reviewerId,
                        reviewed_date = GETDATE(),
                        requires_review = 0,
                        is_published = @approved,
                        published_date = CASE WHEN @approved = 1 THEN GETDATE() ELSE NULL END,
                        modified_date = GETDATE()
                    WHERE article_id = @articleId
                `);

            // Send notification to author
            if (result.rowsAffected[0] > 0) {
                const articleInfo = await pool.request()
                    .input('articleId', sql.UniqueIdentifier, articleId)
                    .query(`SELECT author_id, title FROM Articles WHERE article_id = @articleId`);

                if (articleInfo.recordset.length > 0) {
                    const notificationTitle = approved ? 'Article Approved' : 'Article Rejected';
                    const notificationMessage = approved
                        ? `Your article "${articleInfo.recordset[0].title}" has been approved and published.`
                        : `Your article "${articleInfo.recordset[0].title}" has been rejected. Please revise and resubmit.`;

                    await pool.request()
                        .input('notificationId', sql.UniqueIdentifier, uuidv4())
                        .input('userId', sql.UniqueIdentifier, articleInfo.recordset[0].author_id)
                        .input('title', sql.NVarChar(200), notificationTitle)
                        .input('message', sql.NVarChar(1000), notificationMessage)
                        .input('link', sql.NVarChar(500), `/articles/${articleId}`)
                        .query(`
                            INSERT INTO Notifications (
                                notification_id, user_id, notification_type, title, message, link
                            ) VALUES (
                                @notificationId, @userId, 'ARTICLE_REVIEW', @title, @message, @link
                            )
                        `);
                }
            }

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0
                    ? `Article ${approved ? 'approved' : 'rejected'} successfully`
                    : 'Article not found'
            };
        } catch (error) {
            throw new Error(`Error reviewing article: ${error.message}`);
        }
    }

    // Add view to article
    static async addView(articleId, userId = null, ipAddress) {
        try {
            const pool = await poolPromise;

            // Check if already viewed today by this IP/user
            const today = new Date().toDateString();
            const viewCheck = await pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId)
                .input('userId', sql.UniqueIdentifier, userId)
                .input('ipAddress', sql.NVarChar(50), ipAddress)
                .query(`
                    SELECT view_id
                    FROM ArticleViews
                    WHERE article_id = @articleId
                    AND (user_id = @userId OR ip_address = @ipAddress)
                    AND CAST(viewed_date AS DATE) = CAST(GETDATE() AS DATE)
                `);

            if (viewCheck.recordset.length > 0) {
                return { success: true, message: 'Already viewed today' };
            }

            // Add new view
            await pool.request()
                .input('viewId', sql.UniqueIdentifier, uuidv4())
                .input('articleId', sql.UniqueIdentifier, articleId)
                .input('userId', sql.UniqueIdentifier, userId)
                .input('ipAddress', sql.NVarChar(50), ipAddress)
                .query(`
                    INSERT INTO ArticleViews (view_id, article_id, user_id, ip_address)
                    VALUES (@viewId, @articleId, @userId, @ipAddress)
                `);

            // Update view count
            await pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId)
                .query(`
                    UPDATE Articles
                    SET view_count = (
                        SELECT COUNT(DISTINCT CASE
                            WHEN user_id IS NOT NULL THEN user_id
                            ELSE ip_address
                        END)
                        FROM ArticleViews
                        WHERE article_id = @articleId
                    )
                    WHERE article_id = @articleId
                `);

            return { success: true, message: 'View recorded' };
        } catch (error) {
            throw new Error(`Error adding view: ${error.message}`);
        }
    }

    // Rate article
    static async rate(articleId, userId, rating) {
        try {
            const pool = await poolPromise;

            if (rating < 1 || rating > 5) {
                return { success: false, message: 'Rating must be between 1 and 5' };
            }

            // Check if already rated
            const existingCheck = await pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId)
                .input('userId', sql.UniqueIdentifier, userId)
                .query(`
                    SELECT rating_id, rating
                    FROM ArticleRatings
                    WHERE article_id = @articleId AND user_id = @userId
                `);

            if (existingCheck.recordset.length > 0) {
                // Update existing rating
                await pool.request()
                    .input('ratingId', sql.UniqueIdentifier, existingCheck.recordset[0].rating_id)
                    .input('rating', sql.Int, rating)
                    .query(`
                        UPDATE ArticleRatings
                        SET rating = @rating,
                            modified_date = GETDATE()
                        WHERE rating_id = @ratingId
                    `);
            } else {
                // Create new rating
                await pool.request()
                    .input('ratingId', sql.UniqueIdentifier, uuidv4())
                    .input('articleId', sql.UniqueIdentifier, articleId)
                    .input('userId', sql.UniqueIdentifier, userId)
                    .input('rating', sql.Int, rating)
                    .query(`
                        INSERT INTO ArticleRatings (rating_id, article_id, user_id, rating)
                        VALUES (@ratingId, @articleId, @userId, @rating)
                    `);
            }

            // Get new average rating
            const avgResult = await pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId)
                .query(`
                    SELECT AVG(CAST(rating AS FLOAT)) as avg_rating,
                           COUNT(*) as rating_count
                    FROM ArticleRatings
                    WHERE article_id = @articleId
                `);

            return {
                success: true,
                avgRating: avgResult.recordset[0].avg_rating,
                ratingCount: avgResult.recordset[0].rating_count
            };
        } catch (error) {
            throw new Error(`Error rating article: ${error.message}`);
        }
    }

    // Get popular articles
    static async getPopular(limit = 10, timeframe = 'all') {
        try {
            const pool = await poolPromise;
            const request = pool.request().input('limit', sql.Int, limit);

            let timeClause = '';
            if (timeframe === 'week') {
                timeClause = 'AND a.created_date >= DATEADD(day, -7, GETDATE())';
            } else if (timeframe === 'month') {
                timeClause = 'AND a.created_date >= DATEADD(month, -1, GETDATE())';
            }

            const result = await request.query(`
                SELECT TOP (@limit) a.*,
                       ac.category_name,
                       CONCAT(u.first_name, ' ', u.last_name) as author_name,
                       u.profile_image as author_image,
                       (SELECT AVG(CAST(rating AS FLOAT)) FROM ArticleRatings WHERE article_id = a.article_id) as avg_rating,
                       (SELECT COUNT(*) FROM ArticleRatings WHERE article_id = a.article_id) as rating_count
                FROM Articles a
                LEFT JOIN ArticleCategories ac ON a.category_id = ac.category_id
                LEFT JOIN Users u ON a.author_id = u.user_id
                WHERE a.is_published = 1 AND a.is_active = 1 ${timeClause}
                ORDER BY a.view_count DESC, a.created_date DESC
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching popular articles: ${error.message}`);
        }
    }

    // Get featured articles
    static async getFeatured(limit = 5) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) a.*,
                           ac.category_name,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image,
                           (SELECT AVG(CAST(rating AS FLOAT)) FROM ArticleRatings WHERE article_id = a.article_id) as avg_rating
                    FROM Articles a
                    LEFT JOIN ArticleCategories ac ON a.category_id = ac.category_id
                    LEFT JOIN Users u ON a.author_id = u.user_id
                    WHERE a.is_featured = 1 AND a.is_published = 1 AND a.is_active = 1
                    ORDER BY a.published_date DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching featured articles: ${error.message}`);
        }
    }

    // Get article categories
    static async getCategories() {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .query(`
                    SELECT ac.*,
                           (SELECT COUNT(*) FROM Articles WHERE category_id = ac.category_id AND is_published = 1 AND is_active = 1) as article_count
                    FROM ArticleCategories ac
                    WHERE ac.is_active = 1
                    ORDER BY ac.category_order, ac.category_name
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching categories: ${error.message}`);
        }
    }

    // Get related articles
    static async getRelated(articleId, limit = 5) {
        try {
            const pool = await poolPromise;

            // Get current article info
            const currentArticle = await pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId)
                .query(`SELECT category_id, tags FROM Articles WHERE article_id = @articleId`);

            if (currentArticle.recordset.length === 0) {
                return [];
            }

            const { category_id, tags } = currentArticle.recordset[0];

            const result = await pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId)
                .input('categoryId', sql.UniqueIdentifier, category_id)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) a.*,
                           ac.category_name,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           (SELECT AVG(CAST(rating AS FLOAT)) FROM ArticleRatings WHERE article_id = a.article_id) as avg_rating
                    FROM Articles a
                    LEFT JOIN ArticleCategories ac ON a.category_id = ac.category_id
                    LEFT JOIN Users u ON a.author_id = u.user_id
                    WHERE a.article_id != @articleId
                    AND a.is_published = 1
                    AND a.is_active = 1
                    AND a.category_id = @categoryId
                    ORDER BY a.view_count DESC, a.created_date DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching related articles: ${error.message}`);
        }
    }

    // Delete article (soft delete)
    static async delete(articleId, deletedBy) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('articleId', sql.UniqueIdentifier, articleId)
                .query(`
                    UPDATE Articles
                    SET is_active = 0,
                        is_published = 0,
                        modified_date = GETDATE()
                    WHERE article_id = @articleId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Article deleted successfully' : 'Article not found'
            };
        } catch (error) {
            throw new Error(`Error deleting article: ${error.message}`);
        }
    }

    // Get author statistics
    static async getAuthorStats(authorId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('authorId', sql.UniqueIdentifier, authorId)
                .query(`
                    SELECT
                        COUNT(*) as total_articles,
                        COUNT(CASE WHEN is_published = 1 THEN 1 END) as published_articles,
                        SUM(view_count) as total_views,
                        AVG(CASE WHEN is_published = 1 THEN
                            (SELECT AVG(CAST(rating AS FLOAT)) FROM ArticleRatings WHERE article_id = Articles.article_id)
                        END) as avg_rating
                    FROM Articles
                    WHERE author_id = @authorId AND is_active = 1
                `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error fetching author stats: ${error.message}`);
        }
    }
}

module.exports = Article;