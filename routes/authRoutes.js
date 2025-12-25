const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const JWTAuthMiddleware = require('../middleware/jwtAuth');

// Render pages
router.get('/login', authController.renderLogin);
router.get('/register', authController.renderRegister);
router.get('/forgot-password', authController.renderForgotPassword);
router.get('/reset-password', authController.renderResetPassword);
router.get('/force-change-password', authController.renderForceChangePassword);

// API endpoints
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authMiddleware.requireAuth, authController.changePassword);
router.post('/force-change-password', authController.forceChangePassword);
router.get('/verify-token', authMiddleware.requireAuth, authController.verifyToken);

// JWT specific endpoints
router.post('/refresh-token', authController.refreshToken);
router.post('/api-keys', JWTAuthMiddleware.verifyToken, authController.generateApiKey);

// Alternative JWT-protected routes (for API clients)
router.get('/jwt/verify', JWTAuthMiddleware.verifyToken, authController.verifyToken);
router.post('/jwt/logout', JWTAuthMiddleware.verifyToken, authController.logout);
router.post('/jwt/change-password', JWTAuthMiddleware.verifyToken, authController.changePassword);

module.exports = router;