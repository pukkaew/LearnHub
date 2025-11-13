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
            if (category_id) {filters.category_id = category_id;}
            if (instructor_id) {filters.instructor_id = instructor_id;}
            if (difficulty_level) {filters.difficulty_level = difficulty_level;}
            if (course_type) {filters.course_type = course_type;}
            if (is_active !== undefined) {filters.is_active = is_active === 'true';}
            if (search) {filters.search = search;}

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
            const userRole = req.user.role_name;
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
            const userRole = req.user.role_name;
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
            const userRole = req.user.role_name;
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
            if (status) {filters.status = status;}
            if (completion_status) {filters.completion_status = completion_status;}

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
            const userRole = req.user.role_name;
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
                userRole: req.user.role_name
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
                userRole: req.user.role_name,
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
                userRole: req.user.role_name
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
    },

    async renderCreateCourse(req, res) {
        try {
            const userRole = req.user.role_name;

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).render('error/403', {
                    title: 'ไม่มีสิทธิ์เข้าถึง - Rukchai Hongyen LearnHub',
                    message: 'คุณไม่มีสิทธิ์สร้างหลักสูตร',
                    user: req.session.user
                });
            }

            res.render('courses/create', {
                title: 'สร้างหลักสูตรใหม่ - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: req.user.role_name
            });

        } catch (error) {
            console.error('Render create course error:', error);
            res.status(500).render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดหน้าสร้างหลักสูตรได้',
                user: req.session.user,
                error: error
            });
        }
    },

    async renderEditCourse(req, res) {
        try {
            const { course_id } = req.params;
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            const course = await Course.findById(course_id);
            if (!course) {
                return res.status(404).render('error/404', {
                    title: 'ไม่พบหน้าที่ต้องการ - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).render('error/403', {
                    title: 'ไม่มีสิทธิ์เข้าถึง - Rukchai Hongyen LearnHub',
                    message: 'คุณไม่มีสิทธิ์แก้ไขหลักสูตรนี้',
                    user: req.session.user
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).render('error/403', {
                    title: 'ไม่มีสิทธิ์เข้าถึง - Rukchai Hongyen LearnHub',
                    message: 'คุณไม่มีสิทธิ์แก้ไขหลักสูตร',
                    user: req.session.user
                });
            }

            res.render('courses/edit', {
                title: `แก้ไขหลักสูตร: ${course.course_name} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: req.user.role_name,
                course: course
            });

        } catch (error) {
            console.error('Render edit course error:', error);
            res.status(500).render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดหน้าแก้ไขหลักสูตรได้',
                user: req.session.user,
                error: error
            });
        }
    },

    async getCategories(req, res) {
        try {
            const categories = await Course.getCategories();

            res.json({
                success: true,
                data: categories
            });

        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดหมวดหมู่หลักสูตร'
            });
        }
    },

    async getRecommendedCourses(req, res) {
        try {
            const userId = req.user.userId;
            const { limit = 5 } = req.query;

            const courses = await Course.getRecommended(userId, parseInt(limit));

            res.json({
                success: true,
                data: courses
            });

        } catch (error) {
            console.error('Get recommended courses error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดหลักสูตรที่แนะนำ'
            });
        }
    },

    async getPopularCourses(req, res) {
        try {
            const { limit = 10 } = req.query;

            const courses = await Course.getPopular(parseInt(limit));

            res.json({
                success: true,
                data: courses
            });

        } catch (error) {
            console.error('Get popular courses error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดหลักสูตรยอดนิยม'
            });
        }
    },

    // Get target positions for course creation
    async getTargetPositions(req, res) {
        try {
            const { poolPromise, sql } = require('../config/database');
            const pool = await poolPromise;

            const result = await pool.request()
                .query(`
                    SELECT
                        position_id,
                        position_name_th,
                        position_name_en,
                        level,
                        level_code
                    FROM Positions
                    WHERE is_active = 1
                    ORDER BY level, position_name_th
                `);

            res.json({
                success: true,
                data: result.recordset
            });

        } catch (error) {
            console.error('Get target positions error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดตำแหน่งงาน'
            });
        }
    },

    // Get target departments for course creation
    async getTargetDepartments(req, res) {
        try {
            const { poolPromise, sql } = require('../config/database');
            const pool = await poolPromise;

            const result = await pool.request()
                .query(`
                    SELECT
                        unit_id,
                        unit_name_th,
                        unit_name_en,
                        unit_code,
                        level_code,
                        parent_id
                    FROM OrganizationUnits
                    WHERE is_active = 1
                      AND level_code IN ('BRANCH', 'DIVISION', 'DEPARTMENT', 'SECTION')
                    ORDER BY level_code, unit_name_th
                `);

            res.json({
                success: true,
                data: result.recordset
            });

        } catch (error) {
            console.error('Get target departments error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดแผนกงาน'
            });
        }
    },

    async getAnalytics(req, res) {
        try {
            const { course_id } = req.params;
            const userRole = req.user.role_name;
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
                    message: 'ไม่มีสิทธิ์ดู Analytics ของหลักสูตรนี้'
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์ดู Analytics'
                });
            }

            const analytics = await Course.getCourseStatistics(course_id);

            res.json({
                success: true,
                data: {
                    course_info: {
                        course_id: course.course_id,
                        course_name: course.course_name,
                        course_code: course.course_code,
                        instructor_name: course.instructor_name
                    },
                    ...analytics
                }
            });

        } catch (error) {
            console.error('Get analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลด Analytics'
            });
        }
    },

    async getCourseProgress(req, res) {
        try {
            const { course_id } = req.params;
            const { status, department_id, min_progress } = req.query;
            const userRole = req.user.role_name;
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
                    message: 'ไม่มีสิทธิ์ดูความคืบหน้าของหลักสูตรนี้'
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์ดูความคืบหน้า'
                });
            }

            const filters = {};
            if (status) filters.status = status;
            if (department_id) filters.department_id = parseInt(department_id);
            if (min_progress) filters.min_progress = parseFloat(min_progress);

            const progressData = await Course.getCourseProgressDetails(course_id, filters);

            res.json({
                success: true,
                data: {
                    course_info: {
                        course_id: course.course_id,
                        course_name: course.course_name,
                        course_code: course.course_code,
                        instructor_name: course.instructor_name
                    },
                    total_students: progressData.length,
                    students: progressData
                }
            });

        } catch (error) {
            console.error('Get course progress error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดความคืบหน้า'
            });
        }
    },

    async exportProgress(req, res) {
        try {
            const { course_id } = req.params;
            const { format = 'csv', status, department_id, min_progress } = req.query;
            const userRole = req.user.role_name;
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
                    message: 'ไม่มีสิทธิ์ Export ความคืบหน้าของหลักสูตรนี้'
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์ Export ความคืบหน้า'
                });
            }

            const filters = {};
            if (status) filters.status = status;
            if (department_id) filters.department_id = parseInt(department_id);
            if (min_progress) filters.min_progress = parseFloat(min_progress);

            const progressData = await Course.getCourseProgressDetails(course_id, filters);

            if (format === 'csv') {
                // CSV Export
                let csv = 'Course Progress Report\n\n';
                csv += `Course: ${course.course_name} (${course.course_code})\n`;
                csv += `Instructor: ${course.instructor_name}\n`;
                csv += `Total Students: ${progressData.length}\n`;
                csv += `Export Date: ${new Date().toLocaleString('th-TH')}\n\n`;

                // Progress Data
                csv += 'Employee ID,Name,Email,Department,Position,Enrollment Date,Progress %,Status,Score,Lessons Completed,Total Lessons,Days Enrolled,Last Accessed,Completed Date,Certificate\n';
                progressData.forEach(student => {
                    csv += `"${student.employee_id || 'N/A'}",`;
                    csv += `"${student.user_name}",`;
                    csv += `"${student.email}",`;
                    csv += `"${student.department_name || 'N/A'}",`;
                    csv += `"${student.position_name || 'N/A'}",`;
                    csv += `"${student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('th-TH') : 'N/A'}",`;
                    csv += `${student.progress_percentage || 0}%,`;
                    csv += `"${student.completion_status}",`;
                    csv += `${student.final_score || 'N/A'},`;
                    csv += `${student.lessons_completed},`;
                    csv += `${student.total_lessons},`;
                    csv += `${student.days_enrolled},`;
                    csv += `"${student.last_accessed ? new Date(student.last_accessed).toLocaleDateString('th-TH') : 'N/A'}",`;
                    csv += `"${student.completed_at ? new Date(student.completed_at).toLocaleDateString('th-TH') : 'N/A'}",`;
                    csv += `"${student.certificate_number || 'N/A'}"\n`;
                });

                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="course_progress_${course.course_code}_${new Date().toISOString().split('T')[0]}.csv"`);
                res.send('\uFEFF' + csv); // BOM for Excel UTF-8 support

            } else {
                // JSON Export
                res.json({
                    success: true,
                    data: {
                        course_info: {
                            course_id: course.course_id,
                            course_name: course.course_name,
                            course_code: course.course_code,
                            instructor_name: course.instructor_name
                        },
                        export_date: new Date().toISOString(),
                        total_students: progressData.length,
                        students: progressData
                    }
                });
            }

        } catch (error) {
            console.error('Export progress error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการ Export ความคืบหน้า'
            });
        }
    },

    async exportAnalytics(req, res) {
        try {
            const { course_id } = req.params;
            const { format = 'csv' } = req.query;
            const userRole = req.user.role_name;
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
                    message: 'ไม่มีสิทธิ์ Export Analytics ของหลักสูตรนี้'
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์ Export Analytics'
                });
            }

            const analytics = await Course.getCourseStatistics(course_id);

            if (format === 'csv') {
                // CSV Export
                let csv = 'Course Analytics Report\n\n';
                csv += `Course: ${course.course_name} (${course.course_code})\n`;
                csv += `Instructor: ${course.instructor_name}\n`;
                csv += `Export Date: ${new Date().toLocaleString('th-TH')}\n\n`;

                // Overall Stats
                csv += 'Overall Statistics\n';
                csv += 'Metric,Value\n';
                csv += `Total Enrollments,${analytics.overall.total_enrollments}\n`;
                csv += `Completed,${analytics.overall.completed_count}\n`;
                csv += `In Progress,${analytics.overall.in_progress_count}\n`;
                csv += `Not Started,${analytics.overall.not_started_count}\n`;
                csv += `Dropped,${analytics.overall.dropped_count}\n`;
                csv += `Completion Rate,${analytics.overall.completion_rate}%\n`;
                csv += `Average Score,${analytics.overall.avg_score ? analytics.overall.avg_score.toFixed(2) : 'N/A'}\n`;
                csv += `Average Progress,${analytics.overall.avg_progress ? analytics.overall.avg_progress.toFixed(2) : 'N/A'}%\n\n`;

                // Department Stats
                csv += 'Department Statistics\n';
                csv += 'Department,Enrollments,Completed,Average Score,Average Progress\n';
                analytics.by_department.forEach(dept => {
                    csv += `"${dept.department_name || 'N/A'}",${dept.enrollment_count},${dept.completed_count},${dept.avg_score ? dept.avg_score.toFixed(2) : 'N/A'},${dept.avg_progress ? dept.avg_progress.toFixed(2) : 'N/A'}%\n`;
                });

                csv += '\nTop Performers\n';
                csv += 'Name,Department,Score,Progress,Completed Date\n';
                analytics.top_performers.forEach(performer => {
                    csv += `"${performer.user_name}","${performer.department_name || 'N/A'}",${performer.final_score},${performer.progress_percentage}%,${performer.completed_at ? new Date(performer.completed_at).toLocaleDateString('th-TH') : 'N/A'}\n`;
                });

                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="course_analytics_${course.course_code}_${new Date().toISOString().split('T')[0]}.csv"`);
                res.send('\uFEFF' + csv); // BOM for Excel UTF-8 support

            } else {
                // JSON Export
                res.json({
                    success: true,
                    data: {
                        course_info: {
                            course_id: course.course_id,
                            course_name: course.course_name,
                            course_code: course.course_code,
                            instructor_name: course.instructor_name
                        },
                        export_date: new Date().toISOString(),
                        ...analytics
                    }
                });
            }

        } catch (error) {
            console.error('Export analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการ Export Analytics'
            });
        }
    },

    // ==================== Category Management (Admin Only) ====================

    // Render category management page
    async renderCategoryManagement(req, res) {
        try {
            const userRole = req.user.role_name;

            if (userRole !== 'Admin') {
                return res.status(403).render('error/403', {
                    title: 'ไม่มีสิทธิ์เข้าถึง - Rukchai Hongyen LearnHub',
                    message: 'คุณไม่มีสิทธิ์จัดการหมวดหมู่หลักสูตร',
                    user: req.session.user
                });
            }

            res.render('courses/categories', {
                title: 'จัดการหมวดหมู่หลักสูตร - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: req.user.role_name
            });

        } catch (error) {
            console.error('Render category management error:', error);
            res.status(500).render('error/500', {
                title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
                message: 'ไม่สามารถโหลดหน้าจัดการหมวดหมู่ได้',
                user: req.session.user,
                error: error
            });
        }
    },

    // Get all categories for admin management
    async getAllCategoriesAdmin(req, res) {
        try {
            const { poolPromise } = require('../config/database');
            const pool = await poolPromise;

            const result = await pool.request()
                .query(`
                    SELECT
                        cc.category_id,
                        cc.category_name,
                        cc.category_name_en,
                        cc.description,
                        cc.category_icon,
                        cc.category_color,
                        cc.display_order,
                        cc.is_active,
                        cc.created_at,
                        cc.updated_at,
                        u1.first_name + ' ' + u1.last_name AS created_by_name,
                        u2.first_name + ' ' + u2.last_name AS updated_by_name,
                        COUNT(c.course_id) as course_count
                    FROM CourseCategories cc
                    LEFT JOIN Users u1 ON cc.created_by = u1.user_id
                    LEFT JOIN Users u2 ON cc.updated_by = u2.user_id
                    LEFT JOIN Courses c ON cc.category_id = c.category_id AND c.is_active = 1
                    GROUP BY cc.category_id, cc.category_name, cc.category_name_en,
                             cc.description, cc.category_icon, cc.category_color,
                             cc.display_order, cc.is_active, cc.created_at, cc.updated_at,
                             u1.first_name, u1.last_name, u2.first_name, u2.last_name
                    ORDER BY cc.display_order, cc.category_name
                `);

            res.json({
                success: true,
                data: result.recordset
            });

        } catch (error) {
            console.error('Get all categories admin error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดหมวดหมู่'
            });
        }
    },

    // Get single category by ID
    async getCategoryByIdAdmin(req, res) {
        try {
            const { category_id } = req.params;
            const { poolPromise } = require('../config/database');
            const pool = await poolPromise;

            const result = await pool.request()
                .input('category_id', category_id)
                .query(`
                    SELECT
                        cc.*,
                        u1.first_name + ' ' + u1.last_name AS created_by_name,
                        u2.first_name + ' ' + u2.last_name AS updated_by_name,
                        COUNT(c.course_id) as course_count
                    FROM CourseCategories cc
                    LEFT JOIN Users u1 ON cc.created_by = u1.user_id
                    LEFT JOIN Users u2 ON cc.updated_by = u2.user_id
                    LEFT JOIN Courses c ON cc.category_id = c.category_id AND c.is_active = 1
                    WHERE cc.category_id = @category_id
                    GROUP BY cc.category_id, cc.category_name, cc.category_name_en,
                             cc.description, cc.category_icon, cc.category_color,
                             cc.display_order, cc.is_active, cc.created_at, cc.updated_at,
                             cc.created_by, cc.updated_by,
                             u1.first_name, u1.last_name, u2.first_name, u2.last_name
                `);

            if (result.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบหมวดหมู่ที่ต้องการ'
                });
            }

            res.json({
                success: true,
                data: result.recordset[0]
            });

        } catch (error) {
            console.error('Get category by id admin error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลหมวดหมู่'
            });
        }
    },

    // Create new category
    async createCategoryAdmin(req, res) {
        try {
            const userId = req.user.userId;
            const {
                category_name,
                category_name_en,
                description,
                category_icon,
                category_color,
                display_order
            } = req.body;

            // Validation
            if (!category_name) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณากรอกชื่อหมวดหมู่'
                });
            }

            const { poolPromise } = require('../config/database');
            const pool = await poolPromise;

            const result = await pool.request()
                .input('category_name', category_name)
                .input('category_name_en', category_name_en || null)
                .input('description', description || null)
                .input('category_icon', category_icon || null)
                .input('category_color', category_color || '#64748b')
                .input('display_order', display_order || 0)
                .input('created_by', userId)
                .input('updated_by', userId)
                .query(`
                    INSERT INTO CourseCategories (
                        category_name, category_name_en, description,
                        category_icon, category_color, display_order,
                        created_by, updated_by
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @category_name, @category_name_en, @description,
                        @category_icon, @category_color, @display_order,
                        @created_by, @updated_by
                    )
                `);

            await ActivityLog.logDataChange(
                userId,
                'Create',
                'CourseCategories',
                result.recordset[0].category_id,
                null,
                result.recordset[0],
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Created category: ${category_name}`
            );

            res.status(201).json({
                success: true,
                message: 'สร้างหมวดหมู่สำเร็จ',
                data: result.recordset[0]
            });

        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการสร้างหมวดหมู่'
            });
        }
    },

    // Update category
    async updateCategoryAdmin(req, res) {
        try {
            const { category_id } = req.params;
            const userId = req.user.userId;
            const {
                category_name,
                category_name_en,
                description,
                category_icon,
                category_color,
                display_order,
                is_active
            } = req.body;

            const { poolPromise } = require('../config/database');
            const pool = await poolPromise;

            // Get old data for activity log
            const oldData = await pool.request()
                .input('category_id', category_id)
                .query('SELECT * FROM CourseCategories WHERE category_id = @category_id');

            if (oldData.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบหมวดหมู่ที่ต้องการ'
                });
            }

            const result = await pool.request()
                .input('category_id', category_id)
                .input('category_name', category_name)
                .input('category_name_en', category_name_en || null)
                .input('description', description || null)
                .input('category_icon', category_icon || null)
                .input('category_color', category_color || '#64748b')
                .input('display_order', display_order || 0)
                .input('is_active', is_active !== undefined ? is_active : true)
                .input('updated_by', userId)
                .query(`
                    UPDATE CourseCategories
                    SET
                        category_name = @category_name,
                        category_name_en = @category_name_en,
                        description = @description,
                        category_icon = @category_icon,
                        category_color = @category_color,
                        display_order = @display_order,
                        is_active = @is_active,
                        updated_by = @updated_by,
                        updated_at = GETDATE()
                    OUTPUT INSERTED.*
                    WHERE category_id = @category_id
                `);

            await ActivityLog.logDataChange(
                userId,
                'Update',
                'CourseCategories',
                category_id,
                oldData.recordset[0],
                result.recordset[0],
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Updated category: ${category_name}`
            );

            res.json({
                success: true,
                message: 'อัพเดทหมวดหมู่สำเร็จ',
                data: result.recordset[0]
            });

        } catch (error) {
            console.error('Update category error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการอัพเดทหมวดหมู่'
            });
        }
    },

    // Delete (soft delete) category
    async deleteCategoryAdmin(req, res) {
        try {
            const { category_id } = req.params;
            const userId = req.user.userId;
            const { poolPromise } = require('../config/database');
            const pool = await poolPromise;

            // Get category data
            const categoryData = await pool.request()
                .input('category_id', category_id)
                .query('SELECT * FROM CourseCategories WHERE category_id = @category_id');

            if (categoryData.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบหมวดหมู่ที่ต้องการ'
                });
            }

            // Check if category has courses
            const courseCount = await pool.request()
                .input('category_id', category_id)
                .query('SELECT COUNT(*) as count FROM Courses WHERE category_id = @category_id AND is_active = 1');

            if (courseCount.recordset[0].count > 0) {
                return res.status(400).json({
                    success: false,
                    message: `ไม่สามารถลบได้ เนื่องจากมี ${courseCount.recordset[0].count} หลักสูตรอยู่ในหมวดหมู่นี้`
                });
            }

            // Soft delete
            await pool.request()
                .input('category_id', category_id)
                .input('updated_by', userId)
                .query(`
                    UPDATE CourseCategories
                    SET is_active = 0, updated_by = @updated_by, updated_at = GETDATE()
                    WHERE category_id = @category_id
                `);

            await ActivityLog.logDataChange(
                userId,
                'Delete',
                'CourseCategories',
                category_id,
                categoryData.recordset[0],
                null,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Deleted category: ${categoryData.recordset[0].category_name}`
            );

            res.json({
                success: true,
                message: 'ลบหมวดหมู่สำเร็จ'
            });

        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการลบหมวดหมู่'
            });
        }
    }
};

module.exports = courseController;