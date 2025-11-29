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

            const sanitizedData = {
                applicant_id: applicant.applicant_id,
                first_name: applicant.first_name,
                last_name: applicant.last_name,
                position_name: applicant.position_name,
                department_name: applicant.department_name,
                status: applicant.status,
                application_date: applicant.application_date,
                test_completed: applicant.test_completed,
                test_score: applicant.test_score,
                test_taken_at: applicant.test_taken_at
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

            if (applicant.test_completed) {
                return res.status(400).json({
                    success: false,
                    message: req.t('testAlreadyCompleted')
                });
            }

            if (applicant.status !== 'Pending') {
                return res.status(400).json({
                    success: false,
                    message: req.t('applicationStatusNotAllowTest')
                });
            }

            const tests = await Test.findByJobPosition(applicant.position_id);
            if (!tests || tests.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: req.t('testNotFoundForPosition')
                });
            }

            const existingAttempts = await Test.getApplicantAttempts(applicant.applicant_id);
            const activeAttempt = existingAttempts.find(attempt => attempt.status === 'In_Progress');

            if (activeAttempt) {
                const questions = await Question.findByTestId(activeAttempt.test_id);
                return res.json({
                    success: true,
                    message: req.t('foundIncompleteTest'),
                    data: {
                        attempt: activeAttempt,
                        test: activeAttempt.test_info,
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
                    test: test,
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
            const { test_code, attempt_id } = req.params;
            const { answers } = req.body;

            const applicant = await Applicant.findByTestCode(test_code);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testCodeNotFound')
                });
            }

            const attempt = await Test.getApplicantAttemptById(attempt_id);
            if (!attempt || attempt.applicant_id !== applicant.applicant_id) {
                return res.status(404).json({
                    success: false,
                    message: req.t('testAttemptNotFound')
                });
            }

            if (attempt.status !== 'In_Progress') {
                return res.status(400).json({
                    success: false,
                    message: req.t('testAlreadyFinished')
                });
            }

            const result = await Test.submitApplicantAttempt(attempt_id, answers);

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

    async getAllApplicants(req, res) {
        try {
            const userRole = req.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionToAccessThisData')
                });
            }

            const {
                position_id,
                status,
                test_completed,
                search,
                page = 1,
                limit = 20
            } = req.query;

            const filters = {};
            if (position_id) {filters.position_id = position_id;}
            if (status) {filters.status = status;}
            if (test_completed !== undefined) {filters.test_completed = test_completed === 'true';}
            if (search) {filters.search = search;}

            const offset = (parseInt(page) - 1) * parseInt(limit);
            filters.limit = parseInt(limit);
            filters.offset = offset;

            const applicants = await Applicant.findAll(filters);

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
                data: applicants,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: applicants.length
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
            const userRole = req.user.role;

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

    async updateApplicantStatus(req, res) {
        try {
            const { applicant_id } = req.params;
            const { status, notes } = req.body;
            const userRole = req.user.role;
            const userId = req.user.user_id;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionToUpdateApplicantStatus')
                });
            }

            const applicant = await Applicant.findById(applicant_id);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: req.t('applicantNotFound')
                });
            }

            const updateData = { status };
            if (notes) {updateData.notes = notes;}

            const result = await Applicant.updateStatus(applicant_id, updateData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                userId,
                'Update_Applicant_Status',
                'Applicants',
                applicant_id,
                { status: applicant.status, notes: applicant.notes },
                updateData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Updated applicant status to: ${status}`
            );

            res.json({
                success: true,
                message: req.t('applicantStatusUpdatedSuccessfully'),
                data: result.data
            });

        } catch (error) {
            console.error('Update applicant status error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorUpdatingApplicantStatus')
            });
        }
    },

    async getApplicantStatistics(req, res) {
        try {
            const { position_id } = req.query;
            const userRole = req.user.role;

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

    async renderApplicantManagement(req, res) {
        try {
            const userRole = req.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.render('error/403', {
                    title: req.t('noPermissionToAccess') + ' - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

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
    }
};

module.exports = applicantController;