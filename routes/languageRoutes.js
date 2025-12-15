const express = require('express');
const router = express.Router();
const { getCurrentLanguage, getTranslation } = require('../utils/languages');

// Switch language - Enhanced version
router.post('/switch', (req, res) => {
    const { language } = req.body;
    const validLanguages = ['th', 'en'];

    if (!validLanguages.includes(language)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid language',
            validLanguages
        });
    }

    try {
        // Save to session
        req.session.language = language;

        // Save to multiple cookie names for compatibility
        const cookieOptions = {
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
            httpOnly: false, // Allow JavaScript access for localStorage sync
            secure: false, // Always false for localhost testing
            sameSite: 'lax',
            path: '/' // Ensure cookie is available site-wide
        };

        res.cookie('ruxchai_language', language, cookieOptions);
        res.cookie('language', language, cookieOptions);
        res.cookie('preferred_language', language, cookieOptions);

        res.json({
            success: true,
            language,
            message: language === 'th' ? 'เปลี่ยนภาษาเรียบร้อยแล้ว' : 'Language changed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Language switch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to switch language',
            error: error.message
        });
    }
});

// Get current language - Enhanced version
router.get('/current', (req, res) => {
    try {
        const language = getCurrentLanguage(req);
        const languageInfo = {
            current: language,
            name: language === 'th' ? 'ไทย' : 'English',
            native: language === 'th' ? 'ภาษาไทย' : 'English',
            flag: language,
            isDefault: language === 'th'
        };

        res.json({
            success: true,
            language,
            languageInfo,
            availableLanguages: [
                { code: 'th', name: 'ไทย', native: 'ภาษาไทย', flag: 'th' },
                { code: 'en', name: 'English', native: 'English', flag: 'en' }
            ],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get language error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get current language',
            error: error.message
        });
    }
});

// Get translations for a specific key
router.get('/translate/:key', (req, res) => {
    try {
        const { key } = req.params;
        const language = getCurrentLanguage(req);
        const translation = getTranslation(language, key);

        res.json({
            success: true,
            key,
            translation,
            language,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get translation',
            error: error.message
        });
    }
});

// Bulk translate multiple keys
router.post('/translate', (req, res) => {
    try {
        const { keys } = req.body;
        const language = getCurrentLanguage(req);

        if (!Array.isArray(keys)) {
            return res.status(400).json({
                success: false,
                message: 'Keys must be an array'
            });
        }

        const translations = {};
        keys.forEach(key => {
            translations[key] = getTranslation(language, key);
        });

        res.json({
            success: true,
            translations,
            language,
            count: keys.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Bulk translation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get translations',
            error: error.message
        });
    }
});

module.exports = router;