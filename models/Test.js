const { poolPromise, sql } = require('../config/database');

class Test {
    constructor(data) {
        this.test_id = data.test_id;
        this.course_id = data.course_id;
        this.instructor_id = data.instructor_id;
        this.title = data.title;
        this.description = data.description;
        this.type = data.type;
        this.time_limit = data.time_limit;
        this.total_marks = data.total_marks;
        this.passing_marks = data.passing_marks;
        this.attempts_allowed = data.attempts_allowed;
        this.randomize_questions = data.randomize_questions;
        this.show_results = data.show_results;
        this.status = data.status;
        this.start_date = data.start_date;
        this.end_date = data.end_date;
        this.proctoring_enabled = data.proctoring_enabled;
        this.proctoring_strictness = data.proctoring_strictness;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.chapter_id = data.chapter_id;
        this.lesson_id = data.lesson_id;
        this.test_category = data.test_category;
        this.available_after_chapter_complete = data.available_after_chapter_complete;
        this.required_for_completion = data.required_for_completion;
        this.weight_in_course = data.weight_in_course;
        this.available_from = data.available_from;
        this.available_until = data.available_until;
        this.is_graded = data.is_graded;
        this.is_required = data.is_required;
        this.is_passing_required = data.is_passing_required;
        this.score_weight = data.score_weight;
        this.show_score_breakdown = data.show_score_breakdown;
        this.language = data.language;
    }

    // Create new test
    static async create(testData) {
        try {
            const pool = await poolPromise;

            // Use auto-increment for test_id
            const result = await pool.request()
                .input('courseId', sql.Int, testData.course_id || null)
                .input('instructorId', sql.Int, testData.instructor_id)
                .input('title', sql.NVarChar(255), testData.title)
                .input('description', sql.NVarChar(sql.MAX), testData.description || null)
                .input('type', sql.NVarChar(50), testData.type || 'Quiz')
                .input('timeLimit', sql.Int, testData.time_limit || null)
                .input('totalMarks', sql.Int, testData.total_marks || 0)
                .input('passingMarks', sql.Int, testData.passing_marks || 0)
                .input('attemptsAllowed', sql.Int, testData.attempts_allowed || 1)
                .input('randomizeQuestions', sql.Bit, testData.randomize_questions !== false ? 1 : 0)
                .input('showResults', sql.Bit, testData.show_results !== false ? 1 : 0)
                .input('status', sql.NVarChar(20), testData.status || 'Draft')
                .input('startDate', sql.DateTime2, testData.start_date || null)
                .input('endDate', sql.DateTime2, testData.end_date || null)
                .input('proctoringEnabled', sql.Bit, testData.proctoring_enabled || 0)
                .input('proctoringStrictness', sql.NVarChar(20), testData.proctoring_strictness || null)
                .input('chapterId', sql.Int, testData.chapter_id || null)
                .input('lessonId', sql.Int, testData.lesson_id || null)
                .input('testCategory', sql.VarChar(50), testData.test_category || null)
                .input('availableAfterChapterComplete', sql.Bit, testData.available_after_chapter_complete || 0)
                .input('requiredForCompletion', sql.Bit, testData.required_for_completion || 0)
                .input('weightInCourse', sql.Decimal(5, 2), testData.weight_in_course || null)
                .input('availableFrom', sql.DateTime, testData.available_from || null)
                .input('availableUntil', sql.DateTime, testData.available_until || null)
                .input('isGraded', sql.Bit, testData.is_graded !== undefined ? (testData.is_graded ? 1 : 0) : 1)
                .input('isRequired', sql.Bit, testData.is_required || 0)
                .input('isPassingRequired', sql.Bit, testData.is_passing_required || 0)
                .input('scoreWeight', sql.Int, testData.score_weight || 100)
                .input('showScoreBreakdown', sql.Bit, testData.show_score_breakdown !== undefined ? (testData.show_score_breakdown ? 1 : 0) : 1)
                .input('language', sql.NVarChar(10), testData.language || 'th')
                .input('randomizeOptions', sql.Bit, testData.randomize_options ? 1 : 0)
                .input('questionsToShow', sql.Int, testData.questions_to_show || null)
                .input('positionId', sql.Int, testData.position_id || null)
                .query(`
                    INSERT INTO tests (
                        course_id, instructor_id, title, description, type,
                        time_limit, total_marks, passing_marks, attempts_allowed,
                        randomize_questions, show_results, status,
                        start_date, end_date, proctoring_enabled, proctoring_strictness,
                        created_at, chapter_id, lesson_id, test_category,
                        available_after_chapter_complete, required_for_completion,
                        weight_in_course, available_from, available_until,
                        is_graded, is_required, is_passing_required,
                        score_weight, show_score_breakdown, language,
                        randomize_options, questions_to_show, position_id
                    ) VALUES (
                        @courseId, @instructorId, @title, @description, @type,
                        @timeLimit, @totalMarks, @passingMarks, @attemptsAllowed,
                        @randomizeQuestions, @showResults, @status,
                        @startDate, @endDate, @proctoringEnabled, @proctoringStrictness,
                        GETDATE(), @chapterId, @lessonId, @testCategory,
                        @availableAfterChapterComplete, @requiredForCompletion,
                        @weightInCourse, @availableFrom, @availableUntil,
                        @isGraded, @isRequired, @isPassingRequired,
                        @scoreWeight, @showScoreBreakdown, @language,
                        @randomizeOptions, @questionsToShow, @positionId
                    );
                    SELECT SCOPE_IDENTITY() as test_id
                `);

            const testId = result.recordset[0].test_id;

            return {
                success: true,
                data: {
                    test_id: testId
                }
            };
        } catch (error) {
            console.error('Error creating test:', error);
            return {
                success: false,
                message: `Error creating test: ${error.message}`
            };
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
                           c.title as course_name,
                           CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                           (SELECT COUNT(*) FROM questions WHERE test_id = t.test_id) as question_count,
                           (SELECT COUNT(*) FROM TestAttempts WHERE test_id = t.test_id) as attempt_count,
                           (SELECT AVG(CAST(score AS FLOAT)) FROM TestAttempts WHERE test_id = t.test_id AND status = 'Completed') as avg_score
                    FROM tests t
                    LEFT JOIN courses c ON t.course_id = c.course_id
                    LEFT JOIN users u ON t.instructor_id = u.user_id
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
                        FROM questions q
                        WHERE q.test_id = @testId
                        ORDER BY ${test.randomize_questions ? 'NEWID()' : 'q.question_order, q.question_id'}
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
                            ORDER BY option_order
                        `);
                    question.options = optionResult.recordset;
                }
            }

            return test;
        } catch (error) {
            console.error('Error finding test:', error);
            throw new Error(`Error finding test: ${error.message}`);
        }
    }

    // Find tests by job position (for applicant testing)
    static async findByJobPosition(positionId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('positionId', sql.Int, positionId)
                .query(`
                    SELECT t.*,
                           p.position_name,
                           (SELECT COUNT(*) FROM questions WHERE test_id = t.test_id) as question_count
                    FROM tests t
                    LEFT JOIN positions p ON t.position_id = p.position_id
                    WHERE t.position_id = @positionId
                      AND t.status = 'Published'
                    ORDER BY t.created_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding tests by position:', error);
            return [];
        }
    }

    // Get all tests with pagination
    static async findAll(filters = {}) {
        try {
            const pool = await poolPromise;
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const offset = filters.offset || ((page - 1) * limit);

            let whereClause = "WHERE t.status != 'Deleted'";
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.course_id) {
                whereClause += ' AND t.course_id = @courseId';
                request.input('courseId', sql.Int, filters.course_id);
            }
            if (filters.instructor_id) {
                whereClause += ' AND t.instructor_id = @instructorId';
                request.input('instructorId', sql.Int, filters.instructor_id);
            }
            if (filters.test_type) {
                whereClause += ' AND t.type = @testType';
                request.input('testType', sql.NVarChar(50), filters.test_type);
            }
            if (filters.status) {
                whereClause += ' AND t.status = @status';
                request.input('status', sql.NVarChar(20), filters.status);
            }
            if (filters.is_active !== undefined) {
                // Legacy support for is_active filter
                if (filters.is_active === 'true' || filters.is_active === true) {
                    whereClause += " AND t.status = 'Active'";
                } else {
                    whereClause += " AND t.status != 'Active'";
                }
            }
            if (filters.search) {
                whereClause += ` AND (
                    t.title LIKE @search OR
                    t.description LIKE @search
                )`;
                request.input('search', sql.NVarChar(255), `%${filters.search}%`);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM tests t
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT t.*,
                       c.title as course_name,
                       CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                       (SELECT COUNT(*) FROM questions WHERE test_id = t.test_id) as question_count,
                       (SELECT COUNT(*) FROM TestAttempts WHERE test_id = t.test_id) as attempt_count,
                       (SELECT AVG(CAST(score AS FLOAT)) FROM TestAttempts WHERE test_id = t.test_id AND status = 'Completed') as avg_score
                FROM tests t
                LEFT JOIN courses c ON t.course_id = c.course_id
                LEFT JOIN users u ON t.instructor_id = u.user_id
                ${whereClause}
                ORDER BY t.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error fetching tests:', error);
            throw new Error(`Error fetching tests: ${error.message}`);
        }
    }

    // Start test attempt (compatibility method - redirects to test_attempts table)
    static async createAttempt(attemptData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('testId', sql.Int, attemptData.test_id)
                .input('userId', sql.Int, attemptData.user_id)
                .input('startedAt', sql.DateTime2, attemptData.start_time || new Date())
                .input('status', sql.NVarChar(20), attemptData.status || 'In_Progress')
                .query(`
                    INSERT INTO TestAttempts (
                        test_id, user_id, started_at, status
                    ) OUTPUT INSERTED.attempt_id VALUES (
                        @testId, @userId, @startedAt, @status
                    )
                `);

            return {
                success: true,
                data: {
                    attempt_id: result.recordset[0].attempt_id
                }
            };
        } catch (error) {
            console.error('Error creating attempt:', error);
            return {
                success: false,
                message: `Error creating attempt: ${error.message}`
            };
        }
    }

    // Get user attempts for a test
    static async getUserAttempts(testId, userId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('testId', sql.Int, testId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT *
                    FROM TestAttempts
                    WHERE test_id = @testId AND user_id = @userId
                    ORDER BY started_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting user attempts:', error);
            throw new Error(`Error getting user attempts: ${error.message}`);
        }
    }

    // Get all attempts for a test (for instructors)
    static async getAllAttempts(testId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('testId', sql.Int, testId)
                .query(`
                    SELECT ta.*,
                           CONCAT(u.first_name, ' ', u.last_name) as user_name,
                           u.email as user_email
                    FROM TestAttempts ta
                    JOIN users u ON ta.user_id = u.user_id
                    WHERE ta.test_id = @testId
                    ORDER BY ta.started_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting all attempts:', error);
            throw new Error(`Error getting all attempts: ${error.message}`);
        }
    }

    // Get attempt by ID
    static async getAttemptById(attemptId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .query(`
                    SELECT ta.*,
                           t.title as test_name,
                           t.time_limit,
                           CONCAT(u.first_name, ' ', u.last_name) as user_name
                    FROM TestAttempts ta
                    JOIN tests t ON ta.test_id = t.test_id
                    JOIN users u ON ta.user_id = u.user_id
                    WHERE ta.attempt_id = @attemptId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting attempt:', error);
            throw new Error(`Error getting attempt: ${error.message}`);
        }
    }

    // Submit test attempt (compatibility method)
    static async submitAttempt(attemptId, answers, timeSpentSeconds = 0) {
        try {
            const pool = await poolPromise;

            // Get attempt and test info
            const attemptResult = await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .query(`
                    SELECT ta.*, t.total_marks, t.passing_marks
                    FROM TestAttempts ta
                    JOIN tests t ON ta.test_id = t.test_id
                    WHERE ta.attempt_id = @attemptId
                `);

            if (attemptResult.recordset.length === 0) {
                return { success: false, message: 'Attempt not found' };
            }

            const attempt = attemptResult.recordset[0];
            const testId = attempt.test_id;

            // Check if attempt is already completed - prevent double submission
            if (attempt.status === 'Completed' || attempt.is_submitted) {
                console.log('Attempt already submitted, skipping duplicate submission');
                return {
                    success: true,
                    message: 'Already submitted',
                    data: {
                        total_score: attempt.score || 0,
                        percentage: attempt.percentage || 0,
                        passed: attempt.passed || false,
                        correct_count: attempt.correct_answers || 0,
                        total_questions: attempt.total_questions || 0
                    }
                };
            }

            // Get all questions with TestQuestions info and correct answers
            const questionsResult = await pool.request()
                .input('testId', sql.Int, testId)
                .query(`
                    SELECT
                        q.question_id,
                        q.question_type,
                        q.points,
                        tq.test_question_id,
                        tq.points as tq_points,
                        (SELECT TOP 1 option_id FROM QuestionOptions WHERE question_id = q.question_id AND is_correct = 1) as correct_option_id,
                        (SELECT TOP 1 option_text FROM QuestionOptions WHERE question_id = q.question_id AND is_correct = 1) as correct_answer_text
                    FROM Questions q
                    LEFT JOIN TestQuestions tq ON q.question_id = tq.question_id AND tq.test_id = @testId
                    WHERE q.test_id = @testId AND q.is_active = 1
                `);

            const questions = questionsResult.recordset;
            let totalScore = 0;
            let correctCount = 0;
            let totalQuestions = questions.length;

            // Convert answers object to array format if needed
            // Frontend sends: { question_id: answer_value }
            // We need: [{ question_id, selected_option_id, answer_text }]
            let answersArray = [];
            if (answers && typeof answers === 'object' && !Array.isArray(answers)) {
                // Convert object format to array format
                for (const [questionId, answerValue] of Object.entries(answers)) {
                    const qId = parseInt(questionId);
                    const question = questions.find(q => q.question_id === qId);
                    if (!question) continue;

                    const answerObj = { question_id: qId };

                    if (question.question_type === 'multiple_choice') {
                        // answerValue is option_id as string
                        answerObj.selected_option_id = parseInt(answerValue);
                    } else if (question.question_type === 'true_false') {
                        // answerValue is "true" or "false"
                        answerObj.answer_text = answerValue;
                    } else {
                        // fill_blank, essay - answerValue is text
                        answerObj.answer_text = answerValue;
                    }

                    answersArray.push(answerObj);
                }
            } else if (Array.isArray(answers)) {
                answersArray = answers;
            }

            // Process each answer
            for (const answer of answersArray) {
                const question = questions.find(q => q.question_id === answer.question_id);
                if (!question) continue;

                const points = question.tq_points || question.points || 1;
                let isCorrect = false;
                let pointsEarned = 0;

                // Determine if answer is correct based on question type
                if (question.question_type === 'multiple_choice') {
                    isCorrect = answer.selected_option_id === question.correct_option_id;
                } else if (question.question_type === 'true_false') {
                    const userAnswer = String(answer.answer_text || '').toLowerCase();
                    const correctAnswer = String(question.correct_answer_text || '').toLowerCase();
                    isCorrect = userAnswer === correctAnswer;
                } else if (question.question_type === 'fill_blank') {
                    // Simple text comparison (case insensitive)
                    isCorrect = String(answer.answer_text || '').toLowerCase().trim() ===
                               String(question.correct_answer_text || '').toLowerCase().trim();
                }
                // Essay questions need manual grading

                if (isCorrect) {
                    pointsEarned = points;
                    totalScore += points;
                    correctCount++;
                }

                // Save answer to UserAnswers if we have test_question_id
                // Use MERGE to prevent duplicates (upsert)
                if (question.test_question_id) {
                    await pool.request()
                        .input('attemptId', sql.Int, attemptId)
                        .input('testQuestionId', sql.Int, question.test_question_id)
                        .input('selectedOptionId', sql.Int, answer.selected_option_id || null)
                        .input('answerText', sql.NVarChar(sql.MAX), answer.answer_text || null)
                        .input('isCorrect', sql.Bit, isCorrect ? 1 : 0)
                        .input('pointsEarned', sql.Decimal(5, 2), pointsEarned)
                        .query(`
                            MERGE UserAnswers AS target
                            USING (SELECT @attemptId AS attempt_id, @testQuestionId AS test_question_id) AS source
                            ON target.attempt_id = source.attempt_id AND target.test_question_id = source.test_question_id
                            WHEN MATCHED THEN
                                UPDATE SET
                                    selected_option_id = @selectedOptionId,
                                    answer_text = @answerText,
                                    is_correct = @isCorrect,
                                    points_earned = @pointsEarned,
                                    answered_at = GETDATE()
                            WHEN NOT MATCHED THEN
                                INSERT (attempt_id, test_question_id, selected_option_id, answer_text, is_correct, points_earned, answered_at)
                                VALUES (@attemptId, @testQuestionId, @selectedOptionId, @answerText, @isCorrect, @pointsEarned, GETDATE());
                        `);
                }
            }

            const percentage = attempt.total_marks > 0 ? (totalScore / attempt.total_marks) * 100 : 0;
            const passed = percentage >= (attempt.passing_marks || 0);

            // Update attempt with calculated results
            await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .input('score', sql.Decimal(10, 2), totalScore)
                .input('percentage', sql.Decimal(5, 2), percentage)
                .input('passed', sql.Bit, passed ? 1 : 0)
                .input('totalQuestions', sql.Int, totalQuestions)
                .input('correctAnswers', sql.Int, correctCount)
                .input('timeSpentSeconds', sql.Int, timeSpentSeconds || 0)
                .query(`
                    UPDATE TestAttempts
                    SET completed_at = GETDATE(),
                        score = @score,
                        percentage = @percentage,
                        passed = @passed,
                        status = 'Completed',
                        is_submitted = 1,
                        total_questions = @totalQuestions,
                        correct_answers = @correctAnswers,
                        time_spent_seconds = @timeSpentSeconds
                    WHERE attempt_id = @attemptId
                `);

            return {
                success: true,
                data: {
                    total_score: totalScore,
                    percentage: percentage,
                    passed: passed,
                    correct_count: correctCount,
                    total_questions: totalQuestions
                }
            };
        } catch (error) {
            console.error('Error submitting attempt:', error);
            return {
                success: false,
                message: `Error submitting attempt: ${error.message}`
            };
        }
    }

    // Update test
    static async update(testId, updateData) {
        try {
            const pool = await poolPromise;

            const updateFields = [];
            const request = pool.request()
                .input('testId', sql.Int, testId);

            if (updateData.title !== undefined) {
                updateFields.push('title = @title');
                request.input('title', sql.NVarChar(255), updateData.title);
            }
            if (updateData.description !== undefined) {
                updateFields.push('description = @description');
                request.input('description', sql.NVarChar(sql.MAX), updateData.description);
            }
            if (updateData.type !== undefined) {
                updateFields.push('type = @type');
                request.input('type', sql.NVarChar(50), updateData.type);
            }
            if (updateData.passing_marks !== undefined) {
                updateFields.push('passing_marks = @passingMarks');
                request.input('passingMarks', sql.Int, updateData.passing_marks);
            }
            if (updateData.time_limit !== undefined) {
                updateFields.push('time_limit = @timeLimit');
                request.input('timeLimit', sql.Int, updateData.time_limit);
            }
            if (updateData.attempts_allowed !== undefined) {
                updateFields.push('attempts_allowed = @attemptsAllowed');
                request.input('attemptsAllowed', sql.Int, updateData.attempts_allowed);
            }
            if (updateData.status !== undefined) {
                updateFields.push('status = @status');
                request.input('status', sql.NVarChar(20), updateData.status);
            }
            if (updateData.show_results !== undefined) {
                updateFields.push('show_results = @showResults');
                request.input('showResults', sql.Bit, updateData.show_results ? 1 : 0);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            updateFields.push('updated_at = GETDATE()');

            const updateQuery = `
                UPDATE tests
                SET ${updateFields.join(', ')}
                WHERE test_id = @testId
            `;

            const result = await request.query(updateQuery);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Test updated successfully' : 'Test not found',
                data: result.rowsAffected[0] > 0 ? await this.findById(testId) : null
            };
        } catch (error) {
            console.error('Error updating test:', error);
            return {
                success: false,
                message: `Error updating test: ${error.message}`
            };
        }
    }

    // Delete test (soft delete)
    static async delete(testId) {
        try {
            const pool = await poolPromise;

            // Check if there are completed attempts
            const attemptCheck = await pool.request()
                .input('testId', sql.Int, testId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM TestAttempts
                    WHERE test_id = @testId AND status = 'Completed'
                `);

            if (attemptCheck.recordset[0].count > 0) {
                return {
                    success: false,
                    message: 'Cannot delete test with completed attempts. Consider deactivating instead.'
                };
            }

            const result = await pool.request()
                .input('testId', sql.Int, testId)
                .query(`
                    UPDATE tests
                    SET status = 'Deleted',
                        updated_at = GETDATE()
                    WHERE test_id = @testId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Test deleted successfully' : 'Test not found'
            };
        } catch (error) {
            console.error('Error deleting test:', error);
            return {
                success: false,
                message: `Error deleting test: ${error.message}`
            };
        }
    }

    // Get test statistics
    static async getTestStatistics(testId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('testId', sql.Int, testId)
                .query(`
                    SELECT
                        COUNT(*) as total_attempts,
                        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_attempts,
                        COUNT(CASE WHEN passed = 1 THEN 1 END) as passed_attempts,
                        AVG(CASE WHEN status = 'Completed' THEN CAST(score AS FLOAT) END) as avg_score,
                        MIN(CASE WHEN status = 'Completed' THEN score END) as min_score,
                        MAX(CASE WHEN status = 'Completed' THEN score END) as max_score,
                        AVG(CASE WHEN status = 'Completed' AND completed_at IS NOT NULL THEN
                            DATEDIFF(MINUTE, started_at, completed_at) END) as avg_time_minutes
                    FROM TestAttempts
                    WHERE test_id = @testId
                `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error fetching test statistics:', error);
            throw new Error(`Error fetching test statistics: ${error.message}`);
        }
    }

    // Get test attempts for an applicant
    static async getApplicantAttempts(applicantId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('applicantId', sql.Int, applicantId)
                .query(`
                    SELECT
                        ata.attempt_id,
                        ata.applicant_id,
                        ata.test_id,
                        ata.started_at,
                        ata.completed_at,
                        ata.time_spent_seconds as time_taken_seconds,
                        ata.score,
                        ata.percentage,
                        ata.passed,
                        ata.status,
                        t.title as test_title,
                        t.total_marks,
                        t.passing_marks,
                        t.type as test_type,
                        t.time_limit,
                        (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id) as total_questions
                    FROM ApplicantTestAttempts ata
                    JOIN Tests t ON ata.test_id = t.test_id
                    WHERE ata.applicant_id = @applicantId
                    ORDER BY ata.started_at DESC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting applicant attempts:', error);
            return [];
        }
    }

    // Get detailed attempt results for results page
    static async getAttemptResults(attemptId) {
        try {
            const pool = await poolPromise;

            // Get attempt info with test details
            const attemptResult = await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .query(`
                    SELECT ta.*,
                           t.title as test_title,
                           t.passing_marks as passing_score,
                           t.total_marks,
                           t.show_results,
                           t.attempts_allowed,
                           CASE
                               WHEN ta.time_spent_seconds > 0 THEN ta.time_spent_seconds / 60
                               ELSE DATEDIFF(MINUTE, ta.started_at, ISNULL(ta.completed_at, GETDATE()))
                           END as time_taken
                    FROM TestAttempts ta
                    JOIN tests t ON ta.test_id = t.test_id
                    WHERE ta.attempt_id = @attemptId
                `);

            if (attemptResult.recordset.length === 0) {
                return null;
            }

            const attempt = attemptResult.recordset[0];

            // Get questions and user answers
            // Note: UserAnswers links via TestQuestions.test_question_id
            // If TestQuestions is empty (questions added directly to Questions.test_id),
            // user answers won't be found, so we show questions without answers
            // Using OUTER APPLY with TOP 1 to avoid duplicate results when UserAnswers has multiple records
            const questionsResult = await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .input('testId', sql.Int, attempt.test_id)
                .query(`
                    SELECT
                        q.question_id,
                        q.question_text,
                        q.question_type,
                        q.points,
                        q.difficulty_level as difficulty,
                        q.explanation,
                        q.question_image,
                        COALESCE(ua.answer_text, CAST(ua.selected_option_id AS NVARCHAR(MAX))) as user_answer,
                        ua.is_correct,
                        ua.points_earned,
                        CASE
                            WHEN q.question_type = 'multiple_choice' THEN
                                CAST((SELECT TOP 1 option_id FROM QuestionOptions WHERE question_id = q.question_id AND is_correct = 1) AS NVARCHAR(MAX))
                            WHEN q.question_type = 'true_false' THEN
                                COALESCE(q.correct_answer, (SELECT TOP 1 option_text FROM QuestionOptions WHERE question_id = q.question_id AND is_correct = 1))
                            WHEN q.question_type IN ('fill_blank', 'essay') THEN
                                COALESCE(q.correct_answer, q.sample_answer)
                            ELSE q.correct_answer
                        END as correct_answer
                    FROM Questions q
                    LEFT JOIN TestQuestions tq ON q.question_id = tq.question_id AND tq.test_id = @testId
                    OUTER APPLY (
                        SELECT TOP 1 ua2.answer_text, ua2.selected_option_id, ua2.is_correct, ua2.points_earned
                        FROM UserAnswers ua2
                        WHERE ua2.test_question_id = tq.test_question_id AND ua2.attempt_id = @attemptId
                        ORDER BY ua2.answered_at DESC
                    ) ua
                    WHERE q.test_id = @testId AND q.is_active = 1
                    ORDER BY COALESCE(tq.question_order, q.question_id), q.question_id
                `);

            // Get options for multiple choice questions
            const questions = questionsResult.recordset;
            for (let question of questions) {
                if (question.question_type === 'multiple_choice') {
                    const optionsResult = await pool.request()
                        .input('questionId', sql.Int, question.question_id)
                        .query(`
                            SELECT option_id, option_text, is_correct
                            FROM QuestionOptions
                            WHERE question_id = @questionId
                            ORDER BY option_order
                        `);
                    question.options = optionsResult.recordset;
                }
            }

            // Calculate statistics from questions or use stored values
            let correctAnswers = 0;
            let incorrectAnswers = 0;
            let unanswered = 0;
            let hasUserAnswers = false;

            for (let q of questions) {
                if (q.user_answer !== null && q.user_answer !== undefined) {
                    hasUserAnswers = true;
                    if (q.is_correct) {
                        correctAnswers++;
                    } else {
                        incorrectAnswers++;
                    }
                } else {
                    unanswered++;
                }
            }

            // If no UserAnswers found, use stored values from TestAttempts
            if (!hasUserAnswers && attempt.correct_answers !== null) {
                correctAnswers = attempt.correct_answers || 0;
                incorrectAnswers = (attempt.total_questions || questions.length) - correctAnswers;
                unanswered = 0; // All questions were answered
            }

            // Check if user can retake
            const attemptsCountResult = await pool.request()
                .input('testId', sql.Int, attempt.test_id)
                .input('userId', sql.Int, attempt.user_id)
                .query(`
                    SELECT COUNT(*) as attempt_count
                    FROM TestAttempts
                    WHERE test_id = @testId AND user_id = @userId
                `);

            const attemptCount = attemptsCountResult.recordset[0].attempt_count;
            const canRetake = attempt.attempts_allowed === 0 || attemptCount < attempt.attempts_allowed;

            return {
                attempt_id: attempt.attempt_id,
                test_id: attempt.test_id,
                test_title: attempt.test_title,
                score: attempt.percentage || 0,
                passing_score: attempt.passing_score || 60,
                time_taken: attempt.time_taken || 0,
                correct_answers: correctAnswers,
                incorrect_answers: incorrectAnswers,
                unanswered: unanswered,
                total_questions: questions.length,
                questions: questions,
                can_retake: canRetake,
                has_certificate: false, // Can be implemented later
                show_results: attempt.show_results
            };
        } catch (error) {
            console.error('Error getting attempt results:', error);
            throw new Error(`Error getting attempt results: ${error.message}`);
        }
    }

    // Create applicant test attempt
    static async createApplicantAttempt(attemptData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('test_id', sql.Int, attemptData.test_id)
                .input('applicant_id', sql.Int, attemptData.applicant_id)
                .input('start_time', sql.DateTime, attemptData.start_time || new Date())
                .input('status', sql.VarChar(50), attemptData.status || 'In_Progress')
                .query(`
                    INSERT INTO ApplicantTestAttempts (test_id, applicant_id, started_at, status)
                    OUTPUT INSERTED.attempt_id, INSERTED.test_id, INSERTED.applicant_id,
                           INSERTED.started_at, INSERTED.status
                    VALUES (@test_id, @applicant_id, @start_time, @status)
                `);

            if (result.recordset.length > 0) {
                return {
                    success: true,
                    data: result.recordset[0]
                };
            }

            return { success: false, message: 'Failed to create attempt' };
        } catch (error) {
            console.error('Error creating applicant attempt:', error);
            return { success: false, message: error.message };
        }
    }

    // Get applicant attempt by ID
    static async getApplicantAttemptById(attemptId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .query(`
                    SELECT ata.*, t.title as test_title, t.time_limit, t.passing_marks
                    FROM ApplicantTestAttempts ata
                    JOIN Tests t ON ata.test_id = t.test_id
                    WHERE ata.attempt_id = @attemptId
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error getting applicant attempt by ID:', error);
            return null;
        }
    }

    // Submit applicant test attempt
    static async submitApplicantAttempt(attemptId, answers, timeTaken) {
        try {
            const pool = await poolPromise;

            // Get attempt info
            const attemptResult = await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .query(`
                    SELECT ata.*, t.passing_marks, t.total_marks
                    FROM ApplicantTestAttempts ata
                    JOIN Tests t ON ata.test_id = t.test_id
                    WHERE ata.attempt_id = @attemptId
                `);

            if (attemptResult.recordset.length === 0) {
                return { success: false, message: 'Attempt not found' };
            }

            const attempt = attemptResult.recordset[0];

            // Get questions for this test
            const questionsResult = await pool.request()
                .input('testId', sql.Int, attempt.test_id)
                .query(`
                    SELECT q.question_id, q.question_type, q.points, q.correct_answer,
                           q.correct_answers
                    FROM Questions q
                    WHERE q.test_id = @testId AND q.is_active = 1
                `);

            const questions = questionsResult.recordset;
            let totalScore = 0;
            let correctCount = 0;
            const totalQuestions = questions.length;

            // Calculate score
            for (let i = 0; i < questions.length; i++) {
                const question = questions[i];
                const userAnswer = answers[i];

                if (userAnswer !== undefined && userAnswer !== null) {
                    let isCorrect = false;

                    if (question.question_type === 'multiple_choice') {
                        // Get correct option index
                        const optionsResult = await pool.request()
                            .input('questionId', sql.Int, question.question_id)
                            .query(`
                                SELECT option_id, is_correct, option_order
                                FROM QuestionOptions
                                WHERE question_id = @questionId
                                ORDER BY option_order
                            `);

                        const correctIndex = optionsResult.recordset.findIndex(o => o.is_correct);
                        isCorrect = parseInt(userAnswer) === correctIndex;
                    } else if (question.question_type === 'true_false') {
                        const correctAns = question.correct_answer?.toLowerCase();
                        isCorrect = userAnswer.toLowerCase() === correctAns;
                    } else if (question.question_type === 'fill_blank') {
                        const correctAns = question.correct_answer?.toLowerCase().trim();
                        isCorrect = userAnswer.toLowerCase().trim() === correctAns;
                    }

                    if (isCorrect) {
                        totalScore += question.points || 1;
                        correctCount++;
                    }
                }
            }

            // Calculate percentage
            const maxScore = questions.reduce((sum, q) => sum + (q.points || 1), 0);
            const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
            const passed = percentage >= (attempt.passing_marks || 60);

            // Update attempt
            await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .input('completedAt', sql.DateTime, new Date())
                .input('score', sql.Decimal(5, 2), totalScore)
                .input('percentage', sql.Decimal(5, 2), percentage)
                .input('passed', sql.Bit, passed ? 1 : 0)
                .input('answers', sql.NVarChar(sql.MAX), JSON.stringify(answers))
                .input('timeSpent', sql.Int, timeTaken || 0)
                .query(`
                    UPDATE ApplicantTestAttempts
                    SET completed_at = @completedAt,
                        status = 'Completed',
                        score = @score,
                        percentage = @percentage,
                        passed = @passed,
                        answers = @answers,
                        time_spent_seconds = @timeSpent,
                        updated_at = GETDATE()
                    WHERE attempt_id = @attemptId
                `);

            return {
                success: true,
                data: {
                    attempt_id: attemptId,
                    total_score: totalScore,
                    max_score: maxScore,
                    percentage: percentage,
                    correct_count: correctCount,
                    total_questions: totalQuestions,
                    passed: passed,
                    status: passed ? 'Passed' : 'Failed'
                }
            };

        } catch (error) {
            console.error('Error submitting applicant attempt:', error);
            return { success: false, message: error.message };
        }
    }

}

module.exports = Test;
