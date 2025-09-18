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
        return this.validate({
            title: 'required|minLength:5|maxLength:200',
            description: 'required|minLength:20',
            category_id: 'required|numeric',
            instructor_id: 'numeric',
            duration_hours: 'numeric|min:1',
            max_students: 'numeric|min:1',
            price: 'numeric|min:0',
            status: 'in:draft,published,archived'
        });
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
            if (!req.body.email) return next();

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