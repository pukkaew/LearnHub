const Applicant = require('../models/Applicant');
const JobPosition = require('../models/JobPosition');
const Test = require('../models/Test');
const Question = require('../models/Question');
const ActivityLog = require('../models/ActivityLog');
const PositionTestSet = require('../models/PositionTestSet');
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

            // อัพเดทผลการสอบ แต่ไม่เปลี่ยน status (HR จะเป็นผู้ตัดสินใจ)
            await Applicant.updateTestResults(applicant.applicant_id, {
                test_completed: true,
                test_score: result.data.total_score,
                test_taken_at: new Date()
                // ไม่ส่ง status - ให้คงเป็น Pending จนกว่า HR จะเปลี่ยน
            });

            // Sync กับ ApplicantTestProgress (สำหรับ Dashboard)
            await PositionTestSet.updateApplicantTestStatus(
                applicant.applicant_id,
                attempt.test_id,
                {
                    status: 'completed',
                    attempt_id: attempt_id,
                    score: result.data.total_score,
                    percentage: result.data.percentage,
                    passed: result.data.passed,
                    completed_at: new Date(),
                    time_spent_seconds: time_taken
                }
            );

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

            // Calculate overall result to check if all tests are completed
            const overallResult = await PositionTestSet.calculateApplicantOverallResult(
                applicant.applicant_id,
                applicant.position_id
            );

            res.json({
                success: true,
                message: req.t('testSubmittedSuccessfully'),
                data: {
                    score: result.data.total_score,
                    status: result.data.status,
                    passed: result.data.status === 'Passed',
                    overall: overallResult.data
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
            const { test_id } = req.query;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.render('error/404', {
                    title: req.t('pageNotFound') + ' - Rukchai Hongyen LearnHub',
                    layout: false
                });
            }

            // Check if status allows testing
            if (applicant.status !== 'Pending') {
                return res.render('error/403', {
                    title: req.t('accessDenied') + ' - Rukchai Hongyen LearnHub',
                    layout: false,
                    message: req.t('applicationStatusNotAllowTest') || 'สถานะใบสมัครไม่อนุญาตให้ทำแบบทดสอบ'
                });
            }

            // If test_id is provided, check only that specific test
            if (test_id) {
                const testProgress = await PositionTestSet.getApplicantTestProgress(
                    applicant.applicant_id,
                    applicant.position_id
                );
                const targetTest = testProgress.find(t => t.test_id === parseInt(test_id));

                // If specific test is already completed, redirect to dashboard
                if (targetTest && targetTest.status === 'completed') {
                    return res.redirect(`/applicants/dashboard/${test_code}`);
                }
            } else {
                // Legacy behavior: no test_id means single-test mode
                // Check if ALL tests are completed
                const testProgress = await PositionTestSet.getApplicantTestProgress(
                    applicant.applicant_id,
                    applicant.position_id
                );
                const allCompleted = testProgress.length > 0 &&
                    testProgress.every(t => t.status === 'completed');

                if (allCompleted) {
                    return res.redirect(`/applicants/result/${test_code}`);
                }
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
    },

    // ============ Multi-Test Dashboard Functions ============

    /**
     * Render applicant dashboard showing all tests
     */
    async renderApplicantDashboard(req, res) {
        try {
            const { test_code } = req.params;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.render('error/404', {
                    title: 'ไม่พบข้อมูล - Rukchai Hongyen LearnHub',
                    layout: false
                });
            }

            res.render('applicants/dashboard', {
                title: 'ศูนย์ทดสอบผู้สมัครงาน - Rukchai Hongyen LearnHub',
                layout: false,
                applicant: applicant,
                test_code: test_code
            });

        } catch (error) {
            console.error('Render applicant dashboard error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดหน้า Dashboard ได้',
                layout: false,
                error: error
            });
        }
    },

    /**
     * Get applicant test progress (API)
     */
    async getApplicantTestProgress(req, res) {
        try {
            const { test_code } = req.params;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบรหัสทดสอบ'
                });
            }

            // Initialize tests for applicant if not already done
            const initResult = await PositionTestSet.initializeApplicantTests(
                applicant.applicant_id,
                applicant.position_id
            );

            // Get test progress
            const testProgress = await PositionTestSet.getApplicantTestProgress(
                applicant.applicant_id,
                applicant.position_id
            );

            // Calculate overall result
            const overallResult = await PositionTestSet.calculateApplicantOverallResult(
                applicant.applicant_id,
                applicant.position_id
            );

            res.json({
                success: true,
                data: {
                    tests: testProgress,
                    total_tests: overallResult.data?.total_tests || testProgress.length,
                    completed_tests: overallResult.data?.completed_tests || 0,
                    passed_tests: overallResult.data?.passed_tests || 0,
                    required_tests: overallResult.data?.required_tests || 0,
                    required_passed: overallResult.data?.required_passed || 0,
                    average_score: overallResult.data?.average_score || null,
                    overall_passed: overallResult.data?.overall_passed || false,
                    pass_reason: overallResult.data?.pass_reason || '',
                    is_complete: overallResult.data?.is_complete || false
                }
            });

        } catch (error) {
            console.error('Get applicant test progress error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
            });
        }
    },

    /**
     * Start a specific test from test set
     */
    async startSpecificTest(req, res) {
        try {
            const { test_code } = req.params;
            const { test_id } = req.query;

            if (!test_id) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณาระบุข้อสอบ'
                });
            }

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบรหัสทดสอบ'
                });
            }

            // Check if test is assigned to this applicant's position
            const testProgress = await PositionTestSet.getApplicantTestProgress(
                applicant.applicant_id,
                applicant.position_id
            );

            const targetTest = testProgress.find(t => t.test_id === parseInt(test_id));
            if (!targetTest) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อสอบนี้ไม่ได้กำหนดไว้สำหรับตำแหน่งของคุณ'
                });
            }

            // Check if already completed
            if (targetTest.status === 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'คุณได้ทำข้อสอบนี้ไปแล้ว'
                });
            }

            // Get test data
            const test = await Test.findById(test_id, true);
            if (!test) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบข้อสอบ'
                });
            }

            // Create or get attempt
            let attempt;
            if (targetTest.attempt_id) {
                attempt = await Test.getApplicantAttemptById(targetTest.attempt_id);
            }

            if (!attempt || attempt.status === 'Completed') {
                // Create new attempt
                const attemptResult = await Test.createApplicantAttempt({
                    test_id: test_id,
                    applicant_id: applicant.applicant_id,
                    start_time: new Date(),
                    status: 'In_Progress'
                });

                if (!attemptResult.success) {
                    return res.status(400).json(attemptResult);
                }

                attempt = attemptResult.data;

                // Update progress
                await PositionTestSet.updateApplicantTestStatus(
                    applicant.applicant_id,
                    test_id,
                    {
                        status: 'in_progress',
                        attempt_id: attempt.attempt_id,
                        started_at: new Date()
                    }
                );
            }

            // Get questions
            const questions = await Question.findByTestId(test_id);

            res.json({
                success: true,
                data: {
                    attempt: attempt,
                    test: {
                        test_id: test.test_id,
                        title: test.title,
                        description: test.description,
                        time_limit: test.time_limit,
                        passing_score: targetTest.passing_score_override || test.passing_marks,
                        total_marks: test.total_marks,
                        total_questions: questions.length
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
            console.error('Start specific test error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการเริ่มข้อสอบ'
            });
        }
    },

    /**
     * Submit a specific test from test set
     */
    async submitSpecificTest(req, res) {
        try {
            const { test_code } = req.params;
            const { test_id, answers, time_taken } = req.body;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบรหัสทดสอบ'
                });
            }

            // Get test progress
            const testProgress = await PositionTestSet.getApplicantTestProgress(
                applicant.applicant_id,
                applicant.position_id
            );

            const targetTest = testProgress.find(t => t.test_id === parseInt(test_id));
            if (!targetTest || !targetTest.attempt_id) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่พบข้อมูลการสอบ'
                });
            }

            // Submit the attempt
            const result = await Test.submitApplicantAttempt(
                targetTest.attempt_id,
                answers,
                time_taken
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Update progress
            await PositionTestSet.updateApplicantTestStatus(
                applicant.applicant_id,
                test_id,
                {
                    status: 'completed',
                    score: result.data.total_score,
                    percentage: result.data.percentage,
                    passed: result.data.passed,
                    completed_at: new Date(),
                    time_spent_seconds: time_taken
                }
            );

            // Log activity
            await ActivityLog.create({
                user_id: null,
                action: 'Submit_Applicant_Test',
                table_name: 'ApplicantTestProgress',
                record_id: targetTest.progress_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Applicant submitted test ${test_id}, Score: ${result.data.percentage}%`,
                severity: 'Info',
                module: 'HR Testing'
            });

            // Calculate overall result
            const overallResult = await PositionTestSet.calculateApplicantOverallResult(
                applicant.applicant_id,
                applicant.position_id
            );

            res.json({
                success: true,
                message: 'ส่งข้อสอบสำเร็จ',
                data: {
                    test_result: {
                        score: result.data.total_score,
                        percentage: result.data.percentage,
                        passed: result.data.passed,
                        correct_count: result.data.correct_count,
                        total_questions: result.data.total_questions
                    },
                    overall: overallResult.data
                }
            });

        } catch (error) {
            console.error('Submit specific test error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการส่งข้อสอบ'
            });
        }
    },

    /**
     * Render overall result page (multi-test)
     */
    async renderOverallResult(req, res) {
        try {
            const { test_code } = req.params;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.render('error/404', {
                    title: 'ไม่พบข้อมูล - Rukchai Hongyen LearnHub',
                    layout: false
                });
            }

            res.render('applicants/overall-result', {
                title: 'สรุปผลการทดสอบ - Rukchai Hongyen LearnHub',
                layout: false,
                applicant: applicant,
                test_code: test_code
            });

        } catch (error) {
            console.error('Render overall result error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดหน้าผลการทดสอบได้',
                layout: false,
                error: error
            });
        }
    },

    /**
     * Get applicant info with test_code (enhanced for dashboard with multi-test support)
     */
    async getApplicantInfoForDashboard(req, res) {
        try {
            const { test_code } = req.params;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: req.t ? req.t('testCodeNotFound') : 'ไม่พบรหัสทดสอบ'
                });
            }

            // Get all test progress for this applicant's position (multi-test support)
            const testProgress = await PositionTestSet.getApplicantTestProgress(
                applicant.applicant_id,
                applicant.position_id
            );

            // Check if ALL tests are completed
            const totalTests = testProgress.length;
            const completedTests = testProgress.filter(t => t.status === 'Completed').length;
            const hasCompletedAllTests = totalTests > 0 && completedTests === totalTests;

            // Calculate average score if any test is completed
            let averageScore = null;
            if (completedTests > 0) {
                const totalScore = testProgress
                    .filter(t => t.status === 'Completed' && t.score !== null)
                    .reduce((sum, t) => sum + (t.score || 0), 0);
                averageScore = Math.round(totalScore / completedTests);
            }

            // Check if status allows testing (allow if status is Pending and not all tests completed)
            const canTakeTest = applicant.status === 'Pending' && !hasCompletedAllTests;

            // Determine test status message
            let testStatusMessage = null;
            if (applicant.status !== 'Pending') {
                testStatusMessage = req.t ? req.t('applicationStatusNotAllowTest') : 'สถานะใบสมัครไม่อนุญาตให้ทำแบบทดสอบ';
            } else if (hasCompletedAllTests) {
                testStatusMessage = req.t ? req.t('testAllCompleted') : 'คุณได้ทำแบบทดสอบทุกชุดเสร็จสิ้นแล้ว';
            }

            res.json({
                success: true,
                data: {
                    applicant_id: applicant.applicant_id,
                    first_name: applicant.first_name,
                    last_name: applicant.last_name,
                    position_id: applicant.position_id,
                    position_name: applicant.position_name,
                    department_name: applicant.department_name,
                    test_code: test_code,
                    status: applicant.status,
                    test_completed: hasCompletedAllTests,
                    total_tests: totalTests,
                    completed_tests: completedTests,
                    pending_tests: totalTests - completedTests,
                    average_score: averageScore,
                    can_take_test: canTakeTest,
                    test_status_message: testStatusMessage
                }
            });

        } catch (error) {
            console.error('Get applicant info error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorSearchingData') : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
            });
        }
    }
};

module.exports = applicantController;