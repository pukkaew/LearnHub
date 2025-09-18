const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'localhost',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    async loadTemplate(templateName, variables = {}) {
        try {
            const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
            let template = await fs.readFile(templatePath, 'utf8');

            // Replace variables in template
            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                template = template.replace(regex, variables[key]);
            });

            return template;
        } catch (error) {
            console.error('Error loading email template:', error);
            return null;
        }
    }

    async sendWelcomeEmail(user) {
        try {
            const template = await this.loadTemplate('welcome', {
                name: `${user.first_name} ${user.last_name}`,
                email: user.email,
                login_url: `${process.env.APP_URL}/login`,
                company_name: 'Ruxchai Learning Hub',
                support_email: process.env.SUPPORT_EMAIL || 'support@ruxchai.com'
            });

            if (!template) {
                throw new Error('Welcome email template not found');
            }

            const mailOptions = {
                from: `"Ruxchai Learning Hub" <${process.env.SMTP_FROM}>`,
                to: user.email,
                subject: 'ยินดีต้อนรับสู่ Ruxchai Learning Hub',
                html: template
            };

            await this.transporter.sendMail(mailOptions);
            console.log('Welcome email sent successfully to:', user.email);
            return true;
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return false;
        }
    }

    async sendPasswordResetEmail(user, resetToken) {
        try {
            const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

            const template = await this.loadTemplate('password-reset', {
                name: `${user.first_name} ${user.last_name}`,
                reset_url: resetUrl,
                expiry_time: '1 ชั่วโมง',
                support_email: process.env.SUPPORT_EMAIL || 'support@ruxchai.com'
            });

            if (!template) {
                throw new Error('Password reset email template not found');
            }

            const mailOptions = {
                from: `"Ruxchai Learning Hub" <${process.env.SMTP_FROM}>`,
                to: user.email,
                subject: 'รีเซ็ตรหัสผ่าน - Ruxchai Learning Hub',
                html: template
            };

            await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent successfully to:', user.email);
            return true;
        } catch (error) {
            console.error('Error sending password reset email:', error);
            return false;
        }
    }

    async sendCourseEnrollmentEmail(user, course) {
        try {
            const template = await this.loadTemplate('course-enrollment', {
                name: `${user.first_name} ${user.last_name}`,
                course_title: course.title,
                course_description: course.description,
                course_url: `${process.env.APP_URL}/courses/${course.course_id}`,
                instructor: course.instructor_name || 'ทีมผู้สอน',
                start_date: this.formatDate(course.start_date)
            });

            if (!template) {
                throw new Error('Course enrollment email template not found');
            }

            const mailOptions = {
                from: `"Ruxchai Learning Hub" <${process.env.SMTP_FROM}>`,
                to: user.email,
                subject: `ลงทะเบียนคอร์ส "${course.title}" เรียบร้อยแล้ว`,
                html: template
            };

            await this.transporter.sendMail(mailOptions);
            console.log('Course enrollment email sent successfully to:', user.email);
            return true;
        } catch (error) {
            console.error('Error sending course enrollment email:', error);
            return false;
        }
    }

    async sendTestInvitationEmail(applicant, test) {
        try {
            const template = await this.loadTemplate('test-invitation', {
                name: `${applicant.first_name} ${applicant.last_name}`,
                position_title: applicant.position_title,
                test_title: test.title,
                test_url: `${process.env.APP_URL}/applicants/test/${test.test_id}?token=${applicant.test_token}`,
                time_limit: test.time_limit,
                passing_score: test.passing_score,
                instructions: test.instructions || 'กรุณาอ่านคำแนะนำการทำข้อสอบให้ครบถ้วนก่อนเริ่มทำ',
                deadline: this.formatDate(applicant.test_deadline)
            });

            if (!template) {
                throw new Error('Test invitation email template not found');
            }

            const mailOptions = {
                from: `"Ruxchai Learning Hub" <${process.env.SMTP_FROM}>`,
                to: applicant.email,
                subject: `เชิญทำข้อสอบสำหรับตำแหน่ง ${applicant.position_title}`,
                html: template
            };

            await this.transporter.sendMail(mailOptions);
            console.log('Test invitation email sent successfully to:', applicant.email);
            return true;
        } catch (error) {
            console.error('Error sending test invitation email:', error);
            return false;
        }
    }

    async sendTestResultEmail(applicant, result) {
        try {
            const template = await this.loadTemplate('test-result', {
                name: `${applicant.first_name} ${applicant.last_name}`,
                position_title: applicant.position_title,
                test_title: result.test_title,
                score: result.score,
                passing_score: result.passing_score,
                passed: result.passed ? 'ผ่าน' : 'ไม่ผ่าน',
                result_url: `${process.env.APP_URL}/applicants/results/${result.result_id}`,
                next_steps: result.passed ?
                    'ทีมงาน HR จะติดต่อกลับภายใน 3-5 วันทำการ' :
                    'ขอบคุณสำหรับความสนใจ หากมีโอกาสในอนาคตเราจะติดต่อกลับ'
            });

            if (!template) {
                throw new Error('Test result email template not found');
            }

            const mailOptions = {
                from: `"Ruxchai Learning Hub" <${process.env.SMTP_FROM}>`,
                to: applicant.email,
                subject: `ผลการทดสอบสำหรับตำแหน่ง ${applicant.position_title}`,
                html: template
            };

            await this.transporter.sendMail(mailOptions);
            console.log('Test result email sent successfully to:', applicant.email);
            return true;
        } catch (error) {
            console.error('Error sending test result email:', error);
            return false;
        }
    }

    async sendCertificateEmail(user, certificate) {
        try {
            const template = await this.loadTemplate('certificate', {
                name: `${user.first_name} ${user.last_name}`,
                course_title: certificate.course_title,
                completion_date: this.formatDate(certificate.completion_date),
                certificate_url: `${process.env.APP_URL}/certificates/${certificate.certificate_id}`,
                certificate_number: certificate.certificate_number
            });

            if (!template) {
                throw new Error('Certificate email template not found');
            }

            const mailOptions = {
                from: `"Ruxchai Learning Hub" <${process.env.SMTP_FROM}>`,
                to: user.email,
                subject: `ใบประกาศนียบัตรสำหรับคอร์ส "${certificate.course_title}"`,
                html: template
            };

            await this.transporter.sendMail(mailOptions);
            console.log('Certificate email sent successfully to:', user.email);
            return true;
        } catch (error) {
            console.error('Error sending certificate email:', error);
            return false;
        }
    }

    async sendNotificationEmail(user, notification) {
        try {
            const template = await this.loadTemplate('notification', {
                name: `${user.first_name} ${user.last_name}`,
                title: notification.title,
                message: notification.message,
                action_url: notification.action_url,
                action_text: notification.action_text || 'ดูรายละเอียด'
            });

            if (!template) {
                throw new Error('Notification email template not found');
            }

            const mailOptions = {
                from: `"Ruxchai Learning Hub" <${process.env.SMTP_FROM}>`,
                to: user.email,
                subject: notification.title,
                html: template
            };

            await this.transporter.sendMail(mailOptions);
            console.log('Notification email sent successfully to:', user.email);
            return true;
        } catch (error) {
            console.error('Error sending notification email:', error);
            return false;
        }
    }

    async sendBulkEmail(recipients, subject, template, variables = {}) {
        try {
            const emailPromises = recipients.map(async (recipient) => {
                try {
                    const personalizedVariables = {
                        ...variables,
                        name: `${recipient.first_name} ${recipient.last_name}`,
                        email: recipient.email
                    };

                    const htmlContent = await this.loadTemplate(template, personalizedVariables);

                    if (!htmlContent) {
                        throw new Error(`Template ${template} not found`);
                    }

                    const mailOptions = {
                        from: `"Ruxchai Learning Hub" <${process.env.SMTP_FROM}>`,
                        to: recipient.email,
                        subject: subject,
                        html: htmlContent
                    };

                    await this.transporter.sendMail(mailOptions);
                    return { email: recipient.email, status: 'sent' };
                } catch (error) {
                    console.error(`Error sending email to ${recipient.email}:`, error);
                    return { email: recipient.email, status: 'failed', error: error.message };
                }
            });

            const results = await Promise.all(emailPromises);

            const summary = {
                total: results.length,
                sent: results.filter(r => r.status === 'sent').length,
                failed: results.filter(r => r.status === 'failed').length,
                results: results
            };

            console.log('Bulk email send summary:', summary);
            return summary;
        } catch (error) {
            console.error('Error sending bulk email:', error);
            return {
                total: recipients.length,
                sent: 0,
                failed: recipients.length,
                error: error.message
            };
        }
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('SMTP connection verified successfully');
            return true;
        } catch (error) {
            console.error('SMTP connection verification failed:', error);
            return false;
        }
    }

    formatDate(date) {
        if (!date) return '';

        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Bangkok'
        };

        return new Date(date).toLocaleDateString('th-TH', options);
    }

    formatDateTime(date) {
        if (!date) return '';

        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Bangkok'
        };

        return new Date(date).toLocaleDateString('th-TH', options);
    }
}

module.exports = new EmailService();