const Test = require('../models/Test');
const Question = require('../models/Question');
const TestBank = require('../models/TestBank');
const ActivityLog = require('../models/ActivityLog');
const Chapter = require('../models/Chapter');
const Lesson = require('../models/Lesson');
const { poolPromise, sql } = require('../config/database');

// Helper function to update course progress after test submission
async function updateCourseProgressAfterTest(userId, courseId) {
    try {
        if (!courseId) return; // Test might not be linked to a course

        const pool = await poolPromise;

        // Calculate progress including materials and tests
        const progressResult = await pool.request()
            .input('userId', sql.Int, userId)
            .input('courseId', sql.Int, courseId)
            .query(`
                SELECT
                    -- Count required materials
                    (SELECT COUNT(*) FROM course_materials WHERE course_id = @courseId AND is_required = 1) as total_materials,
                    (SELECT COUNT(*) FROM user_material_progress ump
                     INNER JOIN course_materials cm ON ump.material_id = cm.material_id
                     WHERE ump.user_id = @userId AND ump.course_id = @courseId AND ump.is_completed = 1 AND cm.is_required = 1) as completed_materials,
                    -- Count required tests
                    (SELECT COUNT(*) FROM tests WHERE course_id = @courseId AND is_required = 1) as total_tests,
                    (SELECT COUNT(DISTINCT ta.test_id) FROM TestAttempts ta
                     INNER JOIN tests t ON ta.test_id = t.test_id
                     WHERE ta.user_id = @userId AND t.course_id = @courseId AND t.is_required = 1
                     AND ta.status = 'Completed'
                     AND (t.is_passing_required = 0 OR ta.passed = 1)) as completed_tests
            `);

        const { total_materials, completed_materials, total_tests, completed_tests } = progressResult.recordset[0];
        const totalItems = (total_materials || 0) + (total_tests || 0);
        const completedItems = (completed_materials || 0) + (completed_tests || 0);
        const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        // Update enrollment progress
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('courseId', sql.Int, courseId)
            .input('progress', sql.Decimal(5, 2), progressPercentage)
            .query(`
                UPDATE user_courses
                SET progress = @progress,
                    status = CASE WHEN @progress >= 100 THEN 'completed' ELSE 'active' END,
                    completion_date = CASE WHEN @progress >= 100 AND completion_date IS NULL THEN GETDATE() ELSE completion_date END,
                    last_access_date = GETDATE()
                WHERE user_id = @userId AND course_id = @courseId
            `);

        console.log(`Updated course progress for user ${userId} course ${courseId}: ${progressPercentage}%`);
    } catch (error) {
        console.error('Error updating course progress after test:', error);
        // Don't throw - this is a side effect and shouldn't fail the main operation
    }
}

const testController = {
    // Get test statistics for index page
    async getTestStats(req, res) {
        try {
            const pool = await poolPromise;
            const userId = req.user.user_id;

            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT
                        (SELECT COUNT(*) FROM tests WHERE status IN ('Active', 'Published')) as total_tests,
                        (SELECT COUNT(DISTINCT ta.test_id) FROM TestAttempts ta WHERE ta.user_id = @userId) as tests_taken,
                        (SELECT COUNT(DISTINCT ta.test_id) FROM TestAttempts ta WHERE ta.user_id = @userId AND ta.passed = 1) as tests_passed,
                        (SELECT AVG(CAST(ta.percentage AS FLOAT)) FROM TestAttempts ta WHERE ta.user_id = @userId AND ta.status = 'Completed') as avg_score
                `);

            res.json({
                success: true,
                data: result.recordset[0]
            });
        } catch (error) {
            console.error('Get test stats error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingStats') : 'Error loading stats'
            });
        }
    },

    // Get test list for index page with tabs support
    async getTestList(req, res) {
        try {
            const pool = await poolPromise;
            const userId = req.user.user_id;
            const userRole = req.user.role_name;
            const { page = 1, limit = 12, tab = 'all', search, category } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Admin and Instructor can see Draft tests, others only see Active/Published
            let whereClause;
            if (['Admin', 'Instructor'].includes(userRole)) {
                whereClause = "WHERE t.status IN ('Active', 'Published', 'Draft')";
            } else {
                whereClause = "WHERE t.status IN ('Active', 'Published')";
            }

            const request = pool.request()
                .input('userId', sql.Int, userId)
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, parseInt(limit));

            // Filter by tab
            if (tab === 'my-tests') {
                whereClause += ' AND EXISTS (SELECT 1 FROM TestAttempts ta WHERE ta.test_id = t.test_id AND ta.user_id = @userId)';
            } else if (tab === 'created') {
                whereClause += ' AND t.instructor_id = @userId';
            }

            // Filter by search
            if (search) {
                whereClause += ' AND (t.title LIKE @search OR t.description LIKE @search)';
                request.input('search', sql.NVarChar, `%${search}%`);
            }

            // Filter by category/type
            if (category) {
                whereClause += ' AND t.type = @category';
                request.input('category', sql.NVarChar, category);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total FROM tests t ${whereClause}
            `);

            // Get tests
            const result = await request.query(`
                SELECT t.*,
                       c.title as course_name,
                       (SELECT COUNT(*) FROM questions WHERE test_id = t.test_id) as question_count,
                       (SELECT TOP 1 ta.status FROM TestAttempts ta WHERE ta.test_id = t.test_id AND ta.user_id = @userId ORDER BY ta.started_at DESC) as user_status,
                       (SELECT TOP 1 ta.percentage FROM TestAttempts ta WHERE ta.test_id = t.test_id AND ta.user_id = @userId ORDER BY ta.started_at DESC) as user_score
                FROM tests t
                LEFT JOIN courses c ON t.course_id = c.course_id
                ${whereClause}
                ORDER BY t.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

            res.json({
                success: true,
                data: result.recordset,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult.recordset[0].total
                }
            });
        } catch (error) {
            console.error('Get test list error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingTestList') : 'Error loading test list'
            });
        }
    },

    // Get test categories/types for filter
    async getTestCategories(req, res) {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT DISTINCT type as category, COUNT(*) as count
                FROM tests
                WHERE status IN ('Active', 'Published')
                GROUP BY type
                ORDER BY count DESC
            `);

            res.json({
                success: true,
                data: result.recordset
            });
        } catch (error) {
            console.error('Get test categories error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorLoadingCategories') : 'Error loading categories'
            });
        }
    },

    async getAllTests(req, res) {
        try {
            const {
                course_id,
                instructor_id,
                test_type,
                is_active,
                search,
                page = 1,
                limit = 20
            } = req.query;

            const filters = {};
            if (course_id) {filters.course_id = course_id;}
            if (instructor_id) {filters.instructor_id = instructor_id;}
            if (test_type) {filters.test_type = test_type;}
            if (is_active !== undefined) {filters.is_active = is_active;}
            if (search) {filters.search = search;}

            const offset = (parseInt(page) - 1) * parseInt(limit);
            filters.limit = parseInt(limit);
            filters.offset = offset;
            filters.page = parseInt(page);

            const tests = await Test.findAll(filters);

            res.json({
                success: true,
                data: tests,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: tests.length
                }
            });

        } catch (error) {
            console.error('Get all tests error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingTestList')
            });
        }
    },

    async getTestById(req, res) {
        try {
            const { test_id } = req.params;
            const testIdInt = parseInt(test_id);
            const userId = req.user.user_id;
            const userRole = req.user.role_name;

            if (isNaN(testIdInt)) {
                return res.status(400).json({
                    success: false,
                    message: req.t('invalidTestId')
                });
            }

            const test = await Test.findById(testIdInt);
            if (!test) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testNotFound')
                });
            }

            if (userRole === 'Instructor' && test.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionAccessTest')
                });
            }

            const questions = await Question.findByTestId(testIdInt);

            await ActivityLog.create({
                user_id: userId,
                action: 'View_Test',
                table_name: 'tests',
                record_id: testIdInt,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `User viewed test: ${test.title}`,
                severity: 'Info',
                module: 'Assessment'
            });

            res.json({
                success: true,
                data: {
                    test: test,
                    questions: questions
                }
            });

        } catch (error) {
            console.error('Get test by id error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingTestData')
            });
        }
    },

    async createTest(req, res) {
        try {
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionCreateTest')
                });
            }

            // Map legacy field names to database schema
            const testData = {
                course_id: req.body.course_id || null,
                instructor_id: req.body.instructor_id || userId, // Use current user if not specified
                title: req.body.test_name || req.body.title,
                description: req.body.test_description || req.body.description,
                type: req.body.test_type || req.body.type || 'Quiz',
                time_limit: req.body.time_limit_minutes || req.body.duration_minutes || req.body.time_limit || null,
                total_marks: req.body.total_score || req.body.total_marks || 0,
                passing_marks: req.body.passing_score || req.body.passing_marks || 0,
                attempts_allowed: req.body.max_attempts || req.body.attempts_allowed || 1,
                randomize_questions: req.body.shuffle_questions !== undefined ? req.body.shuffle_questions : req.body.randomize_questions,
                show_results: req.body.show_results !== undefined ? req.body.show_results : true,
                status: req.body.is_active === true ? 'Active' : req.body.status || 'Draft',
                start_date: req.body.start_date || null,
                end_date: req.body.end_date || null,
                proctoring_enabled: req.body.proctoring_enabled || false,
                proctoring_strictness: req.body.proctoring_strictness || null,
                chapter_id: req.body.chapter_id || null,
                lesson_id: req.body.lesson_id || null,
                test_category: req.body.test_category || null,
                available_after_chapter_complete: req.body.available_after_chapter_complete || false,
                required_for_completion: req.body.required_for_completion || false,
                weight_in_course: req.body.weight_in_course || null,
                available_from: req.body.available_from || null,
                available_until: req.body.available_until || null,
                is_graded: req.body.is_graded !== undefined ? req.body.is_graded : true,
                is_required: req.body.is_required || false,
                is_passing_required: req.body.is_passing_required || false,
                score_weight: req.body.score_weight || 100,
                show_score_breakdown: req.body.show_score_breakdown !== undefined ? req.body.show_score_breakdown : true,
                randomize_options: req.body.randomize_options || false,
                questions_to_show: req.body.questions_to_show || null,
                position_id: req.body.position_id || null // For recruitment tests
            };

            const result = await Test.create(testData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            const testId = result.data.test_id;
            let totalMarks = 0;

            // Create questions if provided
            if (req.body.questions && Array.isArray(req.body.questions)) {
                for (let i = 0; i < req.body.questions.length; i++) {
                    const q = req.body.questions[i];

                    const questionData = {
                        test_id: testId,
                        question_type: q.question_type,
                        question_text: q.question_text,
                        points: q.points || 1,
                        explanation: q.explanation || null,
                        created_by: userId,
                        order_index: i + 1
                    };

                    // Add options for multiple choice
                    if (q.question_type === 'multiple_choice' && q.options) {
                        questionData.options = q.options.map(opt => ({
                            text: opt.text,
                            is_correct: opt.is_correct
                        }));
                    }

                    // Add correct answer for true/false
                    if (q.question_type === 'true_false') {
                        questionData.correct_answer = q.correct_answer;
                    }

                    // Add sample answer for essay
                    if (q.question_type === 'essay') {
                        questionData.sample_answer = q.sample_answer;
                    }

                    // Add correct answers for fill_blank
                    if (q.question_type === 'fill_blank') {
                        questionData.correct_answers = q.correct_answers;
                    }

                    try {
                        await Question.create(questionData);
                        totalMarks += (q.points || 1);
                    } catch (questionError) {
                        console.error(`Error creating question ${i + 1}:`, questionError);
                        // Continue with other questions even if one fails
                    }
                }

                // Update test total_marks
                if (totalMarks > 0) {
                    await Test.update(testId, { total_marks: totalMarks });
                }
            }

            await ActivityLog.logDataChange(
                userId,
                'Create',
                'tests',
                testId,
                null,
                testData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Created test: ${testData.title} with ${req.body.questions?.length || 0} questions`
            );

            res.status(201).json({
                success: true,
                message: req.t('testCreatedSuccess'),
                data: { ...result.data, questions_created: req.body.questions?.length || 0 }
            });

        } catch (error) {
            console.error('Create test error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorCreatingTest'),
                error: error.message
            });
        }
    },

    async updateTest(req, res) {
        try {
            const { test_id } = req.params;
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            const test = await Test.findById(test_id);
            if (!test) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testNotFound')
                });
            }

            if (userRole === 'Instructor' && test.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionEditThisTest')
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionEditTest')
                });
            }

            // Map legacy field names to database schema
            const updateData = {};
            if (req.body.test_name) updateData.title = req.body.test_name;
            if (req.body.title) updateData.title = req.body.title;
            if (req.body.test_description) updateData.description = req.body.test_description;
            if (req.body.description) updateData.description = req.body.description;
            if (req.body.test_type) updateData.type = req.body.test_type;
            if (req.body.type) updateData.type = req.body.type;
            if (req.body.passing_score !== undefined) updateData.passing_marks = req.body.passing_score;
            if (req.body.passing_marks !== undefined) updateData.passing_marks = req.body.passing_marks;
            if (req.body.time_limit_minutes !== undefined) updateData.time_limit = req.body.time_limit_minutes;
            if (req.body.time_limit !== undefined) updateData.time_limit = req.body.time_limit;
            if (req.body.max_attempts !== undefined) updateData.attempts_allowed = req.body.max_attempts;
            if (req.body.attempts_allowed !== undefined) updateData.attempts_allowed = req.body.attempts_allowed;
            if (req.body.is_active !== undefined) updateData.status = req.body.is_active ? 'Active' : 'Inactive';
            if (req.body.status) updateData.status = req.body.status;
            if (req.body.show_results !== undefined) updateData.show_results = req.body.show_results;

            // Remove instructor_id from update data for security
            delete updateData.instructor_id;

            const result = await Test.update(test_id, updateData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                userId,
                'Update',
                'tests',
                test_id,
                test,
                updateData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Updated test: ${test.title}`
            );

            res.json({
                success: true,
                message: req.t('testUpdatedSuccess'),
                data: result.data
            });

        } catch (error) {
            console.error('Update test error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorUpdatingTest')
            });
        }
    },

    async deleteTest(req, res) {
        try {
            const { test_id } = req.params;
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            if (userRole !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionDeleteTest')
                });
            }

            const test = await Test.findById(test_id);
            if (!test) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testNotFound')
                });
            }

            const result = await Test.delete(test_id);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                userId,
                'Delete',
                'tests',
                test_id,
                test,
                null,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Deleted test: ${test.title}`
            );

            res.json({
                success: true,
                message: req.t('testDeletedSuccess')
            });

        } catch (error) {
            console.error('Delete test error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorDeletingTest')
            });
        }
    },

    async startTest(req, res) {
        try {
            const { test_id } = req.params;
            const userId = req.user.user_id;

            const test = await Test.findById(test_id);
            if (!test) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testNotFound')
                });
            }

            // Accept both 'Active' and 'Published' status
            if (test.status !== 'Active' && test.status !== 'Published') {
                return res.status(400).json({
                    success: false,
                    message: req.t('testNotActive')
                });
            }

            const existingAttempts = await Test.getUserAttempts(test_id, userId);
            if (existingAttempts.length >= (test.attempts_allowed || 1)) {
                return res.status(400).json({
                    success: false,
                    message: req.t('testAttemptsExceeded')
                });
            }

            const activeAttempt = existingAttempts.find(attempt => attempt.status === 'In_Progress');
            if (activeAttempt) {
                return res.status(400).json({
                    success: false,
                    message: req.t('testAttemptInProgress')
                });
            }

            const attemptData = {
                test_id: test_id,
                user_id: userId,
                start_time: new Date(),
                status: 'In_Progress'
            };

            const result = await Test.createAttempt(attemptData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'Start_Test',
                table_name: 'test_attempts',
                record_id: result.data.attempt_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Started test: ${test.title}`,
                severity: 'Info',
                module: 'Assessment'
            });

            const questions = await Question.findByTestId(test_id);

            res.json({
                success: true,
                message: req.t('testStartSuccess'),
                data: {
                    attempt: result.data,
                    test: test,
                    questions: questions
                }
            });

        } catch (error) {
            console.error('Start test error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorStartingTest')
            });
        }
    },

    async submitTest(req, res) {
        try {
            const { test_id, attempt_id } = req.params;
            const { answers, time_spent_seconds } = req.body;
            const userId = req.user.user_id;

            const test = await Test.findById(test_id);
            if (!test) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testNotFound')
                });
            }

            const attempt = await Test.getAttemptById(attempt_id);
            if (!attempt || attempt.user_id !== userId) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testAttemptNotFound')
                });
            }

            if (attempt.status !== 'In_Progress') {
                return res.status(400).json({
                    success: false,
                    message: req.t('testAttemptAlreadyCompleted')
                });
            }

            const result = await Test.submitAttempt(attempt_id, answers, time_spent_seconds);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'Submit_Test',
                table_name: 'test_attempts',
                record_id: attempt_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Submitted test: ${test.title}, Score: ${result.data.total_score}`,
                severity: 'Info',
                module: 'Assessment'
            });

            // Update course progress if test is linked to a course
            if (test.course_id) {
                await updateCourseProgressAfterTest(userId, test.course_id);
            }

            res.json({
                success: true,
                message: req.t('testSubmitSuccess'),
                data: result.data
            });

        } catch (error) {
            console.error('Submit test error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorSubmittingTest')
            });
        }
    },

    async getMyAttempts(req, res) {
        try {
            const { test_id } = req.params;
            const testIdInt = parseInt(test_id);
            const userId = req.user.user_id;

            if (isNaN(testIdInt)) {
                return res.status(400).json({
                    success: false,
                    message: req.t('invalidTestId')
                });
            }

            const attempts = await Test.getUserAttempts(testIdInt, userId);

            res.json({
                success: true,
                data: attempts
            });
        } catch (error) {
            console.error('Get my attempts error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingAttempts')
            });
        }
    },

    // Start test and redirect to test taking page (for page navigation, not API)
    async startTestAndRedirect(req, res) {
        try {
            const { test_id } = req.params;
            const testIdInt = parseInt(test_id);
            const userId = req.user.user_id;

            if (isNaN(testIdInt)) {
                return res.render('error/400', {
                    title: req.t('errorTitle'),
                    message: req.t('invalidTestId'),
                    user: req.session.user
                });
            }

            const test = await Test.findById(testIdInt);
            if (!test) {
                return res.render('error/404', {
                    title: req.t('pageNotFoundTitle'),
                    message: req.t('testNotFound'),
                    user: req.session.user
                });
            }

            if (test.status !== 'Active' && test.status !== 'Published') {
                return res.render('error/400', {
                    title: req.t('errorTitle'),
                    message: req.t('testNotActive'),
                    user: req.session.user
                });
            }

            // Check existing attempts
            const existingAttempts = await Test.getUserAttempts(testIdInt, userId);

            // If there's an active attempt in progress, redirect to it
            const activeAttempt = existingAttempts.find(attempt => attempt.status === 'In_Progress');
            if (activeAttempt) {
                return res.redirect(`/tests/${testIdInt}/${activeAttempt.attempt_id}/taking`);
            }

            // Check if user has exceeded max attempts
            // attempts_allowed = 0 means unlimited attempts
            const maxAttempts = test.attempts_allowed || 0;
            if (maxAttempts > 0 && existingAttempts.length >= maxAttempts) {
                return res.render('error/400', {
                    title: req.t('errorTitle'),
                    message: req.t('testAttemptsExceeded'),
                    user: req.session.user
                });
            }

            // Create new attempt
            const attemptData = {
                test_id: testIdInt,
                user_id: userId,
                start_time: new Date(),
                status: 'In_Progress'
            };

            const result = await Test.createAttempt(attemptData);

            if (!result.success) {
                return res.render('error/500', {
                    title: req.t('errorTitle'),
                    message: result.message || req.t('errorStartingTest'),
                    user: req.session.user
                });
            }

            // Log activity
            await ActivityLog.create({
                user_id: userId,
                action: 'Start_Test',
                table_name: 'test_attempts',
                record_id: result.data.attempt_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Started test: ${test.title}`,
                severity: 'Info',
                module: 'Assessment'
            });

            // Redirect to test taking page
            res.redirect(`/tests/${testIdInt}/${result.data.attempt_id}/taking`);

        } catch (error) {
            console.error('Start test and redirect error:', error);
            res.render('error/500', {
                title: req.t('errorTitle'),
                message: req.t('errorStartingTest'),
                user: req.session.user,
                error: error
            });
        }
    },

    async getTestResults(req, res) {
        try {
            const { test_id } = req.params;
            const userId = req.user.user_id;
            const userRole = req.user.role_name;

            const test = await Test.findById(test_id);
            if (!test) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testNotFound')
                });
            }

            let attempts = [];

            if (['Admin', 'Instructor'].includes(userRole)) {
                if (userRole === 'Instructor' && test.instructor_id !== userId) {
                    return res.status(403).json({
                        success: false,
                        message: req.t('noPermissionViewTestResults')
                    });
                }
                attempts = await Test.getAllAttempts(test_id);
            } else {
                attempts = await Test.getUserAttempts(test_id, userId);
            }

            res.json({
                success: true,
                data: {
                    test: test,
                    attempts: attempts
                }
            });

        } catch (error) {
            console.error('Get test results error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingTestResults')
            });
        }
    },

    async getTestStatistics(req, res) {
        try {
            const { test_id } = req.params;
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            const test = await Test.findById(test_id);
            if (!test) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testNotFound')
                });
            }

            if (userRole === 'Instructor' && test.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionViewTestStatistics')
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionViewStatistics')
                });
            }

            const stats = await Test.getTestStatistics(test_id);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Get test statistics error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingTestStatistics')
            });
        }
    },

    async renderTestsList(req, res) {
        try {
            res.render('tests/index', {
                title: req.t('testsListTitle'),
                user: req.session.user,
                userRole: req.user.role_name
            });

        } catch (error) {
            console.error('Render tests list error:', error);
            res.render('error/500', {
                title: req.t('errorTitle'),
                message: req.t('errorLoadingTestsListPage'),
                user: req.session.user,
                error: error
            });
        }
    },

    async renderCreateTest(req, res) {
        try {
            const { poolPromise, sql } = require('../config/database');

            // Fetch all published courses for the dropdown
            const pool = await poolPromise;
            const coursesResult = await pool.request().query(`
                SELECT course_id, title, category, status
                FROM courses
                WHERE status IN ('Published', 'Active')
                ORDER BY title
            `);

            // Fetch all positions for recruitment test selection
            const positionsResult = await pool.request().query(`
                SELECT position_id, position_name as name, department_id, is_active
                FROM positions
                WHERE is_active = 1 OR is_active IS NULL
                ORDER BY position_name
            `);

            res.render('tests/create', {
                title: req.t('createTestTitle'),
                user: req.session.user,
                userRole: req.user.role_name,
                courses: coursesResult.recordset || [],
                positions: positionsResult.recordset || []
            });

        } catch (error) {
            console.error('Render create test error:', error);
            res.render('error/500', {
                title: req.t('errorTitle'),
                message: req.t('errorLoadingCreateTestPage'),
                user: req.session.user,
                error: error
            });
        }
    },

    async renderTestDetail(req, res) {
        try {
            const { test_id } = req.params;

            const test = await Test.findById(test_id);
            if (!test) {
                return res.render('error/404', {
                    title: req.t('pageNotFoundTitle'),
                    user: req.session.user
                });
            }

            res.render('tests/detail', {
                title: `${test.title} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: req.user.role_name,
                test: test
            });

        } catch (error) {
            console.error('Render test detail error:', error);
            res.render('error/500', {
                title: req.t('errorTitle'),
                message: req.t('errorLoadingTestDetailPage'),
                user: req.session.user,
                error: error
            });
        }
    },

    async renderTestTaking(req, res) {
        try {
            const { test_id, attempt_id } = req.params;
            const userId = req.user.user_id;

            const test = await Test.findById(test_id);
            if (!test) {
                return res.render('error/404', {
                    title: req.t('pageNotFoundTitle'),
                    user: req.session.user
                });
            }

            const attempt = await Test.getAttemptById(attempt_id);
            if (!attempt || attempt.user_id !== userId) {
                return res.render('error/404', {
                    title: req.t('pageNotFoundTitle'),
                    user: req.session.user
                });
            }

            if (attempt.status !== 'In_Progress') {
                return res.redirect(`/tests/${test_id}/results`);
            }

            // Get questions with randomization based on test settings
            let questions = await Question.findByTestId(test_id, {
                randomizeQuestions: test.randomize_questions === true || test.randomize_questions === 1,
                randomizeOptions: test.randomize_options === true || test.randomize_options === 1
            });

            // Limit questions if questions_to_show is set
            if (test.questions_to_show && test.questions_to_show > 0 && questions.length > test.questions_to_show) {
                // Shuffle and take only the specified number of questions
                const shuffled = [...questions].sort(() => Math.random() - 0.5);
                questions = shuffled.slice(0, test.questions_to_show);
            }

            // Set custom layout for test taking page
            res.locals.layout = 'test-layout';

            res.render('tests/take', {
                title: `${req.t('takingTest')}: ${test.title} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: req.user.role_name,
                test: test,
                attempt: attempt,
                questions: questions,
                attemptId: attempt_id,
                layout: 'test-layout'
            });

        } catch (error) {
            console.error('Render test taking error:', error);
            res.render('error/500', {
                title: req.t('errorTitle'),
                message: req.t('errorLoadingTestTakingPage'),
                user: req.session.user,
                error: error
            });
        }
    },

    // API: Get chapters by course ID
    // Also supports course_materials as virtual chapters if no real chapters exist
    async getChaptersByCourse(req, res) {
        try {
            const { course_id } = req.params;

            if (!course_id) {
                return res.status(400).json({
                    success: false,
                    message: req.t('courseIdRequired')
                });
            }

            // First try to get real chapters
            const chapters = await Chapter.findByCourseId(parseInt(course_id));

            if (chapters && chapters.length > 0) {
                return res.json({
                    success: true,
                    data: chapters,
                    source: 'chapters'
                });
            }

            // If no chapters, get course_materials (all types for test assignment)
            const pool = await poolPromise;
            const materialsResult = await pool.request()
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT
                        material_id as chapter_id,
                        title,
                        content as description,
                        order_index,
                        'material' as source_type,
                        ISNULL(has_test, 0) as has_test
                    FROM course_materials
                    WHERE course_id = @courseId
                      AND type IN ('lesson', 'chapter', 'section')
                    ORDER BY order_index, material_id
                `);

            res.json({
                success: true,
                data: materialsResult.recordset,
                source: 'materials'
            });

        } catch (error) {
            console.error('Get chapters by course error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingChapters')
            });
        }
    },

    // API: Get lessons by chapter ID
    // Also supports course_materials as virtual lessons
    async getLessonsByChapter(req, res) {
        try {
            const { chapter_id } = req.params;
            const { source } = req.query; // 'chapters' or 'materials'

            if (!chapter_id) {
                return res.status(400).json({
                    success: false,
                    message: req.t('chapterIdRequired')
                });
            }

            // If source is materials, the chapter_id is actually a material_id
            // In this case, return empty since materials don't have sub-lessons
            if (source === 'materials') {
                return res.json({
                    success: true,
                    data: [],
                    message: 'Materials do not have sub-lessons'
                });
            }

            const lessons = await Lesson.findByChapterId(parseInt(chapter_id));

            res.json({
                success: true,
                data: lessons
            });

        } catch (error) {
            console.error('Get lessons by chapter error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingLessons')
            });
        }
    },

    // API: Get tests by course ID (for assessment structure display)
    async getTestsByCourse(req, res) {
        try {
            const { course_id } = req.params;

            if (!course_id) {
                return res.status(400).json({
                    success: false,
                    message: req.t('courseIdRequired') || 'Course ID is required'
                });
            }

            // Get all tests for this course
            const tests = await Test.findAll({
                course_id: parseInt(course_id),
                limit: 100 // Get all tests for the course
            });

            // Return tests with essential info (type, title, status)
            const testsSummary = tests.map(test => ({
                test_id: test.test_id,
                title: test.title,
                type: test.type,
                status: test.status,
                created_at: test.created_at
            }));

            res.json({
                success: true,
                data: testsSummary
            });

        } catch (error) {
            console.error('Get tests by course error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingTests') || 'Error loading tests'
            });
        }
    },

    // Render test results page
    async renderTestResults(req, res) {
        try {
            const { test_id } = req.params;
            let attemptId = req.query.attempt_id;
            const userId = req.user.user_id;
            const userRole = req.user.role_name;

            const test = await Test.findById(test_id);
            if (!test) {
                return res.render('error/404', {
                    title: req.t('pageNotFoundTitle'),
                    message: req.t('testNotFound'),
                    user: req.session.user
                });
            }

            // If no attempt_id specified, get the latest completed attempt for this user
            if (!attemptId) {
                const userAttempts = await Test.getUserAttempts(test_id, userId);
                const completedAttempts = userAttempts.filter(a => a.status === 'Completed');

                if (completedAttempts.length === 0) {
                    // No completed attempts, show list of all attempts or redirect
                    return res.render('tests/results', {
                        title: `${req.t('testResultsTitle')} - ${test.title}`,
                        user: req.session.user,
                        userRole: userRole,
                        test: test,
                        attemptId: null,
                        attempts: userAttempts,
                        noAttemptSelected: true
                    });
                }

                // Use the latest completed attempt
                attemptId = completedAttempts[0].attempt_id;
            }

            const attempt = await Test.getAttemptById(attemptId);
            if (!attempt) {
                return res.render('error/404', {
                    title: req.t('pageNotFoundTitle'),
                    message: req.t('testAttemptNotFound'),
                    user: req.session.user
                });
            }

            // Allow viewing if user owns the attempt or is admin/instructor
            if (attempt.user_id !== userId && !['Admin', 'Instructor'].includes(userRole)) {
                return res.render('error/403', {
                    title: req.t('accessDeniedTitle') || 'Access Denied',
                    message: req.t('noPermissionViewResults') || 'You do not have permission to view these results',
                    user: req.session.user
                });
            }

            // Get all attempts for this test by this user (for attempt selector)
            const userAttempts = await Test.getUserAttempts(test_id, attempt.user_id);

            res.render('tests/results', {
                title: `${req.t('testResultsTitle')} - ${test.title}`,
                user: req.session.user,
                userRole: userRole,
                test: test,
                attemptId: attemptId,
                attempts: userAttempts,
                noAttemptSelected: false
            });

        } catch (error) {
            console.error('Render test results error:', error);
            res.render('error/500', {
                title: req.t('errorTitle'),
                message: req.t('errorLoadingResults') || 'Error loading results',
                user: req.session.user,
                error: error
            });
        }
    },

    // Render test analytics page (Admin/Instructor only)
    async renderTestAnalytics(req, res) {
        try {
            const { test_id } = req.params;

            const test = await Test.findById(test_id);
            if (!test) {
                return res.render('error/404', {
                    title: req.t('pageNotFoundTitle'),
                    message: req.t('testNotFound'),
                    user: req.session.user
                });
            }

            res.render('tests/analytics', {
                title: `${req.t('testAnalyticsTitle') || 'สถิติแบบทดสอบ'} - ${test.title}`,
                user: req.session.user,
                userRole: req.user.role_name,
                test: test
            });

        } catch (error) {
            console.error('Render test analytics error:', error);
            res.render('error/500', {
                title: req.t('errorTitle'),
                message: req.t('errorLoadingAnalytics') || 'Error loading analytics',
                user: req.session.user,
                error: error
            });
        }
    },

    // API: Get test analytics data (Admin/Instructor only)
    async getTestAnalyticsAPI(req, res) {
        try {
            const userRole = req.user.role_name;
            const userId = req.user.user_id;
            const { test_id } = req.params;
            const { timeRange = 30 } = req.query;

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionViewAnalytics') || 'No permission to view analytics'
                });
            }

            const pool = await poolPromise;
            const days = parseInt(timeRange);
            const dateFilter = new Date();
            dateFilter.setDate(dateFilter.getDate() - days);

            // Build instructor filter for non-admin users
            let instructorFilter = '';
            const request = pool.request()
                .input('dateFilter', sql.DateTime, dateFilter)
                .input('testId', sql.Int, test_id || null);

            if (userRole === 'Instructor') {
                instructorFilter = ' AND t.instructor_id = @instructorId';
                request.input('instructorId', sql.Int, userId);
            }

            // Get key metrics
            const metricsResult = await request.query(`
                SELECT
                    COUNT(DISTINCT t.test_id) as totalTests,
                    (SELECT COUNT(*) FROM TestAttempts ta
                     INNER JOIN tests t2 ON ta.test_id = t2.test_id
                     WHERE ta.started_at >= @dateFilter ${instructorFilter.replace('t.', 't2.')}) as totalAttempts,
                    (SELECT AVG(CAST(ta.percentage AS FLOAT)) FROM TestAttempts ta
                     INNER JOIN tests t2 ON ta.test_id = t2.test_id
                     WHERE ta.status = 'Completed' AND ta.started_at >= @dateFilter ${instructorFilter.replace('t.', 't2.')}) as averageScore,
                    (SELECT CAST(COUNT(CASE WHEN ta.passed = 1 THEN 1 END) AS FLOAT) * 100 / NULLIF(COUNT(*), 0)
                     FROM TestAttempts ta
                     INNER JOIN tests t2 ON ta.test_id = t2.test_id
                     WHERE ta.status = 'Completed' AND ta.started_at >= @dateFilter ${instructorFilter.replace('t.', 't2.')}) as passRate
                FROM tests t
                WHERE t.status != 'Deleted' ${instructorFilter}
                    ${test_id ? ' AND t.test_id = @testId' : ''}
            `);

            const metrics = metricsResult.recordset[0];

            // Get performance over time (last 30 days)
            const performanceResult = await request.query(`
                SELECT
                    CONVERT(VARCHAR(10), ta.started_at, 120) as date,
                    AVG(CAST(ta.percentage AS FLOAT)) as avgScore,
                    CAST(COUNT(CASE WHEN ta.passed = 1 THEN 1 END) AS FLOAT) * 100 / NULLIF(COUNT(*), 0) as passRate
                FROM TestAttempts ta
                INNER JOIN tests t ON ta.test_id = t.test_id
                WHERE ta.status = 'Completed'
                    AND ta.started_at >= @dateFilter
                    ${instructorFilter}
                    ${test_id ? ' AND t.test_id = @testId' : ''}
                GROUP BY CONVERT(VARCHAR(10), ta.started_at, 120)
                ORDER BY date
            `);

            // Get score distribution
            const distributionResult = await request.query(`
                SELECT
                    CASE
                        WHEN ta.percentage <= 20 THEN 0
                        WHEN ta.percentage <= 40 THEN 1
                        WHEN ta.percentage <= 60 THEN 2
                        WHEN ta.percentage <= 80 THEN 3
                        ELSE 4
                    END as bucket,
                    COUNT(*) as count
                FROM TestAttempts ta
                INNER JOIN tests t ON ta.test_id = t.test_id
                WHERE ta.status = 'Completed'
                    AND ta.started_at >= @dateFilter
                    ${instructorFilter}
                    ${test_id ? ' AND t.test_id = @testId' : ''}
                GROUP BY CASE
                    WHEN ta.percentage <= 20 THEN 0
                    WHEN ta.percentage <= 40 THEN 1
                    WHEN ta.percentage <= 60 THEN 2
                    WHEN ta.percentage <= 80 THEN 3
                    ELSE 4
                END
                ORDER BY bucket
            `);

            // Convert to array format
            const scoreDistribution = [0, 0, 0, 0, 0];
            distributionResult.recordset.forEach(row => {
                scoreDistribution[row.bucket] = row.count;
            });

            // Get attempts by day
            const attemptsResult = await request.query(`
                SELECT
                    CONVERT(VARCHAR(10), ta.started_at, 120) as date,
                    COUNT(*) as attempts
                FROM TestAttempts ta
                INNER JOIN tests t ON ta.test_id = t.test_id
                WHERE ta.started_at >= @dateFilter
                    ${instructorFilter}
                    ${test_id ? ' AND t.test_id = @testId' : ''}
                GROUP BY CONVERT(VARCHAR(10), ta.started_at, 120)
                ORDER BY date
            `);

            // Get question types distribution
            const questionTypesResult = await request.query(`
                SELECT
                    q.question_type,
                    COUNT(*) as count
                FROM Questions q
                INNER JOIN tests t ON q.test_id = t.test_id
                WHERE t.status != 'Deleted'
                    ${instructorFilter}
                    ${test_id ? ' AND t.test_id = @testId' : ''}
                GROUP BY q.question_type
            `);

            const questionTypes = [0, 0, 0, 0]; // multiple_choice, true_false, essay, fill_blank
            questionTypesResult.recordset.forEach(row => {
                switch (row.question_type) {
                    case 'multiple_choice': questionTypes[0] = row.count; break;
                    case 'true_false': questionTypes[1] = row.count; break;
                    case 'essay': questionTypes[2] = row.count; break;
                    case 'fill_blank': questionTypes[3] = row.count; break;
                }
            });

            // Get top performing tests
            const topTestsResult = await request.query(`
                SELECT TOP 5
                    t.test_id,
                    t.title,
                    AVG(CAST(ta.percentage AS FLOAT)) as avgScore,
                    COUNT(ta.attempt_id) as attempts
                FROM tests t
                INNER JOIN TestAttempts ta ON t.test_id = ta.test_id
                WHERE ta.status = 'Completed'
                    AND ta.started_at >= @dateFilter
                    ${instructorFilter}
                GROUP BY t.test_id, t.title
                HAVING COUNT(ta.attempt_id) >= 3
                ORDER BY avgScore DESC
            `);

            // Get challenging tests
            const challengingTestsResult = await request.query(`
                SELECT TOP 5
                    t.test_id,
                    t.title,
                    AVG(CAST(ta.percentage AS FLOAT)) as avgScore,
                    COUNT(ta.attempt_id) as attempts
                FROM tests t
                INNER JOIN TestAttempts ta ON t.test_id = ta.test_id
                WHERE ta.status = 'Completed'
                    AND ta.started_at >= @dateFilter
                    ${instructorFilter}
                GROUP BY t.test_id, t.title
                HAVING COUNT(ta.attempt_id) >= 3
                ORDER BY avgScore ASC
            `);

            // Get all tests with stats for the table
            const testsResult = await request.query(`
                SELECT
                    t.test_id,
                    t.title,
                    t.status,
                    c.title as course_title,
                    COUNT(ta.attempt_id) as attempts,
                    AVG(CAST(ta.percentage AS FLOAT)) as avgScore,
                    CAST(COUNT(CASE WHEN ta.passed = 1 THEN 1 END) AS FLOAT) * 100 / NULLIF(COUNT(ta.attempt_id), 0) as passRate
                FROM tests t
                LEFT JOIN courses c ON t.course_id = c.course_id
                LEFT JOIN TestAttempts ta ON t.test_id = ta.test_id AND ta.status = 'Completed'
                WHERE t.status != 'Deleted'
                    ${instructorFilter}
                    ${test_id ? ' AND t.test_id = @testId' : ''}
                GROUP BY t.test_id, t.title, t.status, c.title, t.created_at
                ORDER BY t.created_at DESC
            `);

            res.json({
                success: true,
                data: {
                    metrics: {
                        totalTests: metrics.totalTests || 0,
                        totalAttempts: metrics.totalAttempts || 0,
                        averageScore: Math.round(metrics.averageScore || 0),
                        passRate: Math.round(metrics.passRate || 0)
                    },
                    trends: {
                        testsTrend: 0,
                        attemptsTrend: 0,
                        scoreTrend: 0,
                        passTrend: 0
                    },
                    performance: {
                        labels: performanceResult.recordset.map(r => r.date),
                        scores: performanceResult.recordset.map(r => Math.round(r.avgScore || 0)),
                        passRates: performanceResult.recordset.map(r => Math.round(r.passRate || 0))
                    },
                    scoreDistribution: scoreDistribution,
                    attempts: {
                        labels: attemptsResult.recordset.map(r => r.date),
                        data: attemptsResult.recordset.map(r => r.attempts)
                    },
                    questionTypes: questionTypes,
                    departments: {
                        labels: [],
                        scores: []
                    },
                    topTests: topTestsResult.recordset,
                    challengingTests: challengingTestsResult.recordset,
                    tests: testsResult.recordset
                }
            });

        } catch (error) {
            console.error('Get test analytics API error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingAnalytics') || 'Error loading analytics'
            });
        }
    },

    // API: Get detailed attempt results
    async getAttemptResultsAPI(req, res) {
        try {
            const { attempt_id } = req.params;
            const userId = req.user.user_id;

            const attempt = await Test.getAttemptById(attempt_id);
            if (!attempt) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testAttemptNotFound')
                });
            }

            // Check if user owns this attempt or is admin/instructor
            const userRole = req.user.role_name;
            if (attempt.user_id !== userId && !['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionViewResults') || 'No permission to view these results'
                });
            }

            const results = await Test.getAttemptResults(attempt_id);
            if (!results) {
                return res.status(404).json({
                    success: false,
                    message: req.t('resultsNotFound') || 'Results not found'
                });
            }

            res.json({
                success: true,
                data: results
            });

        } catch (error) {
            console.error('Get attempt results API error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingResults') || 'Error loading results'
            });
        }
    }
};

module.exports = testController;
