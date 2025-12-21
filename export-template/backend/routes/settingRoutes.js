/**
 * Settings Routes
 * All routes require authentication
 */

const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { isAuthenticated, isAdmin, isAdminOrManager } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * ========================
 * SYSTEM SETTINGS (Admin only)
 * ========================
 */

// GET /settings - Display System Settings page
router.get('/', settingController.getSystemSettingsPage);

// GET /settings/category/:category - Get settings by category
router.get('/category/:category', settingController.getSettingsByCategory);

// GET /settings/key/:key - Get single setting
router.get('/key/:key', settingController.getSettingByKey);

// PUT /settings/key/:key - Update single setting
router.put('/key/:key', settingController.updateSetting);

// POST /settings/batch - Batch update multiple settings
router.post('/batch', settingController.batchUpdateSettings);

// POST /settings/validate - Validate setting value
router.post('/validate', settingController.validateSetting);

/**
 * ========================
 * USER SETTINGS (Personal)
 * ========================
 */

// GET /settings/user - Display User Settings page
router.get('/user', settingController.getUserSettingsPage);

// GET /settings/user/all - Get all user settings
router.get('/user/all', settingController.getAllUserSettings);

// GET /settings/user/:key - Get single user setting
router.get('/user/:key', settingController.getUserSetting);

// POST /settings/user - Save user setting
router.post('/user', settingController.saveUserSetting);

// POST /settings/user/batch - Batch save user settings
router.post('/user/batch', settingController.batchSaveUserSettings);

// DELETE /settings/user/:key - Delete user setting
router.delete('/user/:key', settingController.deleteUserSetting);

/**
 * ========================
 * DEPARTMENT SETTINGS (Admin or Department Manager)
 * ========================
 */

// GET /settings/department/:departmentId - Get department settings
router.get('/department/:departmentId', isAdminOrManager, settingController.getDepartmentSettings);

// POST /settings/department/:departmentId - Save department setting
router.post('/department/:departmentId', isAdminOrManager, settingController.saveDepartmentSetting);

/**
 * ========================
 * UTILITY ENDPOINTS
 * ========================
 */

// GET /settings/effective/:key - Get effective setting value (cascading priority)
router.get('/effective/:key', settingController.getEffectiveSetting);

module.exports = router;
