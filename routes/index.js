const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const userRoutes = require('./userRoutes');
const courseRoutes = require('./courseRoutes');
const testRoutes = require('./testRoutes');
const articleRoutes = require('./articleRoutes');
const applicantRoutes = require('./applicantRoutes');

// Authentication routes (public)
router.use('/auth', authRoutes);

// Applicant routes (public)
router.use('/applicant', applicantRoutes);

// Protected routes (require authentication)
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/tests', testRoutes);
router.use('/articles', articleRoutes);

// Root redirect
router.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Ruxchai LearnHub'
    });
});

module.exports = router;