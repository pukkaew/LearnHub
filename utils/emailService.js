const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = null;
        this.templates = new Map();
        this.init();
    }

    async init() {
        try {
            // Create transporter based on environment
            if (process.env.NODE_ENV === 'production') {
                // Production: Use real SMTP service
                this.transporter = nodemailer.createTransporter({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.SMTP_PORT) || 587,
                    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });
            } else {
                // Development: Use Ethereal Email for testing
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransporter({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });
                console.log('📧 Email service initialized with test account:', testAccount.user);
            }

            // Verify transporter
            await this.transporter.verify();
            console.log('📧 Email service is ready');

            // Preload templates
            await this.loadTemplates();

        } catch (error) {
            console.error('❌ Email service initialization failed:', error);
            this.transporter = null;
        }
    }

    async loadTemplates() {
        const templatesDir = path.join(__dirname, '../email-templates');

        try {
            const templateFiles = await fs.readdir(templatesDir);

            for (const file of templateFiles) {
                if (file.endsWith('.hbs')) {
                    const templateName = path.basename(file, '.hbs');
                    const templatePath = path.join(templatesDir, file);
                    const templateContent = await fs.readFile(templatePath, 'utf-8');
                    const compiledTemplate = handlebars.compile(templateContent);
                    this.templates.set(templateName, compiledTemplate);
                }
            }

            console.log(`📧 Loaded ${this.templates.size} email templates`);
        } catch (error) {
            console.warn('⚠️ Could not load email templates:', error.message);
        }
    }

    async sendEmail(options) {
        if (!this.transporter) {
            throw new Error('Email service not initialized');
        }

        const defaultOptions = {
            from: process.env.SMTP_FROM || '"Ruxchai LearnHub" <noreply@rukchaihongyen.com>',
        };

        const mailOptions = { ...defaultOptions, ...options };

        try {
            const info = await this.transporter.sendMail(mailOptions);

            if (process.env.NODE_ENV !== 'production') {
                console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
            }

            return {
                success: true,
                messageId: info.messageId,
                previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(info) : null
            };
        } catch (error) {
            console.error('❌ Email send failed:', error);
            throw error;
        }
    }

    async sendTemplateEmail(templateName, to, subject, data) {
        const template = this.templates.get(templateName);

        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        const html = template(data);

        return await this.sendEmail({
            to,
            subject,
            html
        });
    }

    // Specific email methods
    async sendWelcomeEmail(user) {
        return await this.sendTemplateEmail('welcome', user.email, 'ยินดีต้อนรับสู่ Ruxchai LearnHub', {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            loginUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/login`,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@rukchaihongyen.com'
        });
    }

    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        return await this.sendTemplateEmail('password-reset', user.email, 'รีเซ็ตรหัสผ่าน - Ruxchai LearnHub', {
            name: `${user.firstName} ${user.lastName}`,
            resetUrl,
            expiryTime: '1 ชั่วโมง',
            supportEmail: process.env.SUPPORT_EMAIL || 'support@rukchaihongyen.com'
        });
    }

    async sendCourseEnrollmentEmail(user, course) {
        return await this.sendTemplateEmail('course-enrollment', user.email, `ลงทะเบียนเรียนหลักสูตร: ${course.title}`, {
            name: `${user.firstName} ${user.lastName}`,
            courseTitle: course.title,
            courseDescription: course.description,
            courseUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/courses/${course.courseId}`,
            startDate: course.startDate ? new Date(course.startDate).toLocaleDateString('th-TH') : 'ยังไม่กำหนด'
        });
    }

    async sendTestNotificationEmail(user, test, course) {
        return await this.sendTemplateEmail('test-notification', user.email, `การทดสอบใหม่: ${test.title}`, {
            name: `${user.firstName} ${user.lastName}`,
            testTitle: test.title,
            testDescription: test.description,
            courseTitle: course.title,
            testUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/tests/${test.testId}`,
            startDate: test.startDate ? new Date(test.startDate).toLocaleDateString('th-TH') : 'ยังไม่กำหนด',
            endDate: test.endDate ? new Date(test.endDate).toLocaleDateString('th-TH') : 'ยังไม่กำหนด',
            duration: test.duration ? `${test.duration} นาที` : 'ไม่จำกัดเวลา'
        });
    }

    async sendTestResultEmail(user, test, result) {
        const passed = result.score >= test.passingScore;

        return await this.sendTemplateEmail('test-result', user.email, `ผลการทดสอบ: ${test.title}`, {
            name: `${user.firstName} ${user.lastName}`,
            testTitle: test.title,
            score: result.score,
            totalScore: test.totalScore,
            percentage: Math.round((result.score / test.totalScore) * 100),
            passed,
            passingScore: test.passingScore,
            completedAt: new Date(result.completedAt).toLocaleDateString('th-TH'),
            testUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/tests/${test.testId}/results/${result.testResultId}`,
            certificateUrl: passed && test.certificateTemplate ?
                `${process.env.BASE_URL || 'http://localhost:3000'}/certificates/${result.testResultId}` : null
        });
    }

    async sendCertificateEmail(user, certificate, course) {
        return await this.sendTemplateEmail('certificate', user.email, `ใบประกาศนียบัตร: ${course.title}`, {
            name: `${user.firstName} ${user.lastName}`,
            courseTitle: course.title,
            certificateId: certificate.certificateId,
            issueDate: new Date(certificate.issueDate).toLocaleDateString('th-TH'),
            certificateUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/certificates/${certificate.certificateId}`,
            downloadUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/certificates/${certificate.certificateId}/download`
        });
    }

    async sendNotificationEmail(user, notification) {
        let templateName = 'notification';
        let subject = notification.title;

        // Choose template based on notification type
        switch (notification.type) {
            case 'announcement':
                templateName = 'announcement';
                break;
            case 'reminder':
                templateName = 'reminder';
                break;
            case 'achievement':
                templateName = 'achievement';
                break;
        }

        return await this.sendTemplateEmail(templateName, user.email, subject, {
            name: `${user.firstName} ${user.lastName}`,
            title: notification.title,
            message: notification.message,
            actionUrl: notification.actionUrl,
            actionText: notification.actionText || 'ดูรายละเอียด',
            createdAt: new Date(notification.createdAt).toLocaleDateString('th-TH')
        });
    }

    async sendBulkEmail(recipients, subject, templateName, data) {
        const results = [];

        for (const recipient of recipients) {
            try {
                const personalizedData = {
                    ...data,
                    name: `${recipient.firstName} ${recipient.lastName}`,
                    email: recipient.email
                };

                const result = await this.sendTemplateEmail(templateName, recipient.email, subject, personalizedData);
                results.push({ email: recipient.email, success: true, result });
            } catch (error) {
                results.push({ email: recipient.email, success: false, error: error.message });
            }
        }

        return results;
    }

    async sendAdminNotificationEmail(subject, message, data = {}) {
        const adminEmails = process.env.ADMIN_EMAILS ?
            process.env.ADMIN_EMAILS.split(',') :
            ['admin@rukchaihongyen.com'];

        return await this.sendEmail({
            to: adminEmails,
            subject: `[Admin] ${subject}`,
            html: `
                <h2>${subject}</h2>
                <p>${message}</p>
                ${data.details ? `<pre>${JSON.stringify(data.details, null, 2)}</pre>` : ''}
                <hr>
                <p><small>ส่งจากระบบ Ruxchai LearnHub เมื่อ ${new Date().toLocaleString('th-TH')}</small></p>
            `
        });
    }

    async testConnection() {
        if (!this.transporter) {
            throw new Error('Email service not initialized');
        }

        try {
            await this.transporter.verify();
            return { success: true, message: 'Email service is working' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Queue system for high-volume emails
    emailQueue = [];
    processing = false;

    async queueEmail(emailData) {
        this.emailQueue.push(emailData);

        if (!this.processing) {
            this.processQueue();
        }
    }

    async processQueue() {
        this.processing = true;

        while (this.emailQueue.length > 0) {
            const emailData = this.emailQueue.shift();

            try {
                await this.sendEmail(emailData);
                console.log(`📧 Queued email sent to: ${emailData.to}`);

                // Rate limiting: wait 100ms between emails
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`📧 Queued email failed for: ${emailData.to}`, error);
            }
        }

        this.processing = false;
    }
}

// Singleton instance
const emailService = new EmailService();

module.exports = emailService;