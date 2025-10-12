const { poolPromise, sql } = require('../config/database');

class ApplicantTestResult {
    constructor(data) {
        this.result_id = data.result_id;
        this.assignment_id = data.assignment_id;
        this.applicant_id = data.applicant_id;
        this.test_id = data.test_id;
        this.started_at = data.started_at;
        this.completed_at = data.completed_at;
        this.time_taken_seconds = data.time_taken_seconds;
        this.total_questions = data.total_questions;
        this.correct_answers = data.correct_answers;
        this.score = data.score;
        this.percentage = data.percentage;
        this.passed = data.passed;
        this.answers = data.answers;
    }

    // Start test (create result record)
    static async startTest(assignmentId, applicantId, testId, ipAddress, browserInfo) {
        try {
            const pool = await poolPromise;

            // Check if test already started
            const checkExisting = await pool.request()
                .input('assignmentId', sql.Int, assignmentId)
                .query(`
                    SELECT result_id, started_at, completed_at
                    FROM ApplicantTestResults
                    WHERE assignment_id = @assignmentId
                `);

            if (checkExisting.recordset.length > 0) {
                const existing = checkExisting.recordset[0];

                // If already completed, don't allow restart
                if (existing.completed_at) {
                    return {
                        success: false,
                        message: 'Test already completed'
                    };
                }

                // If started but not completed, continue
                return {
                    success: true,
                    result_id: existing.result_id,
                    started_at: existing.started_at,
                    message: 'Continuing existing test'
                };
            }

            // Get test info for total_questions
            const testInfo = await pool.request()
                .input('testId', sql.Int, testId)
                .query(`
                    SELECT total_marks
                    FROM Tests
                    WHERE test_id = @testId
                `);

            if (testInfo.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Test not found'
                };
            }

            // Create new result record
            const result = await pool.request()
                .input('assignmentId', sql.Int, assignmentId)
                .input('applicantId', sql.Int, applicantId)
                .input('testId', sql.Int, testId)
                .input('totalQuestions', sql.Int, testInfo.recordset[0].total_marks || 0)
                .input('ipAddress', sql.NVarChar(45), ipAddress)
                .input('browserInfo', sql.NVarChar(500), browserInfo)
                .query(`
                    INSERT INTO ApplicantTestResults (
                        assignment_id, applicant_id, test_id, started_at,
                        total_questions, ip_address, browser_info
                    )
                    OUTPUT INSERTED.result_id, INSERTED.started_at
                    VALUES (
                        @assignmentId, @applicantId, @testId, GETDATE(),
                        @totalQuestions, @ipAddress, @browserInfo
                    )
                `);

            // Update assignment status to IN_PROGRESS
            await pool.request()
                .input('assignmentId', sql.Int, assignmentId)
                .query(`
                    UPDATE ApplicantTestAssignments
                    SET status = 'IN_PROGRESS',
                        updated_at = GETDATE()
                    WHERE assignment_id = @assignmentId
                `);

            return {
                success: true,
                result_id: result.recordset[0].result_id,
                started_at: result.recordset[0].started_at,
                message: 'Test started successfully'
            };
        } catch (error) {
            console.error('Error starting test:', error);
            throw error;
        }
    }

    // Submit test with answers
    static async submitTest(resultId, answersData, proctoringFlags = null) {
        try {
            const pool = await poolPromise;

            // Get result info
            const resultInfo = await pool.request()
                .input('resultId', sql.Int, resultId)
                .query(`
                    SELECT
                        atr.assignment_id,
                        atr.applicant_id,
                        atr.test_id,
                        atr.started_at,
                        t.total_marks,
                        t.passing_marks
                    FROM ApplicantTestResults atr
                    JOIN Tests t ON atr.test_id = t.test_id
                    WHERE atr.result_id = @resultId
                `);

            if (resultInfo.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Test result not found'
                };
            }

            const info = resultInfo.recordset[0];

            // Calculate score
            let correctAnswers = 0;
            let totalScore = 0;

            // answersData should be array of {question_id, selected_option, is_correct, points}
            if (Array.isArray(answersData)) {
                correctAnswers = answersData.filter(a => a.is_correct).length;
                totalScore = answersData.reduce((sum, a) => sum + (a.points || 0), 0);
            }

            const percentage = info.total_marks > 0 ? (totalScore / info.total_marks) * 100 : 0;
            const passed = percentage >= (info.passing_marks || 0);

            // Update result
            const updateResult = await pool.request()
                .input('resultId', sql.Int, resultId)
                .input('correctAnswers', sql.Int, correctAnswers)
                .input('score', sql.Decimal(5, 2), totalScore)
                .input('percentage', sql.Decimal(5, 2), percentage)
                .input('passed', sql.Bit, passed)
                .input('answers', sql.NVarChar(sql.MAX), JSON.stringify(answersData))
                .input('proctoringFlags', sql.NVarChar(sql.MAX), proctoringFlags ? JSON.stringify(proctoringFlags) : null)
                .query(`
                    UPDATE ApplicantTestResults
                    SET completed_at = GETDATE(),
                        time_taken_seconds = DATEDIFF(SECOND, started_at, GETDATE()),
                        correct_answers = @correctAnswers,
                        score = @score,
                        percentage = @percentage,
                        passed = @passed,
                        answers = @answers,
                        proctoring_flags = @proctoringFlags,
                        updated_at = GETDATE()
                    OUTPUT INSERTED.completed_at, INSERTED.time_taken_seconds
                    WHERE result_id = @resultId
                `);

            // Update assignment status to COMPLETED
            await pool.request()
                .input('assignmentId', sql.Int, info.assignment_id)
                .query(`
                    UPDATE ApplicantTestAssignments
                    SET status = 'COMPLETED',
                        updated_at = GETDATE()
                    WHERE assignment_id = @assignmentId
                `);

            // Check if applicant should be auto-disabled
            const ApplicantTestAssignment = require('./ApplicantTestAssignment');
            const pendingTests = await ApplicantTestAssignment.countPending(info.applicant_id);

            let autoDisabled = false;
            if (pendingTests === 0) {
                // Check if user has auto_disable flag
                const userCheck = await pool.request()
                    .input('applicantId', sql.Int, info.applicant_id)
                    .query(`
                        SELECT auto_disable_after_test
                        FROM Users
                        WHERE user_id = @applicantId
                    `);

                if (userCheck.recordset.length > 0 && userCheck.recordset[0].auto_disable_after_test) {
                    // Auto-disable the account
                    await pool.request()
                        .input('applicantId', sql.Int, info.applicant_id)
                        .query(`
                            UPDATE Users
                            SET status = 'DISABLED',
                                updated_at = GETDATE()
                            WHERE user_id = @applicantId
                        `);

                    // Log activity
                    const ActivityLog = require('./ActivityLog');
                    await ActivityLog.create({
                        user_id: info.applicant_id,
                        action: 'Auto_Disabled_After_Test',
                        table_name: 'users',
                        record_id: info.applicant_id,
                        description: 'Account auto-disabled after completing all assigned tests',
                        severity: 'Info',
                        module: 'Applicant'
                    });

                    autoDisabled = true;
                }
            }

            return {
                success: true,
                result_id: resultId,
                score: totalScore,
                percentage: percentage,
                passed: passed,
                correct_answers: correctAnswers,
                total_questions: answersData.length,
                completed_at: updateResult.recordset[0].completed_at,
                time_taken_seconds: updateResult.recordset[0].time_taken_seconds,
                auto_disabled: autoDisabled,
                message: 'Test submitted successfully'
            };
        } catch (error) {
            console.error('Error submitting test:', error);
            throw error;
        }
    }

    // Get result by ID
    static async findById(resultId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('resultId', sql.Int, resultId)
                .query(`
                    SELECT
                        atr.*,
                        t.title as test_title,
                        t.total_marks,
                        t.passing_marks,
                        CONCAT(app.first_name, ' ', app.last_name) as applicant_name,
                        app.id_card_number,
                        app.applied_position,
                        CONCAT(rev.first_name, ' ', rev.last_name) as reviewed_by_name
                    FROM ApplicantTestResults atr
                    JOIN Tests t ON atr.test_id = t.test_id
                    JOIN Users app ON atr.applicant_id = app.user_id
                    LEFT JOIN Users rev ON atr.reviewed_by = rev.user_id
                    WHERE atr.result_id = @resultId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const data = result.recordset[0];

            // Parse JSON fields
            if (data.answers) {
                try {
                    data.answers = JSON.parse(data.answers);
                } catch (e) {
                    data.answers = [];
                }
            }

            if (data.proctoring_flags) {
                try {
                    data.proctoring_flags = JSON.parse(data.proctoring_flags);
                } catch (e) {
                    data.proctoring_flags = [];
                }
            }

            return data;
        } catch (error) {
            console.error('Error finding result:', error);
            throw error;
        }
    }

    // Get results for an applicant
    static async getByApplicant(applicantId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('applicantId', sql.Int, applicantId)
                .query(`
                    SELECT
                        atr.*,
                        t.title as test_title,
                        t.total_marks,
                        t.passing_marks,
                        ata.due_date
                    FROM ApplicantTestResults atr
                    JOIN Tests t ON atr.test_id = t.test_id
                    LEFT JOIN ApplicantTestAssignments ata ON atr.assignment_id = ata.assignment_id
                    WHERE atr.applicant_id = @applicantId
                    ORDER BY atr.completed_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting applicant results:', error);
            throw error;
        }
    }

    // Get all results (for HR)
    static async getAll(filters = {}, page = 1, limit = 20) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE 1=1';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.applicant_id) {
                whereClause += ' AND atr.applicant_id = @applicantId';
                request.input('applicantId', sql.Int, filters.applicant_id);
            }
            if (filters.test_id) {
                whereClause += ' AND atr.test_id = @testId';
                request.input('testId', sql.Int, filters.test_id);
            }
            if (filters.passed !== undefined) {
                whereClause += ' AND atr.passed = @passed';
                request.input('passed', sql.Bit, filters.passed);
            }
            if (filters.position) {
                whereClause += ' AND app.applied_position = @position';
                request.input('position', sql.NVarChar(100), filters.position);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM ApplicantTestResults atr
                LEFT JOIN Users app ON atr.applicant_id = app.user_id
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT
                    atr.*,
                    CONCAT(app.first_name, ' ', app.last_name) as applicant_name,
                    app.id_card_number,
                    app.applied_position,
                    t.title as test_title,
                    t.total_marks,
                    t.passing_marks
                FROM ApplicantTestResults atr
                JOIN Users app ON atr.applicant_id = app.user_id
                JOIN Tests t ON atr.test_id = t.test_id
                ${whereClause}
                ORDER BY atr.completed_at DESC
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
            console.error('Error getting all results:', error);
            throw error;
        }
    }

    // Add/Update review
    static async addReview(resultId, reviewedBy, feedback) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('resultId', sql.Int, resultId)
                .input('reviewedBy', sql.Int, reviewedBy)
                .input('feedback', sql.NVarChar(sql.MAX), feedback)
                .query(`
                    UPDATE ApplicantTestResults
                    SET reviewed = 1,
                        reviewed_by = @reviewedBy,
                        reviewed_at = GETDATE(),
                        feedback = @feedback,
                        updated_at = GETDATE()
                    WHERE result_id = @resultId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Review added successfully' : 'Result not found'
            };
        } catch (error) {
            console.error('Error adding review:', error);
            throw error;
        }
    }

    // Get statistics
    static async getStatistics(filters = {}) {
        try {
            const pool = await poolPromise;

            let whereClause = 'WHERE atr.completed_at IS NOT NULL';
            const request = pool.request();

            if (filters.test_id) {
                whereClause += ' AND atr.test_id = @testId';
                request.input('testId', sql.Int, filters.test_id);
            }
            if (filters.position) {
                whereClause += ' AND app.applied_position = @position';
                request.input('position', sql.NVarChar(100), filters.position);
            }

            const result = await request.query(`
                SELECT
                    COUNT(*) as total_completed,
                    SUM(CASE WHEN atr.passed = 1 THEN 1 ELSE 0 END) as total_passed,
                    SUM(CASE WHEN atr.passed = 0 THEN 1 ELSE 0 END) as total_failed,
                    AVG(atr.percentage) as avg_percentage,
                    MIN(atr.percentage) as min_percentage,
                    MAX(atr.percentage) as max_percentage,
                    AVG(atr.time_taken_seconds) as avg_time_seconds,
                    SUM(CASE WHEN atr.reviewed = 1 THEN 1 ELSE 0 END) as total_reviewed
                FROM ApplicantTestResults atr
                LEFT JOIN Users app ON atr.applicant_id = app.user_id
                ${whereClause}
            `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting statistics:', error);
            throw error;
        }
    }

    // Add proctoring flag
    static async addProctoringFlag(resultId, flagData) {
        try {
            const pool = await poolPromise;

            // Get existing flags
            const existing = await pool.request()
                .input('resultId', sql.Int, resultId)
                .query(`
                    SELECT proctoring_flags
                    FROM ApplicantTestResults
                    WHERE result_id = @resultId
                `);

            if (existing.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Result not found'
                };
            }

            let flags = [];
            if (existing.recordset[0].proctoring_flags) {
                try {
                    flags = JSON.parse(existing.recordset[0].proctoring_flags);
                } catch (e) {
                    flags = [];
                }
            }

            // Add new flag with timestamp
            flags.push({
                ...flagData,
                timestamp: new Date().toISOString()
            });

            // Update
            const result = await pool.request()
                .input('resultId', sql.Int, resultId)
                .input('flags', sql.NVarChar(sql.MAX), JSON.stringify(flags))
                .query(`
                    UPDATE ApplicantTestResults
                    SET proctoring_flags = @flags,
                        updated_at = GETDATE()
                    WHERE result_id = @resultId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: 'Proctoring flag added'
            };
        } catch (error) {
            console.error('Error adding proctoring flag:', error);
            throw error;
        }
    }
}

module.exports = ApplicantTestResult;
