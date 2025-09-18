const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const morgan = require('morgan');
const compression = require('compression');
const cors = require('cors');
require('dotenv').config();

// Import middleware
const securityMiddleware = require('./middleware/security');
const authMiddleware = require('./middleware/auth');
const { poolPromise } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const testRoutes = require('./routes/testRoutes');
const articleRoutes = require('./routes/articleRoutes');
const applicantRoutes = require('./routes/applicantRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Compression middleware
app.use(compression());

// CORS middleware
app.use(securityMiddleware.corsPolicy());

// Security middleware
app.use(securityMiddleware.basicSecurity());

// Request size limiting
app.use(securityMiddleware.requestSizeLimit());

// User agent validation
app.use(securityMiddleware.validateUserAgent());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'ruxchai-learning-hub-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Flash messages
app.use(flash());

// Rate limiting middleware
app.use(securityMiddleware.generalRateLimit());

// Set user data for all requests
app.use(authMiddleware.setUserData);

// Global variables for templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// Input validation and sanitization
app.use(securityMiddleware.validateInput());

// CSRF protection for non-API routes
app.use((req, res, next) => {
    // Skip CSRF for API routes and GET requests
    if (req.path.startsWith('/api/') || req.method === 'GET') {
        return next();
    }
    // Generate CSRF token for session-based requests
    if (!req.session.csrfToken) {
        req.session.csrfToken = require('./utils/cryptoUtils').generateRandomToken(32);
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
});

// Routes
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/users', userRoutes);
app.use('/courses', courseRoutes);
app.use('/tests', testRoutes);
app.use('/articles', articleRoutes);
app.use('/applicants', applicantRoutes);
app.use('/reports', reportRoutes);
app.use('/notifications', notificationRoutes);

// Home page redirect
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        const pool = await poolPromise;
        await pool.request().query('SELECT 1');

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// API Routes with rate limiting
app.use('/api', securityMiddleware.apiRateLimit());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : err.message
        });
    } else {
        res.status(500).render('error', {
            title: 'เกิดข้อผิดพลาด',
            message: process.env.NODE_ENV === 'production'
                ? 'เกิดข้อผิดพลาดภายในระบบ'
                : err.message,
            error: process.env.NODE_ENV === 'production' ? {} : err
        });
    }
});

// 404 handler
app.use((req, res) => {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        res.status(404).json({
            success: false,
            message: 'ไม่พบหน้าที่ต้องการ'
        });
    } else {
        res.status(404).render('error', {
            title: 'ไม่พบหน้าที่ต้องการ',
            message: 'หน้าที่คุณกำลังมองหาไม่มีอยู่ในระบบ',
            error: {}
        });
    }
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Ruxchai LearnHub Server is running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Local URL: http://localhost:${PORT}`);

    if (process.env.NODE_ENV === 'development') {
        console.log(`\n📋 Available endpoints:`);
        console.log(`   - Login: http://localhost:${PORT}/login`);
        console.log(`   - Dashboard: http://localhost:${PORT}/dashboard`);
        console.log(`   - Health Check: http://localhost:${PORT}/health`);
        console.log(`   - Test DB: node test-db-connection.js`);
        console.log(`   - Seed DB: npm run seed`);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
    });
});

// Cleanup login attempts periodically
const securityInstance = require('./middleware/security');
securityInstance.cleanupLoginAttempts();

module.exports = app;
