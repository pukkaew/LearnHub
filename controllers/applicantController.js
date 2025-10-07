const Applicant = require('../models/Applicant');
const JobPosition = require('../models/JobPosition');
const Test = require('../models/Test');
const Question = require('../models/Question');
const ActivityLog = require('../models/ActivityLog');

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
                    message: 'กรุณากรอกเลขบัตรประชาชน 13 หลัก'
                });
            }

            const position = await JobPosition.findById(position_id);
            if (!position || !position.is_active) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่พบตำแหน่งงานที่เปิดรับสมัคร'
                });
            }

            const existingApplicant = await Applicant.findByNationalIdAndPosition(national_id, position_id);
            if (existingApplicant) {
                return res.status(400).json({
                    success: false,
                    message: 'คุณได้สมัครตำแหน่งนี้แล้ว'
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
                message: 'ลงทะเบียนสมัครงานสำเร็จ',
                data: {
                    applicant_id: result.data.applicant_id,
                    test_code: result.data.test_code
                }
            });

        } catch (error) {
            console.error('Register applicant error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการลงทะเบียน'
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
                    message: 'ไม่พบรหัสการทดสอบนี้'
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
                message: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล'
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
                    message: 'ไม่พบรหัสการทดสอบนี้'
                });
            }

            if (applicant.test_completed) {
                return res.status(400).json({
                    success: false,
                    message: 'คุณได้ทำการทดสอบเสร็จสิ้นแล้ว'
                });
            }

            if (applicant.status !== 'Pending') {
                return res.status(400).json({
                    success: false,
                    message: 'สถานะการสมัครไม่อนุญาตให้ทำการทดสอบ'
                });
            }

            const tests = await Test.findByJobPosition(applicant.position_id);
            if (!tests || tests.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่พบการทดสอบสำหรับตำแหน่งนี้'
                });
            }

            const existingAttempts = await Test.getApplicantAttempts(applicant.applicant_id);
            const activeAttempt = existingAttempts.find(attempt => attempt.status === 'In_Progress');

            if (activeAttempt) {
                const questions = await Question.findByTestId(activeAttempt.test_id);
                return res.json({
                    success: true,
                    message: 'พบการทดสอบที่ยังไม่เสร็จสิ้น',
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
                message: 'เริ่มการทดสอบสำเร็จ',
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
                message: 'เกิดข้อผิดพลาดในการเริ่มการทดสอบ'
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
                    message: 'ไม่พบรหัสการทดสอบนี้'
                });
            }

            const attempt = await Test.getApplicantAttemptById(attempt_id);
            if (!attempt || attempt.applicant_id !== applicant.applicant_id) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบการทดสอบที่ต้องการ'
                });
            }

            if (attempt.status !== 'In_Progress') {
                return res.status(400).json({
                    success: false,
                    message: 'การทดสอบนี้เสร็จสิ้นแล้ว'
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
                message: 'ส่งการทดสอบสำเร็จ',
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
                message: 'เกิดข้อผิดพลาดในการส่งการทดสอบ'
            });
        }
    },

    async getAllApplicants(req, res) {
        try {
            const userRole = req.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
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
                user_id: req.user.userId,
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
                message: 'เกิดข้อผิดพลาดในการโหลดรายชื่อผู้สมัคร'
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
                    message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
                });
            }

            const applicant = await Applicant.findById(applicant_id);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบข้อมูลผู้สมัคร'
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
                message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลผู้สมัคร'
            });
        }
    },

    async updateApplicantStatus(req, res) {
        try {
            const { applicant_id } = req.params;
            const { status, notes } = req.body;
            const userRole = req.user.role;
            const userId = req.user.userId;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์อัพเดทสถานะผู้สมัคร'
                });
            }

            const applicant = await Applicant.findById(applicant_id);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบข้อมูลผู้สมัคร'
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
                message: 'อัพเดทสถานะผู้สมัครสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Update applicant status error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการอัพเดทสถานะผู้สมัคร'
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
                    message: 'ไม่มีสิทธิ์ดูสถิติ'
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
                message: 'เกิดข้อผิดพลาดในการโหลดสถิติ'
            });
        }
    },

    async renderTestLogin(req, res) {
        try {
            res.render('applicants/test-login', {
                title: 'เข้าสู่ระบบทดสอบ - Rukchai Hongyen LearnHub',
                layout: 'applicant'
            });

        } catch (error) {
            console.error('Render test login error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดหน้าเข้าสู่ระบบได้',
                layout: 'applicant',
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
                    title: 'ไม่พบหน้าที่ต้องการ - Rukchai Hongyen LearnHub',
                    layout: 'applicant'
                });
            }

            res.render('applicants/test-interface', {
                title: 'ระบบทดสอบ - Rukchai Hongyen LearnHub',
                layout: 'applicant',
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
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดระบบทดสอบได้',
                layout: 'applicant',
                error: error
            });
        }
    },

    async renderApplicantManagement(req, res) {
        try {
            const userRole = req.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.render('error/403', {
                    title: 'ไม่มีสิทธิ์เข้าถึง - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

            const positions = await JobPosition.findAll({ is_active: true });

            res.render('applicants/management', {
                title: 'จัดการผู้สมัครงาน - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: userRole,
                positions: positions
            });

        } catch (error) {
            console.error('Render applicant management error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดหน้าจัดการผู้สมัครงานได้',
                user: req.session.user,
                error: error
            });
        }
    }
};

module.exports = applicantController;