const Test = require('../models/Test');
const Question = require('../models/Question');
const TestBank = require('../models/TestBank');
const ActivityLog = require('../models/ActivityLog');
const Chapter = require('../models/Chapter');
const Lesson = require('../models/Lesson');

const testController = {
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
            const userId = req.user.user_id;
            const userRole = req.user.role_name;

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
                    message: req.t('noPermissionAccessTest')
                });
            }

            const questions = await Question.findByTestId(test_id);

            await ActivityLog.create({
                user_id: userId,
                action: 'View_Test',
                table_name: 'tests',
                record_id: test_id,
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
                show_score_breakdown: req.body.show_score_breakdown !== undefined ? req.body.show_score_breakdown : true
            };

            const result = await Test.create(testData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                userId,
                'Create',
                'tests',
                result.data.test_id,
                null,
                testData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Created test: ${testData.title}`
            );

            res.status(201).json({
                success: true,
                message: req.t('testCreatedSuccess'),
                data: result.data
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

            if (test.status !== 'Active') {
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
            const { answers } = req.body;
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

            const result = await Test.submitAttempt(attempt_id, answers);

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

            res.render('tests/create', {
                title: req.t('createTestTitle'),
                user: req.session.user,
                userRole: req.user.role_name,
                courses: coursesResult.recordset || []
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

            const questions = await Question.findByTestId(test_id);

            res.render('tests/taking', {
                title: `${req.t('takingTest')}: ${test.title} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: req.user.role_name,
                test: test,
                attempt: attempt,
                questions: questions
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
    async getChaptersByCourse(req, res) {
        try {
            const { course_id } = req.params;

            if (!course_id) {
                return res.status(400).json({
                    success: false,
                    message: req.t('courseIdRequired')
                });
            }

            const chapters = await Chapter.findByCourseId(parseInt(course_id));

            res.json({
                success: true,
                data: chapters
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
    async getLessonsByChapter(req, res) {
        try {
            const { chapter_id } = req.params;

            if (!chapter_id) {
                return res.status(400).json({
                    success: false,
                    message: req.t('chapterIdRequired')
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
    }
};

module.exports = testController;
