const User = require('../models/User');
const ApplicantTestAssignment = require('../models/ApplicantTestAssignment');
const ApplicantTestResult = require('../models/ApplicantTestResult');
const ApplicantNote = require('../models/ApplicantNote');
const ActivityLog = require('../models/ActivityLog');
const { poolPromise, sql } = require('../config/database');
const bcrypt = require('bcryptjs');

const hrApplicantController = {
    // แสดงรายชื่อผู้สมัครทั้งหมด
    async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || '';
            const position = req.query.position || '';
            const status = req.query.status || '';

            const filters = {
                search,
                applied_position: position,
                status
            };

            const result = await User.getAllApplicants(page, limit, filters);
            const stats = await User.getApplicantStatistics();

            // Get unique positions
            const pool = await poolPromise;
            const positionsResult = await pool.request().query(`
                SELECT DISTINCT applied_position
                FROM Users
                WHERE user_type = 'APPLICANT' AND applied_position IS NOT NULL
                ORDER BY applied_position
            `);

            res.render('hr/applicants/index', {
                title: 'จัดการผู้สมัครงาน',
                applicants: result.data,
                pagination: {
                    page: result.page,
                    totalPages: result.totalPages,
                    total: result.total
                },
                filters: { search, position, status },
                positions: positionsResult.recordset,
                stats
            });
        } catch (error) {
            console.error('Error fetching applicants:', error);
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้สมัคร');
            res.redirect('/dashboard');
        }
    },

    // แสดงฟอร์มเพิ่มผู้สมัคร
    async showAddForm(req, res) {
        try {
            res.render('hr/applicants/add', {
                title: 'เพิ่มผู้สมัครงาน'
            });
        } catch (error) {
            console.error('Error showing add form:', error);
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการแสดงฟอร์ม');
            res.redirect('/hr/applicants');
        }
    },

    // สร้างผู้สมัครใหม่
    async create(req, res) {
        try {
            const {
                id_card_number,
                first_name,
                last_name,
                email,
                phone,
                applied_position,
                password,
                auto_disable_after_test
            } = req.body;

            // Validate ID card number
            if (!User.validateThaiIdCard(id_card_number)) {
                return res.status(400).json({
                    success: false,
                    message: 'เลขบัตรประชาชนไม่ถูกต้อง'
                });
            }

            // Create applicant
            const result = await User.createApplicant({
                id_card_number,
                first_name,
                last_name,
                email,
                phone,
                applied_position,
                password: password || id_card_number.slice(-4), // Default password = 4 หลักท้าย
                auto_disable_after_test: auto_disable_after_test === 'true' || auto_disable_after_test === true
            });

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่สามารถสร้างผู้สมัครได้'
                });
            }

            // Log activity
            await ActivityLog.create({
                user_id: req.session.user.user_id,
                action: 'Create_Applicant',
                table_name: 'users',
                record_id: result.userId,
                description: `สร้างผู้สมัครงาน: ${first_name} ${last_name} (${id_card_number})`,
                severity: 'Info',
                module: 'HR',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'เพิ่มผู้สมัครสำเร็จ',
                applicantId: result.userId
            });

        } catch (error) {
            console.error('Error creating applicant:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้สมัคร'
            });
        }
    },

    // แสดงรายละเอียดผู้สมัคร
    async show(req, res) {
        try {
            const applicantId = parseInt(req.params.id);
            const user = await User.findById(applicantId);

            if (!user || user.user_type !== 'APPLICANT') {
                req.flash('error_msg', 'ไม่พบข้อมูลผู้สมัคร');
                return res.redirect('/hr/applicants');
            }

            // Get assigned tests
            const assignments = await ApplicantTestAssignment.getByApplicant(applicantId);

            // Get test results
            const results = await ApplicantTestResult.getByApplicant(applicantId);

            // Get notes
            const notes = await ApplicantNote.getByApplicant(applicantId);

            res.render('hr/applicants/show', {
                title: `ข้อมูลผู้สมัคร: ${user.first_name} ${user.last_name}`,
                applicant: user,
                assignments,
                results,
                notes
            });
        } catch (error) {
            console.error('Error showing applicant:', error);
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้สมัคร');
            res.redirect('/hr/applicants');
        }
    },

    // แสดงฟอร์มแก้ไขผู้สมัคร
    async showEditForm(req, res) {
        try {
            const applicantId = parseInt(req.params.id);
            const user = await User.findById(applicantId);

            if (!user || user.user_type !== 'APPLICANT') {
                req.flash('error_msg', 'ไม่พบข้อมูลผู้สมัคร');
                return res.redirect('/hr/applicants');
            }

            res.render('hr/applicants/edit', {
                title: `แก้ไขข้อมูลผู้สมัคร: ${user.first_name} ${user.last_name}`,
                applicant: user
            });
        } catch (error) {
            console.error('Error showing edit form:', error);
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการแสดงฟอร์ม');
            res.redirect('/hr/applicants');
        }
    },

    // อัพเดทข้อมูลผู้สมัคร
    async update(req, res) {
        try {
            const applicantId = parseInt(req.params.id);
            const { first_name, last_name, email, phone, applied_position, auto_disable_after_test } = req.body;

            const result = await User.updateApplicant(applicantId, {
                first_name,
                last_name,
                email,
                phone,
                applied_position,
                auto_disable_after_test: auto_disable_after_test === 'true' || auto_disable_after_test === true
            });

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }

            // Log activity
            await ActivityLog.create({
                user_id: req.session.user.user_id,
                action: 'Update_Applicant',
                table_name: 'users',
                record_id: applicantId,
                description: `แก้ไขข้อมูลผู้สมัครงาน ID: ${applicantId}`,
                severity: 'Info',
                module: 'HR',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'อัพเดทข้อมูลสำเร็จ'
            });

        } catch (error) {
            console.error('Error updating applicant:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล'
            });
        }
    },

    // Enable/Disable ผู้สมัคร
    async updateStatus(req, res) {
        try {
            const applicantId = parseInt(req.params.id);
            const { status } = req.body;

            if (!['ACTIVE', 'DISABLED'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'สถานะไม่ถูกต้อง'
                });
            }

            const result = await User.updateStatus(applicantId, status);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }

            // Log activity
            await ActivityLog.create({
                user_id: req.session.user.user_id,
                action: status === 'ACTIVE' ? 'Enable_Applicant' : 'Disable_Applicant',
                table_name: 'users',
                record_id: applicantId,
                description: `เปลี่ยนสถานะผู้สมัครเป็น ${status}`,
                severity: 'Info',
                module: 'HR',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: status === 'ACTIVE' ? 'เปิดใช้งานบัญชีสำเร็จ' : 'ปิดใช้งานบัญชีสำเร็จ'
            });

        } catch (error) {
            console.error('Error updating status:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ'
            });
        }
    },

    // แสดงหน้า Assign Tests
    async showAssignTests(req, res) {
        try {
            const applicantId = parseInt(req.params.id);
            const user = await User.findById(applicantId);

            if (!user || user.user_type !== 'APPLICANT') {
                req.flash('error_msg', 'ไม่พบข้อมูลผู้สมัคร');
                return res.redirect('/hr/applicants');
            }

            // Get all available tests
            const pool = await poolPromise;
            const testsResult = await pool.request().query(`
                SELECT test_id, title, description, time_limit, total_marks, passing_marks, status
                FROM Tests
                WHERE status = 'active' AND is_active = 1
                ORDER BY title
            `);

            // Get already assigned tests
            const assignments = await ApplicantTestAssignment.getByApplicant(applicantId);

            res.render('hr/applicants/assign-tests', {
                title: `มอบหมายข้อสอบ: ${user.first_name} ${user.last_name}`,
                applicant: user,
                tests: testsResult.recordset,
                assignments
            });

        } catch (error) {
            console.error('Error showing assign tests:', error);
            req.flash('error_msg', 'เกิดข้อผิดพลาดในการแสดงหน้า');
            res.redirect('/hr/applicants');
        }
    },

    // มอบหมายข้อสอบให้ผู้สมัคร
    async assignTest(req, res) {
        try {
            const applicantId = parseInt(req.params.id);
            const { test_id, due_date } = req.body;

            const result = await ApplicantTestAssignment.create({
                applicant_id: applicantId,
                test_id: parseInt(test_id),
                assigned_by: req.session.user.user_id,
                due_date: due_date || null
            });

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }

            // Log activity
            await ActivityLog.create({
                user_id: req.session.user.user_id,
                action: 'Assign_Test_To_Applicant',
                table_name: 'applicant_test_assignments',
                record_id: result.assignment_id,
                description: `มอบหมายข้อสอบ ID ${test_id} ให้ผู้สมัคร ID ${applicantId}`,
                severity: 'Info',
                module: 'HR',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'มอบหมายข้อสอบสำเร็จ',
                assignmentId: result.assignment_id
            });

        } catch (error) {
            console.error('Error assigning test:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการมอบหมายข้อสอบ'
            });
        }
    },

    // ลบการมอบหมายข้อสอบ
    async unassignTest(req, res) {
        try {
            const assignmentId = parseInt(req.params.assignmentId);

            const result = await ApplicantTestAssignment.delete(assignmentId);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }

            // Log activity
            await ActivityLog.create({
                user_id: req.session.user.user_id,
                action: 'Unassign_Test_From_Applicant',
                table_name: 'applicant_test_assignments',
                record_id: assignmentId,
                description: `ยกเลิกการมอบหมายข้อสอบ Assignment ID ${assignmentId}`,
                severity: 'Info',
                module: 'HR',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'ยกเลิกการมอบหมายสำเร็จ'
            });

        } catch (error) {
            console.error('Error unassigning test:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการยกเลิกการมอบหมาย'
            });
        }
    },

    // เพิ่ม Note
    async addNote(req, res) {
        try {
            const applicantId = parseInt(req.params.id);
            const { note_text, note_type } = req.body;

            const result = await ApplicantNote.create({
                applicant_id: applicantId,
                created_by: req.session.user.user_id,
                note_text,
                note_type: note_type || 'GENERAL'
            });

            res.json({
                success: true,
                message: 'เพิ่มบันทึกสำเร็จ',
                noteId: result.note_id
            });

        } catch (error) {
            console.error('Error adding note:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการเพิ่มบันทึก'
            });
        }
    },

    // รีเซ็ตรหัสผ่าน
    async resetPassword(req, res) {
        try {
            const applicantId = parseInt(req.params.id);
            const { new_password } = req.body;

            const user = await User.findById(applicantId);

            if (!user || user.user_type !== 'APPLICANT') {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบข้อมูลผู้สมัคร'
                });
            }

            // Reset password (default = 4 หลักท้ายของบัตรประชาชน)
            const defaultPassword = new_password || user.id_card_number.slice(-4);

            const result = await User.updatePassword(applicantId, defaultPassword);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }

            // Log activity
            await ActivityLog.create({
                user_id: req.session.user.user_id,
                action: 'Reset_Applicant_Password',
                table_name: 'users',
                record_id: applicantId,
                description: `รีเซ็ตรหัสผ่านผู้สมัคร ID ${applicantId}`,
                severity: 'Warning',
                module: 'HR',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'รีเซ็ตรหัสผ่านสำเร็จ',
                defaultPassword: defaultPassword
            });

        } catch (error) {
            console.error('Error resetting password:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
            });
        }
    }
};

module.exports = hrApplicantController;
