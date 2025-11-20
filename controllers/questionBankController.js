const QuestionBank = require('../models/QuestionBank');

/**
 * Question Bank Controller
 * Handles all CRUD operations for question bank management
 */

// ========================================
// View Routes (Render Pages)
// ========================================

/**
 * Show question bank management page
 * GET /courses/:courseId/questions
 */
exports.showQuestionBank = async (req, res) => {
    try {
        const { courseId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Get filters from query
        const filters = {
            question_type: req.query.type,
            difficulty_level: req.query.difficulty,
            search: req.query.search,
            is_verified: req.query.verified === 'true' ? 1 : req.query.verified === 'false' ? 0 : null,
            bloom_taxonomy_level: req.query.bloom
        };

        // Remove null/undefined filters
        Object.keys(filters).forEach(key => {
            if (filters[key] === null || filters[key] === undefined) {
                delete filters[key];
            }
        });

        // Get questions
        const result = await QuestionBank.findByCourse(courseId, {
            ...filters,
            page,
            limit
        });

        // Get statistics
        const stats = await QuestionBank.getStatistics(courseId);

        res.render('questions/index', {
            title: 'Question Bank',
            courseId,
            questions: result.questions,
            pagination: result.pagination,
            stats,
            filters: req.query,
            user: req.user
        });

    } catch (error) {
        console.error('Error showing question bank:', error);
        req.flash('error', 'เกิดข้อผิดพลาดในการแสดงคลังข้อสอบ');
        res.redirect(`/courses/${req.params.courseId}`);
    }
};

/**
 * Show create question form
 * GET /courses/:courseId/questions/create
 */
exports.showCreateForm = async (req, res) => {
    try {
        const { courseId } = req.params;
        const chapterId = req.query.chapter_id;
        const lessonId = req.query.lesson_id;

        res.render('questions/create', {
            title: 'Create Question',
            courseId,
            chapterId,
            lessonId,
            user: req.user
        });

    } catch (error) {
        console.error('Error showing create form:', error);
        req.flash('error', 'เกิดข้อผิดพลาดในการแสดงฟอร์ม');
        res.redirect(`/courses/${req.params.courseId}/questions`);
    }
};

/**
 * Show edit question form
 * GET /courses/:courseId/questions/:questionId/edit
 */
exports.showEditForm = async (req, res) => {
    try {
        const { courseId, questionId } = req.params;

        // Get question with options
        const question = await QuestionBank.findById(questionId);

        if (!question) {
            req.flash('error', 'ไม่พบข้อสอบที่ต้องการแก้ไข');
            return res.redirect(`/courses/${courseId}/questions`);
        }

        // Check permission (only creator or admin can edit)
        if (question.created_by !== req.user.user_id && req.user.role !== 'admin') {
            req.flash('error', 'คุณไม่มีสิทธิ์แก้ไขข้อสอบนี้');
            return res.redirect(`/courses/${courseId}/questions`);
        }

        res.render('questions/edit', {
            title: 'Edit Question',
            courseId,
            question,
            user: req.user
        });

    } catch (error) {
        console.error('Error showing edit form:', error);
        req.flash('error', 'เกิดข้อผิดพลาดในการแสดงฟอร์มแก้ไข');
        res.redirect(`/courses/${req.params.courseId}/questions`);
    }
};

/**
 * Show question detail
 * GET /courses/:courseId/questions/:questionId
 */
exports.showDetail = async (req, res) => {
    try {
        const { courseId, questionId } = req.params;

        // Get question with stats
        const question = await QuestionBank.findById(questionId, true);

        if (!question) {
            req.flash('error', 'ไม่พบข้อสอบที่ต้องการดู');
            return res.redirect(`/courses/${courseId}/questions`);
        }

        res.render('questions/detail', {
            title: 'Question Detail',
            courseId,
            question,
            user: req.user
        });

    } catch (error) {
        console.error('Error showing question detail:', error);
        req.flash('error', 'เกิดข้อผิดพลาดในการแสดงรายละเอียดข้อสอบ');
        res.redirect(`/courses/${req.params.courseId}/questions`);
    }
};

// ========================================
// API Routes (JSON Responses)
// ========================================

/**
 * Get all questions for a course (API)
 * GET /api/courses/:courseId/questions
 */
exports.getQuestions = async (req, res) => {
    try {
        const { courseId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Get filters from query
        const filters = {
            question_type: req.query.type,
            difficulty_level: req.query.difficulty,
            search: req.query.search,
            is_verified: req.query.verified === 'true' ? 1 : req.query.verified === 'false' ? 0 : null,
            bloom_taxonomy_level: req.query.bloom,
            chapter_id: req.query.chapter_id,
            lesson_id: req.query.lesson_id
        };

        // Remove null/undefined filters
        Object.keys(filters).forEach(key => {
            if (filters[key] === null || filters[key] === undefined) {
                delete filters[key];
            }
        });

        const result = await QuestionBank.findByCourse(courseId, {
            ...filters,
            page,
            limit
        });

        res.json({
            success: true,
            data: result.questions,
            pagination: result.pagination
        });

    } catch (error) {
        console.error('Error getting questions:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลข้อสอบ',
            error: error.message
        });
    }
};

/**
 * Get question by ID (API)
 * GET /api/questions/:questionId
 */
exports.getQuestionById = async (req, res) => {
    try {
        const { questionId } = req.params;
        const includeStats = req.query.stats === 'true';

        const question = await QuestionBank.findById(questionId, includeStats);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อสอบที่ต้องการ'
            });
        }

        res.json({
            success: true,
            data: question
        });

    } catch (error) {
        console.error('Error getting question:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลข้อสอบ',
            error: error.message
        });
    }
};

/**
 * Create new question (API)
 * POST /api/courses/:courseId/questions
 */
exports.createQuestion = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.user_id;

        // Prepare question data
        const questionData = {
            course_id: parseInt(courseId),
            chapter_id: req.body.chapter_id ? parseInt(req.body.chapter_id) : null,
            lesson_id: req.body.lesson_id ? parseInt(req.body.lesson_id) : null,
            question_text: req.body.question_text,
            question_type: req.body.question_type || 'multiple-choice',
            image_url: req.body.image_url || null,
            video_url: req.body.video_url || null,
            audio_url: req.body.audio_url || null,
            difficulty_level: req.body.difficulty_level || 'medium',
            topic_tags: req.body.topic_tags || null,
            learning_objective: req.body.learning_objective || null,
            bloom_taxonomy_level: req.body.bloom_taxonomy_level || null,
            default_points: req.body.default_points || 1.0,
            explanation: req.body.explanation || null,
            hint: req.body.hint || null,
            reference: req.body.reference || null,
            is_public: req.body.is_public === true || req.body.is_public === 'true' ? 1 : 0,
            created_by: userId
        };

        // Prepare answer options
        const options = req.body.options || [];

        // Create question
        const questionId = await QuestionBank.create(questionData, options);

        res.json({
            success: true,
            message: 'สร้างข้อสอบสำเร็จ',
            data: { question_id: questionId }
        });

    } catch (error) {
        console.error('Error creating question:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างข้อสอบ',
            error: error.message
        });
    }
};

/**
 * Update question (API)
 * PUT /api/questions/:questionId
 */
exports.updateQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const userId = req.user.user_id;

        // Check if question exists and user has permission
        const existingQuestion = await QuestionBank.findById(questionId);

        if (!existingQuestion) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อสอบที่ต้องการแก้ไข'
            });
        }

        // Check permission (only creator or admin can edit)
        if (existingQuestion.created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์แก้ไขข้อสอบนี้'
            });
        }

        // Prepare question data
        const questionData = {
            question_text: req.body.question_text,
            question_type: req.body.question_type,
            image_url: req.body.image_url || null,
            video_url: req.body.video_url || null,
            audio_url: req.body.audio_url || null,
            difficulty_level: req.body.difficulty_level,
            topic_tags: req.body.topic_tags || null,
            learning_objective: req.body.learning_objective || null,
            bloom_taxonomy_level: req.body.bloom_taxonomy_level || null,
            default_points: req.body.default_points,
            explanation: req.body.explanation || null,
            hint: req.body.hint || null,
            reference: req.body.reference || null,
            is_public: req.body.is_public === true || req.body.is_public === 'true' ? 1 : 0,
            updated_by: userId
        };

        // Prepare answer options (if provided)
        const options = req.body.options || null;

        // Update question
        await QuestionBank.update(questionId, questionData, options);

        res.json({
            success: true,
            message: 'แก้ไขข้อสอบสำเร็จ'
        });

    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการแก้ไขข้อสอบ',
            error: error.message
        });
    }
};

/**
 * Delete question (API)
 * DELETE /api/questions/:questionId
 */
exports.deleteQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const userId = req.user.user_id;

        // Check if question exists and user has permission
        const question = await QuestionBank.findById(questionId);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อสอบที่ต้องการลบ'
            });
        }

        // Check permission (only creator or admin can delete)
        if (question.created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์ลบข้อสอบนี้'
            });
        }

        // Soft delete
        await QuestionBank.delete(questionId);

        res.json({
            success: true,
            message: 'ลบข้อสอบสำเร็จ'
        });

    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบข้อสอบ',
            error: error.message
        });
    }
};

/**
 * Duplicate question (API)
 * POST /api/questions/:questionId/duplicate
 */
exports.duplicateQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const userId = req.user.user_id;

        const newQuestionId = await QuestionBank.duplicate(questionId, userId);

        res.json({
            success: true,
            message: 'ทำสำเนาข้อสอบสำเร็จ',
            data: { question_id: newQuestionId }
        });

    } catch (error) {
        console.error('Error duplicating question:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการทำสำเนาข้อสอบ',
            error: error.message
        });
    }
};

/**
 * Get random questions for test generation (API)
 * POST /api/courses/:courseId/questions/random
 */
exports.getRandomQuestions = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { count, filters } = req.body;

        if (!count || count < 1) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุจำนวนข้อสอบที่ต้องการ'
            });
        }

        const questions = await QuestionBank.getRandomQuestions(courseId, count, filters || {});

        res.json({
            success: true,
            data: questions,
            count: questions.length
        });

    } catch (error) {
        console.error('Error getting random questions:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสุ่มข้อสอบ',
            error: error.message
        });
    }
};

/**
 * Get question bank statistics (API)
 * GET /api/courses/:courseId/questions/statistics
 */
exports.getStatistics = async (req, res) => {
    try {
        const { courseId } = req.params;

        const stats = await QuestionBank.getStatistics(courseId);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงสถิติ',
            error: error.message
        });
    }
};

/**
 * Verify question (Admin only) (API)
 * POST /api/questions/:questionId/verify
 */
exports.verifyQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const userId = req.user.user_id;

        // Check admin permission
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์ในการยืนยันข้อสอบ'
            });
        }

        await QuestionBank.update(questionId, {
            is_verified: 1,
            verified_by: userId,
            verified_at: new Date()
        });

        res.json({
            success: true,
            message: 'ยืนยันข้อสอบสำเร็จ'
        });

    } catch (error) {
        console.error('Error verifying question:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการยืนยันข้อสอบ',
            error: error.message
        });
    }
};

/**
 * Bulk import questions (API)
 * POST /api/courses/:courseId/questions/bulk-import
 */
exports.bulkImport = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.user_id;
        const { questions } = req.body;

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุข้อมูลข้อสอบที่ต้องการนำเข้า'
            });
        }

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (const question of questions) {
            try {
                const questionData = {
                    course_id: parseInt(courseId),
                    chapter_id: question.chapter_id || null,
                    lesson_id: question.lesson_id || null,
                    question_text: question.question_text,
                    question_type: question.question_type || 'multiple-choice',
                    difficulty_level: question.difficulty_level || 'medium',
                    topic_tags: question.topic_tags || null,
                    learning_objective: question.learning_objective || null,
                    bloom_taxonomy_level: question.bloom_taxonomy_level || null,
                    default_points: question.default_points || 1.0,
                    explanation: question.explanation || null,
                    hint: question.hint || null,
                    created_by: userId
                };

                const questionId = await QuestionBank.create(questionData, question.options || []);

                results.push({
                    success: true,
                    question_id: questionId,
                    question_text: question.question_text.substring(0, 50) + '...'
                });
                successCount++;

            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    question_text: question.question_text?.substring(0, 50) + '...' || 'Unknown'
                });
                errorCount++;
            }
        }

        res.json({
            success: true,
            message: `นำเข้าข้อสอบเสร็จสิ้น: สำเร็จ ${successCount} ข้อ, ผิดพลาด ${errorCount} ข้อ`,
            results,
            summary: {
                total: questions.length,
                success: successCount,
                error: errorCount
            }
        });

    } catch (error) {
        console.error('Error bulk importing questions:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการนำเข้าข้อสอบ',
            error: error.message
        });
    }
};

module.exports = exports;
