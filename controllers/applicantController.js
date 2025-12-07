const Applicant = require('../models/Applicant');
const JobPosition = require('../models/JobPosition');
const Test = require('../models/Test');
const Question = require('../models/Question');
const ActivityLog = require('../models/ActivityLog');
const { t } = require('../utils/languages');

const applicantController = {
    async registerApplicant(req, res) {
        try {
            const {
                position_id,
                national_id,
                first_name,
                last_name,
                email,
                phone,
                address
            } = req.body;

            if (!national_id || national_id.length !== 13) {
                return res.status(400).json({
                    success: false,
                    message: req.t('pleaseEnterIdCard13Digits')
                });
            }

            const position = await JobPosition.findById(position_id);
            if (!position || !position.is_active) {
                return res.status(400).json({
                    success: false,
                    message: req.t('positionNotFound')
                });
            }

            const existingApplicant = await Applicant.findByNationalIdAndPosition(national_id, position_id);
            if (existingApplicant) {
                return res.status(400).json({
                    success: false,
                    message: req.t('alreadyAppliedForPosition')
                });
            }

            const applicantData = {
                position_id,
                national_id,
                first_name,
                last_name,
                email,
                phone,
                address,
                application_date: new Date(),
                status: 'Pending'
            };

            const result = await Applicant.create(applicantData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: null,
                action: 'Register_Applicant',
                table_name: 'Applicants',
                record_id: result.data.applicant_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Applicant registered for position: ${position.position_name}`,
                severity: 'Info',
                module: 'HR Testing'
            });

            res.status(201).json({
                success: true,
                message: req.t('applicationSuccess'),
                data: {
                    applicant_id: result.data.applicant_id,
                    test_code: result.data.test_code
                }
            });

        } catch (error) {
            console.error('Register applicant error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorEnrolling')
            });
        }
    },

    async getApplicantByTestCode(req, res) {
        try {
            const { test_code } = req.params;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testCodeNotFound')
                });
            }

            // Check if applicant has completed a test
            const attempts = await Test.getApplicantAttempts(applicant.applicant_id);
            const completedAttempt = attempts.find(a => a.status === 'Completed');
            const hasCompletedTest = !!completedAttempt;

            // Check if status allows testing
            const canTakeTest = applicant.status === 'Pending' && !hasCompletedTest;

            const sanitizedData = {
                applicant_id: applicant.applicant_id,
                first_name: applicant.first_name,
                last_name: applicant.last_name,
                position_name: applicant.position_name,
                department_name: applicant.department_name,
                status: applicant.status,
                application_date: applicant.application_date,
                test_completed: hasCompletedTest,
                test_score: completedAttempt ? completedAttempt.percentage : null,
                test_taken_at: completedAttempt ? completedAttempt.completed_at : null,
                can_take_test: canTakeTest,
                test_status_message: !canTakeTest ? (hasCompletedTest
                    ? (req.t('testAlreadyCompleted') || 'คุณได้ทำแบบทดสอบไปแล้ว')
                    : (req.t('applicationStatusNotAllowTest') || 'สถานะใบสมัครไม่อนุญาตให้ทำแบบทดสอบ'))
                    : null
            };

            res.json({
                success: true,
                data: sanitizedData
            });

        } catch (error) {
            console.error('Get applicant by test code error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorSearchingData')
            });
        }
    },

    async startApplicantTest(req, res) {
        try {
            const { test_code } = req.params;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testCodeNotFound')
                });
            }

            if (applicant.status !== 'Pending') {
                return res.status(400).json({
                    success: false,
                    message: req.t('applicationStatusNotAllowTest') || 'สถานะใบสมัครไม่อนุญาตให้ทำแบบทดสอบ'
                });
            }

            const tests = await Test.findByJobPosition(applicant.position_id);
            if (!tests || tests.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: req.t('testNotFoundForPosition')
                });
            }

            // Check for existing attempts
            const existingAttempts = await Test.getApplicantAttempts(applicant.applicant_id);

            // Check if already completed a test
            const completedAttempt = existingAttempts.find(attempt => attempt.status === 'Completed');
            if (completedAttempt) {
                return res.status(400).json({
                    success: false,
                    message: req.t('testAlreadyCompleted') || 'คุณได้ทำแบบทดสอบไปแล้ว',
                    redirect_url: `/applicants/result/${test_code}`
                });
            }

            // Check for in-progress attempt
            const activeAttempt = existingAttempts.find(attempt => attempt.status === 'In_Progress');

            if (activeAttempt) {
                const questions = await Question.findByTestId(activeAttempt.test_id);
                return res.json({
                    success: true,
                    message: req.t('foundIncompleteTest'),
                    data: {
                        attempt: activeAttempt,
                        test: {
                            test_id: activeAttempt.test_id,
                            title: activeAttempt.test_title,
                            time_limit: activeAttempt.time_limit,
                            passing_score: activeAttempt.passing_marks,
                            total_marks: activeAttempt.total_marks,
                            total_questions: activeAttempt.total_questions
                        },
                        questions: questions,
                        applicant: {
                            applicant_id: applicant.applicant_id,
                            first_name: applicant.first_name,
                            last_name: applicant.last_name
                        }
                    }
                });
            }

            const test = tests[0];
            const attemptData = {
                test_id: test.test_id,
                applicant_id: applicant.applicant_id,
                start_time: new Date(),
                status: 'In_Progress'
            };

            const attemptResult = await Test.createApplicantAttempt(attemptData);

            if (!attemptResult.success) {
                return res.status(400).json(attemptResult);
            }

            await ActivityLog.create({
                user_id: null,
                action: 'Start_Applicant_Test',
                table_name: 'TestAttempts',
                record_id: attemptResult.data.attempt_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Applicant started test: ${test.test_name}`,
                severity: 'Info',
                module: 'HR Testing'
            });

            const questions = await Question.findByTestId(test.test_id);

            res.json({
                success: true,
                message: req.t('testStartedSuccessfully'),
                data: {
                    attempt: attemptResult.data,
                    test: {
                        test_id: test.test_id,
                        title: test.title,
                        time_limit: test.time_limit,
                        passing_score: test.passing_marks,
                        total_marks: test.total_marks,
                        total_questions: test.question_count
                    },
                    questions: questions,
                    applicant: {
                        applicant_id: applicant.applicant_id,
                        first_name: applicant.first_name,
                        last_name: applicant.last_name
                    }
                }
            });

        } catch (error) {
            console.error('Start applicant test error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorStartingTest')
            });
        }
    },

    async submitApplicantTest(req, res) {
        try {
            const { test_code } = req.params;
            const { answers, marked_questions, time_taken, submission_type } = req.body;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testCodeNotFound')
                });
            }

            // Find attempts for this applicant
            const attempts = await Test.getApplicantAttempts(applicant.applicant_id);

            // Check if already has a completed attempt
            const completedAttempt = attempts.find(a => a.status === 'Completed');
            if (completedAttempt) {
                return res.status(400).json({
                    success: false,
                    message: req.t('testAlreadyCompleted') || 'คุณได้ทำแบบทดสอบไปแล้ว',
                    redirect_url: `/applicants/result/${test_code}`
                });
            }

            // Find active attempt
            const attempt = attempts.find(a => a.status === 'In_Progress');

            if (!attempt) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testAttemptNotFound')
                });
            }

            const attempt_id = attempt.attempt_id;

            const result = await Test.submitApplicantAttempt(attempt_id, answers, time_taken);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await Applicant.updateTestResults(applicant.applicant_id, {
                test_completed: true,
                test_score: result.data.total_score,
                test_taken_at: new Date(),
                status: result.data.status
            });

            await ActivityLog.create({
                user_id: null,
                action: 'Submit_Applicant_Test',
                table_name: 'TestAttempts',
                record_id: attempt_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Applicant submitted test, Score: ${result.data.total_score}`,
                severity: 'Info',
                module: 'HR Testing'
            });

            res.json({
                success: true,
                message: req.t('testSubmittedSuccessfully'),
                data: {
                    score: result.data.total_score,
                    status: result.data.status,
                    passed: result.data.status === 'Passed'
                }
            });

        } catch (error) {
            console.error('Submit applicant test error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorSubmittingTest')
            });
        }
    },

    async autosaveApplicantTest(req, res) {
        try {
            const { test_code } = req.params;
            const { answers, marked_questions, current_question, time_remaining } = req.body;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: 'Test code not found'
                });
            }

            // Store auto-save data in session or database
            // For now, just acknowledge the save
            res.json({
                success: true,
                message: 'Progress saved'
            });

        } catch (error) {
            console.error('Autosave applicant test error:', error);
            res.status(500).json({
                success: false,
                message: 'Error saving progress'
            });
        }
    },

    async logTestActivity(req, res) {
        try {
            const { test_code } = req.params;
            const { activity_type, data, timestamp } = req.body;

            // Log suspicious activity
            console.log(`[Test Activity] ${test_code}: ${activity_type}`, data, timestamp);

            // Could store in database for monitoring
            res.json({
                success: true,
                message: 'Activity logged'
            });

        } catch (error) {
            console.error('Log test activity error:', error);
            res.status(500).json({
                success: false,
                message: 'Error logging activity'
            });
        }
    },

    async getAllApplicants(req, res) {
        try {
            const userRole = req.user.role_name;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionToAccessThisData')
                });
            }

            const {
                position_id,
                test_completed,
                search,
                page = 1,
                limit = 20
            } = req.query;

            const filters = {};
            if (position_id) {filters.position_id = position_id;}
            // Only set test_completed filter when explicitly 'true' or 'false', not empty string
            if (test_completed === 'true' || test_completed === 'false') {
                filters.test_completed = test_completed === 'true';
            }
            if (search) {filters.search = search;}

            const offset = (parseInt(page) - 1) * parseInt(limit);
            filters.limit = parseInt(limit);
            filters.offset = offset;

            const result = await Applicant.findAll(filters);

            await ActivityLog.create({
                user_id: req.user.user_id,
                action: 'View_Applicants',
                table_name: 'Applicants',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `${userRole} viewed applicants list`,
                severity: 'Info',
                module: 'HR Testing'
            });

            res.json({
                success: true,
                data: result.data,
                pagination: {
                    page: result.page,
                    limit: parseInt(limit),
                    total: result.total,
                    totalPages: result.totalPages
                }
            });

        } catch (error) {
            console.error('Get all applicants error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingApplicantList')
            });
        }
    },

    async getApplicantById(req, res) {
        try {
            const { applicant_id } = req.params;
            const userRole = req.user.role_name;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionToAccessThisData')
                });
            }

            const applicant = await Applicant.findById(applicant_id);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: req.t('applicantNotFound')
                });
            }

            const attempts = await Test.getApplicantAttempts(applicant_id);

            res.json({
                success: true,
                data: {
                    applicant: applicant,
                    test_attempts: attempts
                }
            });

        } catch (error) {
            console.error('Get applicant by id error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingApplicantData')
            });
        }
    },

    async getApplicantStatistics(req, res) {
        try {
            const { position_id } = req.query;
            const userRole = req.user.role_name;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionToViewStatistics')
                });
            }

            let stats;
            if (position_id) {
                stats = await JobPosition.getPositionStatistics(position_id);
            } else {
                stats = await Applicant.getOverallStatistics();
            }

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Get applicant statistics error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingStatistics')
            });
        }
    },

    async renderTestLogin(req, res) {
        try {
            res.render('applicants/test-login', {
                title: req.t('loginToTestSystem') + ' - Rukchai Hongyen LearnHub',
                layout: false
            });

        } catch (error) {
            console.error('Render test login error:', error);
            res.render('error/500', {
                title: req.t('errorOccurred') + ' - Rukchai Hongyen LearnHub',
                message: req.t('cannotLoadLoginPage'),
                layout: false,
                error: error
            });
        }
    },

    async renderTestInterface(req, res) {
        try {
            const { test_code } = req.params;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.render('error/404', {
                    title: req.t('pageNotFound') + ' - Rukchai Hongyen LearnHub',
                    layout: false
                });
            }

            // Check if applicant has completed a test
            const attempts = await Test.getApplicantAttempts(applicant.applicant_id);
            const completedAttempt = attempts.find(a => a.status === 'Completed');

            if (completedAttempt) {
                // Already completed - redirect to result page
                return res.redirect(`/applicants/result/${test_code}`);
            }

            // Check if status allows testing
            if (applicant.status !== 'Pending') {
                return res.render('error/403', {
                    title: req.t('accessDenied') + ' - Rukchai Hongyen LearnHub',
                    layout: false,
                    message: req.t('applicationStatusNotAllowTest') || 'สถานะใบสมัครไม่อนุญาตให้ทำแบบทดสอบ'
                });
            }

            res.render('applicants/test-interface', {
                title: req.t('testingSystem') + ' - Rukchai Hongyen LearnHub',
                layout: false,
                applicant: {
                    first_name: applicant.first_name,
                    last_name: applicant.last_name,
                    position_name: applicant.position_name
                },
                test_code: test_code
            });

        } catch (error) {
            console.error('Render test interface error:', error);
            res.render('error/500', {
                title: req.t('errorOccurred') + ' - Rukchai Hongyen LearnHub',
                message: req.t('cannotLoadTestSystem'),
                layout: false,
                error: error
            });
        }
    },

    async renderTestResult(req, res) {
        try {
            const { test_code } = req.params;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.render('error/404', {
                    title: req.t('pageNotFound') + ' - Rukchai Hongyen LearnHub',
                    layout: false
                });
            }

            // Get the latest completed attempt
            const attempts = await Test.getApplicantAttempts(applicant.applicant_id);
            const completedAttempt = attempts.find(a => a.status === 'Completed');

            if (!completedAttempt) {
                return res.render('error/404', {
                    title: req.t('pageNotFound') + ' - Rukchai Hongyen LearnHub',
                    layout: false,
                    message: req.t('testResultNotFound') || 'Test result not found'
                });
            }

            res.render('applicants/test-result', {
                title: req.t('testResult') + ' - Rukchai Hongyen LearnHub',
                layout: false,
                applicant: {
                    first_name: applicant.first_name,
                    last_name: applicant.last_name,
                    position_name: applicant.position_name
                },
                result: {
                    score: completedAttempt.score,
                    percentage: completedAttempt.percentage,
                    passed: completedAttempt.passed,
                    time_spent: completedAttempt.time_spent_seconds,
                    completed_at: completedAttempt.completed_at
                },
                test_code: test_code
            });

        } catch (error) {
            console.error('Render test result error:', error);
            res.render('error/500', {
                title: req.t('errorOccurred') + ' - Rukchai Hongyen LearnHub',
                message: req.t('cannotLoadTestResult') || 'Cannot load test result',
                layout: false,
                error: error
            });
        }
    },

    async renderApplicantManagement(req, res) {
        try {
            console.log('🔍 renderApplicantManagement - req.user:', req.user);
            console.log('🔍 renderApplicantManagement - role_name:', req.user?.role_name);
            const userRole = req.user.role_name;

            console.log('🔍 Checking role:', userRole, 'against:', ['Admin', 'HR']);
            console.log('🔍 Match:', ['Admin', 'HR'].includes(userRole));

            if (!['Admin', 'HR'].includes(userRole)) {
                console.log('❌ Access denied for role:', userRole);
                return res.render('error/403', {
                    title: req.t('noPermissionToAccess') + ' - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }
            console.log('✅ Access granted for role:', userRole);

            const positions = await JobPosition.findAll({ is_active: true });

            res.render('applicants/management', {
                title: req.t('manageJobApplicants') + ' - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: userRole,
                positions: positions
            });

        } catch (error) {
            console.error('Render applicant management error:', error);
            res.render('error/500', {
                title: req.t('errorOccurred') + ' - Rukchai Hongyen LearnHub',
                message: req.t('cannotLoadApplicantManagementPage'),
                user: req.session.user,
                error: error
            });
        }
    },

    async renderApplicantDetail(req, res) {
        try {
            const { applicant_id } = req.params;
            const userRole = req.user.role_name;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.render('error/403', {
                    title: req.t('noPermissionToAccess') + ' - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

            const applicant = await Applicant.findById(applicant_id);
            if (!applicant) {
                return res.render('error/404', {
                    title: req.t('pageNotFound') + ' - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

            // Get test attempts for this applicant
            const attempts = await Test.getApplicantAttempts(applicant_id);

            res.render('applicants/detail', {
                title: `${applicant.first_name} ${applicant.last_name} - ${req.t('applicantDetail') || 'รายละเอียดผู้สมัคร'} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: userRole,
                applicant: applicant,
                testAttempts: attempts || []
            });

        } catch (error) {
            console.error('Render applicant detail error:', error);
            res.render('error/500', {
                title: req.t('errorOccurred') + ' - Rukchai Hongyen LearnHub',
                message: req.t('cannotLoadApplicantDetailPage') || 'ไม่สามารถโหลดหน้ารายละเอียดผู้สมัครได้',
                user: req.session.user,
                error: error
            });
        }
    }
};

module.exports = applicantController;