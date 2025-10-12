const { poolPromise, sql } = require('../config/database');

class OrganizationUnit {
    constructor(data) {
        this.unit_id = data.unit_id;
        this.parent_id = data.parent_id;
        this.level_id = data.level_id;
        this.unit_code = data.unit_code;
        this.unit_name_th = data.unit_name_th;
        this.unit_name_en = data.unit_name_en;
        this.unit_abbr = data.unit_abbr;
        this.description = data.description;
        this.manager_id = data.manager_id;
        this.cost_center = data.cost_center;
        this.address = data.address;
        this.phone = data.phone;
        this.email = data.email;
        this.status = data.status;
        this.is_active = data.is_active;
    }

    // Get all organization units with hierarchy
    static async getAll(includeInactive = false) {
        try {
            const pool = await poolPromise;

            const whereClause = includeInactive ? '' : 'WHERE ou.is_active = 1';

            const result = await pool.request().query(`
                SELECT
                    ou.*,
                    ol.level_code,
                    ol.level_name_th,
                    ol.level_name_en,
                    ol.level_order,
                    parent.unit_name_th as parent_name,
                    CONCAT(mgr.first_name, ' ', mgr.last_name) as manager_name,
                    (SELECT COUNT(*) FROM Users WHERE unit_id = ou.unit_id AND is_active = 1) as employee_count
                FROM OrganizationUnits ou
                INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                LEFT JOIN OrganizationUnits parent ON ou.parent_id = parent.unit_id
                LEFT JOIN Users mgr ON ou.manager_id = mgr.user_id
                ${whereClause}
                ORDER BY ol.level_order, ou.unit_name_th
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching organization units: ${error.message}`);
        }
    }

    // Get unit by ID
    static async findById(unitId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('unitId', sql.Int, unitId)
                .query(`
                    SELECT
                        ou.*,
                        ol.level_code,
                        ol.level_name_th,
                        ol.level_name_en,
                        ol.level_order,
                        parent.unit_name_th as parent_name,
                        CONCAT(mgr.first_name, ' ', mgr.last_name) as manager_name,
                        mgr.employee_id as manager_employee_id,
                        (SELECT COUNT(*) FROM Users WHERE unit_id = ou.unit_id AND is_active = 1) as employee_count,
                        (SELECT COUNT(*) FROM Positions WHERE unit_id = ou.unit_id AND is_active = 1) as position_count
                    FROM OrganizationUnits ou
                    INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                    LEFT JOIN OrganizationUnits parent ON ou.parent_id = parent.unit_id
                    LEFT JOIN Users mgr ON ou.manager_id = mgr.user_id
                    WHERE ou.unit_id = @unitId
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error finding organization unit: ${error.message}`);
        }
    }

    // Get hierarchy path (breadcrumb)
    static async getHierarchyPath(unitId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('unitId', sql.Int, unitId)
                .query(`
                    WITH UnitHierarchy AS (
                        -- Anchor: เริ่มต้นจากหน่วยงานที่ระบุ
                        SELECT
                            unit_id, parent_id, unit_code, unit_name_th, level_id, 0 as depth
                        FROM OrganizationUnits
                        WHERE unit_id = @unitId

                        UNION ALL

                        -- Recursive: ขึ้นไปหาหน่วยงานแม่
                        SELECT
                            ou.unit_id, ou.parent_id, ou.unit_code, ou.unit_name_th, ou.level_id, uh.depth + 1
                        FROM OrganizationUnits ou
                        INNER JOIN UnitHierarchy uh ON ou.unit_id = uh.parent_id
                    )
                    SELECT
                        uh.unit_id,
                        uh.unit_code,
                        uh.unit_name_th,
                        ol.level_name_th,
                        uh.depth
                    FROM UnitHierarchy uh
                    INNER JOIN OrganizationLevels ol ON uh.level_id = ol.level_id
                    ORDER BY uh.depth DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error getting hierarchy path: ${error.message}`);
        }
    }

    // Get children units
    static async getChildren(parentId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('parentId', sql.Int, parentId)
                .query(`
                    SELECT
                        ou.*,
                        ol.level_name_th,
                        ol.level_order,
                        (SELECT COUNT(*) FROM OrganizationUnits WHERE parent_id = ou.unit_id AND is_active = 1) as children_count,
                        (SELECT COUNT(*) FROM Users WHERE unit_id = ou.unit_id AND is_active = 1) as employee_count
                    FROM OrganizationUnits ou
                    INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                    WHERE ou.parent_id = @parentId AND ou.is_active = 1
                    ORDER BY ou.unit_name_th
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error getting children units: ${error.message}`);
        }
    }

    // Get tree structure (full hierarchy)
    static async getTree(rootUnitId = null) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('rootUnitId', sql.Int, rootUnitId)
                .query(`
                    WITH UnitTree AS (
                        -- Anchor: เริ่มต้นจาก root หรือหน่วยงานที่ระบุ
                        SELECT
                            unit_id, parent_id, unit_code, unit_name_th, level_id,
                            0 as depth,
                            CAST(unit_name_th AS NVARCHAR(MAX)) as path
                        FROM OrganizationUnits
                        WHERE (parent_id IS NULL AND @rootUnitId IS NULL)
                           OR (unit_id = @rootUnitId)

                        UNION ALL

                        -- Recursive: ลงไปหาหน่วยงานลูก
                        SELECT
                            ou.unit_id, ou.parent_id, ou.unit_code, ou.unit_name_th, ou.level_id,
                            ut.depth + 1,
                            CAST(ut.path + ' > ' + ou.unit_name_th AS NVARCHAR(MAX))
                        FROM OrganizationUnits ou
                        INNER JOIN UnitTree ut ON ou.parent_id = ut.unit_id
                        WHERE ou.is_active = 1
                    )
                    SELECT
                        ut.*,
                        ol.level_name_th,
                        ol.level_order
                    FROM UnitTree ut
                    INNER JOIN OrganizationLevels ol ON ut.level_id = ol.level_id
                    ORDER BY ut.path
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error getting organization tree: ${error.message}`);
        }
    }

    // Get units by level
    static async getByLevel(levelCode) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('levelCode', sql.NVarChar(20), levelCode)
                .query(`
                    SELECT
                        ou.*,
                        ol.level_name_th,
                        parent.unit_name_th as parent_name,
                        (SELECT COUNT(*) FROM Users WHERE unit_id = ou.unit_id AND is_active = 1) as employee_count
                    FROM OrganizationUnits ou
                    INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                    LEFT JOIN OrganizationUnits parent ON ou.parent_id = parent.unit_id
                    WHERE ol.level_code = @levelCode AND ou.is_active = 1
                    ORDER BY ou.unit_name_th
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error getting units by level: ${error.message}`);
        }
    }

    // Create new unit
    static async create(unitData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('parentId', sql.Int, unitData.parent_id || null)
                .input('levelId', sql.Int, unitData.level_id)
                .input('unitCode', sql.NVarChar(20), unitData.unit_code)
                .input('unitNameTh', sql.NVarChar(100), unitData.unit_name_th)
                .input('unitNameEn', sql.NVarChar(100), unitData.unit_name_en || null)
                .input('unitAbbr', sql.NVarChar(10), unitData.unit_abbr || null)
                .input('description', sql.NVarChar(500), unitData.description || null)
                .input('managerId', sql.Int, unitData.manager_id || null)
                .input('costCenter', sql.NVarChar(20), unitData.cost_center || null)
                .input('address', sql.NVarChar(500), unitData.address || null)
                .input('phone', sql.NVarChar(20), unitData.phone || null)
                .input('email', sql.NVarChar(100), unitData.email || null)
                .input('createdBy', sql.Int, unitData.created_by || null)
                .query(`
                    INSERT INTO OrganizationUnits (
                        parent_id, level_id, unit_code, unit_name_th, unit_name_en, unit_abbr,
                        description, manager_id, cost_center, address, phone, email,
                        status, created_by
                    )
                    OUTPUT INSERTED.unit_id
                    VALUES (
                        @parentId, @levelId, @unitCode, @unitNameTh, @unitNameEn, @unitAbbr,
                        @description, @managerId, @costCenter, @address, @phone, @email,
                        'ACTIVE', @createdBy
                    )
                `);

            return {
                success: true,
                unitId: result.recordset[0].unit_id
            };
        } catch (error) {
            if (error.message.includes('UNIQUE KEY') || error.message.includes('duplicate')) {
                throw new Error('รหัสหน่วยงานซ้ำ');
            }
            throw new Error(`Error creating organization unit: ${error.message}`);
        }
    }

    // Update unit
    static async update(unitId, updateData) {
        try {
            const pool = await poolPromise;

            const updateFields = [];
            const request = pool.request().input('unitId', sql.Int, unitId);

            if (updateData.unit_name_th !== undefined) {
                updateFields.push('unit_name_th = @unitNameTh');
                request.input('unitNameTh', sql.NVarChar(100), updateData.unit_name_th);
            }
            if (updateData.unit_name_en !== undefined) {
                updateFields.push('unit_name_en = @unitNameEn');
                request.input('unitNameEn', sql.NVarChar(100), updateData.unit_name_en);
            }
            if (updateData.unit_abbr !== undefined) {
                updateFields.push('unit_abbr = @unitAbbr');
                request.input('unitAbbr', sql.NVarChar(10), updateData.unit_abbr);
            }
            if (updateData.description !== undefined) {
                updateFields.push('description = @description');
                request.input('description', sql.NVarChar(500), updateData.description);
            }
            if (updateData.manager_id !== undefined) {
                updateFields.push('manager_id = @managerId');
                request.input('managerId', sql.Int, updateData.manager_id);
            }
            if (updateData.cost_center !== undefined) {
                updateFields.push('cost_center = @costCenter');
                request.input('costCenter', sql.NVarChar(20), updateData.cost_center);
            }
            if (updateData.address !== undefined) {
                updateFields.push('address = @address');
                request.input('address', sql.NVarChar(500), updateData.address);
            }
            if (updateData.phone !== undefined) {
                updateFields.push('phone = @phone');
                request.input('phone', sql.NVarChar(20), updateData.phone);
            }
            if (updateData.email !== undefined) {
                updateFields.push('email = @email');
                request.input('email', sql.NVarChar(100), updateData.email);
            }
            if (updateData.status !== undefined) {
                updateFields.push('status = @status');
                request.input('status', sql.NVarChar(20), updateData.status);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            updateFields.push('updated_at = GETDATE()');

            if (updateData.updated_by) {
                updateFields.push('updated_by = @updatedBy');
                request.input('updatedBy', sql.Int, updateData.updated_by);
            }

            const updateQuery = `
                UPDATE OrganizationUnits
                SET ${updateFields.join(', ')}
                WHERE unit_id = @unitId
            `;

            const result = await request.query(updateQuery);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Updated successfully' : 'Unit not found'
            };
        } catch (error) {
            throw new Error(`Error updating organization unit: ${error.message}`);
        }
    }

    // Delete unit (soft delete)
    static async delete(unitId) {
        try {
            const pool = await poolPromise;

            // Check if has children
            const childrenCheck = await pool.request()
                .input('unitId', sql.Int, unitId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM OrganizationUnits
                    WHERE parent_id = @unitId AND is_active = 1
                `);

            if (childrenCheck.recordset[0].count > 0) {
                return {
                    success: false,
                    message: 'Cannot delete unit with active children'
                };
            }

            // Check if has employees
            const employeeCheck = await pool.request()
                .input('unitId', sql.Int, unitId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM Users
                    WHERE unit_id = @unitId AND is_active = 1
                `);

            if (employeeCheck.recordset[0].count > 0) {
                return {
                    success: false,
                    message: 'Cannot delete unit with active employees'
                };
            }

            const result = await pool.request()
                .input('unitId', sql.Int, unitId)
                .query(`
                    UPDATE OrganizationUnits
                    SET is_active = 0,
                        status = 'INACTIVE',
                        updated_at = GETDATE()
                    WHERE unit_id = @unitId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Deleted successfully' : 'Unit not found'
            };
        } catch (error) {
            throw new Error(`Error deleting organization unit: ${error.message}`);
        }
    }

    // Get all organization levels
    static async getLevels() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT *
                FROM OrganizationLevels
                WHERE is_active = 1
                ORDER BY level_order
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching organization levels: ${error.message}`);
        }
    }
}

module.exports = OrganizationUnit;
