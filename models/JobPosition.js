const { poolPromise, sql } = require('../config/database');

class JobPosition {
    static async create(positionData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('position_name', sql.NVarChar(255), positionData.position_name)
                .input('position_code', sql.VarChar(50), positionData.position_code)
                .input('department_id', sql.Int, positionData.department_id)
                .input('description', sql.NText, positionData.description)
                .input('responsibilities', sql.NText, positionData.responsibilities)
                .input('qualifications', sql.NText, positionData.qualifications)
                .input('skills_required', sql.NText, positionData.skills_required)
                .input('experience_required', sql.Int, positionData.experience_required || 0)
                .input('salary_min', sql.Decimal(10, 2), positionData.salary_min)
                .input('salary_max', sql.Decimal(10, 2), positionData.salary_max)
                .input('employment_type', sql.VarChar(50), positionData.employment_type || 'Full-time')
                .input('location', sql.NVarChar(255), positionData.location)
                .input('is_active', sql.Bit, positionData.is_active !== undefined ? positionData.is_active : true)
                .input('created_by', sql.Int, positionData.created_by)
                .query(`
                    INSERT INTO JobPositions
                    (position_name, position_code, department_id, description, responsibilities,
                     qualifications, skills_required, experience_required, salary_min, salary_max,
                     employment_type, location, is_active, created_by)
                    OUTPUT INSERTED.*
                    VALUES
                    (@position_name, @position_code, @department_id, @description, @responsibilities,
                     @qualifications, @skills_required, @experience_required, @salary_min, @salary_max,
                     @employment_type, @location, @is_active, @created_by)
                `);

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error creating job position:', error);
            if (error.number === 2627) {
                return { success: false, message: 'Position code already exists' };
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
                    SELECT jp.*, d.name as department_name,
                           u.first_name + ' ' + u.last_name as created_by_name
                    FROM JobPositions jp
                    LEFT JOIN Departments d ON jp.department_id = d.department_id
                    LEFT JOIN Users u ON jp.created_by = u.user_id
                    WHERE jp.position_id = @position_id
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
                SELECT jp.*, d.name as department_name,
                       u.first_name + ' ' + u.last_name as created_by_name,
                       (SELECT COUNT(*) FROM Applicants a WHERE a.position_id = jp.position_id) as applicant_count
                FROM JobPositions jp
                LEFT JOIN Departments d ON jp.department_id = d.department_id
                LEFT JOIN Users u ON jp.created_by = u.user_id
                WHERE 1=1
            `;

            const request = pool.request();

            if (filters.department_id) {
                query += ' AND jp.department_id = @department_id';
                request.input('department_id', sql.Int, filters.department_id);
            }

            if (filters.is_active !== undefined) {
                query += ' AND jp.is_active = @is_active';
                request.input('is_active', sql.Bit, filters.is_active);
            }

            if (filters.employment_type) {
                query += ' AND jp.employment_type = @employment_type';
                request.input('employment_type', sql.VarChar(50), filters.employment_type);
            }

            if (filters.search) {
                query += ' AND (jp.position_name LIKE @search OR jp.position_code LIKE @search OR jp.description LIKE @search)';
                request.input('search', sql.NVarChar(255), `%${filters.search}%`);
            }

            query += ' ORDER BY jp.created_at DESC';

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
                'position_name', 'position_code', 'department_id', 'description',
                'responsibilities', 'qualifications', 'skills_required',
                'experience_required', 'salary_min', 'salary_max',
                'employment_type', 'location', 'is_active'
            ];

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    setClause.push(`${field} = @${field}`);

                    if (field === 'position_name' || field === 'location') {
                        request.input(field, sql.NVarChar(255), updateData[field]);
                    } else if (field === 'position_code' || field === 'employment_type') {
                        request.input(field, sql.VarChar(50), updateData[field]);
                    } else if (field === 'department_id') {
                        request.input(field, sql.Int, updateData[field]);
                    } else if (field === 'description' || field === 'responsibilities' ||
                               field === 'qualifications' || field === 'skills_required') {
                        request.input(field, sql.NText, updateData[field]);
                    } else if (field === 'experience_required') {
                        request.input(field, sql.Int, updateData[field]);
                    } else if (field === 'salary_min' || field === 'salary_max') {
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
                UPDATE JobPositions
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
            if (error.number === 2627) {
                return { success: false, message: 'Position code already exists' };
            }
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
                .query('DELETE FROM JobPositions WHERE position_id = @position_id');

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
                    UPDATE JobPositions
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
                        jp.position_name,
                        COUNT(a.applicant_id) as total_Applicants,
                        COUNT(CASE WHEN a.status = 'Passed' THEN 1 END) as passed_Applicants,
                        COUNT(CASE WHEN a.status = 'Failed' THEN 1 END) as failed_Applicants,
                        COUNT(CASE WHEN a.status = 'Pending' THEN 1 END) as pending_Applicants,
                        AVG(CASE WHEN ta.total_score IS NOT NULL THEN ta.total_score END) as avg_test_score,
                        MAX(ta.total_score) as highest_score,
                        MIN(ta.total_score) as lowest_score
                    FROM JobPositions jp
                    LEFT JOIN Applicants a ON jp.position_id = a.position_id
                    LEFT JOIN test_attempts ta ON a.applicant_id = ta.applicant_id
                    WHERE jp.position_id = @position_id
                    GROUP BY jp.position_id, jp.position_name
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
                    SELECT jp.*, d.name as department_name
                    FROM JobPositions jp
                    LEFT JOIN Departments d ON jp.department_id = d.department_id
                    WHERE jp.is_active = 1
                    ORDER BY jp.position_name
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
                    SELECT jp.*,
                           COUNT(a.applicant_id) as applicant_count
                    FROM JobPositions jp
                    LEFT JOIN Applicants a ON jp.position_id = a.position_id
                    WHERE jp.department_id = @department_id
                    GROUP BY jp.position_id, jp.position_name, jp.position_code,
                             jp.department_id, jp.description, jp.responsibilities,
                             jp.qualifications, jp.skills_required, jp.experience_required,
                             jp.salary_min, jp.salary_max, jp.employment_type,
                             jp.location, jp.is_active, jp.created_by, jp.created_at, jp.updated_at
                    ORDER BY jp.position_name
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding positions by department:', error);
            return [];
        }
    }

    static async validatePositionCode(positionCode, excludePositionId = null) {
        try {
            const pool = await poolPromise;
            const request = pool.request()
                .input('position_code', sql.VarChar(50), positionCode);

            let query = 'SELECT position_id FROM JobPositions WHERE position_code = @position_code';

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
}

module.exports = JobPosition;