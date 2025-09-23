const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all article routes
router.use(authMiddleware.requireAuth);

// Render pages
router.get('/', articleController.renderArticlesList);
router.get('/create', articleController.renderCreateArticle);
router.get('/:article_id', articleController.renderArticleDetail);

// API endpoints - Article CRUD operations (using existing functions)
router.get('/api/all', articleController.getAllArticles);
router.get('/api/:article_id', articleController.getArticleById);
router.post('/api/create', articleController.createArticle);
router.put('/api/:article_id', articleController.updateArticle);
router.delete('/api/:article_id', articleController.deleteArticle);

// Article publishing (using existing functions)
router.put('/api/:article_id/publish', authMiddleware.requireRole(['Admin', 'Instructor']), articleController.publishArticle);

// Article ratings and comments (using existing functions)
router.post('/api/:article_id/rate', articleController.rateArticle);
router.post('/api/:article_id/comments', articleController.addComment);

// Article categories and popular articles (using existing functions)
router.get('/api/categories', articleController.getArticleCategories);
router.get('/api/popular', articleController.getPopularArticles);

// My articles (using existing functions)
router.get('/api/my-articles', articleController.getMyArticles);

module.exports = router;