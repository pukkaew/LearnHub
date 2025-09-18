const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Render pages
router.get('/login', authController.renderLogin);
router.get('/register', authController.renderRegister);
router.get('/forgot-password', authController.renderForgotPassword);
router.get('/reset-password', authController.renderResetPassword);

// API endpoints
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', verifyToken, authController.changePassword);
router.get('/verify-token', verifyToken, authController.verifyToken);

module.exports = router;