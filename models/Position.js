const sql = require('mssql');
const database = require('../config/database');

class Position {
    static async create(positionData) {
        try {
            const pool = await database.getConnection();

            const result = await pool.request()
                .input('title', sql.NVarChar(255), positionData.title)
                .input('code', sql.VarChar(50), positionData.code)
                .input('department_id', sql.UniqueIdentifier, positionData.department_id)
                .input('level', sql.VarChar(50), positionData.level)
                .input('grade', sql.VarChar(20), positionData.grade)
                .input('description', sql.NText, positionData.description)
                .input('requirements', sql.NText, positionData.requirements)
                .input('responsibilities', sql.NText, positionData.responsibilities)
                .input('salary_min', sql.Decimal(10, 2), positionData.salary_min)
                .input('salary_max', sql.Decimal(10, 2), positionData.salary_max)
                .input('reports_to', sql.UniqueIdentifier, positionData.reports_to)
                .input('is_management', sql.Bit, positionData.is_management || false)
                .input('is_active', sql.Bit, positionData.is_active !== undefined ? positionData.is_active : true)
                .input('created_by', sql.UniqueIdentifier, positionData.created_by)
                .query(`
                    INSERT INTO Positions
                    (title, code, department_id, level, grade, description, requirements,
                     responsibilities, salary_min, salary_max, reports_to, is_management, is_active, created_by)
                    OUTPUT INSERTED.*
                    VALUES
                    (@title, @code, @department_id, @level, @grade, @description, @requirements,
                     @responsibilities, @salary_min, @salary_max, @reports_to, @is_management, @is_active, @created_by)
                `);

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error creating position:', error);
            if (error.number === 2627) {
                return { success: false, message: 'Position code already exists' };
            }
            return { success: false, message: 'Failed to create position' };
        }
    }

    static async findById(positionId) {
        try {
            const pool = await database.getConnection();

            const result = await pool.request()
                .input('position_id', sql.UniqueIdentifier, positionId)
                .query(`
                    SELECT p.*,
                           d.name as department_name,
                           rp.title as reports_to_title,
                           c.first_name + ' ' + c.last_name as created_by_name
                    FROM Positions p
                    LEFT JOIN Departments d ON p.department_id = d.department_id
                    LEFT JOIN Positions rp ON p.reports_to = rp.position_id
                    LEFT JOIN Users c ON p.created_by = c.user_id
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
            const pool = await database.getConnection();
            let query = `
                SELECT p.*,
                       d.name as department_name,
                       rp.title as reports_to_title,
                       (SELECT COUNT(*) FROM Users u WHERE u.position_id = p.position_id AND u.is_active = 1) as employee_count
                FROM Positions p
                LEFT JOIN Departments d ON p.department_id = d.department_id
                LEFT JOIN Positions rp ON p.reports_to = rp.position_id
                WHERE 1=1
            `;

            const request = pool.request();

            if (filters.department_id) {
                query += ' AND p.department_id = @department_id';
                request.input('department_id', sql.UniqueIdentifier, filters.department_id);
            }

            if (filters.is_active !== undefined) {
                query += ' AND p.is_active = @is_active';
                request.input('is_active', sql.Bit, filters.is_active);
            }

            if (filters.level) {
                query += ' AND p.level = @level';
                request.input('level', sql.VarChar(50), filters.level);
            }

            if (filters.grade) {
                query += ' AND p.grade = @grade';
                request.input('grade', sql.VarChar(20), filters.grade);
            }

            if (filters.is_management !== undefined) {
                query += ' AND p.is_management = @is_management';
                request.input('is_management', sql.Bit, filters.is_management);
            }

            if (filters.search) {
                query += ' AND (p.title LIKE @search OR p.code LIKE @search OR p.description LIKE @search)';
                request.input('search', sql.NVarChar(255), `%${filters.search}%`);
            }

            query += ' ORDER BY d.name, p.level, p.title';

            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error finding Positions:', error);
            return [];
        }
    }

    static async update(positionId, updateData) {
        try {
            const pool = await database.getConnection();

            let setClause = [];
            const request = pool.request().input('position_id', sql.UniqueIdentifier, positionId);

            const allowedFields = [
                'title', 'code', 'department_id', 'level', 'grade', 'description',
                'requirements', 'responsibilities', 'salary_min', 'salary_max',
                'reports_to', 'is_management', 'is_active'
            ];

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    setClause.push(`${field} = @${field}`);

                    if (field === 'title') {
                        request.input(field, sql.NVarChar(255), updateData[field]);
                    } else if (field === 'code' || field === 'level') {
                        request.input(field, sql.VarChar(50), updateData[field]);
                    } else if (field === 'grade') {
                        request.input(field, sql.VarChar(20), updateData[field]);
                    } else if (field === 'description' || field === 'requirements' || field === 'responsibilities') {
                        request.input(field, sql.NText, updateData[field]);
                    } else if (field === 'department_id' || field === 'reports_to') {
                        request.input(field, sql.UniqueIdentifier, updateData[field]);
                    } else if (field === 'salary_min' || field === 'salary_max') {
                        request.input(field, sql.Decimal(10, 2), updateData[field]);
                    } else if (field === 'is_management' || field === 'is_active') {
                        request.input(field, sql.Bit, updateData[field]);
                    }
                }
            });

            if (setClause.length === 0) {
                return { success: false, message: 'No valid fields to update' };
            }

            setClause.push('updated_at = GETDATE()');

            const result = await request.query(`
                UPDATE Positions
                SET ${setClause.join(', ')}
                OUTPUT INSERTED.*
                WHERE position_id = @position_id
            `);

            if (result.recordset.length === 0) {
                return { success: false, message: 'Position not found' };
            }

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error updating position:', error);
            if (error.number === 2627) {
                return { success: false, message: 'Position code already exists' };
            }
            return { success: false, message: 'Failed to update position' };
        }
    }

    static async delete(positionId) {
        try {
            const pool = await database.getConnection();

            const employeeCheck = await pool.request()
                .input('position_id', sql.UniqueIdentifier, positionId)
                .query('SELECT COUNT(*) as count FROM Users WHERE position_id = @position_id');

            if (employeeCheck.recordset[0].count > 0) {
                return { success: false, message: 'Cannot delete position with existing employees' };
            }

            const reportsCheck = await pool.request()
                .input('position_id', sql.UniqueIdentifier, positionId)
                .query('SELECT COUNT(*) as count FROM Positions WHERE reports_to = @position_id');

            if (reportsCheck.recordset[0].count > 0) {
                return { success: false, message: 'Cannot delete position with direct reports' };
            }

            const result = await pool.request()
                .input('position_id', sql.UniqueIdentifier, positionId)
                .query('DELETE FROM Positions WHERE position_id = @position_id');

            if (result.rowsAffected[0] === 0) {
                return { success: false, message: 'Position not found' };
            }

            return { success: true, message: 'Position deleted successfully' };
        } catch (error) {
            console.error('Error deleting position:', error);
            return { success: false, message: 'Failed to delete position' };
        }
    }

    static async getOrganizationChart(departmentId = null) {
        try {
            const pool = await database.getConnection();

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
                request.input('department_id', sql.UniqueIdentifier, departmentId);
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
            const pool = await database.getConnection();

            const result = await pool.request()
                .input('department_id', sql.UniqueIdentifier, departmentId)
                .query(`
                    SELECT p.*,
                           rp.title as reports_to_title,
                           (SELECT COUNT(*) FROM Users u WHERE u.position_id = p.position_id AND u.is_active = 1) as employee_count,
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
            const pool = await database.getConnection();

            const result = await pool.request()
                .input('position_id', sql.UniqueIdentifier, positionId)
                .query(`
                    SELECT
                        p.title as position_title,
                        COUNT(u.user_id) as total_employees,
                        COUNT(CASE WHEN u.is_active = 1 THEN 1 END) as active_employees,
                        AVG(CASE WHEN u.hire_date IS NOT NULL THEN DATEDIFF(month, u.hire_date, GETDATE()) END) as avg_tenure_months,
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
            const pool = await database.getConnection();

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
            const pool = await database.getConnection();

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
            const pool = await database.getConnection();

            const result = await pool.request().query(`
                SELECT p.*,
                       d.name as department_name,
                       (SELECT COUNT(*) FROM Users u WHERE u.position_id = p.position_id AND u.is_active = 1) as employee_count,
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
            const pool = await database.getConnection();

            const result = await pool.request()
                .input('position_id', sql.UniqueIdentifier, positionId)
                .query(`
                    SELECT p.*,
                           d.name as department_name,
                           (SELECT COUNT(*) FROM Users u WHERE u.position_id = p.position_id AND u.is_active = 1) as employee_count
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
            const pool = await database.getConnection();
            const request = pool.request()
                .input('code', sql.VarChar(50), code);

            let query = 'SELECT position_id FROM Positions WHERE code = @code';

            if (excludePositionId) {
                query += ' AND position_id != @exclude_position_id';
                request.input('exclude_position_id', sql.UniqueIdentifier, excludePositionId);
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
            const pool = await database.getConnection();

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
            const pool = await database.getConnection();

            const result = await pool.request().query(`
                SELECT p.position_id, p.title, p.code, d.name as department_name
                FROM Positions p
                LEFT JOIN Departments d ON p.department_id = d.department_id
                WHERE p.is_active = 1
                ORDER BY d.name, p.title
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding active Positions:', error);
            return [];
        }
    }
}

module.exports = Position;