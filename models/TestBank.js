const { poolPromise, sql } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class TestBank {
    constructor(data) {
        this.bank_id = data.bank_id;
        this.bank_name = data.bank_name;
        this.category_id = data.category_id;
        this.owner_id = data.owner_id;
        this.sharing_level = data.sharing_level;
        this.is_active = data.is_active;
    }

    // Create new test bank
    static async create(bankData) {
        try {
            const pool = await poolPromise;
            const bankId = uuidv4();

            const result = await pool.request()
                .input('bankId', sql.Int, bankId)
                .input('bankName', sql.NVarChar(200), bankData.bank_name)
                .input('categoryId', sql.Int, bankData.category_id || null)
                .input('ownerId', sql.Int, bankData.owner_id)
                .input('sharingLevel', sql.NVarChar(20), bankData.sharing_level || 'PRIVATE')
                .query(`
                    INSERT INTO TestBanks (
                        bank_id, bank_name, category_id, owner_id,
                        sharing_level, is_active, created_date
                    ) VALUES (
                        @bankId, @bankName, @categoryId, @ownerId,
                        @sharingLevel, 1, GETDATE()
                    )
                `);

            return {
                success: true,
                bankId: bankId
            };
        } catch (error) {
            throw new Error(`Error creating test bank: ${error.message}`);
        }
    }

    // Find test bank by ID
    static async findById(bankId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('bankId', sql.Int, bankId)
                .query(`
                    SELECT tb.*,
                           cc.category_name,
                           CONCAT(u.first_name, ' ', u.last_name) as owner_name,
                           u.department_id as owner_department,
                           (SELECT COUNT(*) FROM Questions WHERE bank_id = tb.bank_id AND is_active = 1) as question_count,
                           (SELECT COUNT(DISTINCT question_type) FROM Questions WHERE bank_id = tb.bank_id AND is_active = 1) as question_types,
                           (SELECT AVG(CAST(difficulty_level AS FLOAT)) FROM Questions WHERE bank_id = tb.bank_id AND is_active = 1) as avg_difficulty
                    FROM TestBanks tb
                    LEFT JOIN CourseCategories cc ON tb.category_id = cc.category_id
                    LEFT JOIN Users u ON tb.owner_id = u.user_id
                    WHERE tb.bank_id = @bankId
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error finding test bank: ${error.message}`);
        }
    }

    // Get all test banks with access control
    static async findAll(userId, page = 1, limit = 20, filters = {}) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            // Get user's department for department-level sharing
            const userResult = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT department_id, role_id
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.role_id
                    WHERE u.user_id = @userId
                `);

            const user = userResult.recordset[0];
            const isAdmin = user && user.role_id; // Will need to check role name

            let whereClause = `WHERE tb.is_active = 1 AND (
                tb.owner_id = @userId OR
                tb.sharing_level = 'PUBLIC' OR
                (tb.sharing_level = 'DEPARTMENT' AND EXISTS (
                    SELECT 1 FROM Users u2
                    WHERE u2.user_id = tb.owner_id
                    AND u2.department_id = @userDepartment
                ))
            )`;

            const request = pool.request()
                .input('userId', sql.Int, userId)
                .input('userDepartment', sql.Int, user?.department_id)
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.category_id) {
                whereClause += ' AND tb.category_id = @categoryId';
                request.input('categoryId', sql.Int, filters.category_id);
            }
            if (filters.sharing_level) {
                whereClause += ' AND tb.sharing_level = @sharingLevel';
                request.input('sharingLevel', sql.NVarChar(20), filters.sharing_level);
            }
            if (filters.owner_id) {
                whereClause += ' AND tb.owner_id = @ownerId';
                request.input('ownerId', sql.Int, filters.owner_id);
            }
            if (filters.search) {
                whereClause += ' AND tb.bank_name LIKE @search';
                request.input('search', sql.NVarChar(200), `%${filters.search}%`);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM TestBanks tb
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT tb.*,
                       cc.category_name,
                       CONCAT(u.first_name, ' ', u.last_name) as owner_name,
                       d.department_name as owner_department_name,
                       (SELECT COUNT(*) FROM Questions WHERE bank_id = tb.bank_id AND is_active = 1) as question_count,
                       (SELECT COUNT(DISTINCT question_type) FROM Questions WHERE bank_id = tb.bank_id AND is_active = 1) as question_types
                FROM TestBanks tb
                LEFT JOIN CourseCategories cc ON tb.category_id = cc.category_id
                LEFT JOIN Users u ON tb.owner_id = u.user_id
                LEFT JOIN Departments d ON u.department_id = d.department_id
                ${whereClause}
                ORDER BY tb.created_date DESC
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
            throw new Error(`Error fetching test banks: ${error.message}`);
        }
    }

    // Update test bank
    static async update(bankId, updateData, userId) {
        try {
            const pool = await poolPromise;

            // Check ownership or admin rights
            const accessCheck = await pool.request()
                .input('bankId', sql.Int, bankId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT owner_id
                    FROM TestBanks
                    WHERE bank_id = @bankId
                    AND (owner_id = @userId OR EXISTS (
                        SELECT 1 FROM Users u JOIN Roles r ON u.role_id = r.role_id
                        WHERE u.user_id = @userId AND r.role_name = 'ADMIN'
                    ))
                `);

            if (accessCheck.recordset.length === 0) {
                return { success: false, message: 'Access denied' };
            }

            const updateFields = [];
            const request = pool.request()
                .input('bankId', sql.Int, bankId);

            if (updateData.bank_name !== undefined) {
                updateFields.push('bank_name = @bankName');
                request.input('bankName', sql.NVarChar(200), updateData.bank_name);
            }
            if (updateData.category_id !== undefined) {
                updateFields.push('category_id = @categoryId');
                request.input('categoryId', sql.Int, updateData.category_id);
            }
            if (updateData.sharing_level !== undefined) {
                updateFields.push('sharing_level = @sharingLevel');
                request.input('sharingLevel', sql.NVarChar(20), updateData.sharing_level);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            const updateQuery = `
                UPDATE TestBanks
                SET ${updateFields.join(', ')}
                WHERE bank_id = @bankId
            `;

            const result = await request.query(updateQuery);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Test bank updated successfully' : 'Test bank not found'
            };
        } catch (error) {
            throw new Error(`Error updating test bank: ${error.message}`);
        }
    }

    // Get questions from bank with filters
    static async getQuestions(bankId, filters = {}) {
        try {
            const pool = await poolPromise;
            const request = pool.request()
                .input('bankId', sql.Int, bankId);

            let whereClause = 'WHERE q.bank_id = @bankId AND q.is_active = 1';

            if (filters.question_type) {
                whereClause += ' AND q.question_type = @questionType';
                request.input('questionType', sql.NVarChar(20), filters.question_type);
            }
            if (filters.difficulty_level) {
                whereClause += ' AND q.difficulty_level = @difficultyLevel';
                request.input('difficultyLevel', sql.Int, filters.difficulty_level);
            }
            if (filters.tags) {
                whereClause += ' AND q.tags LIKE @tags';
                request.input('tags', sql.NVarChar(500), `%${filters.tags}%`);
            }

            const result = await request.query(`
                SELECT q.*,
                       (SELECT COUNT(*) FROM QuestionOptions WHERE question_id = q.question_id) as option_count
                FROM Questions q
                ${whereClause}
                ORDER BY q.created_date DESC
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error getting bank questions: ${error.message}`);
        }
    }

    // Get bank statistics
    static async getStatistics(bankId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('bankId', sql.Int, bankId)
                .query(`
                    SELECT
                        COUNT(*) as total_questions,
                        COUNT(CASE WHEN question_type = 'MULTIPLE_CHOICE' THEN 1 END) as multiple_choice_count,
                        COUNT(CASE WHEN question_type = 'TRUE_FALSE' THEN 1 END) as true_false_count,
                        COUNT(CASE WHEN question_type = 'ESSAY' THEN 1 END) as essay_count,
                        COUNT(CASE WHEN question_type = 'FILL_BLANK' THEN 1 END) as fill_blank_count,
                        COUNT(CASE WHEN question_type = 'MATCHING' THEN 1 END) as matching_count,
                        COUNT(CASE WHEN difficulty_level = 1 THEN 1 END) as easy_count,
                        COUNT(CASE WHEN difficulty_level = 2 THEN 1 END) as medium_easy_count,
                        COUNT(CASE WHEN difficulty_level = 3 THEN 1 END) as medium_count,
                        COUNT(CASE WHEN difficulty_level = 4 THEN 1 END) as medium_hard_count,
                        COUNT(CASE WHEN difficulty_level = 5 THEN 1 END) as hard_count,
                        AVG(CAST(points AS FLOAT)) as avg_points,
                        SUM(usage_count) as total_usage,
                        AVG(CASE WHEN usage_count > 0 THEN CAST(correct_count AS FLOAT) / usage_count * 100 ELSE 0 END) as avg_success_rate
                    FROM Questions
                    WHERE bank_id = @bankId AND is_active = 1
                `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error getting bank statistics: ${error.message}`);
        }
    }

    // Share bank with users or departments
    static async shareWith(bankId, shareData, ownerId) {
        try {
            const pool = await poolPromise;

            // Check ownership
            const ownerCheck = await pool.request()
                .input('bankId', sql.Int, bankId)
                .input('ownerId', sql.Int, ownerId)
                .query(`
                    SELECT bank_id FROM TestBanks
                    WHERE bank_id = @bankId AND owner_id = @ownerId
                `);

            if (ownerCheck.recordset.length === 0) {
                return { success: false, message: 'Access denied' };
            }

            // Update sharing level
            const result = await pool.request()
                .input('bankId', sql.Int, bankId)
                .input('sharingLevel', sql.NVarChar(20), shareData.sharing_level)
                .query(`
                    UPDATE TestBanks
                    SET sharing_level = @sharingLevel
                    WHERE bank_id = @bankId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Sharing updated successfully' : 'Bank not found'
            };
        } catch (error) {
            throw new Error(`Error sharing bank: ${error.message}`);
        }
    }

    // Clone entire bank
    static async clone(bankId, newBankName, newOwnerId) {
        try {
            const pool = await poolPromise;

            // Get original bank
            const originalBank = await this.findById(bankId);
            if (!originalBank) {
                return { success: false, message: 'Original bank not found' };
            }

            // Create new bank
            const newBankId = uuidv4();
            await pool.request()
                .input('bankId', sql.Int, newBankId)
                .input('bankName', sql.NVarChar(200), newBankName)
                .input('categoryId', sql.Int, originalBank.category_id)
                .input('ownerId', sql.Int, newOwnerId)
                .query(`
                    INSERT INTO TestBanks (
                        bank_id, bank_name, category_id, owner_id,
                        sharing_level, is_active, created_date
                    ) VALUES (
                        @bankId, @bankName, @categoryId, @ownerId,
                        'PRIVATE', 1, GETDATE()
                    )
                `);

            // Clone all questions
            const questions = await this.getQuestions(bankId);
            const Question = require('./Question');

            for (const question of questions) {
                await Question.clone(question.question_id, newBankId, null, newOwnerId);
            }

            return {
                success: true,
                bankId: newBankId,
                questionCount: questions.length
            };
        } catch (error) {
            throw new Error(`Error cloning bank: ${error.message}`);
        }
    }

    // Export bank to Excel format
    static async exportToExcel(bankId, userId) {
        try {
            const pool = await poolPromise;

            // Check access
            const bank = await this.findById(bankId);
            if (!bank) {
                return { success: false, message: 'Bank not found' };
            }

            // Get all questions with options
            const result = await pool.request()
                .input('bankId', sql.Int, bankId)
                .query(`
                    SELECT q.*,
                           STRING_AGG(
                               CONCAT(qo.option_order, ':', qo.option_text, ':', CASE WHEN qo.is_correct = 1 THEN 'TRUE' ELSE 'FALSE' END),
                               '|'
                           ) as options_data
                    FROM Questions q
                    LEFT JOIN QuestionOptions qo ON q.question_id = qo.question_id
                    WHERE q.bank_id = @bankId AND q.is_active = 1
                    GROUP BY q.question_id, q.bank_id, q.test_id, q.question_type, q.question_text,
                             q.question_image, q.points, q.difficulty_level, q.time_estimate_seconds,
                             q.explanation, q.tags, q.usage_count, q.correct_count, q.is_active,
                             q.created_by, q.created_date, q.modified_by, q.modified_date, q.version
                    ORDER BY q.created_date
                `);

            const exportData = result.recordset.map(question => {
                const row = {
                    question_type: question.question_type,
                    question_text: question.question_text,
                    points: question.points,
                    difficulty_level: question.difficulty_level,
                    explanation: question.explanation,
                    tags: question.tags
                };

                // Parse options for multiple choice
                if (question.options_data && question.question_type === 'MULTIPLE_CHOICE') {
                    const options = question.options_data.split('|');
                    options.forEach((option, index) => {
                        const [order, text, isCorrect] = option.split(':');
                        row[`option_${index + 1}`] = text;
                        row[`option_${index + 1}_correct`] = isCorrect;
                    });
                }

                return row;
            });

            return {
                success: true,
                data: exportData,
                filename: `TestBank_${bank.bank_name}_${new Date().toISOString().split('T')[0]}.xlsx`
            };
        } catch (error) {
            throw new Error(`Error exporting bank: ${error.message}`);
        }
    }

    // Delete test bank (soft delete)
    static async delete(bankId, deletedBy) {
        try {
            const pool = await poolPromise;

            // Check if bank has questions used in submitted tests
            const usageCheck = await pool.request()
                .input('bankId', sql.Int, bankId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM Questions q
                    JOIN TestAnswers ta ON q.question_id = ta.question_id
                    JOIN TestAttempts tat ON ta.attempt_id = tat.attempt_id
                    WHERE q.bank_id = @bankId AND tat.is_submitted = 1
                `);

            if (usageCheck.recordset[0].count > 0) {
                return {
                    success: false,
                    message: 'Cannot delete bank with questions used in submitted tests'
                };
            }

            // Check ownership
            const ownerCheck = await pool.request()
                .input('bankId', sql.Int, bankId)
                .input('deletedBy', sql.Int, deletedBy)
                .query(`
                    SELECT bank_id FROM TestBanks
                    WHERE bank_id = @bankId
                    AND (owner_id = @deletedBy OR EXISTS (
                        SELECT 1 FROM Users u JOIN Roles r ON u.role_id = r.role_id
                        WHERE u.user_id = @deletedBy AND r.role_name = 'ADMIN'
                    ))
                `);

            if (ownerCheck.recordset.length === 0) {
                return { success: false, message: 'Access denied' };
            }

            const result = await pool.request()
                .input('bankId', sql.Int, bankId)
                .query(`
                    UPDATE TestBanks
                    SET is_active = 0
                    WHERE bank_id = @bankId
                `);

            // Also deactivate all questions in the bank
            await pool.request()
                .input('bankId', sql.Int, bankId)
                .query(`
                    UPDATE Questions
                    SET is_active = 0
                    WHERE bank_id = @bankId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Test bank deleted successfully' : 'Test bank not found'
            };
        } catch (error) {
            throw new Error(`Error deleting test bank: ${error.message}`);
        }
    }

    // Get popular tags from bank
    static async getPopularTags(bankId, limit = 20) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('bankId', sql.Int, bankId)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit)
                        value as tag_name,
                        COUNT(*) as usage_count
                    FROM Questions
                    CROSS APPLY STRING_SPLIT(tags, ',')
                    WHERE bank_id = @bankId AND is_active = 1 AND tags IS NOT NULL
                    GROUP BY value
                    ORDER BY COUNT(*) DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error getting popular tags: ${error.message}`);
        }
    }
}

module.exports = TestBank;