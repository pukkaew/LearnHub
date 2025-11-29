const validationService = require('../utils/validation');
const logger = require('../utils/logger');

class ValidationMiddleware {
    constructor() {
        this.validationService = validationService;
    }

    // Generic validation middleware
    validate(rules) {
        return (req, res, next) => {
            const validation = this.validationService.validate(req.body, rules);

            if (!validation.isValid) {
                logger.info('Validation failed', {
                    endpoint: req.originalUrl,
                    errors: validation.errors,
                    user_id: req.user?.user_id
                });

                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: validation.errors
                });
            }

            // Store validated data
            req.validated = validation.data;
            next();
        };
    }

    // File validation middleware
    validateFile(rules = {}) {
        return (req, res, next) => {
            if (!req.file && rules.required) {
                return res.status(400).json({
                    success: false,
                    message: 'จำเป็นต้องแนบไฟล์'
                });
            }

            if (req.file) {
                const errors = this.validationService.validateFile(req.file, rules);

                if (errors.length > 0) {
                    logger.warn('File validation failed', {
                        filename: req.file.originalname,
                        errors: errors,
                        user_id: req.user?.user_id
                    });

                    return res.status(400).json({
                        success: false,
                        message: 'ไฟล์ไม่ถูกต้อง',
                        errors: errors
                    });
                }
            }

            next();
        };
    }

    // Multiple files validation
    validateFiles(rules = {}) {
        return (req, res, next) => {
            if (!req.files || req.files.length === 0) {
                if (rules.required) {
                    return res.status(400).json({
                        success: false,
                        message: 'จำเป็นต้องแนบไฟล์'
                    });
                }
                return next();
            }

            const allErrors = [];

            for (const file of req.files) {
                const errors = this.validationService.validateFile(file, rules);
                if (errors.length > 0) {
                    allErrors.push({
                        filename: file.originalname,
                        errors: errors
                    });
                }
            }

            if (allErrors.length > 0) {
                logger.warn('Multiple files validation failed', {
                    file_errors: allErrors,
                    user_id: req.user?.user_id
                });

                return res.status(400).json({
                    success: false,
                    message: 'ไฟล์ไม่ถูกต้อง',
                    errors: allErrors
                });
            }

            next();
        };
    }

    // User validation middlewares
    validateUserRegistration() {
        return this.validate({
            first_name: 'required|minLength:2|maxLength:50',
            last_name: 'required|minLength:2|maxLength:50',
            email: 'required|email',
            password: 'required|strong_password|minLength:8',
            phone: 'phone',
            role: 'in:admin,hr,manager,employee,learner'
        });
    }

    validateUserUpdate() {
        return this.validate({
            first_name: 'minLength:2|maxLength:50',
            last_name: 'minLength:2|maxLength:50',
            email: 'email',
            phone: 'phone',
            role: 'in:admin,hr,manager,employee,learner'
        });
    }

    validateLogin() {
        return this.validate({
            email: 'required|email',
            password: 'required|minLength:1'
        });
    }

    validatePasswordReset() {
        return this.validate({
            email: 'required|email'
        });
    }

    validatePasswordChange() {
        return (req, res, next) => {
            const validation = this.validationService.validate(req.body, {
                current_password: 'required',
                new_password: 'required|strong_password|minLength:8',
                confirm_password: 'required'
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: validation.errors
                });
            }

            // Check password confirmation
            if (req.body.new_password !== req.body.confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: 'รหัสผ่านใหม่ไม่ตรงกัน'
                });
            }

            req.validated = validation.data;
            next();
        };
    }

    // Course validation middlewares
    validateCourseCreation() {
        return async (req, res, next) => {
            // ============================================
            // FIX 6.9: Payload size limit (100KB max)
            // ============================================
            const bodySize = JSON.stringify(req.body).length;
            if (bodySize > 100000) { // 100KB
                logger.warn('Payload too large', { size: bodySize, limit: 100000 });
                return res.status(413).json({
                    success: false,
                    message: 'ขนาดข้อมูลเกินขีดจำกัด (สูงสุด 100KB)',
                    errors: { payload: ['Payload size exceeds 100KB limit'] }
                });
            }

            // ============================================
            // FIX 2.11 & 2.12: Validate difficulty_level and course_type
            // ============================================
            const validDifficultyLevels = ['Beginner', 'Intermediate', 'Advanced'];
            const validCourseTypes = ['mandatory', 'elective', 'recommended']; // บังคับ, เลือก, แนะนำ

            if (req.body.difficulty_level && !validDifficultyLevels.includes(req.body.difficulty_level)) {
                return res.status(400).json({
                    success: false,
                    message: `ระดับความยากไม่ถูกต้อง (ต้องเป็น: ${validDifficultyLevels.join(', ')})`,
                    errors: { difficulty_level: [`Must be one of: ${validDifficultyLevels.join(', ')}`] }
                });
            }

            if (req.body.course_type && !validCourseTypes.includes(req.body.course_type)) {
                return res.status(400).json({
                    success: false,
                    message: `ประเภทหลักสูตรไม่ถูกต้อง (ต้องเป็น: ${validCourseTypes.join(', ')})`,
                    errors: { course_type: [`Must be one of: ${validCourseTypes.join(', ')}`] }
                });
            }

            // Basic course field validation
            // FIX 4.14: Allow duration_hours min:0 (with minutes validation below)
            const baseValidation = this.validationService.validate(req.body, {
                title: 'required|minLength:10|maxLength:200',
                course_name: 'minLength:10|maxLength:200',  // Validate course_name if provided
                description: 'required|minLength:50',
                category_id: 'required|numeric',
                instructor_id: 'numeric',
                duration_hours: 'numeric|min:0',  // Changed from min:1 to min:0
                max_students: 'numeric|min:1',
                price: 'numeric|min:0',
                status: 'in:draft,published,archived'
            });

            if (!baseValidation.isValid) {
                logger.info('Course base validation failed', {
                    endpoint: req.originalUrl,
                    errors: baseValidation.errors,
                    user_id: req.user?.user_id
                });

                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลหลักสูตรไม่ถูกต้อง',
                    errors: baseValidation.errors
                });
            }

            // ============================================
            // FIX 4.14: Minimum duration validation (at least 30 minutes)
            // ============================================
            const durationHours = parseFloat(req.body.duration_hours) || 0;
            const durationMinutes = parseFloat(req.body.duration_minutes) || 0;
            const totalMinutes = (durationHours * 60) + durationMinutes;

            if (totalMinutes < 30) {
                return res.status(400).json({
                    success: false,
                    message: 'ระยะเวลาหลักสูตรต้องมีอย่างน้อย 30 นาที',
                    errors: { duration: ['Minimum duration is 30 minutes'] }
                });
            }

            // ============================================
            // FIX 2.3: Validate category_id exists in database
            // ============================================
            try {
                const { poolPromise } = require('../config/database');
                const pool = await poolPromise;
                const categoryResult = await pool.request()
                    .input('category_id', req.body.category_id)
                    .query('SELECT category_id FROM CourseCategories WHERE category_id = @category_id AND is_active = 1');

                if (categoryResult.recordset.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'ไม่พบหมวดหมู่ที่เลือก หรือหมวดหมู่ไม่ได้เปิดใช้งาน',
                        errors: { category_id: ['Category not found or inactive'] }
                    });
                }
            } catch (dbError) {
                logger.error('Error validating category_id', { error: dbError.message });
                // Continue if DB check fails - let controller handle it
            }

            // ============================================
            // FIX 2.20: Validate course_code is unique
            // ============================================
            if (req.body.course_code) {
                try {
                    const { poolPromise } = require('../config/database');
                    const pool = await poolPromise;
                    const codeResult = await pool.request()
                        .input('course_code', req.body.course_code)
                        .query('SELECT course_id FROM Courses WHERE course_code = @course_code');

                    if (codeResult.recordset.length > 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'รหัสหลักสูตรนี้ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น',
                            errors: { course_code: ['Course code already exists'] }
                        });
                    }
                } catch (dbError) {
                    logger.error('Error validating course_code uniqueness', { error: dbError.message });
                    // Continue if DB check fails - let controller handle it
                }
            }

            // Validate learning objectives array
            if (req.body.learning_objectives) {
                if (!Array.isArray(req.body.learning_objectives)) {
                    return res.status(400).json({
                        success: false,
                        message: 'วัตถุประสงค์การเรียนรู้ต้องเป็น Array'
                    });
                }

                // ✅ FIX 1: ต้องมีอย่างน้อย 3 ข้อ
                if (req.body.learning_objectives.length < 3) {
                    return res.status(400).json({
                        success: false,
                        message: 'กรุณากรอกวัตถุประสงค์การเรียนรู้อย่างน้อย 3 ข้อ',
                        errors: {
                            learning_objectives: ['ต้องมีอย่างน้อย 3 ข้อ']
                        }
                    });
                }

                if (req.body.learning_objectives.length > 0) {
                    for (let i = 0; i < req.body.learning_objectives.length; i++) {
                        const obj = req.body.learning_objectives[i];
                        if (typeof obj !== 'string' || obj.trim().length < 5) {
                            return res.status(400).json({
                                success: false,
                                message: `วัตถุประสงค์ข้อที่ ${i + 1} ต้องมีความยาวอย่างน้อย 5 ตัวอักษร`
                            });
                        }
                    }
                }
            } else {
                // ✅ FIX 2: learning_objectives เป็น required field
                return res.status(400).json({
                    success: false,
                    message: 'กรุณากรอกวัตถุประสงค์การเรียนรู้',
                    errors: {
                        learning_objectives: ['ฟิลด์นี้จำเป็นต้องระบุ']
                    }
                });
            }

            // Validate lessons array
            if (req.body.lessons) {
                if (!Array.isArray(req.body.lessons)) {
                    return res.status(400).json({
                        success: false,
                        message: 'บทเรียนต้องเป็น Array'
                    });
                }

                // ✅ FIX 3: lessons array can be empty - validation only when has lessons
                // Empty lessons array is now allowed - lessons can be added later

                for (let i = 0; i < req.body.lessons.length; i++) {
                    const lesson = req.body.lessons[i];
                    if (!lesson.title || lesson.title.trim().length < 3) {
                        return res.status(400).json({
                            success: false,
                            message: `ชื่อบทเรียนที่ ${i + 1} ต้องมีความยาวอย่างน้อย 3 ตัวอักษร`
                        });
                    }

                    if (lesson.duration && (isNaN(lesson.duration) || lesson.duration < 1)) {
                        return res.status(400).json({
                            success: false,
                            message: `ระยะเวลาของบทเรียนที่ ${i + 1} ไม่ถูกต้อง`
                        });
                    }
                }
            }
            // ✅ FIX 4: lessons is now OPTIONAL - can create course without lessons first
            // Lessons can be added later through course editing

            // Validate test creation if assessment_type is 'create_new'
            if (req.body.assessment_type === 'create_new') {
                const validTestTypes = [
                    'pre_training_assessment', 'post_training_assessment',
                    'knowledge_check', 'progress_assessment',
                    'midcourse_assessment', 'final_assessment', 'certification_assessment',
                    'practice_exercise'
                ];

                const testValidation = this.validationService.validate(req.body, {
                    new_test_name: 'required|minLength:5|maxLength:200',
                    new_test_type: `required|in:${validTestTypes.join(',')}`,
                    new_test_duration: 'required|numeric|min:5|max:480',
                    new_passing_score: 'numeric|min:0|max:100',
                    new_max_attempts: 'numeric|min:0'
                });

                if (!testValidation.isValid) {
                    logger.info('Test validation failed', {
                        endpoint: req.originalUrl,
                        errors: testValidation.errors,
                        user_id: req.user?.user_id,
                        debug_new_test_duration: req.body.new_test_duration,
                        debug_new_passing_score: req.body.new_passing_score,
                        debug_new_max_attempts: req.body.new_max_attempts
                    });

                    return res.status(400).json({
                        success: false,
                        message: 'ข้อมูลข้อสอบไม่ถูกต้อง',
                        errors: testValidation.errors
                    });
                }

                // Additional validation for passing score (double check)
                if (req.body.new_passing_score !== undefined && req.body.new_passing_score !== '') {
                    const score = parseFloat(req.body.new_passing_score);
                    if (isNaN(score) || score < 0 || score > 100) {
                        return res.status(400).json({
                            success: false,
                            message: 'เกณฑ์การผ่านต้องอยู่ระหว่าง 0-100',
                            errors: {
                                new_passing_score: ['ต้องอยู่ระหว่าง 0-100']
                            }
                        });
                    }
                }

                // Validate max attempts if provided
                if (req.body.new_max_attempts) {
                    const attempts = parseInt(req.body.new_max_attempts);
                    if (isNaN(attempts) || attempts < 1 || attempts > 20) {
                        return res.status(400).json({
                            success: false,
                            message: 'จำนวนครั้งที่ทำได้ต้องอยู่ระหว่าง 1-20'
                        });
                    }
                }

                // Validate available dates if provided
                if (req.body.new_available_from && req.body.new_available_until) {
                    const fromDate = new Date(req.body.new_available_from);
                    const untilDate = new Date(req.body.new_available_until);

                    if (fromDate >= untilDate) {
                        return res.status(400).json({
                            success: false,
                            message: 'วันที่เปิดข้อสอบต้องมาก่อนวันที่ปิดข้อสอบ'
                        });
                    }
                }

                // Validate proctoring strictness if proctoring is enabled
                if (req.body.new_enable_proctoring && req.body.new_proctoring_strictness) {
                    const validStrictness = ['low', 'medium', 'high'];
                    if (!validStrictness.includes(req.body.new_proctoring_strictness)) {
                        return res.status(400).json({
                            success: false,
                            message: 'ระดับความเข้มงวดในการคุมสอบไม่ถูกต้อง'
                        });
                    }
                }

                // Validate score weight if provided
                if (req.body.new_score_weight) {
                    const weight = parseFloat(req.body.new_score_weight);
                    if (isNaN(weight) || weight < 0 || weight > 100) {
                        return res.status(400).json({
                            success: false,
                            message: 'น้ำหนักคะแนนต้องอยู่ระหว่าง 0-100'
                        });
                    }
                }

                // Validate logical consistency
                // ถ้าต้องผ่านถึงจะจบหลักสูตร ต้องบังคับทำและนับคะแนนด้วย
                if (req.body.new_is_passing_required === true || req.body.new_is_passing_required === 'true') {
                    if (!(req.body.new_is_required === true || req.body.new_is_required === 'true')) {
                        return res.status(400).json({
                            success: false,
                            message: 'ถ้าต้องผ่านถึงจะจบหลักสูตร ต้องเป็นข้อสอบบังคับทำด้วย'
                        });
                    }
                    if (!(req.body.new_is_graded === true || req.body.new_is_graded === 'true')) {
                        return res.status(400).json({
                            success: false,
                            message: 'ถ้าต้องผ่านถึงจะจบหลักสูตร ต้องนับคะแนนด้วย'
                        });
                    }
                }
            }

            // Validate existing test selection if assessment_type is 'existing'
            if (req.body.assessment_type === 'existing') {
                if (!req.body.test_id) {
                    return res.status(400).json({
                        success: false,
                        message: 'กรุณาเลือกข้อสอบที่มีอยู่'
                    });
                }

                const testId = parseInt(req.body.test_id);
                if (isNaN(testId) || testId <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'รหัสข้อสอบไม่ถูกต้อง'
                    });
                }
            }

            // Store validated data
            req.validated = req.body;
            next();
        };
    }

    validateCourseUpdate() {
        return this.validate({
            title: 'minLength:5|maxLength:200',
            description: 'minLength:20',
            category_id: 'numeric',
            instructor_id: 'numeric',
            duration_hours: 'numeric|min:1',
            max_students: 'numeric|min:1',
            price: 'numeric|min:0',
            status: 'in:draft,published,archived'
        });
    }

    validateCourseEnrollment() {
        return this.validate({
            course_id: 'required|numeric',
            user_id: 'numeric'
        });
    }

    // Test validation middlewares
    validateTestCreation() {
        return this.validate({
            title: 'required|minLength:5|maxLength:200',
            description: 'required|minLength:10',
            course_id: 'numeric',
            time_limit: 'required|numeric|min:5|max:480',
            passing_score: 'required|numeric|min:0|max:100',
            max_attempts: 'numeric|min:1|max:10',
            randomize_questions: 'boolean',
            show_results: 'boolean',
            status: 'in:draft,active,inactive'
        });
    }

    validateTestUpdate() {
        return this.validate({
            title: 'minLength:5|maxLength:200',
            description: 'minLength:10',
            time_limit: 'numeric|min:5|max:480',
            passing_score: 'numeric|min:0|max:100',
            max_attempts: 'numeric|min:1|max:10',
            randomize_questions: 'boolean',
            show_results: 'boolean',
            status: 'in:draft,active,inactive'
        });
    }

    validateQuestionCreation() {
        return (req, res, next) => {
            const baseRules = {
                test_id: 'required|numeric',
                question_text: 'required|minLength:10',
                type: 'required|in:multiple_choice,true_false,fill_blank,essay,multiple_select',
                points: 'numeric|min:1|max:100',
                category: 'maxLength:100'
            };

            // Additional validation based on question type
            if (req.body.type === 'multiple_choice' || req.body.type === 'multiple_select') {
                if (!req.body.options || !Array.isArray(req.body.options) || req.body.options.length < 2) {
                    return res.status(400).json({
                        success: false,
                        message: 'ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก'
                    });
                }
            }

            if (req.body.type === 'true_false') {
                if (!['true', 'false'].includes(req.body.correct_answer)) {
                    return res.status(400).json({
                        success: false,
                        message: 'คำตอบต้องเป็น true หรือ false'
                    });
                }
            }

            const validation = this.validationService.validate(req.body, baseRules);

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: validation.errors
                });
            }

            req.validated = validation.data;
            next();
        };
    }

    validateTestSubmission() {
        return (req, res, next) => {
            const validation = this.validationService.validate(req.body, {
                test_id: 'required|numeric',
                time_taken: 'required|numeric|min:0'
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลไม่ถูกต้อง',
                    errors: validation.errors
                });
            }

            // Validate answers object
            if (!req.body.answers || typeof req.body.answers !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'ข้อมูลคำตอบไม่ถูกต้อง'
                });
            }

            req.validated = validation.data;
            next();
        };
    }

    // Article validation middlewares
    validateArticleCreation() {
        return this.validate({
            title: 'required|minLength:5|maxLength:200',
            content: 'required|minLength:50',
            summary: 'maxLength:500',
            category: 'required|in:technology,business,management,development,design,marketing,finance,other',
            status: 'required|in:draft,published,pending',
            tags: 'maxLength:500'
        });
    }

    validateArticleUpdate() {
        return this.validate({
            title: 'minLength:5|maxLength:200',
            content: 'minLength:50',
            summary: 'maxLength:500',
            category: 'in:technology,business,management,development,design,marketing,finance,other',
            status: 'in:draft,published,pending',
            tags: 'maxLength:500'
        });
    }

    validateComment() {
        return this.validate({
            content: 'required|minLength:1|maxLength:1000',
            parent_id: 'numeric'
        });
    }

    // Applicant validation middlewares
    validateApplicantRegistration() {
        return this.validate({
            first_name: 'required|minLength:2|maxLength:50',
            last_name: 'required|minLength:2|maxLength:50',
            email: 'required|email',
            phone: 'required|phone',
            position_id: 'required|numeric',
            experience_years: 'numeric|min:0|max:50',
            education_level: 'in:high_school,bachelor,master,doctorate,other'
        });
    }

    validateJobPositionCreation() {
        return this.validate({
            title: 'required|minLength:3|maxLength:100',
            description: 'required|minLength:20',
            requirements: 'minLength:10',
            department_id: 'required|numeric',
            salary_min: 'numeric|min:0',
            salary_max: 'numeric|min:0',
            employment_type: 'in:full_time,part_time,contract,internship',
            status: 'in:active,inactive'
        });
    }

    // Department validation
    validateDepartmentCreation() {
        return this.validate({
            name: 'required|minLength:2|maxLength:100',
            description: 'minLength:10|maxLength:500',
            manager_id: 'numeric',
            budget: 'numeric|min:0'
        });
    }

    // Query parameter validation
    validatePagination() {
        return (req, res, next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            if (page < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'หมายเลขหน้าต้องมากกว่า 0'
                });
            }

            if (limit < 1 || limit > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'จำนวนรายการต่อหน้าต้องอยู่ระหว่าง 1-100'
                });
            }

            req.pagination = { page, limit };
            next();
        };
    }

    validateSearch() {
        return (req, res, next) => {
            const search = req.query.search;

            if (search && search.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'คำค้นหาต้องมีอย่างน้อย 2 ตัวอักษร'
                });
            }

            if (search && search.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'คำค้นหาต้องมีไม่เกิน 100 ตัวอักษร'
                });
            }

            next();
        };
    }

    validateSort() {
        return (allowedFields = []) => {
            return (req, res, next) => {
                const sort = req.query.sort;

                if (sort) {
                    const [field, direction] = sort.split(':');

                    if (allowedFields.length > 0 && !allowedFields.includes(field)) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`
                        });
                    }

                    if (direction && !['asc', 'desc'].includes(direction.toLowerCase())) {
                        return res.status(400).json({
                            success: false,
                            message: 'Sort direction must be asc or desc'
                        });
                    }
                }

                next();
            };
        };
    }

    // ID parameter validation
    validateId(paramName = 'id') {
        return (req, res, next) => {
            const id = req.params[paramName];

            if (!id || !Number.isInteger(parseInt(id)) || parseInt(id) <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid ID parameter'
                });
            }

            req.params[paramName] = parseInt(id);
            next();
        };
    }

    // Email validation
    validateEmailUniqueness() {
        return async (req, res, next) => {
            if (!req.body.email) {return next();}

            try {
                const db = require('../config/database');
                const [existingUser] = await db.execute(
                    'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
                    [req.body.email, req.params.id || 0]
                );

                if (existingUser.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'อีเมลนี้มีอยู่ในระบบแล้ว'
                    });
                }

                next();
            } catch (error) {
                logger.error('Error checking email uniqueness', { error: error.message });
                return res.status(500).json({
                    success: false,
                    message: 'เกิดข้อผิดพลาดในการตรวจสอบอีเมล'
                });
            }
        };
    }

    // Custom validation helpers
    customValidation(validatorFunction, errorMessage) {
        return (req, res, next) => {
            try {
                const isValid = validatorFunction(req.body, req);

                if (!isValid) {
                    return res.status(400).json({
                        success: false,
                        message: errorMessage
                    });
                }

                next();
            } catch (error) {
                logger.error('Custom validation error', { error: error.message });
                return res.status(500).json({
                    success: false,
                    message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล'
                });
            }
        };
    }

    // Sanitization middleware
    sanitizeInput() {
        return (req, res, next) => {
            if (req.body) {
                req.body = this.validationService.sanitize(req.body, {
                    // Define sanitization rules for each field
                    title: 'trim|escape',
                    description: 'trim',
                    content: 'trim',
                    name: 'trim|escape',
                    email: 'trim|lowercase',
                    phone: 'trim'
                });
            }

            if (req.query.search) {
                req.query.search = this.validationService.sanitizeValue(req.query.search, 'trim|escape');
            }

            next();
        };
    }

    // Conditional validation
    validateIf(condition, rules) {
        return (req, res, next) => {
            if (condition(req)) {
                return this.validate(rules)(req, res, next);
            }
            next();
        };
    }

    // Array validation
    validateArray(fieldName, itemRules) {
        return (req, res, next) => {
            const array = req.body[fieldName];

            if (!Array.isArray(array)) {
                return res.status(400).json({
                    success: false,
                    message: `${fieldName} must be an array`
                });
            }

            const errors = [];

            array.forEach((item, index) => {
                const validation = this.validationService.validate(item, itemRules);
                if (!validation.isValid) {
                    errors.push({
                        index: index,
                        errors: validation.errors
                    });
                }
            });

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Validation failed for ${fieldName}`,
                    errors: errors
                });
            }

            next();
        };
    }
}

module.exports = new ValidationMiddleware();