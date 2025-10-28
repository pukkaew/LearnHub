const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const organizationController = require('../controllers/organizationController');

// ============ ORGANIZATION UNITS ROUTES ============

// หน้าหลัก - รายการหน่วยงาน
router.get('/', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.index);

// API: ดึงข้อมูล Organization Levels (ระดับองค์กร)
router.get('/api/levels', authMiddleware.requireAuth, organizationController.getLevels);

// API: Shortcuts สำหรับ dropdown (ไม่ต้อง auth เข้มงวด)
router.get('/api/branches', authMiddleware.requireAuth, organizationController.getBranches);
router.get('/api/offices', authMiddleware.requireAuth, organizationController.getOffices);
router.get('/api/divisions', authMiddleware.requireAuth, organizationController.getDivisions);
router.get('/api/departments', authMiddleware.requireAuth, organizationController.getDepartments);

// API: ดึงข้อมูลหน่วยงานทั้งหมด
router.get('/api/units', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.getUnits);

// API: ดึงข้อมูล Tree
router.get('/api/tree', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.getTree);

// API: ดึงข้อมูลหน่วยงานตาม ID
router.get('/api/units/:id', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.getUnitById);

// API: ดึงข้อมูล Hierarchy Path
router.get('/api/units/:id/path', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.getHierarchyPath);

// API: ดึงหน่วยงานลูก
router.get('/api/units/:id/children', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.getChildren);

// API: ดึงหน่วยงานตามระดับ
router.get('/api/units/level/:levelCode', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.getUnitsByLevel);

// ============ POSITIONS ROUTES ============
// Note: These must come BEFORE /:id routes to avoid conflicts

// หน้ารายการตำแหน่งงาน
router.get('/positions', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.positionsIndex);

// API: ดึงตำแหน่งงานทั้งหมด
router.get('/api/positions', authMiddleware.requireAuth, organizationController.getPositions);

// API: รายการตำแหน่งงาน (สำหรับ dropdown/select)
router.get('/positions/api/list', authMiddleware.requireAuth, organizationController.getPositions);

// API: ดึงตำแหน่งสำหรับพนักงาน (EMPLOYEE)
router.get('/api/positions/employee', authMiddleware.requireAuth, organizationController.getEmployeePositions);

// API: ดึงตำแหน่งสำหรับผู้สมัคร (APPLICANT)
router.get('/api/positions/applicant', organizationController.getApplicantPositions);

// แสดงฟอร์มสร้างตำแหน่งใหม่
router.get('/positions/create', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.createPositionForm);

// สร้างตำแหน่งใหม่
router.post('/positions/create', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.createPosition);

// แสดงรายละเอียดตำแหน่ง
router.get('/positions/:id', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.viewPosition);

// แสดงฟอร์มแก้ไขตำแหน่ง
router.get('/positions/:id/edit', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.editPositionForm);

// อัพเดทตำแหน่ง
router.post('/positions/:id/edit', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.updatePosition);
router.put('/positions/:id', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.updatePosition);

// ลบตำแหน่ง
router.delete('/positions/:id', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin']), organizationController.deletePosition);

// ============ ORGANIZATION UNITS CRUD ROUTES ============
// Note: These MUST come after all specific routes (like /positions, /create) to avoid conflicts

// แสดงฟอร์มสร้างหน่วยงานใหม่
router.get('/create', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.createForm);

// สร้างหน่วยงานใหม่
router.post('/create', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.create);

// แสดงรายละเอียดหน่วยงาน
router.get('/:id', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.view);

// แสดงฟอร์มแก้ไขหน่วยงาน
router.get('/:id/edit', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.editForm);

// แก้ไขหน่วยงาน
router.post('/:id/edit', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.update);
router.put('/:id', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin', 'HR']), organizationController.update);

// ลบหน่วยงาน (hard delete)
router.delete('/:id', authMiddleware.requireAuth, authMiddleware.requireRole(['Admin']), organizationController.delete);

module.exports = router;
