const { poolPromise, sql } = require('../config/database');

class Position {
    constructor(data) {
        this.position_id = data.position_id;
        this.unit_id = data.unit_id;
        this.position_code = data.position_code || data.code;
        this.position_name_th = data.position_name_th || data.title;
        this.position_name_en = data.position_name_en;
        this.position_type = data.position_type;
        this.position_level = data.position_level || data.level;
        this.job_grade = data.job_grade || data.grade;
        this.description = data.description;
        this.responsibilities = data.responsibilities;
        this.requirements = data.requirements;
        this.min_salary = data.min_salary || data.salary_min;
        this.max_salary = data.max_salary || data.salary_max;
        this.is_active = data.is_active;
    }

    static async create(positionData) {
        try {
            const pool = await poolPromise;

            // Check if department_id exists in Departments table, otherwise use default (1 = IT)
            let departmentId = null; // Default to NULL (no FK constraint violation)
            if (positionData.department_id || positionData.unit_id) {
                const deptId = positionData.department_id || positionData.unit_id;
                const deptCheck = await pool.request()
                    .input('dept_id', sql.Int, deptId)
                    .query('SELECT department_id FROM Departments WHERE department_id = @dept_id');

                if (deptCheck.recordset.length > 0) {
                    departmentId = deptId;
                }
            }

            // Map to actual table columns
            const result = await pool.request()
                .input('position_name', sql.NVarChar(100), positionData.position_name_th || positionData.position_name || positionData.title)
                .input('position_name_en', sql.NVarChar(255), positionData.position_name_en || null)
                .input('department_id', sql.Int, departmentId)
                .input('description', sql.NVarChar(255), positionData.description || null)
                .input('level', sql.Int, positionData.level || positionData.position_level || null)
                .input('position_type', sql.NVarChar(20), positionData.position_type || 'EMPLOYEE')
                .input('unit_id', sql.Int, positionData.unit_id || positionData.department_id || null)
                .input('position_level', sql.NVarChar(20), positionData.position_level || null)
                .input('job_grade', sql.NVarChar(10), positionData.job_grade || positionData.grade || null)
                .input('min_salary', sql.Decimal(10, 2), positionData.min_salary || positionData.salary_min || null)
                .input('max_salary', sql.Decimal(10, 2), positionData.max_salary || positionData.salary_max || null)
                .query(`
                    INSERT INTO Positions
                    (position_name, position_name_en, department_id, description, level, is_active,
                     position_type, unit_id, position_level, job_grade, min_salary, max_salary)
                    OUTPUT INSERTED.*
                    VALUES
                    (@position_name, @position_name_en, @department_id, @description, @level, 1,
                     @position_type, @unit_id, @position_level, @job_grade, @min_salary, @max_salary)
                `);

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error creating position:', error);
            if (error.number === 2627) {
                return { success: false, message: 'รหัสตำแหน่งซ้ำ' };
            }
            if (error.number === 547) {
                return { success: false, message: 'ไม่พบหน่วยงานที่เลือก' };
            }
            return { success: false, message: 'เกิดข้อผิดพลาดในการสร้างตำแหน่ง: ' + error.message };
        }
    }

    static async findById(positionId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query(`
                    SELECT p.*,
                           ou.unit_name_th,
                           ou.unit_code,
                           ol.level_name_th as unit_level_name,
                           (SELECT COUNT(*) FROM Users WHERE position_id = p.position_id AND is_active = 1 AND role_id NOT IN (12, 13)) as employee_count
                    FROM Positions p
                    LEFT JOIN OrganizationUnits ou ON p.unit_id = ou.unit_id
                    LEFT JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                    WHERE p.position_id = @position_id
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error finding position:', error);
            return null;
        }
    }

    static async findAll(filters = {}) {
        try {
            const pool = await poolPromise;
            let query = `
                SELECT p.*,
                       ou.unit_name_th,
                       ou.unit_code,
                       ol.level_name_th as unit_level_name,
                       (SELECT COUNT(*) FROM Users u WHERE u.position_id = p.position_id AND u.is_active = 1 AND u.role_id NOT IN (12, 13)) as employee_count
                FROM Positions p
                LEFT JOIN OrganizationUnits ou ON p.unit_id = ou.unit_id
                LEFT JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                WHERE 1=1
            `;

            const request = pool.request();

            // Support both unit_id (new) and department_id (old)
            if (filters.unit_id || filters.department_id) {
                query += ' AND (p.unit_id = @unit_id OR p.department_id = @unit_id)';
                request.input('unit_id', sql.Int, filters.unit_id || filters.department_id);
            }

            if (filters.position_type) {
                query += ' AND p.position_type = @position_type';
                request.input('position_type', sql.NVarChar(20), filters.position_type);
            }

            if (filters.is_active !== undefined) {
                query += ' AND p.is_active = @is_active';
                request.input('is_active', sql.Bit, filters.is_active);
            }

            // Support both position_level (new) and level (old)
            if (filters.position_level || filters.level) {
                query += ' AND (p.position_level = @position_level OR p.level = @level_int)';
                request.input('position_level', sql.NVarChar(20), filters.position_level || filters.level);
                // Try to convert to int for old level column
                const levelInt = parseInt(filters.position_level || filters.level);
                request.input('level_int', sql.Int, isNaN(levelInt) ? null : levelInt);
            }

            // Support both job_grade (new) and grade (old)
            if (filters.job_grade || filters.grade) {
                query += ' AND p.job_grade = @job_grade';
                request.input('job_grade', sql.NVarChar(10), filters.job_grade || filters.grade);
            }

            if (filters.search) {
                query += ' AND (p.position_name LIKE @search OR p.description LIKE @search)';
                request.input('search', sql.NVarChar(255), `%${filters.search}%`);
            }

            query += ' ORDER BY p.position_type, ou.unit_name_th, p.level, p.position_name';

            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error finding Positions:', error);
            return [];
        }
    }

    static async update(positionId, updateData) {
        try {
            const pool = await poolPromise;

            let setClause = [];
            const request = pool.request().input('position_id', sql.Int, positionId);

            // Map of allowed fields with their actual column names in database
            const fieldMapping = {
                'position_name': 'position_name',
                'position_name_en': 'position_name_en',
                'unit_id': 'unit_id',
                // 'department_id': 'department_id', // Removed - no longer updating this field (legacy FK)
                'description': 'description',
                'level': 'level',
                'position_type': 'position_type',
                'position_level': 'position_level',
                'job_grade': 'job_grade',
                'min_salary': 'min_salary',
                'max_salary': 'max_salary',
                'is_active': 'is_active'
            };

            Object.keys(fieldMapping).forEach(field => {
                if (updateData[field] !== undefined) {
                    // Allow empty string for description (will be stored as empty, not null)
                    // Skip null values and empty strings for other fields
                    const allowEmpty = (field === 'description');
                    const fieldValue = updateData[field];
                    const isEmpty = (fieldValue === null || fieldValue === '');

                    if (!isEmpty || allowEmpty) {
                        const dbColumn = fieldMapping[field];
                        setClause.push(`${dbColumn} = @${field}`);

                        // Set appropriate SQL type for each field
                        if (field === 'position_name' || field === 'position_name_en') {
                            request.input(field, sql.NVarChar(255), fieldValue);
                        } else if (field === 'description') {
                            // Explicitly handle description - allow empty string
                            const descValue = (fieldValue === null || fieldValue === undefined) ? '' : fieldValue;
                            request.input(field, sql.NVarChar(255), descValue);
                        } else if (field === 'position_type' || field === 'position_level') {
                            request.input(field, sql.NVarChar(20), fieldValue);
                        } else if (field === 'job_grade') {
                            request.input(field, sql.NVarChar(10), fieldValue);
                        } else if (field === 'level' || field === 'unit_id') {
                            request.input(field, sql.Int, parseInt(fieldValue));
                        } else if (field === 'min_salary' || field === 'max_salary') {
                            request.input(field, sql.Decimal(10, 2), parseFloat(fieldValue));
                        } else if (field === 'is_active') {
                            request.input(field, sql.Bit, fieldValue === true || fieldValue === 1 || fieldValue === '1');
                        }
                    }
                }
            });

            if (setClause.length === 0) {
                return { success: false, message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' };
            }

            const result = await request.query(`
                UPDATE Positions
                SET ${setClause.join(', ')}
                OUTPUT INSERTED.*
                WHERE position_id = @position_id
            `);

            if (result.recordset.length === 0) {
                return { success: false, message: 'ไม่พบตำแหน่งงาน' };
            }

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error updating position:', error);
            if (error.number === 2627) {
                return { success: false, message: 'รหัสตำแหน่งซ้ำ' };
            }
            if (error.number === 547) {
                return { success: false, message: 'ไม่พบหน่วยงานที่เลือก' };
            }
            return { success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขตำแหน่ง: ' + error.message };
        }
    }

    static async delete(positionId) {
        try {
            const pool = await poolPromise;

            // Check if there are employees in this position (exclude Admin and Applicant)
            const employeeCheck = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query('SELECT COUNT(*) as count FROM Users WHERE position_id = @position_id AND is_active = 1 AND role_id NOT IN (12, 13)');

            if (employeeCheck.recordset[0].count > 0) {
                return {
                    success: false,
                    message: `ไม่สามารถลบตำแหน่งได้ เนื่องจากมีพนักงาน ${employeeCheck.recordset[0].count} คนในตำแหน่งนี้`
                };
            }

            // Delete the position
            const result = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query('DELETE FROM Positions WHERE position_id = @position_id');

            if (result.rowsAffected[0] === 0) {
                return { success: false, message: 'ไม่พบตำแหน่งงาน' };
            }

            return { success: true, message: 'ลบตำแหน่งสำเร็จ' };
        } catch (error) {
            console.error('Error deleting position:', error);
            if (error.number === 547) {
                return { success: false, message: 'ไม่สามารถลบตำแหน่งได้ เนื่องจากมีข้อมูลที่เกี่ยวข้อง' };
            }
            return { success: false, message: 'เกิดข้อผิดพลาดในการลบตำแหน่ง: ' + error.message };
        }
    }

    static async getOrganizationChart(departmentId = null) {
        try {
            const pool = await poolPromise;

            let query = `
                WITH PositionHierarchy AS (
                    SELECT
                        p.position_id,
                        p.title,
                        p.level,
                        p.reports_to,
                        d.name as department_name,
                        0 as hierarchy_level,
                        CAST(p.title AS NVARCHAR(1000)) as path
                    FROM Positions p
                    LEFT JOIN Departments d ON p.department_id = d.department_id
                    WHERE p.reports_to IS NULL AND p.is_active = 1
            `;

            const request = pool.request();

            if (departmentId) {
                query += ' AND p.department_id = @department_id';
                request.input('department_id', sql.Int, departmentId);
            }

            query += `
                    UNION ALL

                    SELECT
                        p.position_id,
                        p.title,
                        p.level,
                        p.reports_to,
                        d.name as department_name,
                        ph.hierarchy_level + 1,
                        CAST(ph.path + ' > ' + p.title AS NVARCHAR(1000))
                    FROM Positions p
                    LEFT JOIN Departments d ON p.department_id = d.department_id
                    INNER JOIN PositionHierarchy ph ON p.reports_to = ph.position_id
                    WHERE p.is_active = 1
                )
                SELECT
                    ph.*,
                    (SELECT COUNT(*) FROM Users u WHERE u.position_id = ph.position_id AND u.is_active = 1) as employee_count,
                    (SELECT COUNT(*) FROM Positions sub WHERE sub.reports_to = ph.position_id AND sub.is_active = 1) as direct_reports
                FROM PositionHierarchy ph
                ORDER BY ph.path
            `;

            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error getting organization chart:', error);
            return [];
        }
    }

    static async findByDepartment(departmentId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('department_id', sql.Int, departmentId)
                .query(`
                    SELECT p.*,
                           rp.title as reports_to_title,
                           (SELECT COUNT(*) FROM Users u WHERE u.position_id = p.position_id AND u.is_active = 1 AND u.role_id NOT IN (12, 13)) as employee_count,
                           (SELECT COUNT(*) FROM Positions sub WHERE sub.reports_to = p.position_id AND sub.is_active = 1) as direct_reports
                    FROM Positions p
                    LEFT JOIN Positions rp ON p.reports_to = rp.position_id
                    WHERE p.department_id = @department_id
                    ORDER BY p.level, p.title
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding Positions by department:', error);
            return [];
        }
    }

    static async getPositionStatistics(positionId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query(`
                    SELECT
                        p.title as position_title,
                        COUNT(u.user_id) as total_employees,
                        COUNT(CASE WHEN u.is_active = 1 THEN 1 END) as active_employees,
                        (SELECT COUNT(*) FROM Positions sub WHERE sub.reports_to = p.position_id) as direct_reports,
                        p.salary_min,
                        p.salary_max,
                        AVG(CASE WHEN u.salary IS NOT NULL THEN u.salary END) as avg_salary
                    FROM Positions p
                    LEFT JOIN Users u ON p.position_id = u.position_id
                    WHERE p.position_id = @position_id
                    GROUP BY p.position_id, p.title, p.salary_min, p.salary_max
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error getting position statistics:', error);
            return null;
        }
    }

    static async getPositionLevels() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT DISTINCT level
                FROM Positions
                WHERE is_active = 1 AND level IS NOT NULL
                ORDER BY level
            `);

            return result.recordset.map(row => row.level);
        } catch (error) {
            console.error('Error getting position levels:', error);
            return [];
        }
    }

    static async getPositionGrades() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT DISTINCT grade
                FROM Positions
                WHERE is_active = 1 AND grade IS NOT NULL
                ORDER BY grade
            `);

            return result.recordset.map(row => row.grade);
        } catch (error) {
            console.error('Error getting position grades:', error);
            return [];
        }
    }

    static async findManagementPositions() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT p.*,
                       d.name as department_name,
                       (SELECT COUNT(*) FROM Users u WHERE u.position_id = p.position_id AND u.is_active = 1 AND u.role_id NOT IN (12, 13)) as employee_count,
                       (SELECT COUNT(*) FROM Positions sub WHERE sub.reports_to = p.position_id AND sub.is_active = 1) as direct_reports
                FROM Positions p
                LEFT JOIN Departments d ON p.department_id = d.department_id
                WHERE p.is_management = 1 AND p.is_active = 1
                ORDER BY d.name, p.level, p.title
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding management Positions:', error);
            return [];
        }
    }

    static async getDirectReports(positionId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query(`
                    SELECT p.*,
                           d.name as department_name,
                           (SELECT COUNT(*) FROM Users u WHERE u.position_id = p.position_id AND u.is_active = 1 AND u.role_id NOT IN (12, 13)) as employee_count
                    FROM Positions p
                    LEFT JOIN Departments d ON p.department_id = d.department_id
                    WHERE p.reports_to = @position_id AND p.is_active = 1
                    ORDER BY p.level, p.title
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting direct reports:', error);
            return [];
        }
    }

    static async validatePositionCode(code, excludePositionId = null) {
        try {
            const pool = await poolPromise;
            const request = pool.request()
                .input('code', sql.VarChar(50), code);

            let query = 'SELECT position_id FROM Positions WHERE code = @code';

            if (excludePositionId) {
                query += ' AND position_id != @exclude_position_id';
                request.input('exclude_position_id', sql.Int, excludePositionId);
            }

            const result = await request.query(query);
            return result.recordset.length === 0;
        } catch (error) {
            console.error('Error validating position code:', error);
            return false;
        }
    }

    static async getSalaryRangeAnalysis() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT
                    d.name as department_name,
                    p.level,
                    p.grade,
                    COUNT(p.position_id) as position_count,
                    MIN(p.salary_min) as min_salary_range,
                    MAX(p.salary_max) as max_salary_range,
                    AVG(p.salary_min) as avg_min_salary,
                    AVG(p.salary_max) as avg_max_salary,
                    AVG((p.salary_min + p.salary_max) / 2) as avg_midpoint_salary
                FROM Positions p
                LEFT JOIN Departments d ON p.department_id = d.department_id
                WHERE p.is_active = 1 AND p.salary_min IS NOT NULL AND p.salary_max IS NOT NULL
                GROUP BY d.name, p.level, p.grade
                ORDER BY d.name, p.level, p.grade
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting salary range analysis:', error);
            return [];
        }
    }

    static async findActivePositions() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT p.position_id,
                       p.position_name as title,
                       p.position_id as code,
                       p.position_type,
                       ou.unit_name_th as department_name
                FROM Positions p
                LEFT JOIN OrganizationUnits ou ON p.unit_id = ou.unit_id
                WHERE p.is_active = 1
                ORDER BY p.position_type, ou.unit_name_th, p.position_name
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding active Positions:', error);
            return [];
        }
    }

    // ============ NEW METHODS FOR ORGANIZATION STRUCTURE ============

    // Get positions by type (EMPLOYEE or APPLICANT)
    static async getByType(positionType) {
        try {
            return await this.findAll({ position_type: positionType, is_active: true });
        } catch (error) {
            console.error('Error getting positions by type:', error);
            return [];
        }
    }

    // Get employee positions (for internal staff)
    static async getEmployeePositions(unitId = null) {
        try {
            const filters = {
                position_type: 'EMPLOYEE',
                is_active: true
            };

            if (unitId) {
                filters.unit_id = unitId;
            }

            return await this.findAll(filters);
        } catch (error) {
            console.error('Error getting employee positions:', error);
            return [];
        }
    }

    // Get applicant positions (job openings)
    static async getApplicantPositions() {
        try {
            return await this.findAll({
                position_type: 'APPLICANT',
                is_active: true
            });
        } catch (error) {
            console.error('Error getting applicant positions:', error);
            return [];
        }
    }

    // Get positions by organization unit
    static async getByUnit(unitId) {
        try {
            return await this.findAll({ unit_id: unitId, is_active: true });
        } catch (error) {
            console.error('Error getting positions by unit:', error);
            return [];
        }
    }

    // Check if position name exists (position_code column removed)
    static async existsByCode(positionName, excludeId = null) {
        try {
            const pool = await poolPromise;
            const request = pool.request()
                .input('positionName', sql.NVarChar(100), positionName);

            let query = `
                SELECT COUNT(*) as count
                FROM Positions
                WHERE position_name = @positionName
            `;

            if (excludeId) {
                query += ' AND position_id != @excludeId';
                request.input('excludeId', sql.Int, excludeId);
            }

            const result = await request.query(query);
            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Error checking position name:', error);
            return false;
        }
    }

    // Get position statistics
    static async getStatistics() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT
                    COUNT(*) as total_positions,
                    SUM(CASE WHEN position_type = 'EMPLOYEE' THEN 1 ELSE 0 END) as employee_positions,
                    SUM(CASE WHEN position_type = 'APPLICANT' THEN 1 ELSE 0 END) as applicant_positions,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_positions,
                    (SELECT COUNT(*) FROM Users WHERE position_id IS NOT NULL AND is_active = 1 AND role_id NOT IN (12, 13)) as total_employees
                FROM Positions
            `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting position statistics:', error);
            return null;
        }
    }
}

module.exports = Position;