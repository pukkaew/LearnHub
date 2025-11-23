const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ActivityLog = require('../models/ActivityLog');
const Test = require('../models/Test');
const { poolPromise, sql } = require('../config/database');

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

            const result = await Course.findAll(parseInt(page), parseInt(limit), filters);

            res.json({
                success: true,
                data: result.data || [],
                pagination: {
                    page: result.page || parseInt(page),
                    limit: parseInt(limit),
                    total: result.total || 0,
                    totalPages: result.totalPages || 0
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
            const userId = req.user.user_id;

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
                description: `User viewed course: ${course.title || course.course_name}`,
                severity: 'Info',
                module: 'Course Management'
            });

            // Flatten the course data and add enrollment info
            const responseData = {
                ...course,
                enrollment_status: enrollment ? enrollment.completion_status || enrollment.status : null,
                progress_percentage: enrollment ? (enrollment.progress_percentage || enrollment.progress || 0) : 0,
                is_enrolled: !!enrollment
            };

            res.json({
                success: true,
                data: responseData
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
            const userId = req.user.user_id;  // Changed from userId to user_id

            console.log('📝 createCourse called');
            console.log('User info:', { userId, userRole, fullUser: req.user });
            console.log('Request body keys:', Object.keys(req.body));
            console.log('Full request body:', JSON.stringify(req.body, null, 2));

            // Detailed field check for critical NULL fields
            console.log('\n🔍 CRITICAL FIELD CHECK:');
            console.log('  course_code:', req.body.course_code);
            console.log('  course_type:', req.body.course_type);
            console.log('  language:', req.body.language);
            console.log('  learning_objectives:', req.body.learning_objectives);
            console.log('  target_positions:', req.body.target_positions);
            console.log('  target_departments:', req.body.target_departments);
            console.log('  lessons:', req.body.lessons);
            console.log('  passing_score:', req.body.passing_score);
            console.log('  max_attempts:', req.body.max_attempts);
            console.log('  max_students:', req.body.max_students);
            console.log('  certificate_validity:', req.body.certificate_validity);

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์สร้างหลักสูตร'
                });
            }

            const courseData = {
                ...req.body,
                // Map array field names (from form with []) to model field names
                target_positions: req.body['target_positions[]'] || req.body.target_positions,
                target_departments: req.body['target_departments[]'] || req.body.target_departments,
                // ถ้าไม่มี instructor_id ให้ใช้ null (ใช้ instructor_name แทน)
                instructor_id: req.body.instructor_id || null,
                // ถ้าไม่มี instructor_name ก็ไม่เป็นไร (optional)
                instructor_name: req.body.instructor_name || null,
                created_by: userId
            };

            console.log('Creating course with data:', {
                userRole,
                userId,
                instructor_id: courseData.instructor_id,
                course_name: courseData.course_name,
                category_id: courseData.category_id,
                target_positions: courseData.target_positions,
                target_departments: courseData.target_departments,
                assessment_type: req.body.assessment_type
            });

            // Handle test creation if assessment_type is 'create_new'
            if (req.body.assessment_type === 'create_new') {
                console.log('📝 Creating new test along with course');
                const pool = await poolPromise;

                try {
                    // Create test
                    const testResult = await pool.request()
                        .input('title', sql.NVarChar(200), req.body.new_test_name)
                        .input('description', sql.NVarChar(sql.MAX), req.body.new_test_description || '')
                        .input('testType', sql.NVarChar(50), req.body.new_test_type || 'final_exam')
                        .input('timeLimit', sql.Int, parseInt(req.body.new_test_duration) || 60)
                        .input('passingScore', sql.Int, req.body.new_passing_score ? parseInt(req.body.new_passing_score) : null)
                        .input('maxAttempts', sql.Int, req.body.new_max_attempts ? parseInt(req.body.new_max_attempts) : null)
                        .input('randomizeQuestions', sql.Bit, req.body.new_randomize_questions === true || req.body.new_randomize_questions === 'true')
                        .input('randomizeChoices', sql.Bit, req.body.new_randomize_choices === true || req.body.new_randomize_choices === 'true')
                        .input('showAnswer', sql.NVarChar(20), req.body.new_show_answer || 'immediately')
                        .input('showResultsImmediately', sql.Bit, req.body.new_show_results_immediately === true || req.body.new_show_results_immediately === 'true')
                        .input('availableFrom', sql.DateTime2, req.body.new_available_from || null)
                        .input('availableUntil', sql.DateTime2, req.body.new_available_until || null)
                        .input('enableProctoring', sql.Bit, req.body.new_enable_proctoring === true || req.body.new_enable_proctoring === 'true')
                        .input('proctoringStrictness', sql.NVarChar(20), req.body.new_proctoring_strictness || 'medium')
                        .input('isGraded', sql.Bit, req.body.new_is_graded === true || req.body.new_is_graded === 'true')
                        .input('isRequired', sql.Bit, req.body.new_is_required === true || req.body.new_is_required === 'true')
                        .input('isPassingRequired', sql.Bit, req.body.new_is_passing_required === true || req.body.new_is_passing_required === 'true')
                        .input('scoreWeight', sql.Int, req.body.new_score_weight ? parseInt(req.body.new_score_weight) : null)
                        .input('showScoreBreakdown', sql.Bit, req.body.new_show_score_breakdown === true || req.body.new_show_score_breakdown === 'true')
                        .input('status', sql.NVarChar(20), 'active')
                        .input('createdBy', sql.Int, userId)
                        .query(`
                            INSERT INTO tests (
                                title, description, type, time_limit, passing_marks, attempts_allowed,
                                randomize_questions, show_results, status,
                                available_from, available_until, proctoring_enabled, proctoring_strictness,
                                is_graded, is_required, is_passing_required, score_weight, show_score_breakdown,
                                instructor_id, created_at, updated_at
                            ) VALUES (
                                @title, @description, @testType, @timeLimit, @passingScore, @maxAttempts,
                                @randomizeQuestions, @showResultsImmediately, @status,
                                @availableFrom, @availableUntil, @enableProctoring, @proctoringStrictness,
                                @isGraded, @isRequired, @isPassingRequired, @scoreWeight, @showScoreBreakdown,
                                @createdBy, GETDATE(), GETDATE()
                            );
                            SELECT SCOPE_IDENTITY() AS test_id;
                        `);

                    const newTestId = testResult.recordset[0].test_id;
                    console.log(`✅ Test created successfully with ID: ${newTestId}`);

                    // Add test_id to courseData
                    courseData.test_id = newTestId;

                    // Log test creation
                    await ActivityLog.logDataChange(
                        userId,
                        'Create',
                        'Tests',
                        newTestId,
                        null,
                        { test_name: req.body.new_test_name, test_type: req.body.new_test_type },
                        req.ip,
                        req.get('User-Agent'),
                        req.sessionID,
                        `Created test: ${req.body.new_test_name} for course`
                    );

                } catch (testError) {
                    console.error('❌ Test creation failed:', testError);
                    return res.status(500).json({
                        success: false,
                        message: 'เกิดข้อผิดพลาดในการสร้างข้อสอบ',
                        error: testError.message
                    });
                }
            } else if (req.body.assessment_type === 'existing' && req.body.test_id) {
                // Use existing test
                courseData.test_id = parseInt(req.body.test_id);
                console.log(`✅ Using existing test with ID: ${courseData.test_id}`);
            }

            const result = await Course.create(courseData);

            console.log('Course.create result:', result);

            if (!result.success) {
                console.error('❌ Course creation failed:', result.message);
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
            console.error('❌ Create course error:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการสร้างหลักสูตร',
                error: error.message
            });
        }
    },

    async updateCourse(req, res) {
        try {
            const { course_id } = req.params;
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

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

            if (!['Admin', 'Instructor', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์แก้ไขหลักสูตร'
                });
            }

            const updateData = {
                ...req.body,
                // Map array field names (from form with []) to model field names
                target_positions: req.body['target_positions[]'] || req.body.target_positions,
                target_departments: req.body['target_departments[]'] || req.body.target_departments
            };
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
            const userId = req.user.user_id;

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
            const userId = req.user.user_id;

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
            const userId = req.user.user_id;
            const { status, completion_status } = req.query;

            // findByUser accepts (userId, status) - use completion_status or status
            const statusFilter = completion_status || status || null;
            const enrollments = await Enrollment.findByUser(userId, statusFilter);

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
            const userId = req.user.user_id;

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
            const userId = req.user.user_id;

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
            // Import language helpers
            const { getCurrentLanguage, getTranslation } = require('../utils/languages');
            const currentLang = getCurrentLanguage(req);
            const t = res.locals.t || ((key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue);

            res.render('courses/index', {
                title: 'หลักสูตรทั้งหมด - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: req.user.role_name,
                t: t,
                currentLang: currentLang
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
            const userId = req.user.user_id;

            // Import language helpers
            const { getCurrentLanguage, getTranslation, translations } = require('../utils/languages');
            const currentLang = getCurrentLanguage(req);
            const t = res.locals.t || ((key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue);

            const course = await Course.findById(course_id);
            if (!course) {
                return res.render('error/404', {
                    title: 'ไม่พบหน้าที่ต้องการ - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

            const enrollment = await Enrollment.findByUserAndCourse(userId, course_id);

            res.render('courses/detail', {
                title: `${course.title || course.course_name || 'หลักสูตร'} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: req.user.role_name,
                course: course,
                courseId: course_id,
                enrollment: enrollment,
                is_enrolled: !!enrollment,
                t: t,
                currentLang: currentLang,
                translations: translations[currentLang] || translations.th
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
            // Import language helpers
            const { getCurrentLanguage, getTranslation } = require('../utils/languages');
            const currentLang = getCurrentLanguage(req);
            const t = res.locals.t || ((key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue);

            res.render('courses/my-courses', {
                title: 'หลักสูตรของฉัน - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: req.user.role_name,
                t: t,
                currentLang: currentLang
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

            // Import language helpers
            const { getCurrentLanguage, getTranslation } = require('../utils/languages');
            const currentLang = getCurrentLanguage(req);
            const t = res.locals.t || ((key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue);

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
                userRole: req.user.role_name,
                t: t,
                currentLang: currentLang
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

            // Import language helpers
            const { getCurrentLanguage, getTranslation } = require('../utils/languages');
            const currentLang = getCurrentLanguage(req);
            const t = res.locals.t || ((key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue);

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

            if (!['Admin', 'Instructor', 'HR'].includes(userRole)) {
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
                course: course,
                t: t,
                currentLang: currentLang
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

    async getInstructors(req, res) {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query(`
                SELECT
                    user_id,
                    CONCAT(first_name, ' ', last_name) as full_name,
                    email,
                    position_id
                FROM users
                WHERE is_active = 1
                ORDER BY first_name, last_name
            `);

            res.json({
                success: true,
                data: result.recordset
            });

        } catch (error) {
            console.error('Get instructors error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดรายชื่อผู้สอน'
            });
        }
    },

    async getAvailableTests(req, res) {
        try {
            const pool = await poolPromise;
            const { type, status, course_id } = req.query;

            // Build dynamic query
            let whereConditions = ['1=1'];
            const params = {};

            // Filter by test type if provided
            if (type && ['final_exam', 'chapter_quiz', 'lesson_quiz', 'standalone_test', 'practice_test'].includes(type)) {
                whereConditions.push('test_type = @testType');
                params.testType = type;
            }

            // Filter by status if provided
            if (status && ['draft', 'active', 'inactive'].includes(status)) {
                whereConditions.push('status = @status');
                params.status = status;
            } else {
                // Default: only show active tests
                whereConditions.push('status = @status');
                params.status = 'active';
            }

            // Exclude tests already attached to a specific course
            if (course_id) {
                whereConditions.push('test_id NOT IN (SELECT test_id FROM courses WHERE course_id = @courseId AND test_id IS NOT NULL)');
                params.courseId = parseInt(course_id);
            }

            const query = `
                SELECT
                    test_id,
                    title,
                    description,
                    test_type,
                    time_limit,
                    passing_score,
                    max_attempts,
                    total_questions,
                    status,
                    created_at,
                    updated_at
                FROM tests
                WHERE ${whereConditions.join(' AND ')}
                ORDER BY created_at DESC
            `;

            const request = pool.request();

            // Add parameters to request
            if (params.testType) request.input('testType', sql.NVarChar(50), params.testType);
            if (params.status) request.input('status', sql.NVarChar(20), params.status);
            if (params.courseId) request.input('courseId', sql.Int, params.courseId);

            const result = await request.query(query);

            res.json({
                success: true,
                data: result.recordset,
                count: result.recordset.length
            });

        } catch (error) {
            console.error('Get available tests error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดรายการข้อสอบ',
                error: error.message
            });
        }
    },

    async getRecommendedCourses(req, res) {
        try {
            const userId = req.user.user_id;
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
                        position_name,
                        level,
                        position_level,
                        job_grade,
                        unit_id
                    FROM Positions
                    WHERE is_active = 1
                    ORDER BY level, position_name
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
                        ou.unit_id,
                        ou.unit_name_th,
                        ou.unit_name_en,
                        ou.unit_code,
                        ol.level_code,
                        ou.parent_id,
                        ou.level_id
                    FROM OrganizationUnits ou
                    LEFT JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                    WHERE ou.is_active = 1
                      AND ou.level_id IN (1, 2, 4, 5, 6)
                    ORDER BY ou.level_id, ou.unit_name_th
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
            const userId = req.user.user_id;

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
            const userId = req.user.user_id;

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
            const userId = req.user.user_id;

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
            const userId = req.user.user_id;

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

            // Import language helpers
            const { getCurrentLanguage, getTranslation } = require('../utils/languages');
            const currentLang = getCurrentLanguage(req);
            const t = res.locals.t || ((key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue);

            res.render('courses/categories', {
                title: 'จัดการหมวดหมู่หลักสูตร - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: req.user.role_name,
                t: t,
                currentLang: currentLang
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
                        cc.created_at,
                        cc.updated_at,
                        u1.first_name + ' ' + u1.last_name AS created_by_name,
                        u2.first_name + ' ' + u2.last_name AS updated_by_name,
                        COUNT(c.course_id) as course_count
                    FROM CourseCategories cc
                    LEFT JOIN Users u1 ON cc.created_by = u1.user_id
                    LEFT JOIN Users u2 ON cc.updated_by = u2.user_id
                    LEFT JOIN Courses c ON cc.category_name = c.category AND c.status = 'published'
                    GROUP BY cc.category_id, cc.category_name, cc.category_name_en,
                             cc.description, cc.category_icon, cc.category_color,
                             cc.display_order, cc.created_at, cc.updated_at,
                             cc.created_by, cc.updated_by,
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
                        cc.category_id,
                        cc.category_name,
                        cc.category_name_en,
                        cc.description,
                        cc.category_icon,
                        cc.category_color,
                        cc.display_order,
                        cc.created_at,
                        cc.updated_at,
                        cc.created_by,
                        cc.updated_by,
                        u1.first_name + ' ' + u1.last_name AS created_by_name,
                        u2.first_name + ' ' + u2.last_name AS updated_by_name,
                        COUNT(c.course_id) as course_count
                    FROM CourseCategories cc
                    LEFT JOIN Users u1 ON cc.created_by = u1.user_id
                    LEFT JOIN Users u2 ON cc.updated_by = u2.user_id
                    LEFT JOIN Courses c ON cc.category_name = c.category AND c.status = 'published'
                    WHERE cc.category_id = @category_id
                    GROUP BY cc.category_id, cc.category_name, cc.category_name_en,
                             cc.description, cc.category_icon, cc.category_color,
                             cc.display_order, cc.created_at, cc.updated_at,
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
            const userId = req.user.user_id;
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
            const userId = req.user.user_id;
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
            const userId = req.user.user_id;
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
    },

    // Get all available tests for course creation
    async getAvailableTests(req, res) {
        try {
            const { poolPromise } = require('../config/database');
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT
                    t.test_id,
                    t.title as test_name,
                    t.description as test_description,
                    (
                        SELECT COUNT(*)
                        FROM Questions WHERE test_id = t.test_id AND is_active = 1
                    ) + (
                        SELECT COUNT(*)
                        FROM TestQuestions tq
                        WHERE tq.test_id = t.test_id
                    ) as total_questions,
                    t.passing_marks as passing_score,
                    t.time_limit as duration_minutes,
                    t.attempts_allowed as max_attempts,
                    c.title as course_name,
                    CONCAT(u.first_name, ' ', u.last_name) as creator_name
                FROM Tests t
                LEFT JOIN Courses c ON t.course_id = c.course_id
                LEFT JOIN Users u ON t.instructor_id = u.user_id
                WHERE t.status IN ('Active', 'Published')
                ORDER BY t.created_at DESC
            `);

            res.json({
                success: true,
                data: result.recordset
            });

        } catch (error) {
            console.error('Get available tests error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการโหลดรายการข้อสอบ'
            });
        }
    },

    // Create test for course
    async createTestForCourse(req, res) {
        try {
            const userId = req.user.user_id;
            const {
                test_name,
                test_description,
                course_id,
                passing_score,
                max_attempts,
                duration_minutes,
                randomize_questions,
                randomize_answers,
                show_results_immediately
            } = req.body;

            if (!test_name) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณากรอกชื่อข้อสอบ'
                });
            }

            const { poolPromise } = require('../config/database');
            const pool = await poolPromise;

            const result = await pool.request()
                .input('title', test_name)
                .input('description', test_description || null)
                .input('course_id', course_id || null)
                .input('instructor_id', userId)
                .input('passing_marks', passing_score || 70)
                .input('attempts_allowed', max_attempts || 3)
                .input('time_limit', duration_minutes || 60)
                .input('randomize_questions', randomize_questions !== false)
                .input('show_results', show_results_immediately !== false)
                .input('status', 'Active')
                .input('type', 'assessment')
                .query(`
                    INSERT INTO Tests (
                        title, description, course_id, instructor_id,
                        passing_marks, attempts_allowed, time_limit,
                        randomize_questions, show_results,
                        status, type, created_at
                    )
                    OUTPUT INSERTED.test_id
                    VALUES (
                        @title, @description, @course_id, @instructor_id,
                        @passing_marks, @attempts_allowed, @time_limit,
                        @randomize_questions, @show_results,
                        @status, @type, GETDATE()
                    )
                `);

            const testId = result.recordset[0].test_id;

            await ActivityLog.create({
                user_id: userId,
                action: 'Create',
                table_name: 'Tests',
                record_id: testId,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `Created test: ${test_name}`,
                severity: 'Info',
                module: 'Assessment'
            });

            res.status(201).json({
                success: true,
                message: 'สร้างข้อสอบสำเร็จ',
                data: {
                    test_id: testId
                }
            });

        } catch (error) {
            console.error('Create test for course error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการสร้างข้อสอบ'
            });
        }
    },

    // Upload course image
    async uploadCourseImage(req, res) {
        try {
            const fileUploadService = require('../utils/fileUpload');

            // Use image upload middleware
            await fileUploadService.createImageUpload()(req, res, async (err) => {
                if (err) {
                    console.error('Upload error:', err);
                    return res.status(400).json({
                        success: false,
                        message: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ'
                    });
                }

                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        message: 'กรุณาเลือกไฟล์รูปภาพ'
                    });
                }

                // Return the uploaded file path
                const filePath = `/uploads/images/${req.file.filename}`;

                res.json({
                    success: true,
                    message: 'อัปโหลดรูปภาพสำเร็จ',
                    data: {
                        filename: req.file.filename,
                        path: filePath,
                        url: filePath,
                        size: req.file.size
                    }
                });
            });

        } catch (error) {
            console.error('Upload course image error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
                error: error.message
            });
        }
    },

    // Get course curriculum
    async getCourseCurriculum(req, res) {
        try {
            const { course_id } = req.params;
            const pool = await poolPromise;

            const result = await pool.request()
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT material_id, title, type, content,
                           order_index, duration_minutes, is_required
                    FROM course_materials
                    WHERE course_id = @courseId
                    AND type NOT IN ('document', 'pdf', 'file')
                    ORDER BY order_index
                `);

            // Group by sections if needed
            const curriculum = [{
                title: 'เนื้อหาหลักสูตร',
                description: '',
                lessons: result.recordset.map(m => ({
                    id: m.material_id,
                    title: m.title,
                    type: m.type || 'document',
                    duration: m.duration_minutes || 0,
                    completed: false
                }))
            }];

            res.json({ success: true, data: curriculum });
        } catch (error) {
            console.error('Get curriculum error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get course materials
    async getCourseMaterials(req, res) {
        try {
            const { course_id } = req.params;
            const pool = await poolPromise;

            const result = await pool.request()
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT material_id, title, type, content, file_path, file_size,
                           order_index, duration_minutes, mime_type, is_downloadable
                    FROM course_materials
                    WHERE course_id = @courseId
                    AND type IN ('document', 'pdf', 'file')
                    ORDER BY order_index
                `);

            const materials = result.recordset.map(m => ({
                material_id: m.material_id,
                title: m.title,
                description: m.content || '',
                file_type: m.type,
                file_url: m.file_path || m.content,
                file_size: m.file_size || 0,
                mime_type: m.mime_type,
                is_downloadable: m.is_downloadable !== false
            }));

            res.json({ success: true, data: materials });
        } catch (error) {
            console.error('Get materials error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Upload course materials
    async uploadCourseMaterials(req, res) {
        try {
            const { course_id } = req.params;
            const pool = await poolPromise;
            const multer = require('multer');
            const path = require('path');
            const fs = require('fs');

            // Setup multer for file upload
            const storage = multer.diskStorage({
                destination: function (req, file, cb) {
                    const uploadDir = path.join(__dirname, '../public/uploads/materials');
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    cb(null, uploadDir);
                },
                filename: function (req, file, cb) {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    cb(null, uniqueSuffix + '-' + file.originalname);
                }
            });

            const upload = multer({ storage: storage }).array('materials', 10);

            upload(req, res, async function (err) {
                if (err) {
                    console.error('Upload error:', err);
                    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' });
                }

                if (!req.files || req.files.length === 0) {
                    return res.status(400).json({ success: false, message: 'ไม่พบไฟล์ที่ต้องการอัปโหลด' });
                }

                try {
                    // Get next order_index
                    const maxOrder = await pool.request()
                        .input('courseId', sql.Int, parseInt(course_id))
                        .query('SELECT ISNULL(MAX(order_index), 0) as max_order FROM course_materials WHERE course_id = @courseId');

                    let orderIndex = maxOrder.recordset[0].max_order + 1;

                    // Insert each file into database
                    for (const file of req.files) {
                        const filePath = `/uploads/materials/${file.filename}`;

                        await pool.request()
                            .input('courseId', sql.Int, parseInt(course_id))
                            .input('title', sql.NVarChar(255), file.originalname)
                            .input('type', sql.NVarChar(50), 'document')
                            .input('filePath', sql.NVarChar(500), filePath)
                            .input('fileSize', sql.BigInt, file.size)
                            .input('mimeType', sql.NVarChar(100), file.mimetype)
                            .input('orderIndex', sql.Int, orderIndex++)
                            .input('isDownloadable', sql.Bit, true)
                            .query(`
                                INSERT INTO course_materials (
                                    course_id, title, type, file_path, file_size,
                                    mime_type, order_index, is_downloadable, created_at, updated_at
                                )
                                VALUES (
                                    @courseId, @title, @type, @filePath, @fileSize,
                                    @mimeType, @orderIndex, @isDownloadable, GETDATE(), GETDATE()
                                )
                            `);
                    }

                    res.json({
                        success: true,
                        message: `อัปโหลดเอกสารประกอบ ${req.files.length} ไฟล์เรียบร้อยแล้ว`,
                        data: { count: req.files.length }
                    });

                } catch (dbError) {
                    console.error('Database error:', dbError);
                    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
                }
            });

        } catch (error) {
            console.error('Upload materials error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get course discussions
    async getCourseDiscussions(req, res) {
        try {
            const { course_id } = req.params;
            // TODO: Implement when discussions table is ready
            res.json({ success: true, data: [] });
        } catch (error) {
            console.error('Get discussions error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get course reviews
    async getCourseReviews(req, res) {
        try {
            const { course_id } = req.params;
            // TODO: Implement when reviews table is ready
            res.json({ success: true, data: [] });
        } catch (error) {
            console.error('Get reviews error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get related courses
    async getRelatedCourses(req, res) {
        try {
            const { course_id } = req.params;
            const pool = await poolPromise;

            // Get current course category
            const currentCourse = await pool.request()
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`SELECT category FROM courses WHERE course_id = @courseId`);

            if (currentCourse.recordset.length === 0) {
                return res.json({ success: true, data: [] });
            }

            const category = currentCourse.recordset[0].category;

            // Get related courses
            const result = await pool.request()
                .input('courseId', sql.Int, parseInt(course_id))
                .input('category', sql.NVarChar(100), category)
                .query(`
                    SELECT TOP 5 c.course_id, c.title, c.thumbnail,
                           c.duration_hours, c.category,
                           CONCAT(u.first_name, ' ', u.last_name) as instructor_name
                    FROM courses c
                    LEFT JOIN users u ON c.instructor_id = u.user_id
                    WHERE c.category = @category
                    AND c.course_id != @courseId
                    AND c.status IN ('Active', 'Published')
                    ORDER BY c.created_at DESC
                `);

            res.json({ success: true, data: result.recordset });
        } catch (error) {
            console.error('Get related courses error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Rate course - Submit rating and review
    async rateCourse(req, res) {
        try {
            const { course_id } = req.params;
            const { rating, review } = req.body;
            const userId = req.user.user_id;

            // Validate rating
            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณาให้คะแนนระหว่าง 1-5 ดาว'
                });
            }

            const pool = await poolPromise;

            // Check if user is enrolled in this course
            const enrollment = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT enrollment_id, completion_status
                    FROM user_courses
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            if (enrollment.recordset.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'คุณต้องลงทะเบียนเรียนก่อนจึงจะให้คะแนนได้'
                });
            }

            // For now, update enrollment with rating (temporary solution)
            // TODO: Create course_ratings table for proper rating system
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .input('rating', sql.Int, rating)
                .input('review', sql.NVarChar(sql.MAX), review || null)
                .query(`
                    UPDATE user_courses
                    SET grade = @rating * 20,  -- Convert 5-star to 100 scale temporarily
                        updated_at = GETDATE()
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            // Log activity
            await ActivityLog.create({
                user_id: userId,
                action: 'Rate_Course',
                table_name: 'user_courses',
                record_id: enrollment.recordset[0].enrollment_id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `User rated course ${course_id} with ${rating} stars`,
                severity: 'Info',
                module: 'Course Management'
            });

            res.json({
                success: true,
                message: 'ส่งคะแนนสำเร็จ ขอบคุณสำหรับความคิดเห็น!'
            });

        } catch (error) {
            console.error('Rate course error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการส่งคะแนน'
            });
        }
    }
};

module.exports = courseController;