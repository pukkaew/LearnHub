const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ActivityLog = require('../models/ActivityLog');
const { poolPromise, sql } = require('../config/database');
const validationService = require('../utils/validation');

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
                message: req.t('errorLoadingCourseList')
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
                    message: req.t('courseNotFound')
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
                message: req.t('errorLoadingCourseData')
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
            console.log('  max_students:', req.body.max_students);
            console.log('  certificate_validity:', req.body.certificate_validity);

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionCreateCourse')
                });
            }

            // === SECURITY: XSS Sanitization ===
            // Sanitize all text input fields to prevent XSS attacks
            const sanitizedBody = validationService.sanitizeObject(req.body, [
                'course_name', 'description', 'learning_objectives',
                'instructor_name', 'intro_video_url', 'cover_image_url'
            ]);

            // === VALIDATION: Duration must be positive ===
            const durationHours = parseFloat(sanitizedBody.duration_hours);
            if (sanitizedBody.duration_hours !== undefined && sanitizedBody.duration_hours !== '') {
                if (isNaN(durationHours) || durationHours < 0) {
                    return res.status(400).json({
                        success: false,
                        message: req.t ? req.t('durationMustBePositive') : 'ชั่วโมงเรียนต้องเป็นค่าบวก (ไม่น้อยกว่า 0)'
                    });
                }
                // Convert negative to 0 as safety measure
                sanitizedBody.duration_hours = Math.max(0, durationHours);
            }

            // Validate duration_minutes as well
            const durationMinutes = parseFloat(sanitizedBody.duration_minutes);
            if (sanitizedBody.duration_minutes !== undefined && sanitizedBody.duration_minutes !== '') {
                if (isNaN(durationMinutes) || durationMinutes < 0) {
                    sanitizedBody.duration_minutes = 0;
                } else {
                    sanitizedBody.duration_minutes = Math.max(0, Math.min(59, durationMinutes));
                }
            }

            const courseData = {
                ...sanitizedBody,
                // Map array field names (from form with []) to model field names
                target_positions: sanitizedBody['target_positions[]'] || sanitizedBody.target_positions,
                target_departments: sanitizedBody['target_departments[]'] || sanitizedBody.target_departments,
                // ถ้าไม่มี instructor_id ให้ใช้ null (ใช้ instructor_name แทน)
                instructor_id: sanitizedBody.instructor_id || null,
                // ถ้าไม่มี instructor_name ก็ไม่เป็นไร (optional)
                instructor_name: sanitizedBody.instructor_name || null,
                created_by: userId
            };

            console.log('Creating course with data:', {
                userRole,
                userId,
                instructor_id: courseData.instructor_id,
                course_name: courseData.course_name,
                category_id: courseData.category_id,
                target_positions: courseData.target_positions,
                target_departments: courseData.target_departments
            });

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
                message: req.t('courseCreatedSuccess'),
                data: result.data
            });

        } catch (error) {
            console.error('❌ Create course error:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({
                success: false,
                message: req.t('errorCreatingCourse'),
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
                    message: req.t('courseNotFound')
                });
            }

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionEditThisCourse')
                });
            }

            if (!['Admin', 'Instructor', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionEditCourse')
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
                message: req.t('courseUpdatedSuccess'),
                data: result.data
            });

        } catch (error) {
            console.error('Update course error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorUpdatingCourse')
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
                    message: req.t('noPermissionDeleteCourse')
                });
            }

            const course = await Course.findById(course_id);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: req.t('courseNotFound')
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
                message: req.t('courseDeletedSuccess')
            });

        } catch (error) {
            console.error('Delete course error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorDeletingCourse')
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
                    message: req.t('courseNotFound')
                });
            }

            if (!course.is_active) {
                return res.status(400).json({
                    success: false,
                    message: req.t('courseNotActive')
                });
            }

            const existingEnrollment = await Enrollment.findByUserAndCourse(userId, course_id);
            if (existingEnrollment) {
                return res.status(400).json({
                    success: false,
                    message: req.t('alreadyEnrolledInCourse')
                });
            }

            const enrollmentData = {
                user_id: userId,
                course_id: parseInt(course_id),
                enrollment_type: 'SELF'
            };

            const result = await Enrollment.enroll(enrollmentData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'Enroll_Course',
                table_name: 'user_courses',
                record_id: result.enrollmentId,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `User enrolled in course: ${course.title || course.course_name}`,
                severity: 'Info',
                module: 'Course Management'
            });

            res.status(201).json({
                success: true,
                message: req.t('enrollmentSuccess'),
                data: {
                    enrollment_id: result.enrollmentId
                }
            });

        } catch (error) {
            console.error('Enroll in course error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorEnrolling')
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
                message: req.t('courseErrorLoadingEnrollments')
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
                    message: req.t('courseProgressMustBeBetween0And100')
                });
            }

            const enrollment = await Enrollment.findByUserAndCourse(userId, course_id);
            if (!enrollment) {
                return res.status(404).json({
                    success: false,
                    message: req.t('courseEnrollmentNotFound')
                });
            }

            // Enrollment.updateProgress expects (enrollmentId, progressPercentage)
            const result = await Enrollment.updateProgress(enrollment.enrollment_id, progress_percentage);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'Update_Progress',
                table_name: 'user_courses',
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
                message: req.t('courseProgressUpdatedSuccess'),
                data: {
                    progress_percentage: result.progress
                }
            });

        } catch (error) {
            console.error('Update progress error:', error);
            res.status(500).json({
                success: false,
                message: req.t('courseProgressUpdateError')
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
                    message: req.t('courseNotFound')
                });
            }

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('courseNoPermissionViewThisCourseStats')
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('courseNoPermissionViewCourseStats')
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
                message: req.t('courseStatsLoadError')
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
                title: `${t('allCourses')} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: req.user.role_name,
                t: t,
                currentLang: currentLang
            });

        } catch (error) {
            console.error('Render courses list error:', error);
            res.render('error/500', {
                title: 'errorOccurred - Rukchai Hongyen LearnHub',
                message: req.t('courseListPageLoadError'),
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

            // Validate course_id is a valid number (must be digits only)
            if (!course_id || !/^\d+$/.test(course_id)) {
                return res.render('error/404', {
                    title: 'pageNotFound - Rukchai Hongyen LearnHub',
                    user: req.session.user,
                    t: t
                });
            }

            const course = await Course.findById(course_id);
            if (!course) {
                return res.render('error/404', {
                    title: 'pageNotFound - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

            const enrollment = await Enrollment.findByUserAndCourse(userId, course_id);

            res.render('courses/detail', {
                title: `${course.title || course.course_name || 'course'} - Rukchai Hongyen LearnHub`,
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
                title: 'errorOccurred - Rukchai Hongyen LearnHub',
                message: req.t('courseDataLoadError'),
                user: req.session.user,
                error: error,
                layout: false
            });
        }
    },

    async renderCourseContent(req, res) {
        try {
            const { course_id } = req.params;
            const userId = req.user.user_id;

            // Import language helpers
            const { getCurrentLanguage, getTranslation, translations } = require('../utils/languages');
            const currentLang = getCurrentLanguage(req);
            const t = res.locals.t || ((key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue);

            // Validate course_id is a valid number (must be digits only)
            if (!course_id || !/^\d+$/.test(course_id)) {
                return res.render('error/404', {
                    title: 'pageNotFound - Rukchai Hongyen LearnHub',
                    user: req.session.user,
                    t: t
                });
            }

            const course = await Course.findById(course_id);
            if (!course) {
                return res.render('error/404', {
                    title: 'pageNotFound - Rukchai Hongyen LearnHub',
                    user: req.session.user,
                    t: t
                });
            }

            // Check if user is enrolled
            const enrollment = await Enrollment.findByUserAndCourse(userId, course_id);
            if (!enrollment) {
                // User not enrolled, redirect to course detail
                return res.redirect(`/courses/${course_id}`);
            }

            res.render('courses/content', {
                title: `${course.title || course.course_name || 'course'} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: req.user.role_name,
                course: course,
                courseId: course_id,
                enrollment: enrollment,
                t: t,
                currentLang: currentLang,
                translations: translations[currentLang] || translations.th
            });

        } catch (error) {
            console.error('Render course content error:', error);
            res.status(500).render('error/500', {
                title: 'errorOccurred - Rukchai Hongyen LearnHub',
                message: req.t ? req.t('courseContentLoadError') : 'Failed to load course content',
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
                title: `${t('myCourses')} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: req.user.role_name,
                t: t,
                currentLang: currentLang
            });

        } catch (error) {
            console.error('Render my courses error:', error);
            res.render('error/500', {
                title: 'errorOccurred - Rukchai Hongyen LearnHub',
                message: req.t('myCoursesPageLoadError'),
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
                    title: 'noPermissionAccess - Rukchai Hongyen LearnHub',
                    message: req.t('courseNoPermissionCreate'),
                    user: req.session.user
                });
            }

            res.render('courses/create', {
                title: 'createNewCourse - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: req.user.role_name,
                t: t,
                currentLang: currentLang
            });

        } catch (error) {
            console.error('Render create course error:', error);
            res.status(500).render('error/500', {
                title: 'errorOccurred - Rukchai Hongyen LearnHub',
                message: req.t('courseCreatePageLoadError'),
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
                    title: 'pageNotFound - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).render('error/403', {
                    title: 'noPermissionAccess - Rukchai Hongyen LearnHub',
                    message: req.t('noPermissionEditThisCourse'),
                    user: req.session.user
                });
            }

            if (!['Admin', 'Instructor', 'HR'].includes(userRole)) {
                return res.status(403).render('error/403', {
                    title: 'noPermissionAccess - Rukchai Hongyen LearnHub',
                    message: req.t('noPermissionEditCourse'),
                    user: req.session.user
                });
            }

            res.render('courses/edit', {
                title: `editCourse:${course.course_name} - Rukchai Hongyen LearnHub`,
                user: req.session.user,
                userRole: req.user.role_name,
                course: course,
                t: t,
                currentLang: currentLang
            });

        } catch (error) {
            console.error('Render edit course error:', error);
            res.status(500).render('error/500', {
                title: 'errorOccurred - Rukchai Hongyen LearnHub',
                message: req.t('courseEditPageLoadError'),
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
                message: req.t('errorLoadingCategoryList')
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
                message: req.t('errorLoadingInstructorList')
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
                message: req.t('recommendedCoursesLoadError')
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
                message: req.t('popularCoursesLoadError')
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
                message: req.t('positionsLoadError')
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
                message: req.t('departmentsLoadError')
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
                    message: req.t('courseNotFound')
                });
            }

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionViewAnalytics')
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionViewAnalytics')
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
                message: req.t('courseAnalyticsLoadError')
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
                    message: req.t('courseNotFound')
                });
            }

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionViewProgress')
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionViewProgress')
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
                message: req.t('courseProgressDataLoadError')
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
                    message: req.t('courseNotFound')
                });
            }

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionExport')
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionExport')
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
                message: req.t('courseExportError')
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
                    message: req.t('courseNotFound')
                });
            }

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionExport')
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionExport')
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
                message: req.t('courseExportError')
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
                    title: 'noPermissionAccess - Rukchai Hongyen LearnHub',
                    message: req.t('noPermissionManageCategory'),
                    user: req.session.user
                });
            }

            // Import language helpers
            const { getCurrentLanguage, getTranslation } = require('../utils/languages');
            const currentLang = getCurrentLanguage(req);
            const t = res.locals.t || ((key, defaultValue = key) => getTranslation(currentLang, key) || defaultValue);

            res.render('courses/categories', {
                title: 'manageCourseCategories - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: req.user.role_name,
                t: t,
                currentLang: currentLang
            });

        } catch (error) {
            console.error('Render category management error:', error);
            res.status(500).render('error/500', {
                title: 'errorOccurred - Rukchai Hongyen LearnHub',
                message: req.t('categoryManagementPageLoadError'),
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
                    LEFT JOIN Courses c ON cc.category_name = c.category AND c.status = 'published'
                    WHERE cc.is_active = 1
                    GROUP BY cc.category_id, cc.category_name, cc.category_name_en,
                             cc.description, cc.category_icon, cc.category_color,
                             cc.display_order, cc.is_active, cc.created_at, cc.updated_at,
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
                message: req.t('categoryLoadError')
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
                    message: req.t('categoryNotFound')
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
                message: req.t('categoryLoadError')
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
                    message: req.t('categoryNameRequired')
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
                message: req.t('categoryCreatedSuccess'),
                data: result.recordset[0]
            });

        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({
                success: false,
                message: req.t('categoryCreateError')
            });
        }
    },

    // Update category
    async updateCategoryAdmin(req, res) {
        try {
            const { category_id } = req.params;
            const userId = req.session?.user?.user_id || req.user?.user_id;
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

            // Get old data for activity log and partial update support
            const oldData = await pool.request()
                .input('category_id', category_id)
                .query('SELECT * FROM CourseCategories WHERE category_id = @category_id');

            if (oldData.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: req.t('categoryNotFound')
                });
            }

            const existing = oldData.recordset[0];

            // Support partial update - use existing values if not provided
            const updatedName = category_name !== undefined ? category_name : existing.category_name;
            const updatedNameEn = category_name_en !== undefined ? category_name_en : existing.category_name_en;
            const updatedDescription = description !== undefined ? description : existing.description;
            const updatedIcon = category_icon !== undefined ? category_icon : existing.category_icon;
            const updatedColor = category_color !== undefined ? category_color : existing.category_color;
            const updatedOrder = display_order !== undefined ? display_order : existing.display_order;
            const updatedActive = is_active !== undefined ? is_active : existing.is_active;

            // Update without OUTPUT clause (triggers conflict)
            await pool.request()
                .input('category_id', category_id)
                .input('category_name', updatedName)
                .input('category_name_en', updatedNameEn || null)
                .input('description', updatedDescription || null)
                .input('category_icon', updatedIcon || null)
                .input('category_color', updatedColor || '#64748b')
                .input('display_order', updatedOrder || 0)
                .input('is_active', updatedActive)
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
                    WHERE category_id = @category_id
                `);

            // Fetch updated data separately
            const result = await pool.request()
                .input('category_id', category_id)
                .query('SELECT * FROM CourseCategories WHERE category_id = @category_id');

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
                `Updated category: ${updatedName}`
            );

            res.json({
                success: true,
                message: req.t('categoryUpdatedSuccess'),
                data: result.recordset[0]
            });

        } catch (error) {
            console.error('Update category error:', error);
            res.status(500).json({
                success: false,
                message: req.t('categoryUpdateError')
            });
        }
    },

    // Delete (soft delete) category
    async deleteCategoryAdmin(req, res) {
        try {
            const { category_id } = req.params;
            const userId = req.session?.user?.user_id || req.user?.user_id;
            const { poolPromise } = require('../config/database');
            const pool = await poolPromise;

            // Get category data
            const categoryData = await pool.request()
                .input('category_id', category_id)
                .query('SELECT * FROM CourseCategories WHERE category_id = @category_id');

            if (categoryData.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: req.t('categoryNotFound')
                });
            }

            // Check if category has courses
            const courseCount = await pool.request()
                .input('category_id', category_id)
                .query('SELECT COUNT(*) as count FROM Courses WHERE category = @category_id AND is_active = 1');

            if (courseCount.recordset[0].count > 0) {
                return res.status(400).json({
                    success: false,
                    message: req.t('courseCannotDeleteCategoryHasCourses', { count: courseCount.recordset[0].count })
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
                message: req.t('categoryDeletedSuccess')
            });

        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({
                success: false,
                message: req.t('categoryDeleteError')
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
                        message: err.message || 'courseImageUploadError'
                    });
                }

                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        message: req.t('noFileSelected')
                    });
                }

                // Return the uploaded file path
                const filePath = `/uploads/images/${req.file.filename}`;

                res.json({
                    success: true,
                    message: req.t('imageUploadedSuccess'),
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
                message: req.t('courseImageUploadError'),
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
                title: 'courseContent',
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

    // Get course materials (all types for content page)
    async getCourseMaterials(req, res) {
        try {
            const { course_id } = req.params;
            const userId = req.user?.user_id;
            const pool = await poolPromise;

            // Get all materials for content page using SELECT *
            const result = await pool.request()
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT *
                    FROM course_materials
                    WHERE course_id = @courseId
                    ORDER BY order_index
                `);

            // Get user's progress for all materials in this course
            let userProgress = {};
            if (userId) {
                const progressResult = await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('courseId', sql.Int, parseInt(course_id))
                    .query(`
                        SELECT material_id, is_completed, completed_at, time_spent_seconds
                        FROM user_material_progress
                        WHERE user_id = @userId AND course_id = @courseId
                    `);

                // Create a map for quick lookup
                progressResult.recordset.forEach(p => {
                    userProgress[p.material_id] = {
                        is_completed: p.is_completed,
                        completed_at: p.completed_at,
                        time_spent_seconds: p.time_spent_seconds || 0
                    };
                });
            }

            // Helper function to detect YouTube URL
            const getYoutubeInfo = (url) => {
                if (!url) return { is_youtube: false, youtube_embed_url: '' };
                const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
                const match = url.match(youtubeRegex);
                if (match && match[1]) {
                    return { is_youtube: true, youtube_embed_url: `https://www.youtube.com/embed/${match[1]}` };
                }
                return { is_youtube: false, youtube_embed_url: '' };
            };

            const materials = result.recordset.map(m => {
                const videoUrl = m.video_url || m.file_path || m.file_url || '';
                const youtubeInfo = getYoutubeInfo(videoUrl);
                const progress = userProgress[m.material_id] || {};

                return {
                    material_id: m.material_id,
                    title: m.title,
                    description: m.description || m.content || '',
                    content: m.content || '',
                    material_type: youtubeInfo.is_youtube ? 'video' : (m.type || m.material_type || 'text'),
                    file_type: m.type || m.material_type || 'text',
                    file_url: m.file_path || m.video_url || m.file_url || '',
                    video_url: videoUrl,
                    file_size: m.file_size || 0,
                    mime_type: m.mime_type || '',
                    duration: m.duration_minutes ? `${m.duration_minutes} นาที` : (m.duration || ''),
                    is_downloadable: m.is_downloadable !== false,
                    is_completed: progress.is_completed || false,
                    completed_at: progress.completed_at || null,
                    time_spent_seconds: progress.time_spent_seconds || 0,
                    is_youtube: youtubeInfo.is_youtube,
                    youtube_embed_url: youtubeInfo.youtube_embed_url
                };
            });

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
const { t } = require('../utils/languages');

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
                    return res.status(500).json({ success: false, message: req.t('uploadError') });
                }

                if (!req.files || req.files.length === 0) {
                    return res.status(400).json({ success: false, message: req.t('noFilesSelected') });
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
                        message: req.t('courseDocumentsUploadedSuccess', { count: req.files.length }),
                        data: { count: req.files.length }
                    });

                } catch (dbError) {
                    console.error('Database error:', dbError);
                    res.status(500).json({ success: false, message: req.t('databaseError') });
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
            const pool = await poolPromise;

            // Get reviews with user information
            const reviewsResult = await pool.request()
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT
                        cr.review_id,
                        cr.course_id,
                        cr.user_id,
                        cr.rating,
                        cr.review_text,
                        cr.created_at,
                        cr.updated_at,
                        cr.is_approved,
                        u.first_name,
                        u.last_name,
                        u.profile_image as avatar_url
                    FROM course_reviews cr
                    LEFT JOIN users u ON cr.user_id = u.user_id
                    WHERE cr.course_id = @courseId
                    AND (cr.is_approved = 1 OR cr.is_approved IS NULL)
                    ORDER BY cr.created_at DESC
                `);

            // Calculate stats
            const statsResult = await pool.request()
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT
                        COUNT(*) as total_reviews,
                        AVG(CAST(rating as FLOAT)) as average_rating,
                        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
                        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
                        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
                        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
                        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
                    FROM course_reviews
                    WHERE course_id = @courseId
                    AND (is_approved = 1 OR is_approved IS NULL)
                `);

            const stats = statsResult.recordset[0];

            res.json({
                success: true,
                data: reviewsResult.recordset,
                stats: {
                    total_reviews: stats.total_reviews || 0,
                    average_rating: stats.average_rating ? parseFloat(stats.average_rating.toFixed(1)) : 0,
                    distribution: {
                        five_star: stats.five_star || 0,
                        four_star: stats.four_star || 0,
                        three_star: stats.three_star || 0,
                        two_star: stats.two_star || 0,
                        one_star: stats.one_star || 0
                    }
                }
            });
        } catch (error) {
            console.error('Get reviews error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Submit course review
    async submitCourseReview(req, res) {
        try {
            const { course_id } = req.params;
            const { rating, review_text } = req.body;
            const userId = req.user.user_id;
            const pool = await poolPromise;

            // Validate rating
            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: req.t ? req.t('coursePleaseRateBetween1And5Stars') : 'Please rate between 1 and 5 stars'
                });
            }

            // Check if user is enrolled in this course
            const enrollment = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT enrollment_id, status
                    FROM user_courses
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            if (enrollment.recordset.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: req.t ? req.t('mustEnrollToRate') : 'You must be enrolled to review this course'
                });
            }

            // Check if user already reviewed this course
            const existingReview = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT review_id FROM course_reviews
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            if (existingReview.recordset.length > 0) {
                // Update existing review
                await pool.request()
                    .input('reviewId', sql.Int, existingReview.recordset[0].review_id)
                    .input('rating', sql.Int, rating)
                    .input('reviewText', sql.NVarChar(sql.MAX), review_text || null)
                    .query(`
                        UPDATE course_reviews
                        SET rating = @rating,
                            review_text = @reviewText,
                            updated_at = GETDATE()
                        WHERE review_id = @reviewId
                    `);

                res.json({
                    success: true,
                    message: req.t ? req.t('reviewUpdated') : 'Review updated successfully'
                });
            } else {
                // Insert new review
                await pool.request()
                    .input('courseId', sql.Int, parseInt(course_id))
                    .input('userId', sql.Int, userId)
                    .input('rating', sql.Int, rating)
                    .input('reviewText', sql.NVarChar(sql.MAX), review_text || null)
                    .query(`
                        INSERT INTO course_reviews (course_id, user_id, rating, review_text, created_at, is_approved)
                        VALUES (@courseId, @userId, @rating, @reviewText, GETDATE(), 1)
                    `);

                // Log activity
                await ActivityLog.create({
                    user_id: userId,
                    action: 'Submit_Review',
                    table_name: 'course_reviews',
                    record_id: course_id,
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent'),
                    session_id: req.sessionID,
                    description: `User submitted review for course ${course_id} with ${rating} stars`,
                    severity: 'Info',
                    module: 'Course Management'
                });

                res.json({
                    success: true,
                    message: req.t ? req.t('reviewSubmitted') : 'Review submitted successfully'
                });
            }
        } catch (error) {
            console.error('Submit review error:', error);
            res.status(500).json({
                success: false,
                message: req.t ? req.t('errorSubmittingReview') : 'Error submitting review'
            });
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
                    message: req.t('coursePleaseRateBetween1And5Stars')
                });
            }

            const pool = await poolPromise;

            // Check if user is enrolled in this course
            const enrollment = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT enrollment_id, status
                    FROM user_courses
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            if (enrollment.recordset.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: req.t('mustEnrollToRate')
                });
            }

            // For now, update enrollment with rating (temporary solution)
            // TODO: Create course_ratings table for proper rating system
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .input('rating', sql.Int, rating)
                .query(`
                    UPDATE user_courses
                    SET grade = @rating * 20,  -- Convert 5-star to 100 scale temporarily
                        last_access_date = GETDATE()
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
                message: req.t('ratingSuccess')
            });

        } catch (error) {
            console.error('Rate course error:', error);
            res.status(500).json({
                success: false,
                message: req.t('ratingError')
            });
        }
    },

    async getAvailableTests(req, res) {
        try {
            const { poolPromise } = require('../config/database');
            const pool = await poolPromise;

            // Get all active tests that are not linked to any course (standalone tests)
            const result = await pool.request().query(`
                SELECT
                    test_id,
                    title,
                    type,
                    description,
                    passing_marks,
                    attempts_allowed,
                    created_at
                FROM tests
                WHERE status = 'Active'
                    AND (course_id IS NULL OR course_id = 0)
                ORDER BY created_at DESC
            `);

            res.json({
                success: true,
                data: result.recordset
            });

        } catch (error) {
            console.error('Get available tests error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingTests') || 'Error loading available tests',
                data: []
            });
        }
    }
};

module.exports = courseController;