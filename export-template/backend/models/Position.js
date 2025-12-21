const { poolPromise, sql } = require('../config/database');

class Position {
    constructor(data) {
        this.position_id = data.position_id;
        this.position_name = data.position_name;
        this.position_name_en = data.position_name_en;
        this.department_id = data.department_id;
        this.description = data.description;
        this.level = data.level;
        this.position_type = data.position_type;
        this.is_active = data.is_active;
    }

    static async create(positionData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('position_name', sql.NVarChar(100), positionData.position_name || positionData.title)
                .input('position_name_en', sql.NVarChar(255), positionData.position_name_en || null)
                .input('department_id', sql.Int, positionData.department_id || null)
                .input('description', sql.NVarChar(255), positionData.description || null)
                .input('level', sql.Int, positionData.level || null)
                .input('position_type', sql.NVarChar(20), positionData.position_type || 'EMPLOYEE')
                .query(`
                    INSERT INTO Positions
                    (position_name, position_name_en, department_id, description, level, position_type, is_active)
                    OUTPUT INSERTED.*
                    VALUES
                    (@position_name, @position_name_en, @department_id, @description, @level, @position_type, 1)
                `);

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error creating position:', error);
            if (error.number === 2627) {
                return { success: false, message: 'Position already exists' };
            }
            return { success: false, message: 'Failed to create position' };
        }
    }

    static async findById(positionId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query(`
                    SELECT p.*,
                           d.department_name,
                           (SELECT COUNT(*) FROM Users WHERE position_id = p.position_id AND is_active = 1) as employee_count
                    FROM Positions p
                    LEFT JOIN Departments d ON p.department_id = d.department_id
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
                       d.department_name,
                       (SELECT COUNT(*) FROM Users u WHERE u.position_id = p.position_id AND u.is_active = 1) as employee_count
                FROM Positions p
                LEFT JOIN Departments d ON p.department_id = d.department_id
                WHERE 1=1
            `;

            const request = pool.request();

            if (filters.department_id) {
                query += ' AND p.department_id = @department_id';
                request.input('department_id', sql.Int, filters.department_id);
            }

            if (filters.position_type) {
                query += ' AND p.position_type = @position_type';
                request.input('position_type', sql.NVarChar(20), filters.position_type);
            }

            if (filters.is_active !== undefined) {
                query += ' AND p.is_active = @is_active';
                request.input('is_active', sql.Bit, filters.is_active);
            }

            if (filters.search) {
                query += ' AND (p.position_name LIKE @search OR p.description LIKE @search)';
                request.input('search', sql.NVarChar(255), `%${filters.search}%`);
            }

            query += ' ORDER BY d.department_name, p.level, p.position_name';

            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error finding positions:', error);
            return [];
        }
    }

    static async update(positionId, updateData) {
        try {
            const pool = await poolPromise;

            let setClause = [];
            const request = pool.request().input('position_id', sql.Int, positionId);

            const allowedFields = [
                'position_name', 'position_name_en', 'department_id',
                'description', 'level', 'position_type', 'is_active'
            ];

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    setClause.push(`${field} = @${field}`);

                    if (field === 'position_name' || field === 'position_name_en') {
                        request.input(field, sql.NVarChar(255), updateData[field]);
                    } else if (field === 'description') {
                        request.input(field, sql.NVarChar(255), updateData[field]);
                    } else if (field === 'position_type') {
                        request.input(field, sql.NVarChar(20), updateData[field]);
                    } else if (field === 'level' || field === 'department_id') {
                        request.input(field, sql.Int, updateData[field]);
                    } else if (field === 'is_active') {
                        request.input(field, sql.Bit, updateData[field]);
                    }
                }
            });

            if (setClause.length === 0) {
                return { success: false, message: 'No valid fields to update' };
            }

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
            return { success: false, message: 'Failed to update position' };
        }
    }

    static async delete(positionId) {
        try {
            const pool = await poolPromise;

            // Check if there are employees in this position
            const employeeCheck = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query('SELECT COUNT(*) as count FROM Users WHERE position_id = @position_id AND is_active = 1');

            if (employeeCheck.recordset[0].count > 0) {
                return {
                    success: false,
                    message: 'Cannot delete position with existing employees'
                };
            }

            const result = await pool.request()
                .input('position_id', sql.Int, positionId)
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

    static async findByDepartment(departmentId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('department_id', sql.Int, departmentId)
                .query(`
                    SELECT p.*,
                           (SELECT COUNT(*) FROM Users u WHERE u.position_id = p.position_id AND u.is_active = 1) as employee_count
                    FROM Positions p
                    WHERE p.department_id = @department_id AND p.is_active = 1
                    ORDER BY p.level, p.position_name
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding positions by department:', error);
            return [];
        }
    }

    static async findActivePositions() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT p.position_id,
                       p.position_name as title,
                       p.position_type,
                       d.department_name
                FROM Positions p
                LEFT JOIN Departments d ON p.department_id = d.department_id
                WHERE p.is_active = 1
                ORDER BY p.position_type, d.department_name, p.position_name
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding active positions:', error);
            return [];
        }
    }

    static async getStatistics() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT
                    COUNT(*) as total_positions,
                    SUM(CASE WHEN position_type = 'EMPLOYEE' THEN 1 ELSE 0 END) as employee_positions,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_positions,
                    (SELECT COUNT(*) FROM Users WHERE position_id IS NOT NULL AND is_active = 1) as total_employees
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
