const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Apply authentication to all article routes
router.use(verifyToken);

// Render pages
router.get('/', articleController.renderArticleList);
router.get('/create', articleController.renderCreateArticle);
router.get('/edit/:article_id', articleController.renderEditArticle);
router.get('/:article_id', articleController.renderArticleDetail);
router.get('/category/:category_id', articleController.renderArticlesByCategory);
router.get('/author/:author_id', articleController.renderArticlesByAuthor);

// API endpoints - Article CRUD operations
router.post('/', articleController.createArticle);
router.get('/api/list', articleController.getArticleList);
router.get('/api/:article_id', articleController.getArticleById);
router.put('/api/:article_id', articleController.updateArticle);
router.delete('/api/:article_id', articleController.deleteArticle);

// Article content management
router.post('/api/:article_id/content', articleController.updateArticleContent);
router.get('/api/:article_id/versions', articleController.getArticleVersions);
router.post('/api/:article_id/restore/:version_id', requireRole(['Admin']), articleController.restoreArticleVersion);
router.get('/api/:article_id/version/:version_id', articleController.getArticleVersion);

// Article publishing and workflow
router.put('/api/:article_id/publish', articleController.publishArticle);
router.put('/api/:article_id/unpublish', articleController.unpublishArticle);
router.put('/api/:article_id/submit-review', articleController.submitForReview);
router.put('/api/:article_id/approve', requireRole(['Admin', 'Reviewer']), articleController.approveArticle);
router.put('/api/:article_id/reject', requireRole(['Admin', 'Reviewer']), articleController.rejectArticle);

// Article categories and tags
router.get('/api/categories', articleController.getArticleCategories);
router.post('/api/categories', requireRole(['Admin']), articleController.createCategory);
router.put('/api/:article_id/category', articleController.updateArticleCategory);
router.post('/api/:article_id/tags', articleController.addArticleTags);
router.delete('/api/:article_id/tags/:tag_id', articleController.removeArticleTag);
router.get('/api/tags', articleController.getPopularTags);

// Article ratings and feedback
router.post('/api/:article_id/rate', articleController.rateArticle);
router.get('/api/:article_id/ratings', articleController.getArticleRatings);
router.post('/api/:article_id/helpful', articleController.markAsHelpful);
router.post('/api/:article_id/report', articleController.reportArticle);

// Comments management
router.post('/api/:article_id/comments', articleController.addComment);
router.get('/api/:article_id/comments', articleController.getArticleComments);
router.put('/api/:article_id/comments/:comment_id', articleController.updateComment);
router.delete('/api/:article_id/comments/:comment_id', articleController.deleteComment);
router.post('/api/:article_id/comments/:comment_id/reply', articleController.replyToComment);
router.post('/api/:article_id/comments/:comment_id/like', articleController.likeComment);

// Article search and filtering
router.get('/api/search', articleController.searchArticles);
router.get('/api/filter', articleController.filterArticles);
router.get('/api/trending', articleController.getTrendingArticles);
router.get('/api/recommended', articleController.getRecommendedArticles);

// Article views and analytics
router.post('/api/:article_id/view', articleController.trackArticleView);
router.get('/api/:article_id/analytics', requireRole(['Admin', 'Author']), articleController.getArticleAnalytics);
router.get('/api/:article_id/stats', articleController.getArticleStats);

// Article bookmarks and favorites
router.post('/api/:article_id/bookmark', articleController.bookmarkArticle);
router.delete('/api/:article_id/bookmark', articleController.removeBookmark);
router.get('/api/my-bookmarks', articleController.getMyBookmarks);
router.post('/api/:article_id/favorite', articleController.favoriteArticle);
router.get('/api/my-favorites', articleController.getMyFavorites);

// Article sharing and collaboration
router.post('/api/:article_id/share', articleController.shareArticle);
router.get('/api/:article_id/share-stats', articleController.getShareStats);
router.post('/api/:article_id/collaborate', articleController.addCollaborator);
router.delete('/api/:article_id/collaborate/:user_id', articleController.removeCollaborator);
router.get('/api/:article_id/collaborators', articleController.getCollaborators);

// Article attachments and media
router.post('/api/:article_id/attachments', articleController.addAttachment);
router.get('/api/:article_id/attachments', articleController.getAttachments);
router.delete('/api/:article_id/attachments/:attachment_id', articleController.deleteAttachment);
router.post('/api/:article_id/images', articleController.uploadImage);

// Article templates and drafts
router.get('/api/templates', articleController.getArticleTemplates);
router.post('/api/templates', requireRole(['Admin']), articleController.createTemplate);
router.post('/api/:article_id/save-draft', articleController.saveDraft);
router.get('/api/my-drafts', articleController.getMyDrafts);
router.delete('/api/drafts/:draft_id', articleController.deleteDraft);

// Article series and collections
router.post('/api/series', articleController.createSeries);
router.get('/api/series', articleController.getArticleSeries);
router.post('/api/:article_id/add-to-series/:series_id', articleController.addToSeries);
router.delete('/api/:article_id/remove-from-series/:series_id', articleController.removeFromSeries);

// Article moderation
router.get('/api/pending-review', requireRole(['Admin', 'Reviewer']), articleController.getPendingReview);
router.get('/api/reported', requireRole(['Admin', 'Moderator']), articleController.getReportedArticles);
router.put('/api/:article_id/moderate', requireRole(['Admin', 'Moderator']), articleController.moderateArticle);
router.post('/api/:article_id/flag', requireRole(['Admin', 'Moderator']), articleController.flagArticle);

// Knowledge base and FAQ
router.get('/api/knowledge-base', articleController.getKnowledgeBase);
router.get('/api/faq', articleController.getFAQ);
router.post('/api/faq', requireRole(['Admin']), articleController.createFAQ);
router.put('/api/faq/:faq_id', requireRole(['Admin']), articleController.updateFAQ);

// Article export and import
router.get('/api/:article_id/export', articleController.exportArticle);
router.post('/api/import', requireRole(['Admin']), articleController.importArticle);
router.get('/api/export-all', requireRole(['Admin']), articleController.exportAllArticles);

// My articles (author view)
router.get('/api/my-articles', articleController.getMyArticles);
router.get('/api/my-articles/published', articleController.getMyPublishedArticles);
router.get('/api/my-articles/drafts', articleController.getMyDrafts);
router.get('/api/my-articles/pending', articleController.getMyPendingArticles);

// Article statistics for authors
router.get('/api/author-stats', articleController.getAuthorStats);
router.get('/api/author/:author_id/stats', articleController.getAuthorStatsById);
router.get('/api/top-authors', articleController.getTopAuthors);

// Content quality and recommendations
router.post('/api/:article_id/improve-suggestions', requireRole(['Admin', 'Reviewer']), articleController.addImproveSuggestions);
router.get('/api/:article_id/suggestions', articleController.getImproveSuggestions);
router.put('/api/:article_id/quality-score', requireRole(['Admin']), articleController.updateQualityScore);

module.exports = router;