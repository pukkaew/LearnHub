const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const authMiddleware = require('../middleware/auth');

// Apply authentication to all article routes
router.use(authMiddleware.requireAuth);

// ============ API Endpoints (must be before :article_id routes) ============
// List articles with pagination and filters (for index page)
router.get('/api/list', articleController.getArticlesList);

// Get all articles (original API)
router.get('/api/all', articleController.getAllArticles);

// Article categories
router.get('/api/categories', articleController.getArticleCategories);

// Popular articles
router.get('/api/popular', articleController.getPopularArticles);

// Popular tags
router.get('/api/popular-tags', articleController.getPopularTags);

// My articles
router.get('/api/my-articles', articleController.getMyArticles);

// Image Gallery
router.get('/api/gallery', articleController.getImageGallery);

// Image Upload
router.post('/api/upload/image', articleController.uploadArticleImage);

// Create article
router.post('/api/create', articleController.createArticle);

// ============ API with :article_id parameter ============
// Get article by ID
router.get('/api/:article_id', articleController.getArticleById);

// Get article for editing
router.get('/api/:article_id/edit', articleController.getArticleForEdit);

// Get comments for article
router.get('/api/:article_id/comments', articleController.getArticleComments);

// Get related articles
router.get('/api/:article_id/related', articleController.getRelatedArticles);

// Update article
router.put('/api/:article_id', articleController.updateArticle);

// Delete article
router.delete('/api/:article_id', articleController.deleteArticle);

// Publish article
router.put('/api/:article_id/publish', authMiddleware.requireRole(['Admin', 'Instructor']), articleController.publishArticle);

// Update article status
router.put('/api/:article_id/status', articleController.updateArticleStatus);

// Rate article
router.post('/api/:article_id/rate', articleController.rateArticle);

// Add comment
router.post('/api/:article_id/comments', articleController.addComment);

// Edit comment
router.put('/api/:article_id/comments/:comment_id', articleController.editComment);

// Delete comment
router.delete('/api/:article_id/comments/:comment_id', articleController.deleteComment);

// Like comment
router.post('/api/:article_id/comments/:comment_id/like', articleController.likeComment);

// Reply to comment
router.post('/api/:article_id/comments/:comment_id/reply', articleController.replyToComment);

// Follow comment
router.post('/api/:article_id/comments/:comment_id/follow', articleController.followComment);


// React to comment (Facebook-style reactions)
router.post('/api/:article_id/comments/:comment_id/react', articleController.reactComment);

// Pin comment
router.post('/api/:article_id/comments/:comment_id/pin', articleController.pinComment);

// Get comment reactions
router.get('/api/:article_id/comments/:comment_id/reactions', articleController.getCommentReactions);

// Like article
router.post('/api/:article_id/like', articleController.likeArticle);

// Bookmark/Save article
router.post('/api/:article_id/bookmark', articleController.bookmarkArticle);
router.post('/api/:article_id/save', articleController.bookmarkArticle);

// View count (explicit)
router.post('/api/:article_id/view', articleController.incrementViewCount);

// Autosave
router.post('/api/:article_id/autosave', articleController.autosaveArticle);

// ============ Render Pages (must be last - :article_id is catch-all) ============
router.get('/', articleController.renderArticlesList);
router.get('/create', articleController.renderCreateArticle);
router.get('/:article_id/edit', articleController.renderEditArticle);
router.get('/:article_id', articleController.renderArticleDetail);

module.exports = router;
