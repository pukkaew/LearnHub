const validator = require('validator');

class ValidationService {
    constructor() {
        this.rules = {};
        this.messages = {
            required: 'ฟิลด์นี้จำเป็นต้องระบุ',
            email: 'รูปแบบอีเมลไม่ถูกต้อง',
            min: 'ต้องมีค่าอย่างน้อย {min}',
            max: 'ต้องมีค่าไม่เกิน {max}',
            minLength: 'ต้องมีความยาวอย่างน้อย {min} ตัวอักษร',
            maxLength: 'ต้องมีความยาวไม่เกิน {max} ตัวอักษร',
            numeric: 'ต้องเป็นตัวเลขเท่านั้น',
            alpha: 'ต้องเป็นตัวอักษรเท่านั้น',
            alphanumeric: 'ต้องเป็นตัวอักษรและตัวเลขเท่านั้น',
            url: 'รูปแบบ URL ไม่ถูกต้อง',
            phone: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง',
            date: 'รูปแบบวันที่ไม่ถูกต้อง',
            strong_password: 'รหัสผ่านต้องมีตัวอักษรใหญ่ เล็ก ตัวเลข และอักขระพิเศษ',
            confirmed: 'ยืนยันรหัสผ่านไม่ตรงกัน',
            unique: 'ข้อมูลนี้มีอยู่ในระบบแล้ว',
            exists: 'ไม่พบข้อมูลในระบบ',
            file_required: 'จำเป็นต้องแนบไฟล์',
            file_type: 'ประเภทไฟล์ไม่ถูกต้อง',
            file_size: 'ขนาดไฟล์เกินกำหนด',
            array: 'ต้องเป็น Array',
            object: 'ต้องเป็น Object',
            boolean: 'ต้องเป็น Boolean',
            in: 'ค่าไม่อยู่ในตัวเลือกที่กำหนด',
            not_in: 'ค่าไม่ได้รับอนุญาต'
        };
    }

    // Validate single field
    validateField(value, rules, fieldName = '') {
        const errors = [];
        const ruleArray = Array.isArray(rules) ? rules : rules.split('|');

        for (const rule of ruleArray) {
            const [ruleName, ...params] = rule.split(':');
            const ruleValue = params.length > 0 ? params.join(':') : null;

            const error = this.applyRule(value, ruleName, ruleValue, fieldName);
            if (error) {
                errors.push(error);
            }
        }

        return errors;
    }

    // Validate object with rules
    validate(data, rules) {
        const errors = {};
        let isValid = true;

        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = this.getNestedValue(data, field);
            const fieldErrors = this.validateField(value, fieldRules, field);

            if (fieldErrors.length > 0) {
                errors[field] = fieldErrors;
                isValid = false;
            }
        }

        return {
            isValid,
            errors,
            data: data
        };
    }

    // Apply validation rule
    applyRule(value, ruleName, ruleValue, fieldName) {
        switch (ruleName) {
        case 'required':
            return this.required(value) ? null : this.getMessage('required', { field: fieldName });

        case 'email':
            return this.email(value) ? null : this.getMessage('email', { field: fieldName });

        case 'min':
            return this.min(value, parseInt(ruleValue)) ? null :
                this.getMessage('min', { field: fieldName, min: ruleValue });

        case 'max':
            return this.max(value, parseInt(ruleValue)) ? null :
                this.getMessage('max', { field: fieldName, max: ruleValue });

        case 'minLength':
            return this.minLength(value, parseInt(ruleValue)) ? null :
                this.getMessage('minLength', { field: fieldName, min: ruleValue });

        case 'maxLength':
            return this.maxLength(value, parseInt(ruleValue)) ? null :
                this.getMessage('maxLength', { field: fieldName, max: ruleValue });

        case 'numeric':
            return this.numeric(value) ? null : this.getMessage('numeric', { field: fieldName });

        case 'alpha':
            return this.alpha(value) ? null : this.getMessage('alpha', { field: fieldName });

        case 'alphanumeric':
            return this.alphanumeric(value) ? null : this.getMessage('alphanumeric', { field: fieldName });

        case 'url':
            return this.url(value) ? null : this.getMessage('url', { field: fieldName });

        case 'phone':
            return this.phone(value) ? null : this.getMessage('phone', { field: fieldName });

        case 'date':
            return this.date(value) ? null : this.getMessage('date', { field: fieldName });

        case 'strong_password':
            return this.strongPassword(value) ? null : this.getMessage('strong_password', { field: fieldName });

        case 'confirmed':
            return this.confirmed(value, ruleValue) ? null : this.getMessage('confirmed', { field: fieldName });

        case 'in':
            const allowedValues = ruleValue.split(',');
            return this.in(value, allowedValues) ? null :
                this.getMessage('in', { field: fieldName, values: ruleValue });

        case 'not_in':
            const forbiddenValues = ruleValue.split(',');
            return this.notIn(value, forbiddenValues) ? null :
                this.getMessage('not_in', { field: fieldName, values: ruleValue });

        case 'array':
            return this.array(value) ? null : this.getMessage('array', { field: fieldName });

        case 'object':
            return this.object(value) ? null : this.getMessage('object', { field: fieldName });

        case 'boolean':
            return this.boolean(value) ? null : this.getMessage('boolean', { field: fieldName });

        default:
            return null;
        }
    }

    // Validation methods
    required(value) {
        if (value === null || value === undefined) {return false;}
        if (typeof value === 'string') {return value.trim().length > 0;}
        if (Array.isArray(value)) {return value.length > 0;}
        if (typeof value === 'object') {return Object.keys(value).length > 0;}
        return true;
    }

    email(value) {
        if (!value) {return true;} // Allow empty for optional fields
        return validator.isEmail(value);
    }

    min(value, minValue) {
        // Allow null/undefined/empty string as valid (for optional fields)
        // But 0 should be validated as a numeric value
        if (value === null || value === undefined || value === '') {return true;}
        const numValue = parseFloat(value);
        return !isNaN(numValue) && numValue >= minValue;
    }

    max(value, maxValue) {
        // Allow null/undefined/empty string as valid (for optional fields)
        // But 0 should be validated as a numeric value
        if (value === null || value === undefined || value === '') {return true;}
        const numValue = parseFloat(value);
        return !isNaN(numValue) && numValue <= maxValue;
    }

    minLength(value, minLength) {
        if (!value) {return true;}
        return value.toString().length >= minLength;
    }

    maxLength(value, maxLength) {
        if (!value) {return true;}
        return value.toString().length <= maxLength;
    }

    numeric(value) {
        if (!value) {return true;}
        return validator.isNumeric(value.toString());
    }

    alpha(value) {
        if (!value) {return true;}
        return validator.isAlpha(value, 'th-TH');
    }

    alphanumeric(value) {
        if (!value) {return true;}
        return validator.isAlphanumeric(value, 'th-TH');
    }

    url(value) {
        if (!value) {return true;}
        return validator.isURL(value);
    }

    phone(value) {
        if (!value) {return true;}
        // Thai phone number pattern
        const phonePattern = /^(\+66|0)[0-9]{8,9}$/;
        return phonePattern.test(value.replace(/\s|-/g, ''));
    }

    date(value) {
        if (!value) {return true;}
        return validator.isISO8601(value) || validator.isDate(value);
    }

    strongPassword(value) {
        if (!value) {return true;}
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
        const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return strongPasswordPattern.test(value);
    }

    confirmed(value, confirmField) {
        // This would need access to the full data object
        // Implementation depends on how confirmation is handled
        return true;
    }

    in(value, allowedValues) {
        if (!value) {return true;}
        return allowedValues.includes(value.toString());
    }

    notIn(value, forbiddenValues) {
        if (!value) {return true;}
        return !forbiddenValues.includes(value.toString());
    }

    array(value) {
        return Array.isArray(value);
    }

    object(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    boolean(value) {
        return typeof value === 'boolean' || value === 'true' || value === 'false' || value === '1' || value === '0';
    }

    // File validation
    validateFile(file, rules = {}) {
        const errors = [];
        const {
            required = false,
            maxSize = null, // in bytes
            allowedTypes = [],
            allowedExtensions = []
        } = rules;

        if (required && !file) {
            errors.push(this.getMessage('file_required'));
            return errors;
        }

        if (!file) {return errors;}

        // Check file size
        if (maxSize && file.size > maxSize) {
            errors.push(this.getMessage('file_size', {
                size: this.formatFileSize(maxSize)
            }));
        }

        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
            errors.push(this.getMessage('file_type', {
                types: allowedTypes.join(', ')
            }));
        }

        // Check file extension
        if (allowedExtensions.length > 0) {
            const fileExtension = file.originalname.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(fileExtension)) {
                errors.push(this.getMessage('file_type', {
                    extensions: allowedExtensions.join(', ')
                }));
            }
        }

        return errors;
    }

    // Custom validation rules
    addRule(name, validator, message) {
        this.rules[name] = validator;
        this.messages[name] = message;
    }

    // Sanitization methods
    sanitize(data, rules) {
        const sanitized = {};

        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = this.getNestedValue(data, field);
            sanitized[field] = this.sanitizeValue(value, fieldRules);
        }

        return sanitized;
    }

    sanitizeValue(value, rules) {
        if (!value) {return value;}

        const ruleArray = Array.isArray(rules) ? rules : rules.split('|');

        let sanitizedValue = value;

        for (const rule of ruleArray) {
            const [ruleName, ruleValue] = rule.split(':');

            switch (ruleName) {
            case 'trim':
                sanitizedValue = sanitizedValue.toString().trim();
                break;

            case 'lowercase':
                sanitizedValue = sanitizedValue.toString().toLowerCase();
                break;

            case 'uppercase':
                sanitizedValue = sanitizedValue.toString().toUpperCase();
                break;

            case 'escape':
                sanitizedValue = validator.escape(sanitizedValue.toString());
                break;

            case 'strip_tags':
                sanitizedValue = this.stripTags(sanitizedValue.toString());
                break;

            case 'to_int':
                sanitizedValue = parseInt(sanitizedValue);
                break;

            case 'to_float':
                sanitizedValue = parseFloat(sanitizedValue);
                break;

            case 'to_boolean':
                sanitizedValue = this.toBoolean(sanitizedValue);
                break;
            }
        }

        return sanitizedValue;
    }

    // Express middleware
    middleware(rules) {
        return (req, res, next) => {
            const validation = this.validate(req.body, rules);

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

    // User-specific validation rules
    userValidation() {
        return {
            first_name: 'required|minLength:2|maxLength:50',
            last_name: 'required|minLength:2|maxLength:50',
            email: 'required|email',
            phone: 'phone',
            password: 'required|strong_password|minLength:8',
            role: 'required|in:admin,hr,manager,employee,learner'
        };
    }

    courseValidation() {
        return {
            title: 'required|minLength:5|maxLength:200',
            description: 'required|minLength:20',
            category_id: 'required|numeric',
            instructor_id: 'required|numeric',
            duration_hours: 'numeric|min:1',
            max_students: 'numeric|min:1',
            price: 'numeric|min:0'
        };
    }

    testValidation() {
        return {
            title: 'required|minLength:5|maxLength:200',
            description: 'required|minLength:10',
            time_limit: 'required|numeric|min:5|max:480',
            passing_score: 'required|numeric|min:0|max:100',
            max_attempts: 'numeric|min:1|max:10'
        };
    }

    articleValidation() {
        return {
            title: 'required|minLength:5|maxLength:200',
            content: 'required|minLength:50',
            category: 'required|in:technology,business,management,development,design,marketing,finance,other',
            status: 'required|in:draft,published,pending'
        };
    }

    // Helper methods
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    getMessage(ruleName, params = {}) {
        let message = this.messages[ruleName] || 'ข้อมูลไม่ถูกต้อง';

        // Replace parameters in message
        for (const [key, value] of Object.entries(params)) {
            message = message.replace(`{${key}}`, value);
        }

        return message;
    }

    stripTags(str) {
        return str.replace(/<[^>]*>/g, '');
    }

    // XSS Sanitization - ลบ script tags และ event handlers ที่อันตราย
    sanitizeXSS(str) {
        if (!str || typeof str !== 'string') return str;

        // Remove script tags and content
        let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // Remove other dangerous tags
        sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button|textarea|select|style|link|meta|base)[^>]*>/gi, '');

        // Remove event handlers (onclick, onerror, etc.)
        sanitized = sanitized.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
        sanitized = sanitized.replace(/\bon\w+\s*=\s*[^\s>]*/gi, '');

        // Remove javascript: protocol
        sanitized = sanitized.replace(/javascript\s*:/gi, '');

        // Remove data: protocol (can be used for XSS)
        sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '');

        // Encode dangerous characters
        sanitized = sanitized
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        return sanitized;
    }

    // Sanitize object - apply XSS sanitization to all string fields
    sanitizeObject(obj, fieldsToSanitize = []) {
        if (!obj || typeof obj !== 'object') return obj;

        const sanitized = { ...obj };

        for (const key of Object.keys(sanitized)) {
            if (typeof sanitized[key] === 'string') {
                // If fieldsToSanitize is empty, sanitize all strings
                // Otherwise, only sanitize specified fields
                if (fieldsToSanitize.length === 0 || fieldsToSanitize.includes(key)) {
                    sanitized[key] = this.sanitizeXSS(sanitized[key]);
                }
            }
        }

        return sanitized;
    }

    // Validate positive number (no negative)
    positiveNumber(value) {
        if (value === null || value === undefined || value === '') return true;
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0;
    }

    // Validate positive integer greater than zero
    positiveIntegerGreaterThanZero(value) {
        if (value === null || value === undefined || value === '') return true;
        const num = parseInt(value);
        return !isNaN(num) && num > 0;
    }

    toBoolean(value) {
        if (typeof value === 'boolean') {return value;}
        if (typeof value === 'string') {
            const lower = value.toLowerCase();
            return lower === 'true' || lower === '1' || lower === 'yes';
        }
        if (typeof value === 'number') {return value !== 0;}
        return Boolean(value);
    }

    formatFileSize(bytes) {
        if (bytes === 0) {return '0 Bytes';}
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Validation presets for common scenarios
    loginValidation() {
        return {
            email: 'required|email',
            password: 'required|minLength:1'
        };
    }

    resetPasswordValidation() {
        return {
            email: 'required|email'
        };
    }

    changePasswordValidation() {
        return {
            current_password: 'required',
            new_password: 'required|strong_password|minLength:8',
            confirm_password: 'required'
        };
    }

    enrollmentValidation() {
        return {
            course_id: 'required|numeric',
            user_id: 'required|numeric'
        };
    }

    testSubmissionValidation() {
        return {
            test_id: 'required|numeric',
            answers: 'required|object',
            time_taken: 'required|numeric|min:0'
        };
    }
}

module.exports = new ValidationService();