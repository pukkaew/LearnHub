const { poolPromise, sql } = require('../config/database');

class QuestionBank {
    constructor(data) {
        this.question_id = data.question_id;
        this.course_id = data.course_id;
        this.chapter_id = data.chapter_id;
        this.lesson_id = data.lesson_id;
        this.question_text = data.question_text;
        this.question_type = data.question_type;
        this.image_url = data.image_url;
        this.video_url = data.video_url;
        this.audio_url = data.audio_url;
        this.difficulty_level = data.difficulty_level;
        this.topic_tags = data.topic_tags;
        this.learning_objective = data.learning_objective;
        this.bloom_taxonomy_level = data.bloom_taxonomy_level;
        this.default_points = data.default_points;
        this.explanation = data.explanation;
        this.hint = data.hint;
        this.reference = data.reference;
        this.is_active = data.is_active;
        this.is_verified = data.is_verified;
        this.is_public = data.is_public;
    }

    /**
     * Create new question with options
     */
    static async create(questionData, options = []) {
        const pool = await poolPromise;
        const transaction = pool.transaction();

        try {
            await transaction.begin();

            // Insert question
            const questionResult = await transaction.request()
                .input('courseId', sql.Int, questionData.course_id)
                .input('chapterId', sql.Int, questionData.chapter_id || null)
                .input('lessonId', sql.Int, questionData.lesson_id || null)
                .input('questionText', sql.NVarChar(sql.MAX), questionData.question_text)
                .input('questionType', sql.VarChar(50), questionData.question_type || 'multiple-choice')
                .input('imageUrl', sql.VarChar(500), questionData.image_url || null)
                .input('videoUrl', sql.VarChar(500), questionData.video_url || null)
                .input('audioUrl', sql.VarChar(500), questionData.audio_url || null)
                .input('difficultyLevel', sql.VarChar(20), questionData.difficulty_level || 'medium')
                .input('topicTags', sql.NVarChar(500), questionData.topic_tags || null)
                .input('learningObjective', sql.NVarChar(sql.MAX), questionData.learning_objective || null)
                .input('bloomTaxonomyLevel', sql.VarChar(50), questionData.bloom_taxonomy_level || null)
                .input('defaultPoints', sql.Decimal(5, 2), questionData.default_points || 1.0)
                .input('explanation', sql.NVarChar(sql.MAX), questionData.explanation || null)
                .input('hint', sql.NVarChar(sql.MAX), questionData.hint || null)
                .input('reference', sql.NVarChar(500), questionData.reference || null)
                .input('isVerified', sql.Bit, questionData.is_verified || 0)
                .input('isPublic', sql.Bit, questionData.is_public || 0)
                .input('createdBy', sql.Int, questionData.created_by)
                .query(`
                    INSERT INTO QuestionBank (
                        course_id, chapter_id, lesson_id, question_text, question_type,
                        image_url, video_url, audio_url, difficulty_level, topic_tags,
                        learning_objective, bloom_taxonomy_level, default_points,
                        explanation, hint, reference, is_verified, is_public,
                        created_by, created_at, updated_at
                    )
                    OUTPUT INSERTED.question_id
                    VALUES (
                        @courseId, @chapterId, @lessonId, @questionText, @questionType,
                        @imageUrl, @videoUrl, @audioUrl, @difficultyLevel, @topicTags,
                        @learningObjective, @bloomTaxonomyLevel, @defaultPoints,
                        @explanation, @hint, @reference, @isVerified, @isPublic,
                        @createdBy, GETDATE(), GETDATE()
                    )
                `);

            const questionId = questionResult.recordset[0].question_id;

            // Insert options if provided
            if (options && options.length > 0) {
                for (let i = 0; i < options.length; i++) {
                    const option = options[i];
                    await transaction.request()
                        .input('questionId', sql.Int, questionId)
                        .input('optionText', sql.NVarChar(sql.MAX), option.option_text)
                        .input('isCorrect', sql.Bit, option.is_correct || 0)
                        .input('optionOrder', sql.Int, option.option_order || i + 1)
                        .input('explanation', sql.NVarChar(sql.MAX), option.explanation || null)
                        .query(`
                            INSERT INTO AnswerOptions (
                                question_id, option_text, is_correct, option_order, explanation
                            )
                            VALUES (
                                @questionId, @optionText, @isCorrect, @optionOrder, @explanation
                            )
                        `);
                }
            }

            await transaction.commit();

            return {
                success: true,
                question_id: questionId,
                message: 'Question created successfully'
            };

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Error creating question: ${error.message}`);
        }
    }

    /**
     * Find question by ID with options
     */
    static async findById(questionId, includeStats = false) {
        try {
            const pool = await poolPromise;

            // Get question
            const questionResult = await pool.request()
                .input('questionId', sql.Int, questionId)
                .query(`
                    SELECT
                        q.*,
                        c.title as course_name, c.course_code,
                        CONCAT(u.first_name, ' ', u.last_name) as creator_name,
                        (SELECT COUNT(*) FROM AnswerOptions WHERE question_id = q.question_id) as option_count
                    FROM QuestionBank q
                    LEFT JOIN Courses c ON q.course_id = c.course_id
                    LEFT JOIN Users u ON q.created_by = u.user_id
                    WHERE q.question_id = @questionId AND q.is_active = 1
                `);

            if (questionResult.recordset.length === 0) {
                return null;
            }

            const question = questionResult.recordset[0];

            // Get options
            const optionsResult = await pool.request()
                .input('questionId', sql.Int, questionId)
                .query(`
                    SELECT * FROM AnswerOptions
                    WHERE question_id = @questionId
                    ORDER BY option_order
                `);

            question.options = optionsResult.recordset;

            // Get usage statistics if requested
            if (includeStats) {
                const statsResult = await pool.request()
                    .input('questionId', sql.Int, questionId)
                    .query(`
                        SELECT
                            COUNT(DISTINCT tq.test_id) as used_in_tests,
                            COUNT(DISTINCT ua.attempt_id) as total_attempts,
                            SUM(CASE WHEN ua.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
                            SUM(CASE WHEN ua.is_correct = 0 THEN 1 ELSE 0 END) as incorrect_count,
                            CASE
                                WHEN COUNT(ua.answer_id) > 0
                                THEN CAST(SUM(CASE WHEN ua.is_correct = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(ua.answer_id) * 100
                                ELSE 0
                            END as success_rate,
                            AVG(ua.time_spent_seconds) as avg_time_seconds
                        FROM QuestionBank q
                        LEFT JOIN TestQuestions tq ON q.question_id = tq.question_id
                        LEFT JOIN UserAnswers ua ON tq.test_question_id = ua.test_question_id
                        WHERE q.question_id = @questionId
                    `);

                question.stats = statsResult.recordset[0];
            }

            return question;

        } catch (error) {
            throw new Error(`Error finding question: ${error.message}`);
        }
    }

    /**
     * Find all questions with filters and pagination
     */
    static async findAll(page = 1, limit = 20, filters = {}) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE q.is_active = 1';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.course_id) {
                whereClause += ' AND q.course_id = @courseId';
                request.input('courseId', sql.Int, filters.course_id);
            }
            if (filters.chapter_id) {
                whereClause += ' AND q.chapter_id = @chapterId';
                request.input('chapterId', sql.Int, filters.chapter_id);
            }
            if (filters.question_type) {
                whereClause += ' AND q.question_type = @questionType';
                request.input('questionType', sql.VarChar(50), filters.question_type);
            }
            if (filters.difficulty_level) {
                whereClause += ' AND q.difficulty_level = @difficultyLevel';
                request.input('difficultyLevel', sql.VarChar(20), filters.difficulty_level);
            }
            if (filters.is_verified !== undefined) {
                whereClause += ' AND q.is_verified = @isVerified';
                request.input('isVerified', sql.Bit, filters.is_verified);
            }
            if (filters.search) {
                whereClause += ' AND (q.question_text LIKE @search OR q.topic_tags LIKE @search)';
                request.input('search', sql.NVarChar(500), `%${filters.search}%`);
            }
            if (filters.tag) {
                whereClause += ' AND q.topic_tags LIKE @tag';
                request.input('tag', sql.NVarChar(500), `%${filters.tag}%`);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM QuestionBank q
                ${whereClause}
            `);

            const total = countResult.recordset[0].total;

            // Get questions
            const questionsResult = await request.query(`
                SELECT
                    q.*,
                    c.title as course_name, c.course_code,
                    CONCAT(u.first_name, ' ', u.last_name) as creator_name,
                    (SELECT COUNT(*) FROM AnswerOptions WHERE question_id = q.question_id) as option_count,
                    (SELECT COUNT(*) FROM TestQuestions WHERE question_id = q.question_id) as usage_count
                FROM QuestionBank q
                LEFT JOIN Courses c ON q.course_id = c.course_id
                LEFT JOIN Users u ON q.created_by = u.user_id
                ${whereClause}
                ORDER BY q.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

            return {
                questions: questionsResult.recordset,
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            throw new Error(`Error finding questions: ${error.message}`);
        }
    }

    /**
     * Update question
     */
    static async update(questionId, questionData, options = null) {
        const pool = await poolPromise;
        const transaction = pool.transaction();

        try {
            await transaction.begin();

            // Build update query dynamically
            const updateFields = [];
            const request = transaction.request().input('questionId', sql.Int, questionId);

            if (questionData.question_text !== undefined) {
                updateFields.push('question_text = @questionText');
                request.input('questionText', sql.NVarChar(sql.MAX), questionData.question_text);
            }
            if (questionData.question_type !== undefined) {
                updateFields.push('question_type = @questionType');
                request.input('questionType', sql.VarChar(50), questionData.question_type);
            }
            if (questionData.difficulty_level !== undefined) {
                updateFields.push('difficulty_level = @difficultyLevel');
                request.input('difficultyLevel', sql.VarChar(20), questionData.difficulty_level);
            }
            if (questionData.topic_tags !== undefined) {
                updateFields.push('topic_tags = @topicTags');
                request.input('topicTags', sql.NVarChar(500), questionData.topic_tags);
            }
            if (questionData.default_points !== undefined) {
                updateFields.push('default_points = @defaultPoints');
                request.input('defaultPoints', sql.Decimal(5, 2), questionData.default_points);
            }
            if (questionData.explanation !== undefined) {
                updateFields.push('explanation = @explanation');
                request.input('explanation', sql.NVarChar(sql.MAX), questionData.explanation);
            }
            if (questionData.hint !== undefined) {
                updateFields.push('hint = @hint');
                request.input('hint', sql.NVarChar(sql.MAX), questionData.hint);
            }
            if (questionData.is_verified !== undefined) {
                updateFields.push('is_verified = @isVerified');
                request.input('isVerified', sql.Bit, questionData.is_verified);
            }
            if (questionData.updated_by !== undefined) {
                updateFields.push('updated_by = @updatedBy');
                request.input('updatedBy', sql.Int, questionData.updated_by);
            }

            updateFields.push('updated_at = GETDATE()');

            if (updateFields.length > 0) {
                await request.query(`
                    UPDATE QuestionBank
                    SET ${updateFields.join(', ')}
                    WHERE question_id = @questionId
                `);
            }

            // Update options if provided
            if (options !== null) {
                // Delete existing options
                await transaction.request()
                    .input('questionId', sql.Int, questionId)
                    .query('DELETE FROM AnswerOptions WHERE question_id = @questionId');

                // Insert new options
                for (let i = 0; i < options.length; i++) {
                    const option = options[i];
                    await transaction.request()
                        .input('questionId', sql.Int, questionId)
                        .input('optionText', sql.NVarChar(sql.MAX), option.option_text)
                        .input('isCorrect', sql.Bit, option.is_correct || 0)
                        .input('optionOrder', sql.Int, option.option_order || i + 1)
                        .input('explanation', sql.NVarChar(sql.MAX), option.explanation || null)
                        .query(`
                            INSERT INTO AnswerOptions (
                                question_id, option_text, is_correct, option_order, explanation
                            )
                            VALUES (
                                @questionId, @optionText, @isCorrect, @optionOrder, @explanation
                            )
                        `);
                }
            }

            await transaction.commit();

            return {
                success: true,
                message: 'Question updated successfully'
            };

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Error updating question: ${error.message}`);
        }
    }

    /**
     * Delete question (soft delete)
     */
    static async delete(questionId) {
        try {
            const pool = await poolPromise;

            await pool.request()
                .input('questionId', sql.Int, questionId)
                .query(`
                    UPDATE QuestionBank
                    SET is_active = 0, updated_at = GETDATE()
                    WHERE question_id = @questionId
                `);

            return {
                success: true,
                message: 'Question deleted successfully'
            };

        } catch (error) {
            throw new Error(`Error deleting question: ${error.message}`);
        }
    }

    /**
     * Get questions by course
     */
    static async findByCourse(courseId, filters = {}) {
        filters.course_id = courseId;
        return this.findAll(filters.page || 1, filters.limit || 20, filters);
    }

    /**
     * Get questions by chapter
     */
    static async findByChapter(chapterId, filters = {}) {
        filters.chapter_id = chapterId;
        return this.findAll(filters.page || 1, filters.limit || 20, filters);
    }

    /**
     * Get random questions for test generation
     */
    static async getRandomQuestions(courseId, count, filters = {}) {
        try {
            const pool = await poolPromise;
            let whereClause = 'WHERE q.course_id = @courseId AND q.is_active = 1';
            const request = pool.request()
                .input('courseId', sql.Int, courseId)
                .input('count', sql.Int, count);

            if (filters.difficulty_level) {
                whereClause += ' AND q.difficulty_level = @difficultyLevel';
                request.input('difficultyLevel', sql.VarChar(20), filters.difficulty_level);
            }
            if (filters.question_type) {
                whereClause += ' AND q.question_type = @questionType';
                request.input('questionType', sql.VarChar(50), filters.question_type);
            }
            if (filters.chapter_id) {
                whereClause += ' AND q.chapter_id = @chapterId';
                request.input('chapterId', sql.Int, filters.chapter_id);
            }

            const result = await request.query(`
                SELECT TOP (@count) q.*
                FROM QuestionBank q
                ${whereClause}
                ORDER BY NEWID()
            `);

            // Get options for each question
            for (let question of result.recordset) {
                const optionsResult = await pool.request()
                    .input('questionId', sql.Int, question.question_id)
                    .query(`
                        SELECT * FROM AnswerOptions
                        WHERE question_id = @questionId
                        ORDER BY option_order
                    `);
                question.options = optionsResult.recordset;
            }

            return result.recordset;

        } catch (error) {
            throw new Error(`Error getting random questions: ${error.message}`);
        }
    }

    /**
     * Get question statistics
     */
    static async getStatistics(courseId = null) {
        try {
            const pool = await poolPromise;
            const request = pool.request();
            let whereClause = 'WHERE q.is_active = 1';

            if (courseId) {
                whereClause += ' AND q.course_id = @courseId';
                request.input('courseId', sql.Int, courseId);
            }

            const result = await request.query(`
                SELECT
                    COUNT(*) as total_questions,
                    SUM(CASE WHEN difficulty_level = 'easy' THEN 1 ELSE 0 END) as easy_count,
                    SUM(CASE WHEN difficulty_level = 'medium' THEN 1 ELSE 0 END) as medium_count,
                    SUM(CASE WHEN difficulty_level = 'hard' THEN 1 ELSE 0 END) as hard_count,
                    SUM(CASE WHEN question_type = 'multiple-choice' THEN 1 ELSE 0 END) as mc_count,
                    SUM(CASE WHEN question_type = 'true-false' THEN 1 ELSE 0 END) as tf_count,
                    SUM(CASE WHEN question_type = 'short-answer' THEN 1 ELSE 0 END) as sa_count,
                    SUM(CASE WHEN question_type = 'essay' THEN 1 ELSE 0 END) as essay_count,
                    SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_count,
                    AVG(usage_count) as avg_usage,
                    AVG(success_rate) as avg_success_rate
                FROM QuestionBank q
                ${whereClause}
            `);

            return result.recordset[0];

        } catch (error) {
            throw new Error(`Error getting statistics: ${error.message}`);
        }
    }

    /**
     * Duplicate question
     */
    static async duplicate(questionId, userId) {
        try {
            const original = await this.findById(questionId);
            if (!original) {
                throw new Error('Question not found');
            }

            // Create duplicate
            const duplicateData = {
                ...original,
                question_text: `[Copy] ${original.question_text}`,
                created_by: userId,
                is_verified: 0
            };

            delete duplicateData.question_id;
            delete duplicateData.creator_name;
            delete duplicateData.option_count;

            return await this.create(duplicateData, original.options);

        } catch (error) {
            throw new Error(`Error duplicating question: ${error.message}`);
        }
    }
}

module.exports = QuestionBank;
