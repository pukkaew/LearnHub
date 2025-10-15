const OrganizationUnit = require('../models/OrganizationUnit');
const Position = require('../models/Position');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const organizationController = {
    // ============ ORGANIZATION UNITS ============

    /**
     * แสดงหน้ารายการหน่วยงานทั้งหมด
     */
    async index(req, res) {
        try {
            const units = await OrganizationUnit.getAll(false);
            const levels = await OrganizationUnit.getLevels();

            res.render('organization/index', {
                title: 'จัดการโครงสร้างองค์กร',
                units,
                levels,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading organization units:', error);
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดข้อมูลหน่วยงาน');
            res.redirect('/dashboard');
        }
    },

    /**
     * API: ดึงข้อมูล Organization Levels (ระดับองค์กร)
     */
    async getLevels(req, res) {
        try {
            const levels = await OrganizationUnit.getLevels();

            res.json({
                success: true,
                data: levels
            });
        } catch (error) {
            console.error('Error getting organization levels:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลระดับองค์กร'
            });
        }
    },

    /**
     * API: ดึงข้อมูลหน่วยงานทั้งหมดแบบ JSON
     */
    async getUnits(req, res) {
        try {
            const includeInactive = req.query.include_inactive === 'true';
            const units = await OrganizationUnit.getAll(includeInactive);

            res.json({
                success: true,
                data: units
            });
        } catch (error) {
            console.error('Error getting organization units:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหน่วยงาน'
            });
        }
    },

    /**
     * API: ดึงข้อมูลหน่วยงานแบบ Tree
     */
    async getTree(req, res) {
        try {
            const rootUnitId = req.query.root_id ? parseInt(req.query.root_id) : null;
            const tree = await OrganizationUnit.getTree(rootUnitId);

            res.json({
                success: true,
                data: tree
            });
        } catch (error) {
            console.error('Error getting organization tree:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Tree'
            });
        }
    },

    /**
     * API: ดึงข้อมูลหน่วยงานตาม ID
     */
    async getUnitById(req, res) {
        try {
            const unitId = parseInt(req.params.id);
            const unit = await OrganizationUnit.findById(unitId);

            if (!unit) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบหน่วยงาน'
                });
            }

            res.json({
                success: true,
                data: unit
            });
        } catch (error) {
            console.error('Error getting unit by ID:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหน่วยงาน'
            });
        }
    },

    /**
     * API: ดึงข้อมูล Hierarchy Path (breadcrumb)
     */
    async getHierarchyPath(req, res) {
        try {
            const unitId = parseInt(req.params.id);
            const path = await OrganizationUnit.getHierarchyPath(unitId);

            res.json({
                success: true,
                data: path
            });
        } catch (error) {
            console.error('Error getting hierarchy path:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
            });
        }
    },

    /**
     * API: ดึงหน่วยงานลูก (children)
     */
    async getChildren(req, res) {
        try {
            const parentId = parseInt(req.params.id);
            const children = await OrganizationUnit.getChildren(parentId);

            res.json({
                success: true,
                data: children
            });
        } catch (error) {
            console.error('Error getting children units:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
            });
        }
    },

    /**
     * API: ดึงหน่วยงานตามระดับ (level)
     */
    async getUnitsByLevel(req, res) {
        try {
            const levelCode = req.params.levelCode;
            const units = await OrganizationUnit.getByLevel(levelCode);

            res.json({
                success: true,
                data: units
            });
        } catch (error) {
            console.error('Error getting units by level:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
            });
        }
    },

    /**
     * แสดงฟอร์มสร้างหน่วยงานใหม่
     */
    async createForm(req, res) {
        try {
            const levels = await OrganizationUnit.getLevels();
            const units = await OrganizationUnit.getAll(false);

            // Get managers (direct SQL query)
            const { poolPromise, sql } = require('../config/database');
            const pool = await poolPromise;
            const mgrResult = await pool.request().query(`
                SELECT user_id, employee_id, first_name, last_name
                FROM Users
                WHERE is_active = 1
                ORDER BY first_name, last_name
            `);
            const managers = mgrResult.recordset;

            res.render('organization/create', {
                title: 'สร้างหน่วยงานใหม่',
                levels,
                units,
                managers,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading create form:', error);
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดฟอร์ม');
            res.redirect('/organization');
        }
    },

    /**
     * API: สร้างหน่วยงานใหม่
     */
    async create(req, res) {
        try {
            const unitData = {
                parent_id: req.body.parent_id ? parseInt(req.body.parent_id) : null,
                level_id: parseInt(req.body.level_id),
                unit_code: req.body.unit_code,
                unit_name_th: req.body.unit_name_th,
                unit_name_en: req.body.unit_name_en || null,
                unit_abbr: req.body.unit_abbr || null,
                description: req.body.description || null,
                manager_id: req.body.manager_id ? parseInt(req.body.manager_id) : null,
                cost_center: req.body.cost_center || null,
                created_by: req.session.user.user_id
            };

            const result = await OrganizationUnit.create(unitData);

            if (result.success) {
                // Log activity
                await ActivityLog.log({
                    user_id: req.session.user.user_id,
                    action: 'CREATE_ORGANIZATION_UNIT',
                    description: `สร้างหน่วยงาน: ${unitData.unit_name_th}`,
                    ip_address: req.ip
                });

                const isJsonRequest = req.xhr ||
                                     req.headers.accept?.indexOf('json') > -1 ||
                                     req.headers['content-type']?.indexOf('json') > -1;

                if (isJsonRequest) {
                    return res.json({
                        success: true,
                        message: 'สร้างหน่วยงานสำเร็จ',
                        data: { unit_id: result.unitId }
                    });
                } else {
                    req.flash('success_msg', 'สร้างหน่วยงานสำเร็จ');
                    return res.redirect('/organization');
                }
            }
        } catch (error) {
            console.error('Error creating organization unit:', error);

            const isJsonRequest = req.xhr ||
                                 req.headers.accept?.indexOf('json') > -1 ||
                                 req.headers['content-type']?.indexOf('json') > -1;

            if (isJsonRequest) {
                return res.status(400).json({
                    success: false,
                    message: error.message || 'เกิดข้อผิดพลาดในการสร้างหน่วยงาน'
                });
            } else {
                req.flash('error_msg', error.message || 'เกิดข้อผิดพลาดในการสร้างหน่วยงาน');
                return res.redirect('/organization/create');
            }
        }
    },

    /**
     * แสดงรายละเอียดหน่วยงาน
     */
    async view(req, res) {
        try {
            const unitId = parseInt(req.params.id);
            const unit = await OrganizationUnit.findById(unitId);

            if (!unit) {
                req.flash('error_msg', 'ไม่พบหน่วยงาน');
                return res.redirect('/organization');
            }

            // Get hierarchy path (breadcrumb)
            const hierarchyPath = await OrganizationUnit.getHierarchyPath(unitId);

            // Get children units
            const children = await OrganizationUnit.getChildren(unitId);

            // Get employees in this unit (simplified query)
            const { poolPromise, sql } = require('../config/database');
            const pool = await poolPromise;
            const empResult = await pool.request()
                .input('unitId', sql.Int, unitId)
                .query(`
                    SELECT user_id, employee_id, first_name, last_name, profile_image
                    FROM Users
                    WHERE unit_id = @unitId AND is_active = 1
                    ORDER BY first_name, last_name
                `);
            const employees = empResult.recordset;

            res.render('organization/view', {
                title: `รายละเอียด${unit.unit_name_th}`,
                unit,
                hierarchyPath,
                children,
                employees,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading unit details:', error);
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
            res.redirect('/organization');
        }
    },

    /**
     * แสดงฟอร์มแก้ไขหน่วยงาน
     */
    async editForm(req, res) {
        try {
            const unitId = parseInt(req.params.id);
            const unit = await OrganizationUnit.findById(unitId);

            if (!unit) {
                req.flash('error_msg', 'ไม่พบหน่วยงาน');
                return res.redirect('/organization');
            }

            const levels = await OrganizationUnit.getLevels();
            const units = await OrganizationUnit.getAll(false);

            // Get managers (direct SQL query)
            const { poolPromise, sql } = require('../config/database');
            const pool = await poolPromise;
            const mgrResult = await pool.request().query(`
                SELECT user_id, employee_id, first_name, last_name
                FROM Users
                WHERE is_active = 1
                ORDER BY first_name, last_name
            `);
            const managers = mgrResult.recordset;

            res.render('organization/edit', {
                title: 'แก้ไขหน่วยงาน',
                unit,
                levels,
                units,
                managers,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading edit form:', error);
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดฟอร์ม');
            res.redirect('/organization');
        }
    },

    /**
     * API: แก้ไขหน่วยงาน
     */
    async update(req, res) {
        try {
            const unitId = parseInt(req.params.id);
            const updateData = {
                unit_name_th: req.body.unit_name_th,
                unit_name_en: req.body.unit_name_en,
                unit_abbr: req.body.unit_abbr,
                description: req.body.description,
                manager_id: req.body.manager_id || null,
                cost_center: req.body.cost_center,
                status: req.body.status,
                updated_by: req.session.user.user_id
            };

            const result = await OrganizationUnit.update(unitId, updateData);

            if (result.success) {
                // Log activity
                await ActivityLog.log({
                    user_id: req.session.user.user_id,
                    action: 'UPDATE_ORGANIZATION_UNIT',
                    description: `แก้ไขหน่วยงาน ID: ${unitId}`,
                    ip_address: req.ip
                });

                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.json({
                        success: true,
                        message: 'แก้ไขหน่วยงานสำเร็จ'
                    });
                } else {
                    req.flash('success_msg', 'แก้ไขหน่วยงานสำเร็จ');
                    return res.redirect('/organization');
                }
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error updating organization unit:', error);

            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(400).json({
                    success: false,
                    message: error.message || 'เกิดข้อผิดพลาดในการแก้ไขหน่วยงาน'
                });
            } else {
                req.flash('error_msg', error.message || 'เกิดข้อผิดพลาดในการแก้ไขหน่วยงาน');
                return res.redirect(`/organization/${req.params.id}/edit`);
            }
        }
    },

    /**
     * API: ลบหน่วยงาน (soft delete)
     */
    async delete(req, res) {
        try {
            const unitId = parseInt(req.params.id);
            const unit = await OrganizationUnit.findById(unitId);

            if (!unit) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบหน่วยงาน'
                });
            }

            const result = await OrganizationUnit.delete(unitId);

            if (result.success) {
                // Log activity
                await ActivityLog.log({
                    user_id: req.session.user.user_id,
                    action: 'DELETE_ORGANIZATION_UNIT',
                    description: `ลบหน่วยงาน: ${unit.unit_name_th}`,
                    ip_address: req.ip
                });

                return res.json({
                    success: true,
                    message: 'ลบหน่วยงานสำเร็จ'
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('Error deleting organization unit:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการลบหน่วยงาน'
            });
        }
    },

    // ============ POSITIONS ============

    /**
     * แสดงหน้ารายการตำแหน่งงาน
     */
    async positionsIndex(req, res) {
        try {
            const filters = {
                position_type: req.query.type || undefined,
                unit_id: req.query.unit_id ? parseInt(req.query.unit_id) : undefined,
                search: req.query.search || undefined,
                is_active: req.query.is_active !== undefined ? (req.query.is_active === 'true') : true
            };

            const positions = await Position.findAll(filters);
            const units = await OrganizationUnit.getAll(false);
            const statistics = await Position.getStatistics();

            res.render('organization/positions', {
                title: 'จัดการตำแหน่งงาน',
                positions,
                units,
                statistics,
                filters: req.query,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading positions:', error);
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดข้อมูลตำแหน่งงาน');
            res.redirect('/dashboard');
        }
    },

    /**
     * API: ดึงตำแหน่งงานทั้งหมด
     */
    async getPositions(req, res) {
        try {
            const filters = {
                position_type: req.query.type || undefined,
                unit_id: req.query.unit_id ? parseInt(req.query.unit_id) : undefined,
                search: req.query.search || undefined,
                is_active: req.query.is_active !== undefined ? (req.query.is_active === 'true') : true
            };

            const positions = await Position.findAll(filters);

            res.json({
                success: true,
                data: positions
            });
        } catch (error) {
            console.error('Error getting positions:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตำแหน่งงาน'
            });
        }
    },

    /**
     * API: ดึงตำแหน่งสำหรับพนักงาน
     */
    async getEmployeePositions(req, res) {
        try {
            const unitId = req.query.unit_id ? parseInt(req.query.unit_id) : null;
            const positions = await Position.getEmployeePositions(unitId);

            res.json({
                success: true,
                data: positions
            });
        } catch (error) {
            console.error('Error getting employee positions:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
            });
        }
    },

    /**
     * API: ดึงตำแหน่งสำหรับผู้สมัคร (job openings)
     */
    async getApplicantPositions(req, res) {
        try {
            const positions = await Position.getApplicantPositions();

            res.json({
                success: true,
                data: positions
            });
        } catch (error) {
            console.error('Error getting applicant positions:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
            });
        }
    },

    /**
     * แสดงฟอร์มสร้างตำแหน่งใหม่
     */
    async createPositionForm(req, res) {
        try {
            const units = await OrganizationUnit.getAll(false);

            res.render('organization/create-position', {
                title: 'สร้างตำแหน่งงานใหม่',
                units,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading create position form:', error);
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการโหลดฟอร์ม');
            res.redirect('/organization/positions');
        }
    },

    /**
     * API: สร้างตำแหน่งใหม่
     */
    async createPosition(req, res) {
        try {
            const positionData = {
                unit_id: req.body.unit_id || null,
                position_code: req.body.position_code,
                position_name_th: req.body.position_name_th,
                position_name_en: req.body.position_name_en || null,
                position_type: req.body.position_type || 'EMPLOYEE',
                position_level: req.body.position_level || null,
                job_grade: req.body.job_grade || null,
                description: req.body.description || null,
                responsibilities: req.body.responsibilities || null,
                requirements: req.body.requirements || null,
                min_salary: req.body.min_salary || null,
                max_salary: req.body.max_salary || null,
                created_by: req.session.user.user_id
            };

            const result = await Position.create(positionData);

            if (result.success) {
                // Log activity
                await ActivityLog.log({
                    user_id: req.session.user.user_id,
                    action: 'CREATE_POSITION',
                    description: `สร้างตำแหน่ง: ${positionData.position_name_th}`,
                    ip_address: req.ip
                });

                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.json({
                        success: true,
                        message: 'สร้างตำแหน่งสำเร็จ',
                        data: result.data
                    });
                } else {
                    req.flash('success_msg', 'สร้างตำแหน่งสำเร็จ');
                    return res.redirect('/organization/positions');
                }
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error creating position:', error);

            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(400).json({
                    success: false,
                    message: error.message || 'เกิดข้อผิดพลาดในการสร้างตำแหน่ง'
                });
            } else {
                req.flash('error_msg', error.message || 'เกิดข้อผิดพลาดในการสร้างตำแหน่ง');
                return res.redirect('/organization/positions/create');
            }
        }
    }
};

module.exports = organizationController;
