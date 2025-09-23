const Article = require('../models/Article');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');

const articleController = {
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
            else filters.status = 'published'; // Default to published articles
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
                message: 'เกิดข้อผิดพลาดในการโหลดรายการบทความ'
            });
        }
    },

    async getArticleById(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user?.userId;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบบทความที่ต้องการ'
                });
            }

            if (article.status !== 'Published' && article.author_id !== userId) {
                const userRole = req.user?.role;
                if (!['Admin', 'Instructor'].includes(userRole)) {
                    return res.status(403).json({
                        success: false,
                        message: 'ไม่มีสิทธิ์เข้าถึงบทความนี้'
                    });
                }
            }

            if (userId) {
                await Article.incrementViewCount(article_id, userId);

                await ActivityLog.create({
                    user_id: userId,
                    action: 'View_Article',
                    table_name: 'Articles',
                    record_id: article_id,
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent'),
                    session_id: req.sessionID,
                    description: `User viewed article: ${article.title}`,
                    severity: 'Info',
                    module: 'Knowledge Sharing'
                });
            }

            const comments = await Comment.findByArticle(article_id);

            res.json({
                success: true,
                data: {
                    article: article,
                    comments: comments
                }
            });

        } catch (error) {
            console.error('Get article by id error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลบทความ'
            });
        }
    },

    async createArticle(req, res) {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;

            if (!['Admin', 'Instructor', 'Learner'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์สร้างบทความ'
                });
            }

            const articleData = {
                ...req.body,
                author_id: userId,
                status: userRole === 'Learner' ? 'Draft' : 'Published'
            };

            const result = await Article.create(articleData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                userId,
                'Create',
                'Articles',
                result.data.article_id,
                null,
                articleData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Created article: ${articleData.title}`
            );

            res.status(201).json({
                success: true,
                message: 'สร้างบทความสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Create article error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการสร้างบทความ'
            });
        }
    },

    async updateArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.userId;
            const userRole = req.user.role;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบบทความที่ต้องการ'
                });
            }

            if (article.author_id !== userId && !['Admin'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์แก้ไขบทความนี้'
                });
            }

            const updateData = { ...req.body };

            const result = await Article.update(article_id, updateData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                userId,
                'Update',
                'Articles',
                article_id,
                article,
                updateData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Updated article: ${article.title}`
            );

            res.json({
                success: true,
                message: 'อัพเดทบทความสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Update article error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการอัพเดทบทความ'
            });
        }
    },

    async deleteArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.userId;
            const userRole = req.user.role;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบบทความที่ต้องการ'
                });
            }

            if (article.author_id !== userId && userRole !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์ลบบทความนี้'
                });
            }

            const result = await Article.delete(article_id);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                userId,
                'Delete',
                'Articles',
                article_id,
                article,
                null,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Deleted article: ${article.title}`
            );

            res.json({
                success: true,
                message: 'ลบบทความสำเร็จ'
            });

        } catch (error) {
            console.error('Delete article error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการลบบทความ'
            });
        }
    },

    async publishArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.userId;
            const userRole = req.user.role;

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์เผยแพร่บทความ'
                });
            }

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบบทความที่ต้องการ'
                });
            }

            if (article.status === 'Published') {
                return res.status(400).json({
                    success: false,
                    message: 'บทความนี้เผยแพร่แล้ว'
                });
            }

            const result = await Article.publish(article_id, userId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'Publish_Article',
                table_name: 'Articles',
                record_id: article_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Published article: ${article.title}`,
                severity: 'Info',
                module: 'Knowledge Sharing'
            });

            res.json({
                success: true,
                message: 'เผยแพร่บทความสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Publish article error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการเผยแพร่บทความ'
            });
        }
    },

    async rateArticle(req, res) {
        try {
            const { article_id } = req.params;
            const { rating } = req.body;
            const userId = req.user.userId;

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'คะแนนต้องอยู่ระหว่าง 1-5'
                });
            }

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบบทความที่ต้องการ'
                });
            }

            if (article.author_id === userId) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่สามารถให้คะแนนบทความของตัวเองได้'
                });
            }

            const result = await Article.rateArticle(article_id, userId, rating);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'Rate_Article',
                table_name: 'ArticleRatings',
                record_id: article_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Rated article: ${article.title} with ${rating} stars`,
                severity: 'Info',
                module: 'Knowledge Sharing'
            });

            res.json({
                success: true,
                message: 'ให้คะแนนบทความสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Rate article error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการให้คะแนนบทความ'
            });
        }
    },

    async addComment(req, res) {
        try {
            const { article_id } = req.params;
            const { comment_text, parent_comment_id } = req.body;
            const userId = req.user.userId;

            if (!comment_text || comment_text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณากรอกความคิดเห็น'
                });
            }

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบบทความที่ต้องการ'
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

            await ActivityLog.create({
                user_id: userId,
                action: 'Add_Comment',
                table_name: 'Comments',
                record_id: result.data.comment_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Added comment to article: ${article.title}`,
                severity: 'Info',
                module: 'Knowledge Sharing'
            });

            res.status(201).json({
                success: true,
                message: 'เพิ่มความคิดเห็นสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Add comment error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการเพิ่มความคิดเห็น'
            });
        }
    },

    async getMyArticles(req, res) {
        try {
            const userId = req.user.userId;
            const { status, page = 1, limit = 10 } = req.query;

            const filters = { author_id: userId };
            if (status) filters.status = status;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            filters.limit = parseInt(limit);
            filters.offset = offset;

            const articles = await Article.findAll(filters);

            res.json({
                success: true,
                data: articles,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: articles.length
                }
            });

        } catch (error) {
            console.error('Get my articles error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดบทความของฉัน'
            });
        }
    },

    async getPopularArticles(req, res) {
        try {
            const { limit = 10 } = req.query;

            const articles = await Article.findPopular(parseInt(limit));

            res.json({
                success: true,
                data: articles
            });

        } catch (error) {
            console.error('Get popular articles error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดบทความยอดนิยม'
            });
        }
    },

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
                message: 'เกิดข้อผิดพลาดในการโหลดหมวดหมู่บทความ'
            });
        }
    },

    async renderArticlesList(req, res) {
        try {
            res.render('articles/index', {
                title: 'แชร์ความรู้ - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: req.user?.role
            });

        } catch (error) {
            console.error('Render articles list error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดหน้ารายการบทความได้',
                user: req.session.user,
                error: error
            });
        }
    },

    async renderArticleDetail(req, res) {
        try {
            const { article_id } = req.params;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.render('error/404', {
                    title: 'ไม่พบหน้าที่ต้องการ - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

            const comments = await Comment.findByArticle(article_id);

            res.render('articles/detail', {
                title: `${article.title} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: req.user?.role,
                article: article,
                comments: comments
            });

        } catch (error) {
            console.error('Render article detail error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดข้อมูลบทความได้',
                user: req.session.user,
                error: error
            });
        }
    },

    async renderCreateArticle(req, res) {
        try {
            const userRole = req.user?.role;

            if (!['Admin', 'Instructor', 'Learner'].includes(userRole)) {
                return res.render('error/403', {
                    title: 'ไม่มีสิทธิ์เข้าถึง - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

            res.render('articles/create', {
                title: 'สร้างบทความ - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: userRole
            });

        } catch (error) {
            console.error('Render create article error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดหน้าสร้างบทความได้',
                user: req.session.user,
                error: error
            });
        }
    }
};

module.exports = articleController;