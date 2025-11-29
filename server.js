const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const morgan = require('morgan');
const compression = require('compression');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import middleware
const securityMiddleware = require('./middleware/security');
const authMiddleware = require('./middleware/auth');
const settingsMiddleware = require('./middleware/settingsMiddleware');
const { poolPromise } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const chapterRoutes = require('./routes/chapterRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const testRoutes = require('./routes/testRoutes');
const articleRoutes = require('./routes/articleRoutes');
const applicantRoutes = require('./routes/applicantRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const apiRoutes = require('./routes/apiRoutes');
const languageRoutes = require('./routes/languageRoutes');
const settingRoutes = require('./routes/settingRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const questionBankRoutes = require('./routes/questionBankRoutes');

// Import services
const proctoringService = require('./utils/proctoringService');
const socketHandler = require('./utils/socketHandler');
const { languageMiddleware } = require('./utils/languages');
const sessionConfigService = require('./utils/sessionConfig');
const passwordExpiryChecker = require('./utils/passwordExpiryChecker');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? ["https://your-domain.com"]
            : ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// View engine setup
const expressLayouts = require('express-ejs-layouts');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Disable view cache in development to force reload
if (process.env.NODE_ENV !== 'production') {
    app.set('view cache', false);
}

// Set UTF-8 charset for all HTML responses
app.use((req, res, next) => {
    const originalRender = res.render;
    res.render = function(view, options, callback) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        originalRender.call(this, view, options, callback);
    };
    next();
});


// Apply layout conditionally - skip for auth pages
app.use((req, res, next) => {
    if (req.path.startsWith('/auth/')) {
        return next();
    }
    expressLayouts(req, res, next);
});

app.set('layout', './layout');
app.set('layout extractScripts', false);
app.set('layout extractStyles', false);

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
    secret: process.env.SESSION_SECRET || 'rukchai-hongyen-learnhub-secret',
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

// Language middleware - must be after session and before any rendering
app.use(languageMiddleware);

// Session timeout middleware (must be after session and flash)
app.use(sessionConfigService.checkSessionTimeout());

// Password expiry check middleware (must be after session)
app.use(passwordExpiryChecker.checkPasswordExpiryMiddleware());

// Rate limiting middleware
app.use(securityMiddleware.generalRateLimit());

// Set user data for all requests
app.use(authMiddleware.setUserData);

// Global variables for templates
app.use((req, res, next) => {
    // Only access flash if session exists
    if (req.session) {
        res.locals.success_msg = req.flash('success_msg');
        res.locals.error_msg = req.flash('error_msg');
        res.locals.error = req.flash('error');
    } else {
        res.locals.success_msg = [];
        res.locals.error_msg = [];
        res.locals.error = [];
    }
    next();
});

// Settings middleware - load system and user settings
app.use(settingsMiddleware.loadSystemSettings);
app.use(settingsMiddleware.loadUserSettings);
app.use(settingsMiddleware.loadEffectiveSettings);
app.use(settingsMiddleware.injectHelpers);

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
app.use('/auth', authRoutes);

// Redirect old routes to new auth routes
app.get('/login', (req, res) => res.redirect('/auth/login'));
app.get('/register', (req, res) => res.redirect('/auth/register'));
app.get('/logout', (req, res) => res.redirect('/auth/logout'));
app.use('/dashboard', dashboardRoutes);
app.use('/users', userRoutes);
app.use('/courses', courseRoutes);
app.use('/chapters', chapterRoutes);
app.use('/lessons', lessonRoutes);
app.use('/tests', testRoutes);
app.use('/articles', articleRoutes);
app.use('/applicants', applicantRoutes);
app.use('/reports', reportRoutes);
app.use('/notifications', notificationRoutes);
app.use('/language', languageRoutes);
app.use('/settings', settingRoutes);
app.use('/organization', organizationRoutes);
app.use('/', questionBankRoutes);

// Home page redirect
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
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
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', questionBankRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    // Get translation function
    const { getTranslation } = require('./utils/languages');
    const lang = req.language || req.session?.language || 'th';
    const t = (key) => getTranslation(lang, key);

    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production'
                ? t('error')
                : err.message
        });
    } else {
        res.status(500).render('error', {
            title: t('error'),
            message: process.env.NODE_ENV === 'production'
                ? t('errorLoadingData')
                : err.message,
            error: process.env.NODE_ENV === 'production' ? {} : err
        });
    }
});

// 404 handler
app.use((req, res) => {
    // Get translation function
    const { getTranslation } = require('./utils/languages');
    const lang = req.language || req.session?.language || 'th';
    const t = (key) => getTranslation(lang, key);

    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        res.status(404).json({
            success: false,
            message: t('pageNotFound')
        });
    } else {
        res.status(404).render('error', {
            title: t('pageNotFound'),
            message: t('pageNotFound'),
            error: {}
        });
    }
});

// Initialize socket handler
socketHandler.initialize(io);

// Make io globally available for services
global.io = io;

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

    // Join user to their personal room for private notifications
    socket.on('join-user-room', (userId) => {
        if (userId) {
            socket.join(`user-${userId}`);
            console.log(`👤 User ${userId} joined personal room`);
        }
    });

    // Join department room for department-wide notifications
    socket.on('join-department-room', (departmentId) => {
        if (departmentId) {
            socket.join(`dept-${departmentId}`);
            console.log(`🏢 User joined department ${departmentId} room`);
        }
    });

    // Handle dashboard data requests
    socket.on('request-dashboard-data', async (userId) => {
        try {
            const dashboardData = await getDashboardData(userId);
            socket.emit('dashboard-data', dashboardData);
        } catch (error) {
            console.error('Dashboard data error:', error);
        }
    });

    // Proctoring event handlers
    socket.on('start-proctoring', (data) => {
        const { testSessionId, userId, testId } = data;
        socket.join(`proctoring-${testSessionId}`);

        const session = proctoringService.startProctoring(testSessionId, userId, testId);
        socket.emit('proctoring-started', { session });

        console.log(`🎥 Proctoring started for test session ${testSessionId}`);
    });

    socket.on('proctoring_violation', async (data) => {
        try {
            const result = await proctoringService.recordViolation(
                data.testSessionId,
                data.violationType,
                data.data
            );

            // Notify the student if needed
            if (result.shouldWarn) {
                socket.emit('proctoring_warning', result.violation);
            }

            // Notify instructors
            socket.to('instructors').emit('proctoring_violation_alert', {
                testSessionId: data.testSessionId,
                violation: result.violation,
                totalViolations: result.totalViolations
            });

        } catch (error) {
            console.error('Proctoring violation error:', error);
        }
    });

    socket.on('proctoring_screenshot', async (data) => {
        try {
            await proctoringService.captureScreenshot(
                data.testSessionId,
                data.imageData,
                data.violationType
            );
        } catch (error) {
            console.error('Screenshot capture error:', error);
        }
    });

    socket.on('webcam_status_update', (data) => {
        proctoringService.updateWebcamStatus(data.testSessionId, data.isEnabled);
    });

    socket.on('proctoring_ended', async (data) => {
        try {
            const report = await proctoringService.endProctoring(data.testSessionId);
            socket.leave(`proctoring-${data.testSessionId}`);

            // Send final report to instructors
            socket.to('instructors').emit('proctoring_report', report);

            console.log(`🎥 Proctoring ended for test session ${data.testSessionId}`);
        } catch (error) {
            console.error('End proctoring error:', error);
            socket.emit('dashboard-error', { message: 'Failed to load dashboard data' });
        }
    });

    // Handle test-taking events
    socket.on('test-start', (data) => {
        socket.join(`test-${data.testId}`);
        socket.emit('test-started', { testId: data.testId, startTime: new Date() });
    });

    socket.on('test-submit', (data) => {
        socket.leave(`test-${data.testId}`);
        socket.emit('test-submitted', { testId: data.testId, submitTime: new Date() });
    });

    // Handle activity tracking
    socket.on('user-activity', (data) => {
        // Broadcast user activity to department
        if (data.departmentId) {
            socket.to(`dept-${data.departmentId}`).emit('department-activity', {
                userId: data.userId,
                activity: data.activity,
                timestamp: new Date()
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('👤 User disconnected:', socket.id);
    });
});

// Real-time dashboard data function
async function getDashboardData(userId) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', userId)
            .query(`
                SELECT
                    (SELECT COUNT(*) FROM Courses WHERE status = 'active') as totalCourses,
                    (SELECT COUNT(*) FROM Tests WHERE status = 'active') as totalTests,
                    (SELECT COUNT(*) FROM Users WHERE isActive = 1) as totalUsers,
                    (SELECT COUNT(*) FROM UserCourses WHERE userId = @userId AND status = 'completed') as completedCourses,
                    (SELECT COUNT(*) FROM TestResults WHERE userId = @userId) as completedTests,
                    (SELECT AVG(CAST(score AS FLOAT)) FROM TestResults WHERE userId = @userId) as averageScore,
                    (SELECT COUNT(*) FROM Notifications WHERE userId = @userId AND isRead = 0) as unreadNotifications
            `);

        const stats = result.recordset[0];

        // Get recent activities
        const activitiesResult = await pool.request()
            .input('userId', userId)
            .query(`
                SELECT TOP 10
                    activityType,
                    description,
                    createdAt,
                    metadata
                FROM UserActivities
                WHERE userId = @userId
                ORDER BY createdAt DESC
            `);

        // Get upcoming tests
        const testsResult = await pool.request()
            .input('userId', userId)
            .query(`
                SELECT TOP 5
                    t.testId,
                    t.title,
                    t.startDate,
                    t.endDate,
                    c.title as courseTitle
                FROM Tests t
                INNER JOIN Courses c ON t.courseId = c.courseId
                LEFT JOIN TestResults tr ON t.testId = tr.testId AND tr.userId = @userId
                WHERE t.status = 'active'
                AND t.startDate <= GETDATE()
                AND t.endDate >= GETDATE()
                AND tr.testId IS NULL
                ORDER BY t.startDate ASC
            `);

        // Get progress data
        const progressResult = await pool.request()
            .input('userId', userId)
            .query(`
                SELECT
                    c.title,
                    uc.progress,
                    uc.lastAccessDate
                FROM UserCourses uc
                INNER JOIN Courses c ON uc.courseId = c.courseId
                WHERE uc.userId = @userId
                AND uc.status IN ('in_progress', 'completed')
                ORDER BY uc.lastAccessDate DESC
            `);

        return {
            stats,
            activities: activitiesResult.recordset,
            upcomingTests: testsResult.recordset,
            courseProgress: progressResult.recordset,
            timestamp: new Date()
        };
    } catch (error) {
        console.error('Dashboard data error:', error);
        throw error;
    }
}

// Broadcast functions for real-time updates
function broadcastNotification(userId, notification) {
    io.to(`user-${userId}`).emit('new-notification', notification);
}

function broadcastDepartmentUpdate(departmentId, update) {
    io.to(`dept-${departmentId}`).emit('department-update', update);
}

function broadcastTestUpdate(testId, update) {
    io.to(`test-${testId}`).emit('test-update', update);
}

// Make Socket.IO accessible to routes
app.set('io', io);
app.set('broadcastNotification', broadcastNotification);
app.set('broadcastDepartmentUpdate', broadcastDepartmentUpdate);
app.set('broadcastTestUpdate', broadcastTestUpdate);

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Rukchai Hongyen LearnHub Server is running on port ${PORT}`);
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
    io.close(() => {
        server.close(() => {
            console.log('✅ Process terminated');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received. Shutting down gracefully...');
    io.close(() => {
        server.close(() => {
            console.log('✅ Process terminated');
            process.exit(0);
        });
    });
});

// Cleanup login attempts periodically
const securityInstance = require('./middleware/security');
securityInstance.cleanupLoginAttempts();

module.exports = app;

