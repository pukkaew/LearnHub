const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { isAuthenticated, isAdmin, isAdminOrManager } = require('../middleware/auth');

/**
 * Settings Routes
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * ========================
 * SYSTEM SETTINGS (Admin only)
 * ========================
 */

// GET /settings - แสดงหน้า System Settings
router.get('/', settingController.getSystemSettingsPage);

// GET /settings/category/:category - ดึง settings ตาม category
router.get('/category/:category', settingController.getSettingsByCategory);

// GET /settings/key/:key - ดึง setting เดียว
router.get('/key/:key', settingController.getSettingByKey);

// PUT /settings/key/:key - อัพเดท setting เดียว
router.put('/key/:key', settingController.updateSetting);

// POST /settings/batch - อัพเดทหลาย settings พร้อมกัน
router.post('/batch', settingController.batchUpdateSettings);

// POST /settings/validate - Validate setting value
router.post('/validate', settingController.validateSetting);

// GET /settings/audit-log - ดูประวัติการเปลี่ยนแปลง
router.get('/audit-log', settingController.getAuditLog);

/**
 * ========================
 * USER SETTINGS (Personal)
 * ========================
 */

// GET /settings/user - แสดงหน้า User Settings
router.get('/user', settingController.getUserSettingsPage);

// GET /settings/user/all - ดึง user settings ทั้งหมด
router.get('/user/all', settingController.getAllUserSettings);

// GET /settings/user/:key - ดึง user setting เดียว
router.get('/user/:key', settingController.getUserSetting);

// POST /settings/user - บันทึก user setting
router.post('/user', settingController.saveUserSetting);

// POST /settings/user/batch - บันทึกหลาย user settings
router.post('/user/batch', settingController.batchSaveUserSettings);

// DELETE /settings/user/:key - ลบ user setting
router.delete('/user/:key', settingController.deleteUserSetting);

/**
 * ========================
 * DEPARTMENT SETTINGS (Admin or Department Manager)
 * ========================
 */

// GET /settings/department/:departmentId - ดึง department settings
router.get('/department/:departmentId', isAdminOrManager, settingController.getDepartmentSettings);

// POST /settings/department/:departmentId - บันทึก department setting
router.post('/department/:departmentId', isAdminOrManager, settingController.saveDepartmentSetting);

/**
 * ========================
 * UTILITY ENDPOINTS
 * ========================
 */

// GET /settings/effective/:key - ดึงค่า setting ที่มีผล (cascading priority)
router.get('/effective/:key', settingController.getEffectiveSetting);

module.exports = router;
