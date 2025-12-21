/**
 * LearnHub Express Server
 * Sample server setup with settings middleware
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import middleware
const { setUserData } = require('./middleware/auth');
const {
    loadSystemSettings,
    loadUserSettings,
    loadEffectiveSettings,
    injectHelpers
} = require('./middleware/settingsMiddleware');

// Import routes
const settingRoutes = require('./routes/settingRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ===========================================
// MIDDLEWARE SETUP
// ===========================================

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10)
    }
}));

// Flash messages
app.use(flash());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===========================================
// SETTINGS MIDDLEWARE (Apply to all routes)
// ===========================================

// Load system settings
app.use(loadSystemSettings);

// Set user data in response locals
app.use(setUserData);

// Load user settings (after setUserData)
app.use(loadUserSettings);

// Load effective settings (merged)
app.use(loadEffectiveSettings);

// Inject helper functions for views
app.use(injectHelpers);

// Flash messages in views
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// ===========================================
// ROUTES
// ===========================================

// Settings routes
app.use('/settings', settingRoutes);

// Home route
app.get('/', (req, res) => {
    res.render('index', {
        title: res.locals.getSetting('site_name', 'LearnHub')
    });
});

// Dashboard route (example)
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        req.flash('error_msg', 'Please login first');
        return res.redirect('/auth/login');
    }

    res.render('dashboard', {
        title: 'Dashboard',
        user: req.session.user
    });
});

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 handler
app.use((req, res, next) => {
    res.status(404).render('errors/404', {
        title: 'Page Not Found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }

    res.status(500).render('errors/500', {
        title: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// ===========================================
// START SERVER
// ===========================================

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║   LearnHub Server                          ║
║   Running on http://localhost:${PORT}         ║
║                                            ║
╚════════════════════════════════════════════╝
    `);
});

module.exports = app;
