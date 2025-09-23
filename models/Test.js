const { poolPromise, sql } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Test {
    constructor(data) {
        this.test_id = data.test_id;
        this.course_id = data.course_id;
        this.test_name = data.test_name;
        this.test_description = data.test_description;
        this.test_type = data.test_type;
        this.total_questions = data.total_questions;
        this.total_score = data.total_score;
        this.passing_score = data.passing_score;
        this.time_limit_minutes = data.time_limit_minutes;
        this.max_attempts = data.max_attempts;
        this.randomize_questions = data.randomize_questions;
        this.randomize_answers = data.randomize_answers;
        this.show_correct_answers = data.show_correct_answers;
        this.show_score_immediately = data.show_score_immediately;
        this.is_active = data.is_active;
    }

    // Create new test
    static async create(testData) {
        try {
            const pool = await poolPromise;
            const testId = uuidv4();

            const result = await pool.request()
                .input('testId', sql.Int, testId)
                .input('courseId', sql.Int, testData.course_id || null)
                .input('testName', sql.NVarChar(200), testData.test_name)
                .input('testDescription', sql.NVarChar(sql.MAX), testData.test_description || null)
                .input('testType', sql.NVarChar(20), testData.test_type)
                .input('totalQuestions', sql.Int, testData.total_questions)
                .input('totalScore', sql.Decimal(5, 2), testData.total_score)
                .input('passingScore', sql.Decimal(5, 2), testData.passing_score)
                .input('timeLimitMinutes', sql.Int, testData.time_limit_minutes || null)
                .input('maxAttempts', sql.Int, testData.max_attempts || 1)
                .input('randomizeQuestions', sql.Bit, testData.randomize_questions !== false)
                .input('randomizeAnswers', sql.Bit, testData.randomize_answers !== false)
                .input('showCorrectAnswers', sql.Bit, testData.show_correct_answers !== false)
                .input('showScoreImmediately', sql.Bit, testData.show_score_immediately !== false)
                .input('createdBy', sql.Int, testData.created_by)
                .query(`
                    INSERT INTO Tests (
                        test_id, course_id, test_name, test_description, test_type,
                        total_questions, total_score, passing_score, time_limit_minutes,
                        max_attempts, randomize_questions, randomize_answers,
                        show_correct_answers, show_score_immediately, is_active,
                        created_by, created_date
                    ) VALUES (
                        @testId, @courseId, @testName, @testDescription, @testType,
                        @totalQuestions, @totalScore, @passingScore, @timeLimitMinutes,
                        @maxAttempts, @randomizeQuestions, @randomizeAnswers,
                        @showCorrectAnswers, @showScoreImmediately, 1,
                        @createdBy, GETDATE()
                    )
                `);

            return {
                success: true,
                testId: testId
            };
        } catch (error) {
            throw new Error(`Error creating test: ${error.message}`);
        }
    }

    // Find test by ID with questions
    static async findById(testId, includeQuestions = false) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('testId', sql.Int, testId)
                .query(`
                    SELECT t.*,
                           c.course_name, c.course_code,
                           CONCAT(u.first_name, ' ', u.last_name) as creator_name,
                           (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count,
                           (SELECT COUNT(*) FROM TestAttempts WHERE test_id = t.test_id) as attempt_count,
                           (SELECT AVG(CAST(percentage AS FLOAT)) FROM TestAttempts WHERE test_id = t.test_id AND is_submitted = 1) as avg_score
                    FROM Tests t
                    LEFT JOIN Courses c ON t.course_id = c.course_id
                    LEFT JOIN Users u ON t.created_by = u.user_id
                    WHERE t.test_id = @testId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const test = result.recordset[0];

            if (includeQuestions) {
                // Get questions with options
                const questionResult = await pool.request()
                    .input('testId', sql.Int, testId)
                    .query(`
                        SELECT q.*
                        FROM Questions q
                        WHERE q.test_id = @testId AND q.is_active = 1
                        ORDER BY NEWID() -- Random order if needed
                    `);

                test.questions = questionResult.recordset;

                // Get options for each question
                for (let question of test.questions) {
                    const optionResult = await pool.request()
                        .input('questionId', sql.Int, question.question_id)
                        .query(`
                            SELECT *
                            FROM QuestionOptions
                            WHERE question_id = @questionId
                            ORDER BY ${test.randomize_answers ? 'NEWID()' : 'option_order'}
                        `);
                    question.options = optionResult.recordset;
                }
            }

            return test;
        } catch (error) {
            throw new Error(`Error finding test: ${error.message}`);
        }
    }

    // Get all tests with pagination
    static async findAll(page = 1, limit = 20, filters = {}) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE t.is_active = 1';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.course_id) {
                whereClause += ' AND t.course_id = @courseId';
                request.input('courseId', sql.Int, filters.course_id);
            }
            if (filters.test_type) {
                whereClause += ' AND t.test_type = @testType';
                request.input('testType', sql.NVarChar(20), filters.test_type);
            }
            if (filters.created_by) {
                whereClause += ' AND t.created_by = @createdBy';
                request.input('createdBy', sql.Int, filters.created_by);
            }
            if (filters.search) {
                whereClause += ` AND (
                    t.test_name LIKE @search OR
                    t.test_description LIKE @search
                )`;
                request.input('search', sql.NVarChar(200), `%${filters.search}%`);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM Tests t
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT t.*,
                       c.course_name, c.course_code,
                       CONCAT(u.first_name, ' ', u.last_name) as creator_name,
                       (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count,
                       (SELECT COUNT(*) FROM TestAttempts WHERE test_id = t.test_id) as attempt_count,
                       (SELECT AVG(CAST(percentage AS FLOAT)) FROM TestAttempts WHERE test_id = t.test_id AND is_submitted = 1) as avg_score
                FROM Tests t
                LEFT JOIN Courses c ON t.course_id = c.course_id
                LEFT JOIN Users u ON t.created_by = u.user_id
                ${whereClause}
                ORDER BY t.created_date DESC
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
            throw new Error(`Error fetching tests: ${error.message}`);
        }
    }

    // Start test attempt
    static async startAttempt(testId, userId, enrollmentId = null) {
        try {
            const pool = await poolPromise;

            // Check if test exists and is active
            const test = await this.findById(testId);
            if (!test) {
                return { success: false, message: 'Test not found' };
            }

            // Check max attempts
            const attemptCountResult = await pool.request()
                .input('testId', sql.Int, testId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM TestAttempts
                    WHERE test_id = @testId AND user_id = @userId
                `);

            const attemptCount = attemptCountResult.recordset[0].count;
            if (test.max_attempts && attemptCount >= test.max_attempts) {
                return { success: false, message: 'Maximum attempts reached' };
            }

            // Check if there's an ongoing attempt
            const ongoingCheck = await pool.request()
                .input('testId', sql.Int, testId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT attempt_id
                    FROM TestAttempts
                    WHERE test_id = @testId AND user_id = @userId
                    AND end_time IS NULL
                `);

            if (ongoingCheck.recordset.length > 0) {
                return {
                    success: true,
                    attemptId: ongoingCheck.recordset[0].attempt_id,
                    message: 'Continuing existing attempt'
                };
            }

            // Create new attempt
            const attemptId = uuidv4();
            const attemptNumber = attemptCount + 1;

            await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .input('userId', sql.Int, userId)
                .input('testId', sql.Int, testId)
                .input('enrollmentId', sql.Int, enrollmentId)
                .input('attemptNumber', sql.Int, attemptNumber)
                .query(`
                    INSERT INTO TestAttempts (
                        attempt_id, user_id, test_id, enrollment_id, attempt_number,
                        start_time, ip_address, browser_info
                    ) VALUES (
                        @attemptId, @userId, @testId, @enrollmentId, @attemptNumber,
                        GETDATE(), '127.0.0.1', 'Browser Info'
                    )
                `);

            return {
                success: true,
                attemptId: attemptId,
                attemptNumber: attemptNumber,
                timeLimit: test.time_limit_minutes
            };
        } catch (error) {
            throw new Error(`Error starting test attempt: ${error.message}`);
        }
    }

    // Submit answer
    static async submitAnswer(attemptId, questionId, answerData) {
        try {
            const pool = await poolPromise;

            // Check if answer already exists
            const existingCheck = await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .input('questionId', sql.Int, questionId)
                .query(`
                    SELECT answer_id
                    FROM TestAnswers
                    WHERE attempt_id = @attemptId AND question_id = @questionId
                `);

            let answerId;
            if (existingCheck.recordset.length > 0) {
                answerId = existingCheck.recordset[0].answer_id;

                // Update existing answer
                await pool.request()
                    .input('answerId', sql.Int, answerId)
                    .input('answerText', sql.NVarChar(sql.MAX), answerData.answer_text || null)
                    .input('selectedOptionId', sql.Int, answerData.selected_option_id || null)
                    .query(`
                        UPDATE TestAnswers
                        SET answer_text = @answerText,
                            selected_option_id = @selectedOptionId,
                            answered_date = GETDATE()
                        WHERE answer_id = @answerId
                    `);
            } else {
                // Create new answer
                answerId = uuidv4();

                await pool.request()
                    .input('answerId', sql.Int, answerId)
                    .input('attemptId', sql.Int, attemptId)
                    .input('questionId', sql.Int, questionId)
                    .input('answerText', sql.NVarChar(sql.MAX), answerData.answer_text || null)
                    .input('selectedOptionId', sql.Int, answerData.selected_option_id || null)
                    .query(`
                        INSERT INTO TestAnswers (
                            answer_id, attempt_id, question_id, answer_text,
                            selected_option_id, answered_date
                        ) VALUES (
                            @answerId, @attemptId, @questionId, @answerText,
                            @selectedOptionId, GETDATE()
                        )
                    `);
            }

            return { success: true, answerId: answerId };
        } catch (error) {
            throw new Error(`Error submitting answer: ${error.message}`);
        }
    }

    // Submit test (finish attempt)
    static async submitTest(attemptId) {
        try {
            const pool = await poolPromise;

            // Get attempt info
            const attemptResult = await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .query(`
                    SELECT ta.*, t.total_score, t.passing_score, t.show_score_immediately
                    FROM TestAttempts ta
                    JOIN Tests t ON ta.test_id = t.test_id
                    WHERE ta.attempt_id = @attemptId
                `);

            if (attemptResult.recordset.length === 0) {
                return { success: false, message: 'Attempt not found' };
            }

            const attempt = attemptResult.recordset[0];

            // Calculate score
            const scoreResult = await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .query(`
                    -- Calculate score for multiple choice questions
                    UPDATE TestAnswers
                    SET is_correct = CASE
                        WHEN qo.is_correct = 1 THEN 1
                        ELSE 0
                    END,
                    points_earned = CASE
                        WHEN qo.is_correct = 1 THEN q.points
                        ELSE 0
                    END
                    FROM TestAnswers ta
                    JOIN Questions q ON ta.question_id = q.question_id
                    LEFT JOIN QuestionOptions qo ON ta.selected_option_id = qo.option_id
                    WHERE ta.attempt_id = @attemptId
                    AND q.question_type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE')

                    -- Get total score
                    SELECT
                        SUM(points_earned) as total_points,
                        COUNT(*) as total_answered,
                        (SELECT COUNT(*) FROM Questions q
                         JOIN TestAttempts ta ON q.test_id = ta.test_id
                         WHERE ta.attempt_id = @attemptId AND q.is_active = 1) as total_questions
                    FROM TestAnswers
                    WHERE attempt_id = @attemptId
                `);

            const scoreInfo = scoreResult.recordset[0];
            const finalScore = scoreInfo.total_points || 0;
            const percentage = attempt.total_score > 0 ? (finalScore / attempt.total_score) * 100 : 0;
            const passed = percentage >= attempt.passing_score;

            // Update attempt
            await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .input('score', sql.Decimal(5, 2), finalScore)
                .input('percentage', sql.Decimal(5, 2), percentage)
                .input('passed', sql.Bit, passed)
                .query(`
                    UPDATE TestAttempts
                    SET end_time = GETDATE(),
                        time_spent_seconds = DATEDIFF(SECOND, start_time, GETDATE()),
                        score = @score,
                        percentage = @percentage,
                        passed = @passed,
                        is_submitted = 1
                    WHERE attempt_id = @attemptId
                `);

            // Update enrollment progress if applicable
            if (attempt.enrollment_id && passed) {
                // This would update course progress
                // Implementation depends on course structure
            }

            // Add gamification points
            if (passed) {
                await pool.request()
                    .input('pointId', sql.Int, uuidv4())
                    .input('userId', sql.Int, attempt.user_id)
                    .input('activityId', sql.Int, attemptId)
                    .input('points', sql.Int, Math.floor(percentage / 10) * 10) // Points based on score
                    .query(`
                        INSERT INTO UserPoints (point_id, user_id, activity_type, activity_id, points_earned, description)
                        VALUES (@pointId, @userId, 'TEST_PASS', @activityId, @points, 'Passed a test')
                    `);
            }

            return {
                success: true,
                score: finalScore,
                percentage: percentage,
                passed: passed,
                showScore: attempt.show_score_immediately
            };
        } catch (error) {
            throw new Error(`Error submitting test: ${error.message}`);
        }
    }

    // Get test attempt
    static async getAttempt(attemptId, includeAnswers = false) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .query(`
                    SELECT ta.*,
                           t.test_name, t.time_limit_minutes, t.show_correct_answers,
                           CONCAT(u.first_name, ' ', u.last_name) as user_name
                    FROM TestAttempts ta
                    JOIN Tests t ON ta.test_id = t.test_id
                    JOIN Users u ON ta.user_id = u.user_id
                    WHERE ta.attempt_id = @attemptId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const attempt = result.recordset[0];

            if (includeAnswers) {
                const answerResult = await pool.request()
                    .input('attemptId', sql.Int, attemptId)
                    .query(`
                        SELECT ta.*,
                               q.question_text, q.question_type, q.points,
                               qo.option_text, qo.is_correct as option_is_correct
                        FROM TestAnswers ta
                        JOIN Questions q ON ta.question_id = q.question_id
                        LEFT JOIN QuestionOptions qo ON ta.selected_option_id = qo.option_id
                        WHERE ta.attempt_id = @attemptId
                        ORDER BY q.created_date
                    `);

                attempt.answers = answerResult.recordset;
            }

            return attempt;
        } catch (error) {
            throw new Error(`Error getting test attempt: ${error.message}`);
        }
    }

    // Get user's test attempts
    static async getUserAttempts(userId, testId = null) {
        try {
            const pool = await poolPromise;
            const request = pool.request()
                .input('userId', sql.Int, userId);

            let whereClause = 'WHERE ta.user_id = @userId';
            if (testId) {
                whereClause += ' AND ta.test_id = @testId';
                request.input('testId', sql.Int, testId);
            }

            const result = await request.query(`
                SELECT ta.*,
                       t.test_name, t.max_attempts, t.passing_score,
                       c.course_name
                FROM TestAttempts ta
                JOIN Tests t ON ta.test_id = t.test_id
                LEFT JOIN Courses c ON t.course_id = c.course_id
                ${whereClause}
                ORDER BY ta.start_time DESC
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching user attempts: ${error.message}`);
        }
    }

    // Update test
    static async update(testId, updateData) {
        try {
            const pool = await poolPromise;

            const updateFields = [];
            const request = pool.request()
                .input('testId', sql.Int, testId);

            if (updateData.test_name !== undefined) {
                updateFields.push('test_name = @testName');
                request.input('testName', sql.NVarChar(200), updateData.test_name);
            }
            if (updateData.test_description !== undefined) {
                updateFields.push('test_description = @testDescription');
                request.input('testDescription', sql.NVarChar(sql.MAX), updateData.test_description);
            }
            if (updateData.passing_score !== undefined) {
                updateFields.push('passing_score = @passingScore');
                request.input('passingScore', sql.Decimal(5, 2), updateData.passing_score);
            }
            if (updateData.time_limit_minutes !== undefined) {
                updateFields.push('time_limit_minutes = @timeLimitMinutes');
                request.input('timeLimitMinutes', sql.Int, updateData.time_limit_minutes);
            }
            if (updateData.max_attempts !== undefined) {
                updateFields.push('max_attempts = @maxAttempts');
                request.input('maxAttempts', sql.Int, updateData.max_attempts);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            updateFields.push('modified_date = GETDATE()');

            const updateQuery = `
                UPDATE Tests
                SET ${updateFields.join(', ')}
                WHERE test_id = @testId
            `;

            const result = await request.query(updateQuery);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Test updated successfully' : 'Test not found'
            };
        } catch (error) {
            throw new Error(`Error updating test: ${error.message}`);
        }
    }

    // Delete test (soft delete)
    static async delete(testId, deletedBy) {
        try {
            const pool = await poolPromise;

            // Check if there are submitted attempts
            const attemptCheck = await pool.request()
                .input('testId', sql.Int, testId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM TestAttempts
                    WHERE test_id = @testId AND is_submitted = 1
                `);

            if (attemptCheck.recordset[0].count > 0) {
                return {
                    success: false,
                    message: 'Cannot delete test with submitted attempts'
                };
            }

            const result = await pool.request()
                .input('testId', sql.Int, testId)
                .query(`
                    UPDATE Tests
                    SET is_active = 0,
                        modified_date = GETDATE()
                    WHERE test_id = @testId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Test deleted successfully' : 'Test not found'
            };
        } catch (error) {
            throw new Error(`Error deleting test: ${error.message}`);
        }
    }

    // Get test statistics
    static async getStatistics(testId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('testId', sql.Int, testId)
                .query(`
                    SELECT
                        COUNT(*) as total_attempts,
                        COUNT(CASE WHEN is_submitted = 1 THEN 1 END) as submitted_attempts,
                        COUNT(CASE WHEN passed = 1 THEN 1 END) as passed_attempts,
                        AVG(CASE WHEN is_submitted = 1 THEN CAST(percentage AS FLOAT) END) as avg_score,
                        MIN(CASE WHEN is_submitted = 1 THEN percentage END) as min_score,
                        MAX(CASE WHEN is_submitted = 1 THEN percentage END) as max_score,
                        AVG(CASE WHEN is_submitted = 1 THEN time_spent_seconds END) as avg_time_seconds
                    FROM TestAttempts
                    WHERE test_id = @testId
                `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error fetching test statistics: ${error.message}`);
        }
    }
}

module.exports = Test;