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
                        COUNT(p.position_id) as total_positions
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
}

module.exports = Department;
