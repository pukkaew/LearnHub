const Article = require('../models/Article');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const { t } = require('../utils/languages');

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
            if (category) {filters.category = category;}
            if (author_id) {filters.author_id = author_id;}
            if (status) {filters.status = status;}
            else {filters.status = 'published';} // Default to published articles
            if (search) {filters.search = search;}
            if (tags) {filters.tags = tags;}

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
                message: req.t('errorLoadingArticleList')
            });
        }
    },

    async getArticleById(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user?.user_id;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t('articleNotFound')
                });
            }

            if (article.status !== 'Published' && article.author_id !== userId) {
                const userRole = req.user?.role;
                if (!['Admin', 'Instructor'].includes(userRole)) {
                    return res.status(403).json({
                        success: false,
                        message: req.t('noPermissionAccessArticle')
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
                message: req.t('errorLoadingArticleData')
            });
        }
    },

    async createArticle(req, res) {
        try {
            const userId = req.user.user_id;
            const userRole = req.user.role;

            if (!['Admin', 'Instructor', 'Learner'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionCreateArticle')
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
                message: req.t('articleCreatedSuccess'),
                data: result.data
            });

        } catch (error) {
            console.error('Create article error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorCreatingArticle')
            });
        }
    },

    async updateArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.user_id;
            const userRole = req.user.role;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t('articleNotFound')
                });
            }

            if (article.author_id !== userId && !['Admin'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionEditThisArticle')
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
                message: req.t('articleUpdatedSuccess'),
                data: result.data
            });

        } catch (error) {
            console.error('Update article error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorUpdatingArticle')
            });
        }
    },

    async deleteArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.user_id;
            const userRole = req.user.role;

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t('articleNotFound')
                });
            }

            if (article.author_id !== userId && userRole !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionDeleteArticle')
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
                message: req.t('articleDeletedSuccess')
            });

        } catch (error) {
            console.error('Delete article error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorDeletingArticle')
            });
        }
    },

    async publishArticle(req, res) {
        try {
            const { article_id } = req.params;
            const userId = req.user.user_id;
            const userRole = req.user.role;

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionPublishArticle')
                });
            }

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t('articleNotFound')
                });
            }

            if (article.status === 'Published') {
                return res.status(400).json({
                    success: false,
                    message: req.t('articleAlreadyPublished')
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
                message: req.t('articlePublishedSuccess'),
                data: result.data
            });

        } catch (error) {
            console.error('Publish article error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorPublishingArticle')
            });
        }
    },

    async rateArticle(req, res) {
        try {
            const { article_id } = req.params;
            const { rating } = req.body;
            const userId = req.user.user_id;

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: req.t('ratingMustBeBetween1And5')
                });
            }

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t('articleNotFound')
                });
            }

            if (article.author_id === userId) {
                return res.status(400).json({
                    success: false,
                    message: req.t('cannotRateOwnArticle')
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
                message: req.t('articleRatedSuccess'),
                data: result.data
            });

        } catch (error) {
            console.error('Rate article error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorRatingArticle')
            });
        }
    },

    async addComment(req, res) {
        try {
            const { article_id } = req.params;
            const { comment_text, parent_comment_id } = req.body;
            const userId = req.user.user_id;

            if (!comment_text || comment_text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: req.t('pleaseEnterComment')
                });
            }

            const article = await Article.findById(article_id);
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: req.t('articleNotFound')
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
                message: req.t('commentAddedSuccess'),
                data: result.data
            });

        } catch (error) {
            console.error('Add comment error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorAddingComment')
            });
        }
    },

    async getMyArticles(req, res) {
        try {
            const userId = req.user.user_id;
            const { status, page = 1, limit = 10 } = req.query;

            const filters = { author_id: userId };
            if (status) {filters.status = status;}

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
                message: req.t('errorLoadingMyArticles')
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
                message: req.t('errorLoadingPopularArticles')
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
                message: req.t('errorLoadingArticleCategories')
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
                message: req.t('cannotLoadArticleListPage'),
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
                message: req.t('cannotLoadArticleData'),
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
                message: req.t('cannotLoadCreateArticlePage'),
                user: req.session.user,
                error: error
            });
        }
    }
};

module.exports = articleController;