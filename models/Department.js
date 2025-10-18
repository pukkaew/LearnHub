const { poolPromise, sql } = require('../config/database');

class Department {
    static async create(departmentData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('department_name', sql.NVarChar(100), departmentData.department_name || departmentData.name)
                .input('department_code', sql.NVarChar(10), departmentData.department_code || departmentData.code)
                .input('description', sql.NVarChar(500), departmentData.description)
                .input('is_active', sql.Bit, departmentData.is_active !== undefined ? departmentData.is_active : true)
                .query(`
                    INSERT INTO Departments
                    (department_name, department_code, description, is_active)
                    OUTPUT INSERTED.*
                    VALUES
                    (@department_name, @department_code, @description, @is_active)
                `);

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error creating department:', error);
            if (error.number === 2627) {
                return { success: false, message: 'Department code already exists' };
            }
            return { success: false, message: 'Failed to create department' };
        }
    }

    static async findById(departmentId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('department_id', sql.Int, departmentId)
                .query(`
                    SELECT d.*
                    FROM Departments d
                    WHERE d.department_id = @department_id
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error finding department:', error);
            return null;
        }
    }

    static async findAll(filters = {}) {
        try {
            const pool = await poolPromise;
            let query = `
                SELECT d.*,
                       (SELECT COUNT(*) FROM Users u WHERE u.department_id = d.department_id AND u.is_active = 1) as employee_count,
                       (SELECT COUNT(*) FROM Positions p WHERE p.department_id = d.department_id AND p.is_active = 1) as position_count
                FROM Departments d
                WHERE 1=1
            `;

            const request = pool.request();

            if (filters.is_active !== undefined) {
                query += ' AND d.is_active = @is_active';
                request.input('is_active', sql.Bit, filters.is_active);
            }


            if (filters.search) {
                query += ' AND (d.department_name LIKE @search OR d.department_code LIKE @search OR d.description LIKE @search)';
                request.input('search', sql.NVarChar(255), `%${filters.search}%`);
            }

            query += ' ORDER BY d.department_name';

            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error finding Departments:', error);
            return [];
        }
    }

    static async update(departmentId, updateData) {
        try {
            const pool = await poolPromise;

            let setClause = [];
            const request = pool.request().input('department_id', sql.Int, departmentId);

            const allowedFields = [
                'department_name', 'department_code', 'description', 'is_active'
            ];

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    setClause.push(`${field} = @${field}`);

                    if (field === 'department_name') {
                        request.input(field, sql.NVarChar(100), updateData[field]);
                    } else if (field === 'department_code') {
                        request.input(field, sql.NVarChar(10), updateData[field]);
                    } else if (field === 'description') {
                        request.input(field, sql.NVarChar(500), updateData[field]);
                    } else if (field === 'is_active') {
                        request.input(field, sql.Bit, updateData[field]);
                    }
                }
            });

            if (setClause.length === 0) {
                return { success: false, message: 'No valid fields to update' };
            }

            setClause.push('updated_at = GETDATE()');

            const result = await request.query(`
                UPDATE Departments
                SET ${setClause.join(', ')}
                OUTPUT INSERTED.*
                WHERE department_id = @department_id
            `);

            if (result.recordset.length === 0) {
                return { success: false, message: 'Department not found' };
            }

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error updating department:', error);
            if (error.number === 2627) {
                return { success: false, message: 'Department code already exists' };
            }
            return { success: false, message: 'Failed to update department' };
        }
    }

    static async delete(departmentId) {
        try {
            const pool = await poolPromise;

            const employeeCheck = await pool.request()
                .input('department_id', sql.Int, departmentId)
                .query('SELECT COUNT(*) as count FROM Users WHERE department_id = @department_id');

            if (employeeCheck.recordset[0].count > 0) {
                return { success: false, message: 'Cannot delete department with existing employees' };
            }

            const positionCheck = await pool.request()
                .input('department_id', sql.Int, departmentId)
                .query('SELECT COUNT(*) as count FROM Positions WHERE department_id = @department_id');

            if (positionCheck.recordset[0].count > 0) {
                return { success: false, message: 'Cannot delete department with existing positions' };
            }

            const result = await pool.request()
                .input('department_id', sql.Int, departmentId)
                .query('DELETE FROM Departments WHERE department_id = @department_id');

            if (result.rowsAffected[0] === 0) {
                return { success: false, message: 'Department not found' };
            }

            return { success: true, message: 'Department deleted successfully' };
        } catch (error) {
            console.error('Error deleting department:', error);
            return { success: false, message: 'Failed to delete department' };
        }
    }

    static async getDepartmentHierarchy() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT
                    d.department_id,
                    d.department_name,
                    d.department_code,
                    (SELECT COUNT(*) FROM Users u WHERE u.department_id = d.department_id AND u.is_active = 1) as employee_count
                FROM Departments d
                WHERE d.is_active = 1
                ORDER BY d.department_name
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting department hierarchy:', error);
            return [];
        }
    }

    static async getDepartmentEmployees(departmentId, includeSubDepartments = false) {
        try {
            const pool = await poolPromise;

            let query = `
                SELECT u.user_id, u.employee_id, u.first_name, u.last_name, u.email,
                       u.role, u.position, u.is_active,
                       d.department_name
                FROM Users u
                LEFT JOIN Departments d ON u.department_id = d.department_id
                WHERE u.department_id = @department_id
            `;

            const request = pool.request();

            query += ' ORDER BY u.last_name, u.first_name';

            const result = await request
                .input('department_id', sql.Int, departmentId)
                .query(query);

            return result.recordset;
        } catch (error) {
            console.error('Error getting department employees:', error);
            return [];
        }
    }

    static async getDepartmentStatistics(departmentId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('department_id', sql.Int, departmentId)
                .query(`
                    SELECT
                        d.department_name,
                        COUNT(u.user_id) as total_employees,
                        COUNT(CASE WHEN u.is_active = 1 THEN 1 END) as active_employees,
                        COUNT(CASE WHEN u.role = 'Manager' THEN 1 END) as managers,
                        COUNT(CASE WHEN u.role = 'Instructor' THEN 1 END) as instructors,
                        COUNT(CASE WHEN u.role = 'Learner' THEN 1 END) as learners,
                        COUNT(p.position_id) as total_positions,
                        COUNT(CASE WHEN p.is_active = 1 THEN 1 END) as active_positions,
                        0 as total_applicants,
                        0 as avg_test_score
                    FROM Departments d
                    LEFT JOIN Users u ON d.department_id = u.department_id
                    LEFT JOIN Positions p ON d.department_id = p.department_id
                    WHERE d.department_id = @department_id
                    GROUP BY d.department_id, d.department_name
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error getting department statistics:', error);
            return null;
        }
    }

    static async findTopLevelDepartments() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT d.*,
                       (SELECT COUNT(*) FROM Users u WHERE u.department_id = d.department_id AND u.is_active = 1) as employee_count
                FROM Departments d
                WHERE d.is_active = 1
                ORDER BY d.department_name
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding top level Departments:', error);
            return [];
        }
    }

    static async findChildDepartments(parentDepartmentId) {
        try {
            const pool = await poolPromise;

            // Since parent_department_id column doesn't exist, return empty array
            return [];
        } catch (error) {
            console.error('Error finding child Departments:', error);
            return [];
        }
    }

    static async validateDepartmentCode(code, excludeDepartmentId = null) {
        try {
            const pool = await poolPromise;
            const request = pool.request()
                .input('department_code', sql.NVarChar(10), code);

            let query = 'SELECT department_id FROM Departments WHERE department_code = @department_code';

            if (excludeDepartmentId) {
                query += ' AND department_id != @exclude_department_id';
                request.input('exclude_department_id', sql.Int, excludeDepartmentId);
            }

            const result = await request.query(query);
            return result.recordset.length === 0;
        } catch (error) {
            console.error('Error validating department code:', error);
            return false;
        }
    }

    static async getDepartmentBudgetSummary() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT
                    d.department_name,
                    COUNT(u.user_id) as employee_count
                FROM Departments d
                LEFT JOIN Users u ON d.department_id = u.department_id AND u.is_active = 1
                WHERE d.is_active = 1
                GROUP BY d.department_id, d.department_name
                ORDER BY d.department_name
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting department budget summary:', error);
            return [];
        }
    }

    // Removed updateManager method as manager_id column doesn't exist in schema
}

module.exports = Department;