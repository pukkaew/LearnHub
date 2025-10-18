const OrganizationUnit = require('../models/OrganizationUnit');
const Position = require('../models/Position');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { getTranslation } = require('../utils/languages');

// Helper function to get translation from request
const t = (req, key) => {
    const lang = req.language || req.session?.language || 'th';
    return getTranslation(lang, key);
};

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
                title: t(req, 'organizationManagement') + ' - Rukchai Hongyen LearnHub',
                units,
                levels,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading organization units:', error);
            req.flash('error_msg', t(req, 'errorLoadingUnits'));
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
                message: t(req, 'errorLoadingLevels')
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
                message: t(req, 'errorLoadingUnits')
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
                message: t(req, 'errorLoadingTree')
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
                    message: t(req, 'unitNotFound')
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
                message: t(req, 'errorLoadingUnits')
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
                message: t(req, 'errorLoadingData')
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
                message: t(req, 'errorLoadingData')
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
                message: t(req, 'errorLoadingData')
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
                title: t(req, 'createUnit') + ' - Rukchai Hongyen LearnHub',
                levels,
                units,
                managers,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading create form:', error);
            req.flash('error_msg', t(req, 'errorLoadingForm'));
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
                        message: t(req, 'unitCreatedSuccess'),
                        data: { unit_id: result.unitId }
                    });
                } else {
                    req.flash('success_msg', t(req, 'unitCreatedSuccess'));
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
                    message: error.message || t(req, 'errorCreatingUnit')
                });
            } else {
                req.flash('error_msg', error.message || t(req, 'errorCreatingUnit'));
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
                req.flash('error_msg', t(req, 'unitNotFound'));
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
                title: t(req, 'unitDetails') + ': ' + unit.unit_name_th + ' - Rukchai Hongyen LearnHub',
                unit,
                hierarchyPath,
                children,
                employees,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading unit details:', error);
            req.flash('error_msg', t(req, 'errorLoadingData'));
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
                req.flash('error_msg', t(req, 'unitNotFound'));
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
                title: t(req, 'editUnit') + ' - Rukchai Hongyen LearnHub',
                unit,
                levels,
                units,
                managers,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading edit form:', error);
            req.flash('error_msg', t(req, 'errorLoadingForm'));
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
                        message: t(req, 'unitUpdatedSuccess')
                    });
                } else {
                    req.flash('success_msg', t(req, 'unitUpdatedSuccess'));
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
                    message: error.message || t(req, 'errorUpdatingUnit')
                });
            } else {
                req.flash('error_msg', error.message || t(req, 'errorUpdatingUnit'));
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
                    message: t(req, 'unitNotFound')
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
                    message: t(req, 'unitDeletedSuccess')
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
                message: error.message || t(req, 'errorDeletingUnit')
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
                is_active: req.query.is_active !== undefined ? (req.query.is_active === 'true') : undefined
            };

            const positions = await Position.findAll(filters);
            const units = await OrganizationUnit.getAll(false);
            const statistics = await Position.getStatistics();

            console.log('📊 Statistics for positions page:', statistics);

            res.render('organization/positions', {
                title: t(req, 'positionManagement') + ' - Rukchai Hongyen LearnHub',
                positions,
                units,
                statistics,
                filters: req.query,
                user: req.session.user,
                success_msg: req.flash('success_msg'),
                error_msg: req.flash('error_msg')
            });
        } catch (error) {
            console.error('Error loading positions:', error);
            req.flash('error_msg', t(req, 'errorLoadingPositions'));
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
                positions: positions
            });
        } catch (error) {
            console.error('Error getting positions:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorLoadingPositions')
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
                message: t(req, 'errorLoadingData')
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
                message: t(req, 'errorLoadingData')
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
                title: t(req, 'createNewPosition') + ' - Rukchai Hongyen LearnHub',
                units,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading create position form:', error);
            req.flash('error_msg', t(req, 'errorLoadingForm'));
            res.redirect('/organization/positions');
        }
    },

    /**
     * API: สร้างตำแหน่งใหม่
     */
    async createPosition(req, res) {
        try {
            // Check if creating positions for multiple units
            const unitIds = req.body.unit_ids || (req.body.unit_id ? [req.body.unit_id] : null);
            const positionName = req.body.position_name || req.body.position_name_th;

            if (!positionName) {
                return res.status(400).json({
                    success: false,
                    message: t(req, 'pleaseEnterPositionName')
                });
            }

            if (!unitIds || unitIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: t(req, 'pleaseSelectUnit')
                });
            }

            // Create positions for all selected units
            const results = [];
            const errors = [];

            for (const unitId of unitIds) {
                const positionData = {
                    position_name: positionName,
                    unit_id: parseInt(unitId),
                    description: req.body.description || null,
                    position_type: req.body.position_type || 'EMPLOYEE',
                    position_level: req.body.position_level || null,
                    job_grade: req.body.job_grade || null,
                    level: req.body.level || null,
                    min_salary: req.body.min_salary || null,
                    max_salary: req.body.max_salary || null
                };

                const result = await Position.create(positionData);

                if (result.success) {
                    results.push({ unit_id: unitId, position_id: result.data.position_id });
                } else {
                    errors.push({ unit_id: unitId, message: result.message });
                }
            }

            // Log activity
            if (results.length > 0) {
                await ActivityLog.log({
                    user_id: req.session.user.user_id,
                    action: 'CREATE_POSITION',
                    description: `สร้างตำแหน่ง: ${positionName} ใน ${results.length} หน่วยงาน`,
                    ip_address: req.ip
                });
            }

            const isJsonRequest = req.xhr ||
                                 req.headers.accept?.indexOf('json') > -1 ||
                                 req.headers['content-type']?.indexOf('json') > -1;

            if (results.length > 0) {
                const message = errors.length > 0
                    ? t(req, 'positionCreatedPartial').replace('{success}', results.length).replace('{failed}', errors.length)
                    : t(req, 'positionCreatedInUnits').replace('{count}', results.length);

                if (isJsonRequest) {
                    return res.json({
                        success: true,
                        message,
                        data: { results, errors }
                    });
                } else {
                    req.flash('success_msg', message);
                    return res.redirect('/organization/positions');
                }
            } else {
                throw new Error(t(req, 'cannotCreatePosition'));
            }
        } catch (error) {
            console.error('Error creating position:', error);

            const isJsonRequest = req.xhr ||
                                 req.headers.accept?.indexOf('json') > -1 ||
                                 req.headers['content-type']?.indexOf('json') > -1;

            if (isJsonRequest) {
                return res.status(400).json({
                    success: false,
                    message: error.message || t(req, 'errorCreatingPosition')
                });
            } else {
                req.flash('error_msg', error.message || t(req, 'errorCreatingPosition'));
                return res.redirect('/organization/positions/create');
            }
        }
    },

    /**
     * แสดงรายละเอียดตำแหน่ง
     */
    async viewPosition(req, res) {
        try {
            const positionId = parseInt(req.params.id);
            const position = await Position.findById(positionId);

            if (!position) {
                req.flash('error_msg', t(req, 'positionNotFound'));
                return res.redirect('/organization/positions');
            }

            // Get employees in this position
            const { poolPromise, sql } = require('../config/database');
            const pool = await poolPromise;
            const empResult = await pool.request()
                .input('positionId', sql.Int, positionId)
                .query(`
                    SELECT u.user_id, u.employee_id, u.first_name, u.last_name, u.profile_image,
                           ou.unit_name_th
                    FROM Users u
                    LEFT JOIN OrganizationUnits ou ON u.unit_id = ou.unit_id
                    WHERE u.position_id = @positionId AND u.is_active = 1
                    ORDER BY u.first_name, u.last_name
                `);
            const employees = empResult.recordset;

            console.log('Position ID:', positionId);
            console.log('Position data:', position);
            console.log('Employee count from position:', position.employee_count);
            console.log('Employees from query:', employees.length);

            res.render('organization/view-position', {
                title: t(req, 'positionDetails') + ': ' + position.position_name + ' - Rukchai Hongyen LearnHub',
                position,
                employees,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading position details:', error);
            req.flash('error_msg', t(req, 'errorLoadingData'));
            res.redirect('/organization/positions');
        }
    },

    /**
     * แสดงฟอร์มแก้ไขตำแหน่ง
     */
    async editPositionForm(req, res) {
        try {
            const positionId = parseInt(req.params.id);
            const position = await Position.findById(positionId);

            if (!position) {
                req.flash('error_msg', t(req, 'positionNotFound'));
                return res.redirect('/organization/positions');
            }

            const units = await OrganizationUnit.getAll(false);

            res.render('organization/edit-position', {
                title: t(req, 'editPosition') + ' - Rukchai Hongyen LearnHub',
                position,
                units,
                user: req.session.user,
                success_msg: req.flash('success_msg'),
                error_msg: req.flash('error_msg')
            });
        } catch (error) {
            console.error('Error loading edit position form:', error);
            req.flash('error_msg', t(req, 'errorLoadingForm'));
            res.redirect('/organization/positions');
        }
    },

    /**
     * API: อัพเดทตำแหน่ง
     */
    async updatePosition(req, res) {
        try {
            const positionId = parseInt(req.params.id);

            const updateData = {
                position_name: req.body.position_name,
                unit_id: req.body.unit_id ? parseInt(req.body.unit_id) : null,
                description: req.body.description,
                position_type: req.body.position_type,
                position_level: req.body.position_level,
                job_grade: req.body.job_grade,
                level: req.body.level,
                min_salary: req.body.min_salary,
                max_salary: req.body.max_salary,
                is_active: req.body.is_active === '1' || req.body.is_active === 1 || req.body.is_active === true
            };

            const result = await Position.update(positionId, updateData);

            if (result.success) {
                // Log activity
                await ActivityLog.log({
                    user_id: req.session.user.user_id,
                    action: 'UPDATE_POSITION',
                    description: `แก้ไขตำแหน่ง ID: ${positionId}`,
                    ip_address: req.ip
                });

                const isJsonRequest = req.xhr ||
                                     req.headers.accept?.indexOf('json') > -1 ||
                                     req.headers['content-type']?.indexOf('json') > -1;

                if (isJsonRequest) {
                    return res.json({
                        success: true,
                        message: t(req, 'positionUpdatedSuccess')
                    });
                } else {
                    req.flash('success_msg', t(req, 'positionUpdatedSuccess'));
                    return res.redirect('/organization/positions');
                }
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error updating position:', error);

            const isJsonRequest = req.xhr ||
                                 req.headers.accept?.indexOf('json') > -1 ||
                                 req.headers['content-type']?.indexOf('json') > -1;

            if (isJsonRequest) {
                return res.status(400).json({
                    success: false,
                    message: error.message || t(req, 'errorUpdatingPosition')
                });
            } else {
                req.flash('error_msg', error.message || t(req, 'errorUpdatingPosition'));
                return res.redirect(`/organization/positions/${req.params.id}/edit`);
            }
        }
    },

    /**
     * API: ลบตำแหน่ง
     */
    async deletePosition(req, res) {
        try {
            const positionId = parseInt(req.params.id);
            const position = await Position.findById(positionId);

            if (!position) {
                return res.status(404).json({
                    success: false,
                    message: t(req, 'positionNotFound')
                });
            }

            const result = await Position.delete(positionId);

            if (result.success) {
                // Log activity
                await ActivityLog.log({
                    user_id: req.session.user.user_id,
                    action: 'DELETE_POSITION',
                    description: `ลบตำแหน่ง: ${position.position_name}`,
                    ip_address: req.ip
                });

                return res.json({
                    success: true,
                    message: t(req, 'positionDeletedSuccess')
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('Error deleting position:', error);
            return res.status(500).json({
                success: false,
                message: error.message || t(req, 'errorDeletingPosition')
            });
        }
    }
};

module.exports = organizationController;
