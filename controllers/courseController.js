const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ActivityLog = require('../models/ActivityLog');

const courseController = {
    async getAllCourses(req, res) {
        try {
            const {
                category_id,
                instructor_id,
                difficulty_level,
                course_type,
                is_active,
                search,
                page = 1,
                limit = 12
            } = req.query;

            const filters = {};
            if (category_id) filters.category_id = category_id;
            if (instructor_id) filters.instructor_id = instructor_id;
            if (difficulty_level) filters.difficulty_level = difficulty_level;
            if (course_type) filters.course_type = course_type;
            if (is_active !== undefined) filters.is_active = is_active === 'true';
            if (search) filters.search = search;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            filters.limit = parseInt(limit);
            filters.offset = offset;

            const courses = await Course.findAll(filters);

            res.json({
                success: true,
                data: courses,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: courses.length
                }
            });

        } catch (error) {
            console.error('Get all courses error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดรายการหลักสูตร'
            });
        }
    },

    async getCourseById(req, res) {
        try {
            const { course_id } = req.params;
            const userId = req.user.userId;

            const course = await Course.findById(course_id);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบหลักสูตรที่ต้องการ'
                });
            }

            const enrollment = await Enrollment.findByUserAndCourse(userId, course_id);

            await ActivityLog.create({
                user_id: userId,
                action: 'View_Course',
                table_name: 'Courses',
                record_id: course_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `User viewed course: ${course.course_name}`,
                severity: 'Info',
                module: 'Course Management'
            });

            res.json({
                success: true,
                data: {
                    course: course,
                    enrollment: enrollment,
                    is_enrolled: !!enrollment
                }
            });

        } catch (error) {
            console.error('Get course by id error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลหลักสูตร'
            });
        }
    },

    async createCourse(req, res) {
        try {
            const userRole = req.user.role;
            const userId = req.user.userId;

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์สร้างหลักสูตร'
                });
            }

            const courseData = {
                ...req.body,
                instructor_id: userRole === 'Instructor' ? userId : req.body.instructor_id,
                created_by: userId
            };

            const result = await Course.create(courseData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                userId,
                'Create',
                'Courses',
                result.data.course_id,
                null,
                courseData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Created course: ${courseData.course_name}`
            );

            res.status(201).json({
                success: true,
                message: 'สร้างหลักสูตรสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Create course error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการสร้างหลักสูตร'
            });
        }
    },

    async updateCourse(req, res) {
        try {
            const { course_id } = req.params;
            const userRole = req.user.role;
            const userId = req.user.userId;

            const course = await Course.findById(course_id);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบหลักสูตรที่ต้องการ'
                });
            }

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์แก้ไขหลักสูตรนี้'
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์แก้ไขหลักสูตร'
                });
            }

            const updateData = { ...req.body };
            delete updateData.instructor_id; // ป้องกันการเปลี่ยนผู้สอน

            const result = await Course.update(course_id, updateData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                userId,
                'Update',
                'Courses',
                course_id,
                course,
                updateData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Updated course: ${course.course_name}`
            );

            res.json({
                success: true,
                message: 'อัพเดทหลักสูตรสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Update course error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการอัพเดทหลักสูตร'
            });
        }
    },

    async deleteCourse(req, res) {
        try {
            const { course_id } = req.params;
            const userRole = req.user.role;
            const userId = req.user.userId;

            if (userRole !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์ลบหลักสูตร'
                });
            }

            const course = await Course.findById(course_id);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบหลักสูตรที่ต้องการ'
                });
            }

            const result = await Course.delete(course_id);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                userId,
                'Delete',
                'Courses',
                course_id,
                course,
                null,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Deleted course: ${course.course_name}`
            );

            res.json({
                success: true,
                message: 'ลบหลักสูตรสำเร็จ'
            });

        } catch (error) {
            console.error('Delete course error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการลบหลักสูตร'
            });
        }
    },

    async enrollInCourse(req, res) {
        try {
            const { course_id } = req.params;
            const userId = req.user.userId;

            const course = await Course.findById(course_id);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบหลักสูตรที่ต้องการ'
                });
            }

            if (!course.is_active) {
                return res.status(400).json({
                    success: false,
                    message: 'หลักสูตรนี้ยังไม่เปิดใช้งาน'
                });
            }

            const existingEnrollment = await Enrollment.findByUserAndCourse(userId, course_id);
            if (existingEnrollment) {
                return res.status(400).json({
                    success: false,
                    message: 'คุณได้ลงทะเบียนหลักสูตรนี้แล้ว'
                });
            }

            const enrollmentData = {
                user_id: userId,
                course_id: course_id,
                enrolled_at: new Date(),
                status: 'Active'
            };

            const result = await Enrollment.create(enrollmentData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'Enroll_Course',
                table_name: 'Enrollments',
                record_id: result.data.enrollment_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `User enrolled in course: ${course.course_name}`,
                severity: 'Info',
                module: 'Course Management'
            });

            res.status(201).json({
                success: true,
                message: 'ลงทะเบียนหลักสูตรสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Enroll in course error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการลงทะเบียนหลักสูตร'
            });
        }
    },

    async getMyEnrollments(req, res) {
        try {
            const userId = req.user.userId;
            const { status, completion_status } = req.query;

            const filters = { user_id: userId };
            if (status) filters.status = status;
            if (completion_status) filters.completion_status = completion_status;

            const enrollments = await Enrollment.findByUser(userId, filters);

            res.json({
                success: true,
                data: enrollments
            });

        } catch (error) {
            console.error('Get my enrollments error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดการลงทะเบียน'
            });
        }
    },

    async updateProgress(req, res) {
        try {
            const { course_id } = req.params;
            const { progress_percentage } = req.body;
            const userId = req.user.userId;

            if (progress_percentage < 0 || progress_percentage > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'ค่าความคืบหน้าต้องอยู่ระหว่าง 0-100'
                });
            }

            const enrollment = await Enrollment.findByUserAndCourse(userId, course_id);
            if (!enrollment) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบการลงทะเบียนหลักสูตร'
                });
            }

            const updateData = {
                progress_percentage: progress_percentage
            };

            if (progress_percentage >= 100) {
                updateData.completion_status = 'Completed';
                updateData.completed_at = new Date();
            }

            const result = await Enrollment.updateProgress(enrollment.enrollment_id, updateData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'Update_Progress',
                table_name: 'Enrollments',
                record_id: enrollment.enrollment_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Updated course progress to ${progress_percentage}%`,
                severity: 'Info',
                module: 'Course Management'
            });

            res.json({
                success: true,
                message: 'อัพเดทความคืบหน้าสำเร็จ',
                data: result.data
            });

        } catch (error) {
            console.error('Update progress error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการอัพเดทความคืบหน้า'
            });
        }
    },

    async getCourseStatistics(req, res) {
        try {
            const { course_id } = req.params;
            const userRole = req.user.role;
            const userId = req.user.userId;

            const course = await Course.findById(course_id);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบหลักสูตรที่ต้องการ'
                });
            }

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์ดูสถิติหลักสูตรนี้'
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์ดูสถิติหลักสูตร'
                });
            }

            const stats = await Course.getCourseStatistics(course_id);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Get course statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดสถิติหลักสูตร'
            });
        }
    },

    async renderCoursesList(req, res) {
        try {
            res.render('courses/index', {
                title: 'หลักสูตรทั้งหมด - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: req.user.role
            });

        } catch (error) {
            console.error('Render courses list error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดหน้ารายการหลักสูตรได้',
                user: req.session.user,
                error: error
            });
        }
    },

    async renderCourseDetail(req, res) {
        try {
            const { course_id } = req.params;
            const userId = req.user.userId;

            const course = await Course.findById(course_id);
            if (!course) {
                return res.render('error/404', {
                    title: 'ไม่พบหน้าที่ต้องการ - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

            const enrollment = await Enrollment.findByUserAndCourse(userId, course_id);

            res.render('courses/detail', {
                title: `${course.course_name} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: req.user.role,
                course: course,
                enrollment: enrollment,
                is_enrolled: !!enrollment
            });

        } catch (error) {
            console.error('Render course detail error:', error);
            res.status(500).render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดข้อมูลหลักสูตรได้',
                user: req.session.user,
                error: error,
                layout: false
            });
        }
    },

    async renderMyCourses(req, res) {
        try {
            res.render('courses/my-courses', {
                title: 'หลักสูตรของฉัน - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: req.user.role
            });

        } catch (error) {
            console.error('Render my courses error:', error);
            res.render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดหน้าหลักสูตรของฉันได้',
                user: req.session.user,
                error: error
            });
        }
    }
};

module.exports = courseController;