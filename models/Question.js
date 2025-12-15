const { poolPromise, sql } = require('../config/database');

class Question {
    constructor(data) {
        this.question_id = data.question_id;
        this.bank_id = data.bank_id;
        this.test_id = data.test_id;
        this.question_type = data.question_type;
        this.question_text = data.question_text;
        this.question_image = data.question_image;
        this.points = data.points;
        this.difficulty_level = data.difficulty_level;
        this.time_estimate_seconds = data.time_estimate_seconds;
        this.explanation = data.explanation;
        this.tags = data.tags;
        this.usage_count = data.usage_count;
        this.correct_count = data.correct_count;
        this.is_active = data.is_active;
    }

    // Create new question
    static async create(questionData) {
        try {
            const pool = await poolPromise;

            // Prepare correct_answers as JSON string if array
            let correctAnswersJson = null;
            if (questionData.correct_answers && Array.isArray(questionData.correct_answers)) {
                correctAnswersJson = JSON.stringify(questionData.correct_answers);
            }

            // question_id is IDENTITY - let DB generate it
            const result = await pool.request()
                .input('bankId', sql.Int, questionData.bank_id || null)
                .input('testId', sql.Int, questionData.test_id || null)
                .input('questionType', sql.NVarChar(20), questionData.question_type)
                .input('questionText', sql.NVarChar(sql.MAX), questionData.question_text)
                .input('questionImage', sql.NVarChar(500), questionData.question_image || null)
                .input('points', sql.Decimal(5, 2), questionData.points || 1)
                .input('difficultyLevel', sql.Int, questionData.difficulty_level || 3)
                .input('timeEstimate', sql.Int, questionData.time_estimate_seconds || 60)
                .input('explanation', sql.NVarChar(sql.MAX), questionData.explanation || null)
                .input('tags', sql.NVarChar(500), questionData.tags || null)
                .input('correctAnswer', sql.NVarChar(50), questionData.correct_answer || null)
                .input('sampleAnswer', sql.NVarChar(sql.MAX), questionData.sample_answer || null)
                .input('correctAnswers', sql.NVarChar(sql.MAX), correctAnswersJson)
                .input('createdBy', sql.Int, questionData.created_by)
                .query(`
                    INSERT INTO Questions (
                        bank_id, test_id, question_type, question_text,
                        question_image, points, difficulty_level, time_estimate_seconds,
                        explanation, tags, correct_answer, sample_answer, correct_answers,
                        usage_count, correct_count, is_active,
                        created_by, created_date, version
                    )
                    OUTPUT INSERTED.question_id
                    VALUES (
                        @bankId, @testId, @questionType, @questionText,
                        @questionImage, @points, @difficultyLevel, @timeEstimate,
                        @explanation, @tags, @correctAnswer, @sampleAnswer, @correctAnswers,
                        0, 0, 1,
                        @createdBy, GETDATE(), 1
                    )
                `);

            const questionId = result.recordset[0].question_id;

            // Add options if provided (for multiple choice)
            if (questionData.options && questionData.options.length > 0) {
                for (let i = 0; i < questionData.options.length; i++) {
                    const option = questionData.options[i];
                    // option_id is IDENTITY - let DB generate it
                    await pool.request()
                        .input('questionId', sql.Int, questionId)
                        .input('optionText', sql.NVarChar(500), option.text || option.option_text)
                        .input('optionImage', sql.NVarChar(500), option.image || option.option_image || null)
                        .input('isCorrect', sql.Bit, option.is_correct || false)
                        .input('optionOrder', sql.Int, i + 1)
                        .query(`
                            INSERT INTO QuestionOptions (
                                question_id, option_text, option_image,
                                is_correct, option_order, created_date
                            ) VALUES (
                                @questionId, @optionText, @optionImage,
                                @isCorrect, @optionOrder, GETDATE()
                            )
                        `);
                }
            }

            // Add to TestQuestions linking table if test_id is provided
            if (questionData.test_id) {
                const testQuestionResult = await pool.request()
                    .input('testId', sql.Int, questionData.test_id)
                    .input('questionId', sql.Int, questionId)
                    .input('questionOrder', sql.Int, questionData.order_index || 1)
                    .input('points', sql.Decimal(5, 2), questionData.points || 1)
                    .query(`
                        INSERT INTO TestQuestions (
                            test_id, question_id, question_order, points, created_at
                        )
                        OUTPUT INSERTED.test_question_id
                        VALUES (
                            @testId, @questionId, @questionOrder, @points, GETDATE()
                        )
                    `);
            }

            return {
                success: true,
                questionId: questionId
            };
        } catch (error) {
            throw new Error(`Error creating question: ${error.message}`);
        }
    }

    // Find question by ID with options
    static async findById(questionId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('questionId', sql.Int, questionId)
                .query(`
                    SELECT q.*,
                           CONCAT(u.first_name, ' ', u.last_name) as creator_name
                    FROM Questions q
                    LEFT JOIN Users u ON q.created_by = u.user_id
                    WHERE q.question_id = @questionId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const question = result.recordset[0];

            // Get options if multiple choice or similar (check both upper and lower case)
            const questionType = (question.question_type || '').toUpperCase();
            if (['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING'].includes(questionType)) {
                const optionResult = await pool.request()
                    .input('questionId', sql.Int, questionId)
                    .query(`
                        SELECT *
                        FROM QuestionOptions
                        WHERE question_id = @questionId
                        ORDER BY option_order
                    `);

                question.options = optionResult.recordset;
            }

            return question;
        } catch (error) {
            throw new Error(`Error finding question: ${error.message}`);
        }
    }

    // Get questions with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE q.is_active = 1';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.bank_id) {
                whereClause += ' AND q.bank_id = @bankId';
                request.input('bankId', sql.Int, filters.bank_id);
            }
            if (filters.test_id) {
                whereClause += ' AND q.test_id = @testId';
                request.input('testId', sql.Int, filters.test_id);
            }
            if (filters.question_type) {
                whereClause += ' AND q.question_type = @questionType';
                request.input('questionType', sql.NVarChar(20), filters.question_type);
            }
            if (filters.difficulty_level) {
                whereClause += ' AND q.difficulty_level = @difficultyLevel';
                request.input('difficultyLevel', sql.Int, filters.difficulty_level);
            }
            if (filters.created_by) {
                whereClause += ' AND q.created_by = @createdBy';
                request.input('createdBy', sql.Int, filters.created_by);
            }
            if (filters.tags) {
                whereClause += ' AND q.tags LIKE @tags';
                request.input('tags', sql.NVarChar(500), `%${filters.tags}%`);
            }
            if (filters.search) {
                whereClause += ` AND (
                    q.question_text LIKE @search OR
                    q.tags LIKE @search
                )`;
                request.input('search', sql.NVarChar(500), `%${filters.search}%`);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM Questions q
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT q.*,
                       CONCAT(u.first_name, ' ', u.last_name) as creator_name,
                       (SELECT COUNT(*) FROM QuestionOptions WHERE question_id = q.question_id) as option_count
                FROM Questions q
                LEFT JOIN Users u ON q.created_by = u.user_id
                ${whereClause}
                ORDER BY q.created_date DESC
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
            throw new Error(`Error fetching questions: ${error.message}`);
        }
    }

    // Update question
    static async update(questionId, updateData) {
        try {
            const pool = await poolPromise;

            console.log('Question.update called with:', { questionId, updateData });

            const updateFields = [];
            const request = pool.request()
                .input('questionId', sql.Int, questionId);

            if (updateData.question_text !== undefined) {
                updateFields.push('question_text = @questionText');
                request.input('questionText', sql.NVarChar(sql.MAX), updateData.question_text);
            }
            if (updateData.question_type !== undefined) {
                updateFields.push('question_type = @questionType');
                request.input('questionType', sql.NVarChar(20), updateData.question_type);
            }
            if (updateData.points !== undefined) {
                updateFields.push('points = @points');
                request.input('points', sql.Decimal(5, 2), updateData.points);
            }
            if (updateData.difficulty_level !== undefined) {
                updateFields.push('difficulty_level = @difficultyLevel');
                request.input('difficultyLevel', sql.Int, updateData.difficulty_level);
            }
            if (updateData.time_estimate_seconds !== undefined) {
                updateFields.push('time_estimate_seconds = @timeEstimate');
                request.input('timeEstimate', sql.Int, updateData.time_estimate_seconds);
            }
            if (updateData.explanation !== undefined) {
                updateFields.push('explanation = @explanation');
                request.input('explanation', sql.NVarChar(sql.MAX), updateData.explanation);
            }
            if (updateData.tags !== undefined) {
                updateFields.push('tags = @tags');
                request.input('tags', sql.NVarChar(500), updateData.tags);
            }
            if (updateData.question_image !== undefined) {
                updateFields.push('question_image = @questionImage');
                request.input('questionImage', sql.NVarChar(500), updateData.question_image);
            }
            if (updateData.correct_answer !== undefined) {
                updateFields.push('correct_answer = @correctAnswer');
                request.input('correctAnswer', sql.NVarChar(50), updateData.correct_answer);
            }
            if (updateData.sample_answer !== undefined) {
                updateFields.push('sample_answer = @sampleAnswer');
                request.input('sampleAnswer', sql.NVarChar(sql.MAX), updateData.sample_answer);
            }

            if (updateFields.length === 0) {
                console.log('Question.update: No fields to update!', { updateData });
                return { success: false, message: 'No fields to update' };
            }

            console.log('Question.update: Fields to update:', updateFields);

            updateFields.push('modified_date = GETDATE()');
            updateFields.push('version = version + 1');

            const updateQuery = `
                UPDATE Questions
                SET ${updateFields.join(', ')}
                WHERE question_id = @questionId
            `;

            const result = await request.query(updateQuery);

            // Update options if provided
            if (updateData.options) {
                // Delete existing options
                await pool.request()
                    .input('questionId', sql.Int, questionId)
                    .query('DELETE FROM QuestionOptions WHERE question_id = @questionId');

                // Add new options (option_id is IDENTITY - let DB generate)
                for (let i = 0; i < updateData.options.length; i++) {
                    const option = updateData.options[i];
                    await pool.request()
                        .input('questionId', sql.Int, questionId)
                        .input('optionText', sql.NVarChar(500), option.text || option.option_text)
                        .input('optionImage', sql.NVarChar(500), option.image || option.option_image || null)
                        .input('isCorrect', sql.Bit, option.is_correct || false)
                        .input('optionOrder', sql.Int, i + 1)
                        .query(`
                            INSERT INTO QuestionOptions (
                                question_id, option_text, option_image,
                                is_correct, option_order, created_date
                            ) VALUES (
                                @questionId, @optionText, @optionImage,
                                @isCorrect, @optionOrder, GETDATE()
                            )
                        `);
                }
            }

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Question updated successfully' : 'Question not found'
            };
        } catch (error) {
            throw new Error(`Error updating question: ${error.message}`);
        }
    }

    // Clone question to different bank or test
    static async clone(questionId, targetBankId = null, targetTestId = null, createdBy) {
        try {
            const pool = await poolPromise;

            // Get original question
            const original = await this.findById(questionId);
            if (!original) {
                return { success: false, message: 'Original question not found' };
            }

            // Create new question (question_id is IDENTITY - let DB generate)
            const result = await pool.request()
                .input('bankId', sql.Int, targetBankId)
                .input('testId', sql.Int, targetTestId)
                .input('questionType', sql.NVarChar(20), original.question_type)
                .input('questionText', sql.NVarChar(sql.MAX), original.question_text)
                .input('questionImage', sql.NVarChar(500), original.question_image)
                .input('points', sql.Decimal(5, 2), original.points)
                .input('difficultyLevel', sql.Int, original.difficulty_level)
                .input('timeEstimate', sql.Int, original.time_estimate_seconds)
                .input('explanation', sql.NVarChar(sql.MAX), original.explanation)
                .input('tags', sql.NVarChar(500), original.tags)
                .input('createdBy', sql.Int, createdBy)
                .query(`
                    INSERT INTO Questions (
                        bank_id, test_id, question_type, question_text,
                        question_image, points, difficulty_level, time_estimate_seconds,
                        explanation, tags, usage_count, correct_count, is_active,
                        created_by, created_date, version
                    )
                    OUTPUT INSERTED.question_id
                    VALUES (
                        @bankId, @testId, @questionType, @questionText,
                        @questionImage, @points, @difficultyLevel, @timeEstimate,
                        @explanation, @tags, 0, 0, 1,
                        @createdBy, GETDATE(), 1
                    )
                `);

            const newQuestionId = result.recordset[0].question_id;

            // Clone options if they exist (option_id is IDENTITY - let DB generate)
            if (original.options && original.options.length > 0) {
                for (const option of original.options) {
                    await pool.request()
                        .input('questionId', sql.Int, newQuestionId)
                        .input('optionText', sql.NVarChar(500), option.option_text)
                        .input('optionImage', sql.NVarChar(500), option.option_image)
                        .input('isCorrect', sql.Bit, option.is_correct)
                        .input('optionOrder', sql.Int, option.option_order)
                        .query(`
                            INSERT INTO QuestionOptions (
                                question_id, option_text, option_image,
                                is_correct, option_order, created_date
                            ) VALUES (
                                @questionId, @optionText, @optionImage,
                                @isCorrect, @optionOrder, GETDATE()
                            )
                        `);
                }
            }

            return {
                success: true,
                questionId: newQuestionId
            };
        } catch (error) {
            throw new Error(`Error cloning question: ${error.message}`);
        }
    }

    // Import questions from CSV/Excel
    static async importFromData(questions, bankId, createdBy) {
        try {
            const pool = await poolPromise;
            const results = [];

            for (const questionData of questions) {
                try {
                    // Validate required fields
                    if (!questionData.question_text || !questionData.question_type || !questionData.points) {
                        results.push({
                            success: false,
                            row: questionData._row || 0,
                            message: 'Missing required fields: question_text, question_type, or points'
                        });
                        continue;
                    }

                    // Create question (question_id is IDENTITY - let DB generate)
                    const result = await pool.request()
                        .input('bankId', sql.Int, bankId)
                        .input('questionType', sql.NVarChar(20), questionData.question_type.toUpperCase())
                        .input('questionText', sql.NVarChar(sql.MAX), questionData.question_text)
                        .input('points', sql.Decimal(5, 2), parseFloat(questionData.points))
                        .input('difficultyLevel', sql.Int, parseInt(questionData.difficulty_level) || 3)
                        .input('explanation', sql.NVarChar(sql.MAX), questionData.explanation || null)
                        .input('tags', sql.NVarChar(500), questionData.tags || null)
                        .input('createdBy', sql.Int, createdBy)
                        .query(`
                            INSERT INTO Questions (
                                bank_id, question_type, question_text,
                                points, difficulty_level, explanation, tags,
                                usage_count, correct_count, is_active,
                                created_by, created_date, version
                            )
                            OUTPUT INSERTED.question_id
                            VALUES (
                                @bankId, @questionType, @questionText,
                                @points, @difficultyLevel, @explanation, @tags,
                                0, 0, 1, @createdBy, GETDATE(), 1
                            )
                        `);

                    const questionId = result.recordset[0].question_id;

                    // Add options for multiple choice questions (option_id is IDENTITY)
                    if (questionData.question_type.toUpperCase() === 'MULTIPLE_CHOICE') {
                        const options = [];
                        for (let i = 1; i <= 6; i++) {
                            const optionKey = `option_${i}`;
                            const correctKey = `option_${i}_correct`;

                            if (questionData[optionKey]) {
                                options.push({
                                    text: questionData[optionKey],
                                    is_correct: questionData[correctKey] === 'true' || questionData[correctKey] === '1'
                                });
                            }
                        }

                        for (let i = 0; i < options.length; i++) {
                            await pool.request()
                                .input('questionId', sql.Int, questionId)
                                .input('optionText', sql.NVarChar(500), options[i].text)
                                .input('isCorrect', sql.Bit, options[i].is_correct)
                                .input('optionOrder', sql.Int, i + 1)
                                .query(`
                                    INSERT INTO QuestionOptions (
                                        question_id, option_text,
                                        is_correct, option_order, created_date
                                    ) VALUES (
                                        @questionId, @optionText,
                                        @isCorrect, @optionOrder, GETDATE()
                                    )
                                `);
                        }
                    }

                    results.push({
                        success: true,
                        row: questionData._row || 0,
                        questionId: questionId
                    });

                } catch (error) {
                    results.push({
                        success: false,
                        row: questionData._row || 0,
                        message: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            throw new Error(`Error importing questions: ${error.message}`);
        }
    }

    // Update usage statistics
    static async updateUsageStats(questionId, wasCorrect = false) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('questionId', sql.Int, questionId)
                .input('wasCorrect', sql.Bit, wasCorrect)
                .query(`
                    UPDATE Questions
                    SET usage_count = usage_count + 1,
                        correct_count = correct_count + CASE WHEN @wasCorrect = 1 THEN 1 ELSE 0 END
                    WHERE question_id = @questionId
                `);

            return { success: true };
        } catch (error) {
            throw new Error(`Error updating usage stats: ${error.message}`);
        }
    }

    // Get question analytics
    static async getAnalytics(questionId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('questionId', sql.Int, questionId)
                .query(`
                    SELECT
                        q.usage_count,
                        q.correct_count,
                        CASE
                            WHEN q.usage_count > 0 THEN (CAST(q.correct_count AS FLOAT) / q.usage_count) * 100
                            ELSE 0
                        END as success_rate,
                        q.difficulty_level,
                        AVG(CAST(ta.time_spent_seconds AS FLOAT)) as avg_time_spent
                    FROM Questions q
                    LEFT JOIN TestAnswers ta ON q.question_id = ta.question_id
                    WHERE q.question_id = @questionId
                    GROUP BY q.question_id, q.usage_count, q.correct_count, q.difficulty_level
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error getting question analytics: ${error.message}`);
        }
    }

    // Delete question (soft delete)
    static async delete(questionId, deletedBy) {
        try {
            const pool = await poolPromise;

            // Check if question is used in submitted tests
            const usageCheck = await pool.request()
                .input('questionId', sql.Int, questionId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM UserAnswers ua
                    JOIN TestAttempts tat ON ua.attempt_id = tat.attempt_id
                    WHERE ua.test_question_id = @questionId AND tat.is_submitted = 1
                `);

            if (usageCheck.recordset[0].count > 0) {
                return {
                    success: false,
                    message: 'Cannot delete question that has been used in submitted tests'
                };
            }

            const result = await pool.request()
                .input('questionId', sql.Int, questionId)
                .query(`
                    UPDATE Questions
                    SET is_active = 0,
                        modified_date = GETDATE()
                    WHERE question_id = @questionId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Question deleted successfully' : 'Question not found'
            };
        } catch (error) {
            throw new Error(`Error deleting question: ${error.message}`);
        }
    }

    // Get questions by difficulty distribution
    static async getByDifficulty(bankId, difficulties = [1, 2, 3, 4, 5], counts = [2, 3, 3, 2, 1]) {
        try {
            const pool = await poolPromise;
            const selectedQuestions = [];

            for (let i = 0; i < difficulties.length; i++) {
                const difficulty = difficulties[i];
                const count = counts[i];

                const result = await pool.request()
                    .input('bankId', sql.Int, bankId)
                    .input('difficulty', sql.Int, difficulty)
                    .input('count', sql.Int, count)
                    .query(`
                        SELECT TOP (@count) *
                        FROM Questions
                        WHERE bank_id = @bankId
                        AND difficulty_level = @difficulty
                        AND is_active = 1
                        ORDER BY NEWID()
                    `);

                selectedQuestions.push(...result.recordset);
            }

            return selectedQuestions;
        } catch (error) {
            throw new Error(`Error getting questions by difficulty: ${error.message}`);
        }
    }

    // Find questions by test ID
    static async findByTestId(testId, options = {}) {
        try {
            const { randomizeQuestions = false, randomizeOptions = false } = options;
            const pool = await poolPromise;
            const result = await pool.request()
                .input('testId', sql.Int, parseInt(testId))
                .query(`
                    SELECT q.question_id, q.bank_id, q.test_id, q.question_type,
                           q.question_text, q.question_image, q.points, q.difficulty_level,
                           q.time_estimate_seconds, q.explanation, q.tags,
                           q.correct_answer, q.sample_answer, q.correct_answers,
                           q.usage_count, q.correct_count, q.is_active, q.version,
                           q.created_by, q.created_date, q.modified_date,
                           CONCAT(u.first_name, ' ', u.last_name) as creator_name
                    FROM Questions q
                    LEFT JOIN Users u ON q.created_by = u.user_id
                    WHERE q.test_id = @testId AND q.is_active = 1
                    ORDER BY q.question_id
                `);

            // Get options for each question
            let questions = result.recordset;
            for (let question of questions) {
                // Parse correct_answers from JSON if stored as string
                if (question.correct_answers && typeof question.correct_answers === 'string') {
                    try {
                        question.correct_answers = JSON.parse(question.correct_answers);
                    } catch (e) {
                        // If parsing fails, try splitting by comma
                        question.correct_answers = question.correct_answers.split(',').map(a => a.trim());
                    }
                }

                const optionsResult = await pool.request()
                    .input('questionId', sql.Int, question.question_id)
                    .query(`
                        SELECT * FROM QuestionOptions
                        WHERE question_id = @questionId
                        ORDER BY option_order
                    `);
                let questionOptions = optionsResult.recordset;

                // Randomize options if enabled and question is multiple choice
                if (randomizeOptions && question.question_type === 'multiple_choice') {
                    questionOptions = Question.shuffleArray(questionOptions);
                }
                question.options = questionOptions;
            }

            // Randomize questions if enabled
            if (randomizeQuestions) {
                questions = Question.shuffleArray(questions);
            }

            return questions;
        } catch (error) {
            console.error('Error finding questions by test ID:', error);
            throw new Error(`Error finding questions by test ID: ${error.message}`);
        }
    }

    // Helper function to shuffle array (Fisher-Yates algorithm)
    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

module.exports = Question;