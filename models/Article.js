const { poolPromise, sql } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Article {
    constructor(data) {
        this.article_id = data.article_id;
        this.title = data.title;
        this.slug = data.slug;
        this.content = data.content;
        this.excerpt = data.excerpt;
        this.author_id = data.author_id;
        this.category = data.category;
        this.tags = data.tags;
        this.featured_image = data.featured_image;
        this.status = data.status;
        this.published_at = data.published_at;
        this.views_count = data.views_count;
        this.likes_count = data.likes_count;
        this.comments_enabled = data.comments_enabled;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Generate slug from title
    static generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .trim();
    }

    // Create new article
    static async create(articleData) {
        try {
            const pool = await poolPromise;

            // Generate unique slug
            let baseSlug = this.generateSlug(articleData.title);
            let slug = baseSlug;
            let counter = 1;

            while (true) {
                const slugCheck = await pool.request()
                    .input('slug', sql.NVarChar(200), slug)
                    .query('SELECT article_id FROM articles WHERE slug = @slug');

                if (slugCheck.recordset.length === 0) {break;}

                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            const result = await pool.request()
                .input('title', sql.NVarChar(200), articleData.title)
                .input('slug', sql.NVarChar(200), slug)
                .input('content', sql.NVarChar(sql.MAX), articleData.content)
                .input('excerpt', sql.NVarChar(500), articleData.excerpt || null)
                .input('authorId', sql.Int, articleData.author_id)
                .input('category', sql.NVarChar(100), articleData.category || null)
                .input('tags', sql.NVarChar(500), articleData.tags || null)
                .input('featuredImage', sql.NVarChar(500), articleData.featured_image || null)
                .input('status', sql.NVarChar(50), articleData.status || 'draft')
                .input('commentsEnabled', sql.Bit, articleData.comments_enabled !== undefined ? articleData.comments_enabled : 1)
                .query(`
                    INSERT INTO articles (
                        title, slug, content, excerpt, author_id,
                        category, tags, featured_image, status,
                        views_count, likes_count, comments_enabled,
                        created_at, updated_at
                    ) VALUES (
                        @title, @slug, @content, @excerpt, @authorId,
                        @category, @tags, @featuredImage, @status,
                        0, 0, @commentsEnabled,
                        GETDATE(), GETDATE()
                    );
                    SELECT SCOPE_IDENTITY() AS article_id;
                `);

            const articleId = result.recordset[0].article_id;

            return {
                success: true,
                articleId: articleId,
                slug: slug
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
                .input('articleId', sql.Int, articleId)
                .query(`
                    SELECT a.*,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image
                    FROM articles a
                    LEFT JOIN users u ON a.author_id = u.user_id
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
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image
                    FROM articles a
                    LEFT JOIN users u ON a.author_id = u.user_id
                    WHERE a.slug = @slug AND a.status = 'published'
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const article = result.recordset[0];

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

            let whereClause = 'WHERE a.status = \'published\'';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.category) {
                whereClause += ' AND a.category = @category';
                request.input('category', sql.NVarChar(50), filters.category);
            }
            if (filters.author_id) {
                whereClause += ' AND a.author_id = @authorId';
                request.input('authorId', sql.Int, filters.author_id);
            }
            if (filters.status) {
                whereClause += ' AND a.status = @status';
                request.input('status', sql.NVarChar(50), filters.status);
            }
            if (filters.search) {
                whereClause += ` AND (
                    a.title LIKE @search OR
                    a.content LIKE @search OR
                    a.excerpt LIKE @search OR
                    a.tags LIKE @search
                )`;
                request.input('search', sql.NVarChar(500), `%${filters.search}%`);
            }

            // Order by
            let orderBy = 'ORDER BY a.created_at DESC';
            if (filters.sort === 'popular') {
                orderBy = 'ORDER BY a.views_count DESC, a.created_at DESC';
            } else if (filters.sort === 'likes') {
                orderBy = 'ORDER BY a.likes_count DESC, a.created_at DESC';
            } else if (filters.sort === 'title') {
                orderBy = 'ORDER BY a.title ASC';
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM articles a
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT a.*,
                       CONCAT(u.first_name, ' ', u.last_name) as author_name,
                       u.profile_image as author_image
                FROM articles a
                LEFT JOIN users u ON a.author_id = u.user_id
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
                .input('articleId', sql.Int, articleId);

            if (updateData.title !== undefined) {
                updateFields.push('title = @title');
                request.input('title', sql.NVarChar(200), updateData.title);

                // Update slug if title changed
                const slug = this.generateSlug(updateData.title);
                updateFields.push('slug = @slug');
                request.input('slug', sql.NVarChar(200), slug);
            }
            if (updateData.category !== undefined) {
                updateFields.push('category = @category');
                request.input('category', sql.NVarChar(100), updateData.category);
            }
            if (updateData.content !== undefined) {
                updateFields.push('content = @content');
                request.input('content', sql.NVarChar(sql.MAX), updateData.content);
            }
            if (updateData.excerpt !== undefined) {
                updateFields.push('excerpt = @excerpt');
                request.input('excerpt', sql.NVarChar(500), updateData.excerpt);
            }
            if (updateData.featured_image !== undefined) {
                updateFields.push('featured_image = @featuredImage');
                request.input('featuredImage', sql.NVarChar(500), updateData.featured_image);
            }
            if (updateData.tags !== undefined) {
                updateFields.push('tags = @tags');
                request.input('tags', sql.NVarChar(500), updateData.tags);
            }
            if (updateData.status !== undefined) {
                updateFields.push('status = @status');
                request.input('status', sql.NVarChar(50), updateData.status);

                // Set published_at when publishing
                if (updateData.status === 'published') {
                    updateFields.push('published_at = GETDATE()');
                }
            }
            if (updateData.comments_enabled !== undefined) {
                updateFields.push('comments_enabled = @commentsEnabled');
                request.input('commentsEnabled', sql.Bit, updateData.comments_enabled);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            updateFields.push('updated_at = GETDATE()');

            const updateQuery = `
                UPDATE articles
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
            const status = publish ? 'published' : 'draft';
            const result = await pool.request()
                .input('articleId', sql.Int, articleId)
                .input('status', sql.NVarChar(50), status)
                .query(`
                    UPDATE articles
                    SET status = @status,
                        published_at = CASE WHEN @status = 'published' THEN GETDATE() ELSE published_at END,
                        updated_at = GETDATE()
                    WHERE article_id = @articleId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0
                    ? (publish ? 'Article published successfully' : 'Article unpublished successfully')
                    : 'Article not found'
            };
        } catch (error) {
            throw new Error(`Error publishing article: ${error.message}`);
        }
    }

    // Review article
    static async review(articleId, reviewerId, approved = true) {
        try {
            const pool = await poolPromise;
            const status = approved ? 'published' : 'draft';
            const result = await pool.request()
                .input('articleId', sql.Int, articleId)
                .input('status', sql.NVarChar(50), status)
                .query(`
                    UPDATE articles
                    SET status = @status,
                        published_at = CASE WHEN @status = 'published' THEN GETDATE() ELSE NULL END,
                        updated_at = GETDATE()
                    WHERE article_id = @articleId
                `);

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

    // Add view to article with duplicate prevention
    static async addView(articleId, viewerInfo = {}) {
        try {
            const pool = await poolPromise;
            const { userId, sessionId, ipAddress, userAgent } = viewerInfo;

            // Check if this viewer has already viewed this article recently (within 24 hours)
            // Use combination of: user_id (if logged in) OR session_id OR ip_address
            const checkRequest = pool.request()
                .input('articleId', sql.Int, articleId);

            let checkQuery = `
                SELECT view_id FROM ArticleViews
                WHERE article_id = @articleId
                AND viewed_at > DATEADD(HOUR, -24, GETDATE())
            `;

            if (userId) {
                checkRequest.input('userId', sql.Int, userId);
                checkQuery += ` AND user_id = @userId`;
            } else if (sessionId) {
                checkRequest.input('sessionId', sql.NVarChar(255), sessionId);
                checkQuery += ` AND session_id = @sessionId`;
            } else if (ipAddress) {
                checkRequest.input('ipAddress', sql.NVarChar(45), ipAddress);
                checkQuery += ` AND ip_address = @ipAddress AND user_id IS NULL`;
            }

            const existingView = await checkRequest.query(checkQuery);

            if (existingView.recordset.length > 0) {
                // Already viewed recently - don't count again
                return {
                    success: true,
                    counted: false,
                    message: 'View already recorded within 24 hours'
                };
            }

            // Record the new view
            await pool.request()
                .input('articleId', sql.Int, articleId)
                .input('userId', sql.Int, userId || null)
                .input('sessionId', sql.NVarChar(255), sessionId || null)
                .input('ipAddress', sql.NVarChar(45), ipAddress || null)
                .input('userAgent', sql.NVarChar(500), userAgent?.substring(0, 500) || null)
                .query(`
                    INSERT INTO ArticleViews (article_id, user_id, session_id, ip_address, user_agent)
                    VALUES (@articleId, @userId, @sessionId, @ipAddress, @userAgent)
                `);

            // Increment view count
            const result = await pool.request()
                .input('articleId', sql.Int, articleId)
                .query(`
                    UPDATE articles
                    SET views_count = views_count + 1
                    WHERE article_id = @articleId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                counted: true,
                message: 'View recorded successfully'
            };
        } catch (error) {
            console.error('Error adding view:', error);
            // Don't throw - view counting should not break the page
            return {
                success: false,
                counted: false,
                message: `Error: ${error.message}`
            };
        }
    }

    // Check if user has liked an article
    static async checkUserLiked(articleId, userId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('articleId', sql.Int, articleId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT like_id FROM article_likes
                    WHERE article_id = @articleId AND user_id = @userId
                `);

            return result.recordset.length > 0;
        } catch (error) {
            throw new Error(`Error checking like status: ${error.message}`);
        }
    }

    // Toggle like on article (like/unlike)
    static async toggleLike(articleId, userId) {
        try {
            const pool = await poolPromise;

            // Check if user already liked
            const isLiked = await this.checkUserLiked(articleId, userId);

            if (isLiked) {
                // Unlike - remove from article_likes and decrement count
                await pool.request()
                    .input('articleId', sql.Int, articleId)
                    .input('userId', sql.Int, userId)
                    .query(`
                        DELETE FROM article_likes
                        WHERE article_id = @articleId AND user_id = @userId
                    `);

                await pool.request()
                    .input('articleId', sql.Int, articleId)
                    .query(`
                        UPDATE articles
                        SET likes_count = CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END,
                            updated_at = GETDATE()
                        WHERE article_id = @articleId
                    `);

                // Get updated count
                const countResult = await pool.request()
                    .input('articleId', sql.Int, articleId)
                    .query(`SELECT likes_count FROM articles WHERE article_id = @articleId`);

                return {
                    success: true,
                    is_liked: false,
                    like_count: countResult.recordset[0]?.likes_count || 0,
                    message: 'Unliked'
                };
            } else {
                // Like - add to article_likes and increment count
                await pool.request()
                    .input('articleId', sql.Int, articleId)
                    .input('userId', sql.Int, userId)
                    .query(`
                        INSERT INTO article_likes (article_id, user_id)
                        VALUES (@articleId, @userId)
                    `);

                await pool.request()
                    .input('articleId', sql.Int, articleId)
                    .query(`
                        UPDATE articles
                        SET likes_count = likes_count + 1,
                            updated_at = GETDATE()
                        WHERE article_id = @articleId
                    `);

                // Get updated count
                const countResult = await pool.request()
                    .input('articleId', sql.Int, articleId)
                    .query(`SELECT likes_count FROM articles WHERE article_id = @articleId`);

                return {
                    success: true,
                    is_liked: true,
                    like_count: countResult.recordset[0]?.likes_count || 0,
                    message: 'Liked'
                };
            }
        } catch (error) {
            throw new Error(`Error toggling like: ${error.message}`);
        }
    }

    // Add like to article (legacy - kept for compatibility)
    static async addLike(articleId) {
        try {
            const pool = await poolPromise;

            // Simple increment of like count
            const result = await pool.request()
                .input('articleId', sql.Int, articleId)
                .query(`
                    UPDATE articles
                    SET likes_count = likes_count + 1,
                        updated_at = GETDATE()
                    WHERE article_id = @articleId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Like recorded' : 'Article not found'
            };
        } catch (error) {
            throw new Error(`Error adding like: ${error.message}`);
        }
    }

    // Get popular articles
    static async getPopular(limit = 10) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) a.*,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image
                    FROM articles a
                    LEFT JOIN users u ON a.author_id = u.user_id
                    WHERE a.status = 'published'
                    ORDER BY a.views_count DESC, a.created_at DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching popular articles: ${error.message}`);
        }
    }

    // Get recent articles
    static async getRecent(limit = 5) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) a.*,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name,
                           u.profile_image as author_image
                    FROM articles a
                    LEFT JOIN users u ON a.author_id = u.user_id
                    WHERE a.status = 'published'
                    ORDER BY a.published_at DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching recent articles: ${error.message}`);
        }
    }

    // Get article categories (distinct categories from articles)
    static async getCategories() {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .query(`
                    SELECT DISTINCT
                           a.category,
                           COUNT(*) as article_count
                    FROM articles a
                    WHERE a.status = 'published' AND a.category IS NOT NULL
                    GROUP BY a.category
                    ORDER BY a.category
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
                .input('articleId', sql.Int, articleId)
                .query('SELECT category FROM articles WHERE article_id = @articleId');

            if (currentArticle.recordset.length === 0) {
                return [];
            }

            const { category } = currentArticle.recordset[0];

            const result = await pool.request()
                .input('articleId', sql.Int, articleId)
                .input('category', sql.NVarChar(100), category)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) a.*,
                           CONCAT(u.first_name, ' ', u.last_name) as author_name
                    FROM articles a
                    LEFT JOIN users u ON a.author_id = u.user_id
                    WHERE a.article_id != @articleId
                    AND a.status = 'published'
                    AND a.category = @category
                    ORDER BY a.views_count DESC, a.created_at DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching related articles: ${error.message}`);
        }
    }

    // Delete article (soft delete)
    static async delete(articleId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('articleId', sql.Int, articleId)
                .query(`
                    UPDATE articles
                    SET status = 'deleted',
                        updated_at = GETDATE()
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
                .input('authorId', sql.Int, authorId)
                .query(`
                    SELECT
                        COUNT(*) as total_articles,
                        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_articles,
                        SUM(views_count) as total_views,
                        SUM(likes_count) as total_likes
                    FROM articles
                    WHERE author_id = @authorId AND status != 'deleted'
                `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error fetching author stats: ${error.message}`);
        }
    }
}

module.exports = Article;