const Article = require('../models/Article');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const { poolPromise, sql } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for article image uploads
const articleImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/articles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'article-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const articleImageUpload = multer({
    storage: articleImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
}).single('image');

const articleController = {
    // ============ API: Get Articles List (for index page) ============
    async getArticlesList(req, res) {
        try {
            const pool = await poolPromise;
            const userId = req.user?.user_id;
            const userRole = req.user?.role_name || req.user?.role;

            const {
                page = 1,
                limit = 12,
                search,
                category,
                sort = 'latest',
                status
            } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Build WHERE clause based on user role
            let whereConditions = [];

            if (userRole === 'Admin') {
                // Admin sees all articles except deleted
                whereConditions.push("a.status != 'deleted'");
                if (status) {
                    whereConditions.push(`a.status = @status`);
                }
            } else if (userRole === 'Instructor') {
                // Instructor sees published + own articles
                if (status) {
                    whereConditions.push(`(a.status = @status AND (a.status = 'published' OR a.author_id = @userId))`);
                } else {
                    whereConditions.push(`(a.status = 'published' OR a.author_id = @userId)`);
                }
            } else {
                // Regular users only see published articles
                whereConditions.push("a.status = 'published'");
            }

            if (search) {
                whereConditions.push(`(a.title LIKE @search OR a.content LIKE @search OR a.excerpt LIKE @search)`);
            }

            if (category) {
                whereConditions.push(`a.category = @category`);
            }

            const whereClause = whereConditions.length > 0
                ? 'WHERE ' + whereConditions.join(' AND ')
                : '';

            // Build ORDER BY
            let orderBy = 'ORDER BY a.created_at DESC';
            switch (sort) {
                case 'popular':
                case 'most_viewed':
                    orderBy = 'ORDER BY a.views_count DESC, a.created_at DESC';
                    break;
                case 'most_liked':
                    orderBy = 'ORDER BY a.likes_count DESC, a.created_at DESC';
                    break;
                case 'oldest':
                    orderBy = 'ORDER BY a.created_at ASC';
                    break;
            }

            // Build request with parameters
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, parseInt(limit))
                .input('userId', sql.Int, userId);

            if (search) {
                request.input('search', sql.NVarChar, `%${search}%`);
            }
            if (category) {
                request.input('category', sql.NVarChar, category);
            }
            if (status) {
                request.input('status', sql.NVarChar, status);
            }

            // Get articles
            const articlesResult = await request.query(`
                SELECT
                    a.article_id,
                    a.title,
                    a.slug,
                    a.excerpt,
                    a.category,
                    a.featured_image,
                    a.status,
                    a.views_count,
                    a.likes_count,
                    a.created_at,
                    a.published_at,
                    a.author_id,
                    CONCAT(u.first_name, ' ', u.last_name) as author_name,
                    u.profile_image as author_image,
                    (SELECT COUNT(*) FROM Comments c WHERE c.article_id = a.article_id) as comments_count
                FROM articles a
                LEFT JOIN users u ON a.author_id = u.user_id
                ${whereClause}
                ${orderBy}
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

            // Get total count
            const countRequest = pool.request()
                .input('userId', sql.Int, userId);

            if (search) {
                countRequest.input('search', sql.NVarChar, `%${search}%`);
            }
            if (category) {
                countRequest.input('category', sql.NVarChar, category);
            }
            if (status) {
                countRequest.input('status', sql.NVarChar, status);
            }

            const countResult = await countRequest.query(`
                SELECT COUNT(*) as total
                FROM articles a
                ${whereClause}
            `);

            // Get stats
            const statsRequest = pool.request();
            let statsWhereClause = userRole === 'Admin'
                ? "WHERE a.status != 'deleted'"
                : "WHERE a.status = 'published'";

            const statsResult = await statsRequest.query(`
                SELECT
                    COUNT(*) as total_articles,
                    ISNULL(SUM(a.views_count), 0) as total_views,
                    ISNULL(SUM(a.likes_count), 0) as total_likes,
                    (SELECT COUNT(*) FROM Comments c
                     INNER JOIN articles a2 ON c.article_id = a2.article_id
                     ${statsWhereClause.replace('a.', 'a2.')}) as total_comments
                FROM articles a
                ${statsWhereClause}
            `);

            const total = countResult.recordset[0].total;
            const totalPages = Math.ceil(total / parseInt(limit));

            res.json({
                success: true,
                data: articlesResult.recordset,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: totalPages
                },
                stats: statsResult.recordset[0]
            });

        } catch (error) {
            console.error('Get articles list error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingArticleList') : 'เกิดข้อผิดพลาดในการโหลดรายการบทความ'
            });
        }
    },

    // ============ API: Get All Articles ============
    async getAllArticles(req, res) {
        try {
            const {
                category,
                author_id,
                status,
                search,
                tags,
                page = 1,
                limit = 12
            } = req.query;

            const filters = {};
            if (category) filters.category = category;
            if (author_id) filters.author_id = author_id;
            if (status) filters.status = status;
            else filters.status = 'published';
            if (search) filters.search = search;
            if (tags) filters.tags = tags;

            const articles = await Article.findAll(parseInt(page), parseInt(limit), filters);

            res.json({
                success: true,
                data: articles.data,
                pagination: {
                    page: articles.page,
                    limit: parseInt(limit),
                    total: articles.total,
                    totalPages: articles.totalPages
                }
            });

        } catch (error) {
            console.error('Get all articles error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingArticleList') : 'เกิดข้อผิดพลาดในการโหลดรายการบทความ'
            });
        }
    },

    // ============ API: Get Article By ID ============
    async getArticleById(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user?.user_id;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t ? req.t('articleNotFound') : 'ไม่พบบทความ'
                });
            }

            // Check permission
            if (article.status !== 'published' && article.author_id !== userId) {
                const userRole = req.user?.role_name || req.user?.role;
                if (!['Admin', 'Instructor'].includes(userRole)) {
                    return res.status(403).json({
                        success: false,
                        message: req.t ? req.t('noPermissionAccessArticle') : 'ไม่มีสิทธิ์เข้าถึงบทความนี้'
                    });
                }
            }

            // View count is now incremented via separate API endpoint
            // This prevents double counting when fetching article data

            // Check if user has liked this article
            let is_liked = false;
            if (userId) {
                is_liked = await Article.checkUserLiked(article_id, userId);
            }

            res.json({
                success: true,
                data: {
                    ...article,
                    is_liked: is_liked
                }
            });

        } catch (error) {
            console.error('Get article by id error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingArticleData') : 'เกิดข้อผิดพลาดในการโหลดข้อมูลบทความ'
            });
        }
    },

    // ============ API: Get Article For Edit ============
    async getArticleForEdit(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user?.user_id;
            const userRole = req.user?.role_name || req.user?.role;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t ? req.t('articleNotFound') : 'ไม่พบบทความ'
                });
            }

            // Check permission
            if (article.author_id !== userId && userRole !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: req.t ? req.t('noPermissionEditThisArticle') : 'ไม่มีสิทธิ์แก้ไขบทความนี้'
                });
            }

            res.json({
                success: true,
                article: article
            });

        } catch (error) {
            console.error('Get article for edit error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingArticleData') : 'เกิดข้อผิดพลาดในการโหลดข้อมูลบทความ'
            });
        }
    },

    // ============ API: Create Article ============
    async createArticle(req, res) {
        try {
            const userId = req.user.user_id;
            const userRole = req.user.role_name || req.user.role;

            if (!['Admin', 'Instructor', 'Learner'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t ? req.t('noPermissionCreateArticle') : 'ไม่มีสิทธิ์สร้างบทความ'
                });
            }

            const articleData = {
                title: req.body.title,
                content: req.body.content,
                excerpt: req.body.summary || req.body.excerpt,
                category: req.body.category,
                tags: req.body.tags,
                featured_image: req.body.featured_image,
                author_id: userId,
                status: req.body.status || (userRole === 'Learner' ? 'draft' : 'published'),
                comments_enabled: req.body.allow_comments !== 'false'
            };

            const result = await Article.create(articleData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Log activity
            await ActivityLog.create({
                user_id: userId,
                action: 'Create',
                table_name: 'articles',
                record_id: result.articleId,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `สร้างบทความ: ${articleData.title}`,
                severity: 'Info',
                module: 'Articles'
            });

            res.status(201).json({
                success: true,
                message: req.t ? req.t('articleCreatedSuccess') : 'สร้างบทความสำเร็จ',
                data: {
                    article_id: result.articleId,
                    slug: result.slug
                }
            });

        } catch (error) {
            console.error('Create article error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorCreatingArticle') : 'เกิดข้อผิดพลาดในการสร้างบทความ'
            });
        }
    },

    // ============ API: Update Article ============
    async updateArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.user_id;
            const userRole = req.user.role_name || req.user.role;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t ? req.t('articleNotFound') : 'ไม่พบบทความ'
                });
            }

            // Check permission
            if (article.author_id !== userId && userRole !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: req.t ? req.t('noPermissionEditThisArticle') : 'ไม่มีสิทธิ์แก้ไขบทความนี้'
                });
            }

            const updateData = {};
            if (req.body.title) updateData.title = req.body.title;
            if (req.body.content) updateData.content = req.body.content;
            if (req.body.summary !== undefined) updateData.excerpt = req.body.summary;
            if (req.body.excerpt !== undefined) updateData.excerpt = req.body.excerpt;
            if (req.body.category) updateData.category = req.body.category;
            if (req.body.tags !== undefined) updateData.tags = req.body.tags;
            if (req.body.featured_image !== undefined) updateData.featured_image = req.body.featured_image;
            if (req.body.status) updateData.status = req.body.status;
            if (req.body.comments_enabled !== undefined) updateData.comments_enabled = req.body.comments_enabled;

            const result = await Article.update(article_id, updateData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Log activity
            await ActivityLog.create({
                user_id: userId,
                action: 'Update',
                table_name: 'articles',
                record_id: article_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `แก้ไขบทความ: ${article.title}`,
                severity: 'Info',
                module: 'Articles'
            });

            res.json({
                success: true,
                message: req.t ? req.t('articleUpdatedSuccess') : 'แก้ไขบทความสำเร็จ'
            });

        } catch (error) {
            console.error('Update article error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorUpdatingArticle') : 'เกิดข้อผิดพลาดในการแก้ไขบทความ'
            });
        }
    },

    // ============ API: Delete Article ============
    async deleteArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.user_id;
            const userRole = req.user.role_name || req.user.role;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t ? req.t('articleNotFound') : 'ไม่พบบทความ'
                });
            }

            // Check permission
            if (article.author_id !== userId && userRole !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: req.t ? req.t('noPermissionDeleteArticle') : 'ไม่มีสิทธิ์ลบบทความนี้'
                });
            }

            const result = await Article.delete(article_id);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Log activity
            await ActivityLog.create({
                user_id: userId,
                action: 'Delete',
                table_name: 'articles',
                record_id: article_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `ลบบทความ: ${article.title}`,
                severity: 'Warning',
                module: 'Articles'
            });

            res.json({
                success: true,
                message: req.t ? req.t('articleDeletedSuccess') : 'ลบบทความสำเร็จ'
            });

        } catch (error) {
            console.error('Delete article error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorDeletingArticle') : 'เกิดข้อผิดพลาดในการลบบทความ'
            });
        }
    },

    // ============ API: Publish Article ============
    async publishArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.user_id;
            const userRole = req.user.role_name || req.user.role;

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t ? req.t('noPermissionPublishArticle') : 'ไม่มีสิทธิ์เผยแพร่บทความ'
                });
            }

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t ? req.t('articleNotFound') : 'ไม่พบบทความ'
                });
            }

            const result = await Article.togglePublish(article_id, true);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json({
                success: true,
                message: req.t ? req.t('articlePublishedSuccess') : 'เผยแพร่บทความสำเร็จ'
            });

        } catch (error) {
            console.error('Publish article error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorPublishingArticle') : 'เกิดข้อผิดพลาดในการเผยแพร่บทความ'
            });
        }
    },

    // ============ API: Update Article Status ============
    async updateArticleStatus(req, res) {
        try {
            const { article_id } = req.params;
            const { status } = req.body;
            const userId = req.user.user_id;
            const userRole = req.user.role_name || req.user.role;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t ? req.t('articleNotFound') : 'ไม่พบบทความ'
                });
            }

            // Check permission
            if (article.author_id !== userId && userRole !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: req.t ? req.t('noPermissionEditThisArticle') : 'ไม่มีสิทธิ์แก้ไขบทความนี้'
                });
            }

            const result = await Article.update(article_id, { status });

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json({
                success: true,
                message: req.t ? req.t('statusUpdatedSuccess') : 'อัพเดทสถานะสำเร็จ'
            });

        } catch (error) {
            console.error('Update article status error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorUpdatingStatus') : 'เกิดข้อผิดพลาดในการอัพเดทสถานะ'
            });
        }
    },

    // ============ API: Rate Article ============
    async rateArticle(req, res) {
        try {
            const { article_id } = req.params;
            const { rating } = req.body;
            const userId = req.user.user_id;

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: req.t ? req.t('ratingMustBeBetween1And5') : 'คะแนนต้องอยู่ระหว่าง 1-5'
                });
            }

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t ? req.t('articleNotFound') : 'ไม่พบบทความ'
                });
            }

            if (article.author_id === userId) {
                return res.status(400).json({
                    success: false,
                    message: req.t ? req.t('cannotRateOwnArticle') : 'ไม่สามารถให้คะแนนบทความของตัวเองได้'
                });
            }

            res.json({
                success: true,
                message: req.t ? req.t('articleRatedSuccess') : 'ให้คะแนนบทความสำเร็จ'
            });

        } catch (error) {
            console.error('Rate article error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorRatingArticle') : 'เกิดข้อผิดพลาดในการให้คะแนนบทความ'
            });
        }
    },

    // ============ API: Add Comment ============
    async addComment(req, res) {
        try {
            const { article_id } = req.params;
            const { comment_text, parent_comment_id } = req.body;
            const userId = req.user.user_id;

            if (!comment_text || comment_text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: req.t ? req.t('pleaseEnterComment') : 'กรุณากรอกความคิดเห็น'
                });
            }

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t ? req.t('articleNotFound') : 'ไม่พบบทความ'
                });
            }

            const commentData = {
                article_id: article_id,
                user_id: userId,
                comment_text: comment_text.trim(),
                parent_comment_id: parent_comment_id || null
            };

            const result = await Comment.create(commentData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(201).json({
                success: true,
                message: req.t ? req.t('commentAddedSuccess') : 'เพิ่มความคิดเห็นสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Add comment error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorAddingComment') : 'เกิดข้อผิดพลาดในการเพิ่มความคิดเห็น'
            });
        }
    },

    // ============ API: Edit Comment ============
    async editComment(req, res) {
        try {
            const { article_id, comment_id } = req.params;
            const { comment_text, reply_to_user_id } = req.body;
            const userId = req.user.user_id;

            if (!comment_text || comment_text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: req.t ? req.t('pleaseEnterComment') : 'กรุณากรอกความคิดเห็น'
                });
            }

            const result = await Comment.update(comment_id, userId, comment_text.trim());

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json({
                success: true,
                message: req.t ? req.t('commentUpdatedSuccess') : 'แก้ไขความคิดเห็นสำเร็จ'
            });

        } catch (error) {
            console.error('Edit comment error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorEditingComment') : 'เกิดข้อผิดพลาดในการแก้ไขความคิดเห็น'
            });
        }
    },

    // ============ API: Delete Comment ============
    async deleteComment(req, res) {
        try {
            const { article_id, comment_id } = req.params;
            const userId = req.user.user_id;
            const isAdmin = req.user?.role_name === 'Admin';

            const result = await Comment.delete(comment_id, userId, isAdmin);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json({
                success: true,
                message: req.t ? req.t('commentDeletedSuccess') : 'ลบความคิดเห็นสำเร็จ'
            });

        } catch (error) {
            console.error('Delete comment error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorDeletingComment') : 'เกิดข้อผิดพลาดในการลบความคิดเห็น'
            });
        }
    },

    // ============ API: Like Comment ============
    async likeComment(req, res) {
        try {
            const { article_id, comment_id } = req.params;
            const userId = req.user.user_id;
            const { poolPromise, sql } = require('../config/database');
            const pool = await poolPromise;

            // Check if already liked
            const existingLike = await pool.request()
                .input('commentId', sql.Int, comment_id)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT like_id FROM CommentLikes
                    WHERE comment_id = @commentId AND user_id = @userId
                `);

            let is_liked;
            if (existingLike.recordset.length > 0) {
                // Unlike - remove the like
                await pool.request()
                    .input('commentId', sql.Int, comment_id)
                    .input('userId', sql.Int, userId)
                    .query(`DELETE FROM CommentLikes WHERE comment_id = @commentId AND user_id = @userId`);
                is_liked = false;
            } else {
                // Like - add new like
                await pool.request()
                    .input('commentId', sql.Int, comment_id)
                    .input('userId', sql.Int, userId)
                    .query(`INSERT INTO CommentLikes (comment_id, user_id) VALUES (@commentId, @userId)`);
                is_liked = true;
            }

            // Get updated like count
            const countResult = await pool.request()
                .input('commentId', sql.Int, comment_id)
                .query(`SELECT COUNT(*) as count FROM CommentLikes WHERE comment_id = @commentId`);

            res.json({
                success: true,
                message: is_liked 
                    ? (req.t ? req.t('commentLikedSuccess') : 'กดถูกใจความคิดเห็นสำเร็จ')
                    : (req.t ? req.t('commentUnlikedSuccess') : 'ยกเลิกถูกใจสำเร็จ'),
                is_liked: is_liked,
                like_count: countResult.recordset[0].count
            });

        } catch (error) {
            console.error('Like comment error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLikingComment') : 'เกิดข้อผิดพลาด'
            });
        }
    },

    // ============ API: Reply to Comment ============
    async replyToComment(req, res) {
        try {
            const { article_id, comment_id } = req.params;
            const { comment_text, reply_to_user_id, reply_to_comment_id } = req.body;
            const userId = req.user.user_id;

            if (!comment_text || comment_text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: req.t ? req.t('pleaseEnterComment') : 'กรุณากรอกความคิดเห็น'
                });
            }

            const commentData = {
                article_id: article_id,
                user_id: userId,
                comment_text: comment_text.trim(),
                parent_comment_id: comment_id,
                reply_to_user_id: reply_to_user_id || null,
                reply_to_comment_id: reply_to_comment_id || null  // ID of the reply being replied to
            };

            const result = await Comment.create(commentData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(201).json({
                success: true,
                message: req.t ? req.t('replyAddedSuccess') : 'ตอบกลับสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Reply to comment error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorAddingReply') : 'เกิดข้อผิดพลาดในการตอบกลับ'
            });
        }
    },

    // ============ API: Follow Comment ============
    async followComment(req, res) {
        try {
            const { article_id, comment_id } = req.params;
            const userId = req.user.user_id;
            const { poolPromise, sql } = require('../config/database');
            const pool = await poolPromise;

            // Check if already following
            const existingFollow = await pool.request()
                .input('commentId', sql.Int, comment_id)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT follow_id FROM CommentFollows
                    WHERE comment_id = @commentId AND user_id = @userId
                `);

            let is_following;
            if (existingFollow.recordset.length > 0) {
                // Unfollow
                await pool.request()
                    .input('commentId', sql.Int, comment_id)
                    .input('userId', sql.Int, userId)
                    .query(`DELETE FROM CommentFollows WHERE comment_id = @commentId AND user_id = @userId`);
                is_following = false;
            } else {
                // Follow
                await pool.request()
                    .input('commentId', sql.Int, comment_id)
                    .input('userId', sql.Int, userId)
                    .query(`INSERT INTO CommentFollows (comment_id, user_id) VALUES (@commentId, @userId)`);
                is_following = true;
            }

            // Get follower count
            const countResult = await pool.request()
                .input('commentId', sql.Int, comment_id)
                .query(`SELECT COUNT(*) as count FROM CommentFollows WHERE comment_id = @commentId`);

            res.json({
                success: true,
                message: is_following 
                    ? (req.t ? req.t('followingComment') : 'ติดตามความคิดเห็นแล้ว')
                    : (req.t ? req.t('unfollowedComment') : 'ยกเลิกติดตามแล้ว'),
                is_following: is_following,
                follower_count: countResult.recordset[0].count
            });

        } catch (error) {
            console.error('Follow comment error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorFollowingComment') : 'เกิดข้อผิดพลาด'
            });
        }
    },



    // ============ API: React to Comment (Facebook-style) ============
    async reactComment(req, res) {
        try {
            const { article_id, comment_id } = req.params;
            const { reaction_type } = req.body;
            const userId = req.user.user_id;

            if (!reaction_type) {
                return res.status(400).json({
                    success: false,
                    message: 'Reaction type is required'
                });
            }

            const result = await Comment.addReaction(comment_id, userId, reaction_type);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Get updated reactions summary
            const summary = await Comment.getReactionsSummary(comment_id);

            res.json({
                success: true,
                action: result.action,
                user_reaction: result.reaction_type,
                reactions: summary
            });

        } catch (error) {
            console.error('React to comment error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาด'
            });
        }
    },

    // ============ API: Pin Comment ============
    async pinComment(req, res) {
        try {
            const { article_id, comment_id } = req.params;
            const userId = req.user.user_id;
            const isAdmin = req.user?.role_name === 'Admin';

            const result = await Comment.togglePin(comment_id, article_id, userId, isAdmin);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json({
                success: true,
                is_pinned: result.is_pinned,
                message: result.message
            });

        } catch (error) {
            console.error('Pin comment error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาด'
            });
        }
    },

    // ============ API: Get Reactions Detail ============
    async getCommentReactions(req, res) {
        try {
            const { article_id, comment_id } = req.params;

            const summary = await Comment.getReactionsSummary(comment_id);

            res.json({
                success: true,
                reactions: summary
            });

        } catch (error) {
            console.error('Get reactions error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาด'
            });
        }
    },

    // ============ API: Like Article ============
    async likeArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.user_id;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t ? req.t('articleNotFound') : 'ไม่พบบทความ'
                });
            }

            // Use toggle like (like/unlike)
            const result = await Article.toggleLike(article_id, userId);

            res.json({
                success: true,
                is_liked: result.is_liked,
                like_count: result.like_count,
                message: result.is_liked
                    ? (req.t ? req.t('addedToLiked') : 'เพิ่มในรายการถูกใจแล้ว')
                    : (req.t ? req.t('unliked') : 'ยกเลิกถูกใจแล้ว')
            });

        } catch (error) {
            console.error('Like article error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLikingArticle') : 'เกิดข้อผิดพลาด'
            });
        }
    },

    // ============ API: Get My Articles ============
    async getMyArticles(req, res) {
        try {
            const userId = req.user.user_id;
            const { status, page = 1, limit = 10 } = req.query;

            const pool = await poolPromise;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            let whereClause = 'WHERE a.author_id = @userId AND a.status != \'deleted\'';
            if (status) {
                whereClause += ' AND a.status = @status';
            }

            const request = pool.request()
                .input('userId', sql.Int, userId)
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, parseInt(limit));

            if (status) {
                request.input('status', sql.NVarChar, status);
            }

            const result = await request.query(`
                SELECT
                    a.*,
                    (SELECT COUNT(*) FROM Comments c WHERE c.article_id = a.article_id) as comments_count
                FROM articles a
                ${whereClause}
                ORDER BY a.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

            res.json({
                success: true,
                data: result.recordset,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: result.recordset.length
                }
            });

        } catch (error) {
            console.error('Get my articles error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingMyArticles') : 'เกิดข้อผิดพลาดในการโหลดบทความของฉัน'
            });
        }
    },

    // ============ API: Get Popular Articles ============
    async getPopularArticles(req, res) {
        try {
            const { limit = 10 } = req.query;

            const articles = await Article.getPopular(parseInt(limit));

            res.json({
                success: true,
                data: articles
            });

        } catch (error) {
            console.error('Get popular articles error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingPopularArticles') : 'เกิดข้อผิดพลาดในการโหลดบทความยอดนิยม'
            });
        }
    },

    // ============ API: Get Article Categories ============
    async getArticleCategories(req, res) {
        try {
            const categories = await Article.getCategories();

            res.json({
                success: true,
                data: categories
            });

        } catch (error) {
            console.error('Get article categories error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingArticleCategories') : 'เกิดข้อผิดพลาดในการโหลดหมวดหมู่บทความ'
            });
        }
    },

    // ============ Render: Articles List Page ============
    async renderArticlesList(req, res) {
        try {
            res.render('articles/index', {
                title: 'ศูนย์แบ่งปันความรู้ - ' + (req.systemSettings?.site_name || 'LearnHub'),
                user: req.session.user,
                userRole: req.user?.role_name || req.user?.role
            });

        } catch (error) {
            console.error('Render articles list error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด',
                message: req.t ? req.t('cannotLoadArticleListPage') : 'ไม่สามารถโหลดหน้ารายการบทความได้',
                user: req.session.user,
                error: error
            });
        }
    },

    // ============ Render: Article Detail Page ============
    async renderArticleDetail(req, res) {
        try {
            const { article_id } = req.params;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.render('error/404', {
                    title: 'ไม่พบหน้าที่ต้องการ',
                    user: req.session.user
                });
            }

            // View count is now incremented via API call from frontend (detail.ejs)
            // This prevents double counting and allows proper tracking

            res.render('articles/detail', {
                title: `${article.title} - ${req.systemSettings?.site_name || 'LearnHub'}`,
                user: req.session.user,
                userRole: req.user?.role_name || req.user?.role,
                article: article
            });

        } catch (error) {
            console.error('Render article detail error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด',
                message: req.t ? req.t('cannotLoadArticleData') : 'ไม่สามารถโหลดข้อมูลบทความได้',
                user: req.session.user,
                error: error
            });
        }
    },

    // ============ Render: Create Article Page ============
    async renderCreateArticle(req, res) {
        try {
            // Debug log
            console.log('🔍 renderCreateArticle - req.user:', req.user);
            console.log('🔍 renderCreateArticle - req.session.user:', req.session?.user);
            console.log('🔍 renderCreateArticle - req.user.role:', req.user?.role);
            console.log('🔍 renderCreateArticle - req.user.role_name:', req.user?.role_name);

            const userRole = req.user?.role || req.user?.role_name || req.session?.user?.role_name;
            console.log('🔍 renderCreateArticle - resolved userRole:', userRole);

            if (!['Admin', 'Instructor', 'Learner'].includes(userRole)) {
                console.log('❌ Access denied - userRole not in allowed list');
                return res.render('error/403', {
                    title: 'ไม่มีสิทธิ์เข้าถึง',
                    user: req.session.user
                });
            }

            res.render('articles/create', {
                title: 'สร้างบทความใหม่ - ' + (req.systemSettings?.site_name || 'LearnHub'),
                user: req.session.user,
                userRole: userRole
            });

        } catch (error) {
            console.error('Render create article error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด',
                message: req.t ? req.t('cannotLoadCreateArticlePage') : 'ไม่สามารถโหลดหน้าสร้างบทความได้',
                user: req.session.user,
                error: error
            });
        }
    },

    // ============ Render: Edit Article Page ============
    async renderEditArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user?.user_id;
            const userRole = req.user?.role_name || req.user?.role;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.render('error/404', {
                    title: 'ไม่พบหน้าที่ต้องการ',
                    user: req.session.user
                });
            }

            // Check permission
            if (article.author_id !== userId && userRole !== 'Admin') {
                return res.render('error/403', {
                    title: 'ไม่มีสิทธิ์เข้าถึง',
                    user: req.session.user
                });
            }

            res.render('articles/edit', {
                title: `แก้ไขบทความ - ${req.systemSettings?.site_name || 'LearnHub'}`,
                user: req.session.user,
                userRole: userRole,
                article: article
            });

        } catch (error) {
            console.error('Render edit article error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด',
                message: req.t ? req.t('cannotLoadEditArticlePage') : 'ไม่สามารถโหลดหน้าแก้ไขบทความได้',
                user: req.session.user,
                error: error
            });
        }
    },

    // ============ API: Get Popular Tags ============
    async getPopularTags(req, res) {
        try {
            const pool = await poolPromise;
            const { limit = 20 } = req.query;

            const result = await pool.request()
                .input('limit', sql.Int, parseInt(limit))
                .query(`
                    SELECT TOP (@limit)
                        value as name,
                        COUNT(*) as count
                    FROM articles a
                    CROSS APPLY STRING_SPLIT(a.tags, ',')
                    WHERE a.status = 'published' AND a.tags IS NOT NULL AND LTRIM(RTRIM(value)) != ''
                    GROUP BY value
                    ORDER BY COUNT(*) DESC
                `);

            res.json({
                success: true,
                tags: result.recordset.map(t => ({
                    name: t.name.trim(),
                    count: t.count
                }))
            });

        } catch (error) {
            console.error('Get popular tags error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingTags') : 'เกิดข้อผิดพลาดในการโหลดแท็ก'
            });
        }
    },

    // ============ API: Get Article Comments ============
    async getArticleComments(req, res) {
        try {
            const { article_id } = req.params;
            const { page = 1, limit = 20, sort = 'newest' } = req.query;
            const userId = req.user?.user_id;

            const comments = await Comment.getByArticle(article_id, parseInt(page), parseInt(limit), userId, sort);

            // Get article author for author badge
            const article = await Article.findById(article_id);
            const articleAuthorId = article?.author_id;
            const isArticleAuthor = articleAuthorId === userId;
            const isAdmin = req.user?.role_name === 'Admin';

            // Add permission flags and reactions
            comments.data = await Promise.all(comments.data.map(async comment => {
                const reactions = await Comment.getReactionsSummary(comment.comment_id);

                return {
                    ...comment,
                    can_edit: comment.user_id === userId,
                    can_delete: comment.user_id === userId || isAdmin,
                    can_pin: isArticleAuthor || isAdmin,
                    user_avatar: comment.author_image || '/images/default-avatar.png',
                    user_name: comment.author_name,
                    content: comment.comment_text,
                    is_author: comment.user_id === articleAuthorId,
                    is_pinned: comment.is_pinned || false,
                    user_reaction: comment.user_reaction || null,
                    reactions: reactions,
                    is_following: comment.is_following > 0,
                    replies: await Promise.all((comment.replies || []).map(async reply => {
                        const replyReactions = await Comment.getReactionsSummary(reply.comment_id);
                        return {
                            ...reply,
                            user_avatar: reply.author_image || '/images/default-avatar.png',
                            user_name: reply.author_name,
                            content: reply.comment_text,
                            is_author: reply.user_id === articleAuthorId,
                            user_reaction: reply.user_reaction || null,
                            reactions: replyReactions,
                            reply_to_name: reply.reply_to_name || null,
                            reply_to_user_id: reply.reply_to_user_id || null,
                            reply_to_comment_id: reply.reply_to_comment_id || null,  // For nested replies
                            can_edit: reply.user_id === userId,
                            can_delete: reply.user_id === userId || isAdmin
                        };
                    }))
                };
            }));

            res.json({
                success: true,
                comments: comments.data,
                pagination: {
                    page: comments.page,
                    total: comments.total,
                    totalPages: comments.totalPages,
                    has_next: comments.page < comments.totalPages
                }
            });

        } catch (error) {
            console.error('Get article comments error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingComments') : 'เกิดข้อผิดพลาดในการโหลดความคิดเห็น'
            });
        }
    },

    // ============ API: Get Related Articles ============
    async getRelatedArticles(req, res) {
        try {
            const { article_id } = req.params;
            const { limit = 5 } = req.query;

            const articles = await Article.getRelated(article_id, parseInt(limit));

            res.json({
                success: true,
                articles: articles.map(a => ({
                    article_id: a.article_id,
                    title: a.title,
                    featured_image: a.featured_image,
                    created_at: a.created_at,
                    views: a.views_count,
                    likes: a.likes_count
                }))
            });

        } catch (error) {
            console.error('Get related articles error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingRelatedArticles') : 'เกิดข้อผิดพลาดในการโหลดบทความที่เกี่ยวข้อง'
            });
        }
    },

    // ============ API: Bookmark/Save Article ============
    async bookmarkArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.user_id;

            const pool = await poolPromise;

            // Check if bookmark exists
            const existingBookmark = await pool.request()
                .input('userId', sql.Int, userId)
                .input('articleId', sql.Int, article_id)
                .query(`
                    SELECT bookmark_id FROM article_bookmarks
                    WHERE user_id = @userId AND article_id = @articleId
                `);

            let isBookmarked = false;

            if (existingBookmark.recordset.length > 0) {
                // Remove bookmark
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('articleId', sql.Int, article_id)
                    .query(`
                        DELETE FROM article_bookmarks
                        WHERE user_id = @userId AND article_id = @articleId
                    `);
            } else {
                // Add bookmark
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('articleId', sql.Int, article_id)
                    .query(`
                        INSERT INTO article_bookmarks (user_id, article_id, created_at)
                        VALUES (@userId, @articleId, GETDATE())
                    `);
                isBookmarked = true;
            }

            res.json({
                success: true,
                bookmarked: isBookmarked,
                is_saved: isBookmarked,
                message: isBookmarked
                    ? (req.t ? req.t('articleBookmarked') : 'บันทึกบทความแล้ว')
                    : (req.t ? req.t('bookmarkRemoved') : 'ลบบุ๊คมาร์คแล้ว')
            });

        } catch (error) {
            // If table doesn't exist, create it
            if (error.message.includes('Invalid object name')) {
                try {
                    const pool = await poolPromise;
                    await pool.request().query(`
                        CREATE TABLE article_bookmarks (
                            bookmark_id INT IDENTITY(1,1) PRIMARY KEY,
                            user_id INT NOT NULL,
                            article_id INT NOT NULL,
                            created_at DATETIME DEFAULT GETDATE(),
                            CONSTRAINT FK_bookmark_user FOREIGN KEY (user_id) REFERENCES users(user_id),
                            CONSTRAINT FK_bookmark_article FOREIGN KEY (article_id) REFERENCES articles(article_id),
                            CONSTRAINT UQ_user_article_bookmark UNIQUE (user_id, article_id)
                        )
                    `);
                    // Retry the bookmark
                    return this.bookmarkArticle(req, res);
                } catch (createError) {
                    console.error('Create bookmarks table error:', createError);
                }
            }
            console.error('Bookmark article error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorBookmarking') : 'เกิดข้อผิดพลาดในการบันทึก'
            });
        }
    },

    // ============ API: Increment View Count ============
    async incrementViewCount(req, res) {
        try {
            const { article_id } = req.params;

            // Collect viewer information for duplicate prevention
            const viewerInfo = {
                userId: req.user?.user_id || null,
                sessionId: req.sessionID || req.session?.id || null,
                ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0],
                userAgent: req.headers['user-agent']
            };

            const result = await Article.addView(article_id, viewerInfo);

            res.json({
                success: result.success,
                counted: result.counted,
                message: result.message
            });

        } catch (error) {
            console.error('Increment view count error:', error);
            res.status(500).json({
                success: false,
                counted: false,
                message: 'Error incrementing view count'
            });
        }
    },

    // ============ API: Autosave Article ============
    async autosaveArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.user_id;
            const userRole = req.user.role_name || req.user.role;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: 'Article not found'
                });
            }

            // Check permission
            if (article.author_id !== userId && userRole !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'No permission to edit this article'
                });
            }

            const updateData = {};
            if (req.body.title) updateData.title = req.body.title;
            if (req.body.content) updateData.content = req.body.content;
            if (req.body.summary) updateData.excerpt = req.body.summary;
            if (req.body.category) updateData.category = req.body.category;
            if (req.body.tags) updateData.tags = req.body.tags;

            if (Object.keys(updateData).length > 0) {
                await Article.update(article_id, updateData);
            }

            res.json({
                success: true,
                message: 'Autosaved',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Autosave article error:', error);
            res.status(500).json({
                success: false,
                message: 'Error autosaving'
            });
        }
    },

    // ============ API: Get Image Gallery ============
    async getImageGallery(req, res) {
        try {
            const uploadDir = path.join(__dirname, '../public/uploads/articles');

            // Ensure directory exists
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
                return res.json({
                    success: true,
                    images: []
                });
            }

            // Read directory
            const files = fs.readdirSync(uploadDir);

            // Filter only image files
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const images = files
                .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
                .map(file => {
                    const filePath = path.join(uploadDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        filename: file,
                        url: `/uploads/articles/${file}`,
                        size: stats.size,
                        created_at: stats.birthtime,
                        modified_at: stats.mtime
                    };
                })
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort newest first

            res.json({
                success: true,
                images: images
            });

        } catch (error) {
            console.error('Get image gallery error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingGallery') : 'เกิดข้อผิดพลาดในการโหลดแกลเลอรี่'
            });
        }
    },

    // ============ API: Upload Article Image ============
    async uploadArticleImage(req, res) {
        articleImageUpload(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    message: err.code === 'LIMIT_FILE_SIZE'
                        ? 'File too large. Maximum size is 5MB'
                        : err.message
                });
            } else if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const imageUrl = `/uploads/articles/${req.file.filename}`;

            res.json({
                success: true,
                url: imageUrl,
                filename: req.file.filename
            });
        });
    }
};

module.exports = articleController;
