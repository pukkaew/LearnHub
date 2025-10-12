const { poolPromise, sql } = require('../config/database');

class ApplicantTestAssignment {
    constructor(data) {
        this.assignment_id = data.assignment_id;
        this.applicant_id = data.applicant_id;
        this.test_id = data.test_id;
        this.assigned_by = data.assigned_by;
        this.assigned_date = data.assigned_date;
        this.due_date = data.due_date;
        this.status = data.status;
        this.is_active = data.is_active;
    }

    // Create new assignment
    static async create(assignmentData) {
        try {
            const pool = await poolPromise;

            // Check if assignment already exists
            const checkExists = await pool.request()
                .input('applicantId', sql.Int, assignmentData.applicant_id)
                .input('testId', sql.Int, assignmentData.test_id)
                .query(`
                    SELECT assignment_id
                    FROM ApplicantTestAssignments
                    WHERE applicant_id = @applicantId AND test_id = @testId
                `);

            if (checkExists.recordset.length > 0) {
                return {
                    success: false,
                    message: 'Test already assigned to this applicant',
                    assignment_id: checkExists.recordset[0].assignment_id
                };
            }

            // Create new assignment
            const result = await pool.request()
                .input('applicantId', sql.Int, assignmentData.applicant_id)
                .input('testId', sql.Int, assignmentData.test_id)
                .input('assignedBy', sql.Int, assignmentData.assigned_by)
                .input('dueDate', sql.DateTime2, assignmentData.due_date || null)
                .query(`
                    INSERT INTO ApplicantTestAssignments (
                        applicant_id, test_id, assigned_by, due_date, status, is_active
                    )
                    OUTPUT INSERTED.assignment_id
                    VALUES (
                        @applicantId, @testId, @assignedBy, @dueDate, 'PENDING', 1
                    )
                `);

            return {
                success: true,
                assignment_id: result.recordset[0].assignment_id,
                message: 'Test assigned successfully'
            };
        } catch (error) {
            console.error('Error creating assignment:', error);
            throw error;
        }
    }

    // Bulk assign tests to multiple applicants
    static async bulkAssign(applicantIds, testIds, assignedBy, dueDate = null) {
        try {
            const pool = await poolPromise;
            const results = [];

            for (const applicantId of applicantIds) {
                for (const testId of testIds) {
                    const result = await this.create({
                        applicant_id: applicantId,
                        test_id: testId,
                        assigned_by: assignedBy,
                        due_date: dueDate
                    });
                    results.push(result);
                }
            }

            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            return {
                success: true,
                total: results.length,
                assigned: successCount,
                skipped: failCount,
                results
            };
        } catch (error) {
            console.error('Error in bulk assign:', error);
            throw error;
        }
    }

    // Get assignments for an applicant
    static async getByApplicant(applicantId, includeTestDetails = true) {
        try {
            const pool = await poolPromise;

            let query = `
                SELECT
                    ata.*,
                    t.title as test_title,
                    t.description as test_description,
                    t.time_limit,
                    t.total_marks,
                    t.passing_marks,
                    CONCAT(u.first_name, ' ', u.last_name) as assigned_by_name,
                    atr.result_id,
                    atr.score,
                    atr.percentage,
                    atr.passed,
                    atr.completed_at
                FROM ApplicantTestAssignments ata
                LEFT JOIN Tests t ON ata.test_id = t.test_id
                LEFT JOIN Users u ON ata.assigned_by = u.user_id
                LEFT JOIN ApplicantTestResults atr ON ata.assignment_id = atr.assignment_id
                WHERE ata.applicant_id = @applicantId
                    AND ata.is_active = 1
                ORDER BY
                    CASE ata.status
                        WHEN 'IN_PROGRESS' THEN 1
                        WHEN 'PENDING' THEN 2
                        WHEN 'COMPLETED' THEN 3
                        WHEN 'EXPIRED' THEN 4
                    END,
                    ata.due_date ASC
            `;

            const result = await pool.request()
                .input('applicantId', sql.Int, applicantId)
                .query(query);

            return result.recordset;
        } catch (error) {
            console.error('Error getting applicant assignments:', error);
            throw error;
        }
    }

    // Get all assignments (for HR)
    static async getAll(filters = {}, page = 1, limit = 20) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE ata.is_active = 1';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.applicant_id) {
                whereClause += ' AND ata.applicant_id = @applicantId';
                request.input('applicantId', sql.Int, filters.applicant_id);
            }
            if (filters.test_id) {
                whereClause += ' AND ata.test_id = @testId';
                request.input('testId', sql.Int, filters.test_id);
            }
            if (filters.status) {
                whereClause += ' AND ata.status = @status';
                request.input('status', sql.NVarChar(20), filters.status);
            }
            if (filters.position) {
                whereClause += ' AND app.applied_position = @position';
                request.input('position', sql.NVarChar(100), filters.position);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM ApplicantTestAssignments ata
                LEFT JOIN Users app ON ata.applicant_id = app.user_id
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT
                    ata.*,
                    CONCAT(app.first_name, ' ', app.last_name) as applicant_name,
                    app.id_card_number,
                    app.applied_position,
                    t.title as test_title,
                    CONCAT(hr.first_name, ' ', hr.last_name) as assigned_by_name,
                    atr.score,
                    atr.percentage,
                    atr.passed,
                    atr.completed_at
                FROM ApplicantTestAssignments ata
                LEFT JOIN Users app ON ata.applicant_id = app.user_id
                LEFT JOIN Tests t ON ata.test_id = t.test_id
                LEFT JOIN Users hr ON ata.assigned_by = hr.user_id
                LEFT JOIN ApplicantTestResults atr ON ata.assignment_id = atr.assignment_id
                ${whereClause}
                ORDER BY ata.assigned_date DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

            return {
                data: result.recordset,
                total: countResult.recordset[0].total,
                page: page,
                totalPages: Math.ceil(countResult.recordset[0].total / limit)
            };
        } catch (error) {
            console.error('Error getting all assignments:', error);
            throw error;
        }
    }

    // Update assignment status
    static async updateStatus(assignmentId, status) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('assignmentId', sql.Int, assignmentId)
                .input('status', sql.NVarChar(20), status)
                .query(`
                    UPDATE ApplicantTestAssignments
                    SET status = @status,
                        updated_at = GETDATE()
                    WHERE assignment_id = @assignmentId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Status updated' : 'Assignment not found'
            };
        } catch (error) {
            console.error('Error updating assignment status:', error);
            throw error;
        }
    }

    // Count pending tests for an applicant
    static async countPending(applicantId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('applicantId', sql.Int, applicantId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM ApplicantTestAssignments
                    WHERE applicant_id = @applicantId
                        AND status IN ('PENDING', 'IN_PROGRESS')
                        AND is_active = 1
                `);

            return result.recordset[0].count;
        } catch (error) {
            console.error('Error counting pending tests:', error);
            throw error;
        }
    }

    // Delete assignment (soft delete)
    static async delete(assignmentId) {
        try {
            const pool = await poolPromise;

            // Check if test has been completed
            const checkResult = await pool.request()
                .input('assignmentId', sql.Int, assignmentId)
                .query(`
                    SELECT atr.result_id
                    FROM ApplicantTestAssignments ata
                    LEFT JOIN ApplicantTestResults atr ON ata.assignment_id = atr.assignment_id
                    WHERE ata.assignment_id = @assignmentId
                `);

            if (checkResult.recordset.length > 0 && checkResult.recordset[0].result_id) {
                return {
                    success: false,
                    message: 'Cannot delete assignment with completed test'
                };
            }

            const result = await pool.request()
                .input('assignmentId', sql.Int, assignmentId)
                .query(`
                    UPDATE ApplicantTestAssignments
                    SET is_active = 0,
                        updated_at = GETDATE()
                    WHERE assignment_id = @assignmentId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Assignment deleted' : 'Assignment not found'
            };
        } catch (error) {
            console.error('Error deleting assignment:', error);
            throw error;
        }
    }

    // Get assignment by ID
    static async findById(assignmentId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('assignmentId', sql.Int, assignmentId)
                .query(`
                    SELECT
                        ata.*,
                        t.title as test_title,
                        t.description as test_description,
                        t.time_limit,
                        t.total_marks,
                        t.passing_marks,
                        CONCAT(app.first_name, ' ', app.last_name) as applicant_name,
                        app.id_card_number,
                        app.applied_position,
                        CONCAT(hr.first_name, ' ', hr.last_name) as assigned_by_name
                    FROM ApplicantTestAssignments ata
                    LEFT JOIN Tests t ON ata.test_id = t.test_id
                    LEFT JOIN Users app ON ata.applicant_id = app.user_id
                    LEFT JOIN Users hr ON ata.assigned_by = hr.user_id
                    WHERE ata.assignment_id = @assignmentId
                `);

            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (error) {
            console.error('Error finding assignment:', error);
            throw error;
        }
    }

    // Check if test is assigned to applicant
    static async isAssigned(applicantId, testId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('applicantId', sql.Int, applicantId)
                .input('testId', sql.Int, testId)
                .query(`
                    SELECT assignment_id, status
                    FROM ApplicantTestAssignments
                    WHERE applicant_id = @applicantId
                        AND test_id = @testId
                        AND is_active = 1
                `);

            if (result.recordset.length === 0) {
                return { assigned: false };
            }

            return {
                assigned: true,
                assignment_id: result.recordset[0].assignment_id,
                status: result.recordset[0].status
            };
        } catch (error) {
            console.error('Error checking assignment:', error);
            throw error;
        }
    }

    // Get statistics for HR dashboard
    static async getStatistics(filters = {}) {
        try {
            const pool = await poolPromise;

            let whereClause = 'WHERE ata.is_active = 1';
            const request = pool.request();

            if (filters.position) {
                whereClause += ' AND app.applied_position = @position';
                request.input('position', sql.NVarChar(100), filters.position);
            }

            const result = await request.query(`
                SELECT
                    COUNT(*) as total_assignments,
                    SUM(CASE WHEN ata.status = 'PENDING' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN ata.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN ata.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN ata.status = 'EXPIRED' THEN 1 ELSE 0 END) as expired,
                    SUM(CASE WHEN atr.passed = 1 THEN 1 ELSE 0 END) as passed,
                    SUM(CASE WHEN atr.passed = 0 AND atr.result_id IS NOT NULL THEN 1 ELSE 0 END) as failed,
                    AVG(CASE WHEN atr.percentage IS NOT NULL THEN atr.percentage END) as avg_score
                FROM ApplicantTestAssignments ata
                LEFT JOIN Users app ON ata.applicant_id = app.user_id
                LEFT JOIN ApplicantTestResults atr ON ata.assignment_id = atr.assignment_id
                ${whereClause}
            `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting statistics:', error);
            throw error;
        }
    }
}

module.exports = ApplicantTestAssignment;
