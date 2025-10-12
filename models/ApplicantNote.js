const { poolPromise, sql } = require('../config/database');

class ApplicantNote {
    constructor(data) {
        this.note_id = data.note_id;
        this.applicant_id = data.applicant_id;
        this.created_by = data.created_by;
        this.note_text = data.note_text;
        this.note_type = data.note_type;
        this.created_at = data.created_at;
    }

    // Create new note
    static async create(noteData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('applicantId', sql.Int, noteData.applicant_id)
                .input('createdBy', sql.Int, noteData.created_by)
                .input('noteText', sql.NVarChar(sql.MAX), noteData.note_text)
                .input('noteType', sql.NVarChar(20), noteData.note_type || 'GENERAL')
                .query(`
                    INSERT INTO ApplicantNotes (
                        applicant_id, created_by, note_text, note_type
                    )
                    OUTPUT INSERTED.note_id, INSERTED.created_at
                    VALUES (
                        @applicantId, @createdBy, @noteText, @noteType
                    )
                `);

            return {
                success: true,
                note_id: result.recordset[0].note_id,
                created_at: result.recordset[0].created_at,
                message: 'Note created successfully'
            };
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    }

    // Get notes for an applicant
    static async getByApplicant(applicantId, noteType = null) {
        try {
            const pool = await poolPromise;

            let whereClause = 'WHERE an.applicant_id = @applicantId';
            const request = pool.request()
                .input('applicantId', sql.Int, applicantId);

            if (noteType) {
                whereClause += ' AND an.note_type = @noteType';
                request.input('noteType', sql.NVarChar(20), noteType);
            }

            const result = await request.query(`
                SELECT
                    an.*,
                    CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
                    u.employee_id as created_by_employee_id
                FROM ApplicantNotes an
                JOIN Users u ON an.created_by = u.user_id
                ${whereClause}
                ORDER BY an.created_at DESC
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting applicant notes:', error);
            throw error;
        }
    }

    // Get all notes (for HR dashboard)
    static async getAll(filters = {}, page = 1, limit = 20) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE 1=1';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            if (filters.applicant_id) {
                whereClause += ' AND an.applicant_id = @applicantId';
                request.input('applicantId', sql.Int, filters.applicant_id);
            }
            if (filters.note_type) {
                whereClause += ' AND an.note_type = @noteType';
                request.input('noteType', sql.NVarChar(20), filters.note_type);
            }
            if (filters.created_by) {
                whereClause += ' AND an.created_by = @createdBy';
                request.input('createdBy', sql.Int, filters.created_by);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM ApplicantNotes an
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT
                    an.*,
                    CONCAT(app.first_name, ' ', app.last_name) as applicant_name,
                    app.id_card_number,
                    app.applied_position,
                    CONCAT(hr.first_name, ' ', hr.last_name) as created_by_name
                FROM ApplicantNotes an
                JOIN Users app ON an.applicant_id = app.user_id
                JOIN Users hr ON an.created_by = hr.user_id
                ${whereClause}
                ORDER BY an.created_at DESC
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
            console.error('Error getting all notes:', error);
            throw error;
        }
    }

    // Update note
    static async update(noteId, noteText) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('noteId', sql.Int, noteId)
                .input('noteText', sql.NVarChar(sql.MAX), noteText)
                .query(`
                    UPDATE ApplicantNotes
                    SET note_text = @noteText,
                        updated_at = GETDATE()
                    WHERE note_id = @noteId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Note updated successfully' : 'Note not found'
            };
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    }

    // Delete note
    static async delete(noteId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('noteId', sql.Int, noteId)
                .query(`
                    DELETE FROM ApplicantNotes
                    WHERE note_id = @noteId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Note deleted successfully' : 'Note not found'
            };
        } catch (error) {
            console.error('Error deleting note:', error);
            throw error;
        }
    }

    // Get note by ID
    static async findById(noteId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('noteId', sql.Int, noteId)
                .query(`
                    SELECT
                        an.*,
                        CONCAT(app.first_name, ' ', app.last_name) as applicant_name,
                        app.id_card_number,
                        CONCAT(hr.first_name, ' ', hr.last_name) as created_by_name
                    FROM ApplicantNotes an
                    JOIN Users app ON an.applicant_id = app.user_id
                    JOIN Users hr ON an.created_by = hr.user_id
                    WHERE an.note_id = @noteId
                `);

            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (error) {
            console.error('Error finding note:', error);
            throw error;
        }
    }

    // Get recent notes (for HR dashboard widget)
    static async getRecent(limit = 5) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit)
                        an.*,
                        CONCAT(app.first_name, ' ', app.last_name) as applicant_name,
                        app.id_card_number,
                        app.applied_position,
                        CONCAT(hr.first_name, ' ', hr.last_name) as created_by_name
                    FROM ApplicantNotes an
                    JOIN Users app ON an.applicant_id = app.user_id
                    JOIN Users hr ON an.created_by = hr.user_id
                    ORDER BY an.created_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting recent notes:', error);
            throw error;
        }
    }

    // Get statistics by note type
    static async getStatistics(applicantId = null) {
        try {
            const pool = await poolPromise;

            let whereClause = '';
            const request = pool.request();

            if (applicantId) {
                whereClause = 'WHERE applicant_id = @applicantId';
                request.input('applicantId', sql.Int, applicantId);
            }

            const result = await request.query(`
                SELECT
                    note_type,
                    COUNT(*) as count
                FROM ApplicantNotes
                ${whereClause}
                GROUP BY note_type
                ORDER BY count DESC
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting note statistics:', error);
            throw error;
        }
    }
}

module.exports = ApplicantNote;
