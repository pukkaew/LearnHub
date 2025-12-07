const { poolPromise, sql } = require('../config/database');

class JobPosition {
    static async create(positionData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('position_name', sql.NVarChar(255), positionData.position_name)
                .input('department_id', sql.Int, positionData.department_id)
                .input('description', sql.NText, positionData.description)
                .input('position_type', sql.NVarChar(50), positionData.position_type || null)
                .input('level', sql.NVarChar(50), positionData.level || null)
                .input('min_salary', sql.Decimal(10, 2), positionData.min_salary || positionData.salary_min)
                .input('max_salary', sql.Decimal(10, 2), positionData.max_salary || positionData.salary_max)
                .input('is_active', sql.Bit, positionData.is_active !== undefined ? positionData.is_active : true)
                .query(`
                    INSERT INTO positions
                    (position_name, department_id, description, position_type, level,
                     min_salary, max_salary, is_active, created_at)
                    OUTPUT INSERTED.*
                    VALUES
                    (@position_name, @department_id, @description, @position_type, @level,
                     @min_salary, @max_salary, @is_active, GETDATE())
                `);

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error creating job position:', error);
            if (error.number === 2627) {
                return { success: false, message: 'Position already exists' };
            }
            return { success: false, message: 'Failed to create job position' };
        }
    }

    static async findById(positionId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query(`
                    SELECT p.*, d.department_name
                    FROM positions p
                    LEFT JOIN Departments d ON p.department_id = d.department_id
                    WHERE p.position_id = @position_id
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error finding job position:', error);
            return null;
        }
    }

    static async findAll(filters = {}) {
        try {
            const pool = await poolPromise;
            let query = `
                SELECT p.*, d.department_name
                FROM positions p
                LEFT JOIN Departments d ON p.department_id = d.department_id
                WHERE 1=1
            `;

            const request = pool.request();

            if (filters.department_id) {
                query += ' AND p.department_id = @department_id';
                request.input('department_id', sql.Int, filters.department_id);
            }

            if (filters.is_active !== undefined) {
                query += ' AND p.is_active = @is_active';
                request.input('is_active', sql.Bit, filters.is_active);
            }

            if (filters.position_type) {
                query += ' AND p.position_type = @position_type';
                request.input('position_type', sql.NVarChar(50), filters.position_type);
            }

            if (filters.search) {
                query += ' AND (p.position_name LIKE @search OR p.description LIKE @search)';
                request.input('search', sql.NVarChar(255), `%${filters.search}%`);
            }

            query += ' ORDER BY p.created_at DESC';

            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error finding job positions:', error);
            return [];
        }
    }

    static async update(positionId, updateData) {
        try {
            const pool = await poolPromise;

            let setClause = [];
            const request = pool.request().input('position_id', sql.Int, positionId);

            const allowedFields = [
                'position_name', 'department_id', 'description',
                'position_type', 'level', 'min_salary', 'max_salary', 'is_active'
            ];

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    setClause.push(`${field} = @${field}`);

                    if (field === 'position_name') {
                        request.input(field, sql.NVarChar(255), updateData[field]);
                    } else if (field === 'position_type' || field === 'level') {
                        request.input(field, sql.NVarChar(50), updateData[field]);
                    } else if (field === 'department_id') {
                        request.input(field, sql.Int, updateData[field]);
                    } else if (field === 'description') {
                        request.input(field, sql.NText, updateData[field]);
                    } else if (field === 'min_salary' || field === 'max_salary') {
                        request.input(field, sql.Decimal(10, 2), updateData[field]);
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
                UPDATE positions
                SET ${setClause.join(', ')}
                OUTPUT INSERTED.*
                WHERE position_id = @position_id
            `);

            if (result.recordset.length === 0) {
                return { success: false, message: 'Job position not found' };
            }

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error updating job position:', error);
            return { success: false, message: 'Failed to update job position' };
        }
    }

    static async delete(positionId) {
        try {
            const pool = await poolPromise;

            const applicantCheck = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query('SELECT COUNT(*) as count FROM Applicants WHERE position_id = @position_id');

            if (applicantCheck.recordset[0].count > 0) {
                return { success: false, message: 'Cannot delete position with existing Applicants' };
            }

            const result = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query('DELETE FROM positions WHERE position_id = @position_id');

            if (result.rowsAffected[0] === 0) {
                return { success: false, message: 'Job position not found' };
            }

            return { success: true, message: 'Job position deleted successfully' };
        } catch (error) {
            console.error('Error deleting job position:', error);
            return { success: false, message: 'Failed to delete job position' };
        }
    }

    static async deactivate(positionId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query(`
                    UPDATE positions
                    SET is_active = 0, updated_at = GETDATE()
                    OUTPUT INSERTED.*
                    WHERE position_id = @position_id
                `);

            if (result.recordset.length === 0) {
                return { success: false, message: 'Job position not found' };
            }

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error deactivating job position:', error);
            return { success: false, message: 'Failed to deactivate job position' };
        }
    }

    static async getPositionStatistics(positionId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('position_id', sql.Int, positionId)
                .query(`
                    SELECT
                        p.position_name,
                        COUNT(a.applicant_id) as total_Applicants,
                        COUNT(CASE WHEN a.status = 'Passed' THEN 1 END) as passed_Applicants,
                        COUNT(CASE WHEN a.status = 'Failed' THEN 1 END) as failed_Applicants,
                        COUNT(CASE WHEN a.status = 'Pending' THEN 1 END) as pending_Applicants,
                        AVG(CASE WHEN ta.total_score IS NOT NULL THEN ta.total_score END) as avg_test_score,
                        MAX(ta.total_score) as highest_score,
                        MIN(ta.total_score) as lowest_score
                    FROM positions p
                    LEFT JOIN Applicants a ON p.position_id = a.position_id
                    LEFT JOIN test_attempts ta ON a.applicant_id = ta.applicant_id
                    WHERE p.position_id = @position_id
                    GROUP BY p.position_id, p.position_name
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error getting position statistics:', error);
            return null;
        }
    }

    static async findActivePositions() {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .query(`
                    SELECT p.*, d.department_name
                    FROM positions p
                    LEFT JOIN Departments d ON p.department_id = d.department_id
                    WHERE p.is_active = 1
                    ORDER BY p.position_name
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding active positions:', error);
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
                           COUNT(a.applicant_id) as applicant_count
                    FROM positions p
                    LEFT JOIN Applicants a ON p.position_id = a.position_id
                    WHERE p.department_id = @department_id
                    GROUP BY p.position_id, p.position_name,
                             p.department_id, p.description, p.position_type, p.level,
                             p.min_salary, p.max_salary, p.is_active, p.created_at, p.updated_at
                    ORDER BY p.position_name
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding positions by department:', error);
            return [];
        }
    }

    static async validatePositionName(positionName, excludePositionId = null) {
        try {
            const pool = await poolPromise;
            const request = pool.request()
                .input('position_name', sql.NVarChar(255), positionName);

            let query = 'SELECT position_id FROM positions WHERE position_name = @position_name';

            if (excludePositionId) {
                query += ' AND position_id != @exclude_position_id';
                request.input('exclude_position_id', sql.Int, excludePositionId);
            }

            const result = await request.query(query);
            return result.recordset.length === 0;
        } catch (error) {
            console.error('Error validating position name:', error);
            return false;
        }
    }
}

module.exports = JobPosition;