const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all article routes
router.use(authMiddleware.requireAuth);

// ============ Render Pages ============
router.get('/', articleController.renderArticlesList);
router.get('/create', articleController.renderCreateArticle);
router.get('/:article_id/edit', articleController.renderEditArticle);
router.get('/:article_id', articleController.renderArticleDetail);

// ============ API Endpoints ============
// List articles with pagination and filters (for index page)
router.get('/api/list', articleController.getArticlesList);

// Get all articles (original API)
router.get('/api/all', articleController.getAllArticles);

// Get article by ID
router.get('/api/:article_id', articleController.getArticleById);

// Get article for editing
router.get('/api/:article_id/edit', articleController.getArticleForEdit);

// Create article
router.post('/api/create', articleController.createArticle);

// Update article
router.put('/api/:article_id', articleController.updateArticle);

// Delete article
router.delete('/api/:article_id', articleController.deleteArticle);

// ============ Article Status ============
// Publish article
router.put('/api/:article_id/publish', authMiddleware.requireRole(['Admin', 'Instructor']), articleController.publishArticle);

// Update article status
router.put('/api/:article_id/status', articleController.updateArticleStatus);

// ============ Interactions ============
// Rate article
router.post('/api/:article_id/rate', articleController.rateArticle);

// Add comment
router.post('/api/:article_id/comments', articleController.addComment);

// Like article
router.post('/api/:article_id/like', articleController.likeArticle);

// ============ Other APIs ============
// Article categories
router.get('/api/categories', articleController.getArticleCategories);

// Popular articles
router.get('/api/popular', articleController.getPopularArticles);

// My articles
router.get('/api/my-articles', articleController.getMyArticles);

module.exports = router;
