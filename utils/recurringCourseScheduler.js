/**
 * Recurring Course & Test Scheduler
 * Handles automatic re-enrollment and reminders for annual/recurring training courses and tests
 */

const { poolPromise, sql } = require('../config/database');

class RecurringCourseScheduler {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
    }

    /**
     * Start the scheduler
     * Runs every hour to check for:
     * 1. Expired certificates that need re-enrollment
     * 2. Upcoming expiry reminders
     * 3. Update renewal status
     */
    start() {
        console.log('🔄 Starting Recurring Course Scheduler...');

        // Run immediately on start
        this.runScheduledTasks();

        // Then run every hour
        this.intervalId = setInterval(() => {
            this.runScheduledTasks();
        }, 60 * 60 * 1000); // 1 hour

        console.log('✅ Recurring Course Scheduler started (runs every hour)');
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⏹️ Recurring Course Scheduler stopped');
        }
    }

    /**
     * Run all scheduled tasks
     */
    async runScheduledTasks() {
        if (this.isRunning) {
            console.log('⏳ Scheduler already running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = new Date();
        console.log(`\n📅 [${startTime.toISOString()}] Running recurring course & test scheduled tasks...`);

        try {
            // ===== COURSES =====
            console.log('\n📚 Processing Recurring Courses...');
            // 1. Update renewal status for all enrollments
            await this.updateRenewalStatuses();

            // 2. Auto-enroll users for expired recurring courses
            await this.autoEnrollExpiredCourses();

            // 3. Send renewal reminders
            await this.sendRenewalReminders();

            // ===== TESTS =====
            console.log('\n📝 Processing Recurring Tests...');
            // 4. Update renewal status for test attempts
            await this.updateTestRenewalStatuses();

            // 5. Notify users about tests due soon
            await this.sendTestRenewalReminders();

            const duration = (new Date() - startTime) / 1000;
            console.log(`✅ Scheduled tasks completed in ${duration.toFixed(2)}s\n`);
        } catch (error) {
            console.error('❌ Error running scheduled tasks:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Update renewal_status for all enrollments based on expiry date
     */
    async updateRenewalStatuses() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                UPDATE uc
                SET uc.renewal_status = CASE
                    WHEN uc.certificate_expiry_date IS NULL THEN 'valid'
                    WHEN uc.certificate_expiry_date < GETDATE() THEN 'expired'
                    WHEN DATEDIFF(day, GETDATE(), uc.certificate_expiry_date) <= c.notify_days_before THEN 'due_soon'
                    ELSE 'valid'
                END
                FROM user_courses uc
                JOIN courses c ON uc.course_id = c.course_id
                WHERE c.is_recurring = 1
                AND uc.status = 'completed'
            `);

            console.log(`  📊 Updated renewal status for ${result.rowsAffected[0]} enrollments`);
            return result.rowsAffected[0];
        } catch (error) {
            console.error('  ❌ Error updating renewal statuses:', error.message);
            return 0;
        }
    }

    /**
     * Auto-enroll users for expired recurring courses
     */
    async autoEnrollExpiredCourses() {
        try {
            const pool = await poolPromise;

            // Find expired enrollments for recurring courses
            const expiredResult = await pool.request().query(`
                SELECT DISTINCT
                    uc.user_id,
                    uc.course_id,
                    c.title as course_name,
                    uc.certificate_expiry_date,
                    uc.enrollment_id as old_enrollment_id,
                    u.first_name,
                    u.last_name,
                    u.email
                FROM user_courses uc
                JOIN courses c ON uc.course_id = c.course_id
                JOIN users u ON uc.user_id = u.user_id
                WHERE c.is_recurring = 1
                AND c.is_published = 1
                AND uc.status = 'completed'
                AND uc.certificate_expiry_date < GETDATE()
                AND uc.renewal_status = 'expired'
                AND NOT EXISTS (
                    SELECT 1 FROM user_courses uc2
                    WHERE uc2.user_id = uc.user_id
                    AND uc2.course_id = uc.course_id
                    AND uc2.status IN ('pending', 'active')
                    AND uc2.training_year = YEAR(GETDATE())
                )
            `);

            console.log(`  🔍 Found ${expiredResult.recordset.length} expired enrollments needing re-enrollment`);

            let enrolledCount = 0;
            for (const expired of expiredResult.recordset) {
                try {
                    // Create new enrollment for current year
                    await pool.request()
                        .input('userId', sql.Int, expired.user_id)
                        .input('courseId', sql.Int, expired.course_id)
                        .input('trainingYear', sql.Int, new Date().getFullYear())
                        .query(`
                            INSERT INTO user_courses (
                                user_id, course_id, enrollment_date, progress, status,
                                training_year, renewal_status
                            ) VALUES (
                                @userId, @courseId, GETDATE(), 0, 'pending',
                                @trainingYear, 'valid'
                            )
                        `);

                    // Create notification for user
                    await this.createNotification(
                        expired.user_id,
                        'AUTO_ENROLLED',
                        `คุณได้ลงทะเบียนหลักสูตร "${expired.course_name}" อัตโนมัติเนื่องจากถึงรอบอบรมประจำปี`,
                        `/courses/${expired.course_id}`
                    );

                    enrolledCount++;
                    console.log(`    ✅ Auto-enrolled user ${expired.first_name} ${expired.last_name} to "${expired.course_name}"`);
                } catch (enrollError) {
                    console.error(`    ❌ Error enrolling user ${expired.user_id}:`, enrollError.message);
                }
            }

            console.log(`  📝 Auto-enrolled ${enrolledCount} users`);
            return enrolledCount;
        } catch (error) {
            console.error('  ❌ Error auto-enrolling expired courses:', error.message);
            return 0;
        }
    }

    /**
     * Send renewal reminders for courses expiring soon
     */
    async sendRenewalReminders() {
        try {
            const pool = await poolPromise;

            // Find enrollments expiring within notify_days_before
            const expiringResult = await pool.request().query(`
                SELECT DISTINCT
                    uc.user_id,
                    uc.course_id,
                    c.title as course_name,
                    uc.certificate_expiry_date,
                    DATEDIFF(day, GETDATE(), uc.certificate_expiry_date) as days_until_expiry,
                    u.first_name,
                    u.last_name,
                    u.email
                FROM user_courses uc
                JOIN courses c ON uc.course_id = c.course_id
                JOIN users u ON uc.user_id = u.user_id
                WHERE c.is_recurring = 1
                AND uc.status = 'completed'
                AND uc.certificate_expiry_date IS NOT NULL
                AND DATEDIFF(day, GETDATE(), uc.certificate_expiry_date) BETWEEN 0 AND c.notify_days_before
                AND uc.renewal_status = 'due_soon'
                AND NOT EXISTS (
                    SELECT 1 FROM Notifications n
                    WHERE n.user_id = uc.user_id
                    AND n.type = 'TRAINING_DUE_SOON'
                    AND n.related_id = CAST(uc.course_id AS VARCHAR)
                    AND CAST(n.created_at AS DATE) = CAST(GETDATE() AS DATE)
                )
            `);

            console.log(`  🔔 Found ${expiringResult.recordset.length} enrollments needing reminder`);

            let reminderCount = 0;
            for (const expiring of expiringResult.recordset) {
                try {
                    const daysText = expiring.days_until_expiry <= 0
                        ? 'หมดอายุแล้ว'
                        : `จะหมดอายุใน ${expiring.days_until_expiry} วัน`;

                    await this.createNotification(
                        expiring.user_id,
                        'TRAINING_DUE_SOON',
                        `ใบรับรองหลักสูตร "${expiring.course_name}" ${daysText} กรุณาลงทะเบียนเรียนใหม่`,
                        `/courses/${expiring.course_id}`,
                        expiring.course_id.toString()
                    );

                    reminderCount++;
                } catch (notifyError) {
                    console.error(`    ❌ Error sending reminder to user ${expiring.user_id}:`, notifyError.message);
                }
            }

            console.log(`  📬 Sent ${reminderCount} renewal reminders`);
            return reminderCount;
        } catch (error) {
            console.error('  ❌ Error sending renewal reminders:', error.message);
            return 0;
        }
    }

    /**
     * Create a notification for a user
     */
    async createNotification(userId, type, message, link = null, relatedId = null) {
        try {
            const pool = await poolPromise;

            await pool.request()
                .input('userId', sql.Int, userId)
                .input('type', sql.NVarChar(50), type)
                .input('message', sql.NVarChar(500), message)
                .input('link', sql.NVarChar(500), link)
                .input('relatedId', sql.NVarChar(100), relatedId)
                .query(`
                    INSERT INTO Notifications (
                        user_id, type, message, action_url, related_id, is_read, created_at
                    ) VALUES (
                        @userId, @type, @message, @link, @relatedId, 0, GETDATE()
                    )
                `);

            return true;
        } catch (error) {
            // Notifications table might not exist - not a critical error
            console.error('    ⚠️ Could not create notification:', error.message);
            return false;
        }
    }

    /**
     * Get statistics about recurring courses
     */
    async getStatistics() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT
                    COUNT(DISTINCT c.course_id) as recurring_courses,
                    COUNT(DISTINCT CASE WHEN uc.renewal_status = 'valid' THEN uc.enrollment_id END) as valid_certificates,
                    COUNT(DISTINCT CASE WHEN uc.renewal_status = 'due_soon' THEN uc.enrollment_id END) as expiring_soon,
                    COUNT(DISTINCT CASE WHEN uc.renewal_status = 'expired' THEN uc.enrollment_id END) as expired_certificates
                FROM courses c
                LEFT JOIN user_courses uc ON c.course_id = uc.course_id AND uc.status = 'completed'
                WHERE c.is_recurring = 1
            `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting statistics:', error.message);
            return null;
        }
    }

    // ===========================
    // RECURRING TESTS METHODS
    // ===========================

    /**
     * Update renewal_status for all test attempts based on expiry date
     */
    async updateTestRenewalStatuses() {
        try {
            const pool = await poolPromise;

            // Check if TestAttempts table has renewal_status column
            const columnCheck = await pool.request().query(`
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'TestAttempts' AND COLUMN_NAME = 'renewal_status'
            `);

            if (columnCheck.recordset.length === 0) {
                console.log('  ⏭️ TestAttempts.renewal_status column not found, skipping...');
                return 0;
            }

            const result = await pool.request().query(`
                UPDATE ta
                SET ta.renewal_status = CASE
                    WHEN ta.expiry_date IS NULL THEN 'valid'
                    WHEN ta.expiry_date < GETDATE() THEN 'expired'
                    WHEN DATEDIFF(day, GETDATE(), ta.expiry_date) <= t.notify_days_before THEN 'due_soon'
                    ELSE 'valid'
                END
                FROM TestAttempts ta
                JOIN tests t ON ta.test_id = t.test_id
                WHERE t.is_recurring = 1
                AND ta.status = 'Completed'
                AND ta.passed = 1
            `);

            console.log(`  📊 Updated test renewal status for ${result.rowsAffected[0]} attempts`);
            return result.rowsAffected[0];
        } catch (error) {
            console.error('  ❌ Error updating test renewal statuses:', error.message);
            return 0;
        }
    }

    /**
     * Send renewal reminders for tests expiring soon
     */
    async sendTestRenewalReminders() {
        try {
            const pool = await poolPromise;

            // Check if required columns exist
            const columnCheck = await pool.request().query(`
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'TestAttempts' AND COLUMN_NAME = 'expiry_date'
            `);

            if (columnCheck.recordset.length === 0) {
                console.log('  ⏭️ TestAttempts.expiry_date column not found, skipping...');
                return 0;
            }

            // Find test attempts expiring within notify_days_before
            const expiringResult = await pool.request().query(`
                SELECT DISTINCT
                    ta.user_id,
                    ta.test_id,
                    t.title as test_name,
                    ta.expiry_date,
                    DATEDIFF(day, GETDATE(), ta.expiry_date) as days_until_expiry,
                    u.first_name,
                    u.last_name,
                    u.email
                FROM TestAttempts ta
                JOIN tests t ON ta.test_id = t.test_id
                JOIN users u ON ta.user_id = u.user_id
                WHERE t.is_recurring = 1
                AND ta.status = 'Completed'
                AND ta.passed = 1
                AND ta.expiry_date IS NOT NULL
                AND DATEDIFF(day, GETDATE(), ta.expiry_date) BETWEEN 0 AND t.notify_days_before
                AND ta.renewal_status = 'due_soon'
                AND NOT EXISTS (
                    SELECT 1 FROM Notifications n
                    WHERE n.user_id = ta.user_id
                    AND n.type = 'TEST_DUE_SOON'
                    AND n.related_id = CAST(ta.test_id AS VARCHAR)
                    AND CAST(n.created_at AS DATE) = CAST(GETDATE() AS DATE)
                )
            `);

            console.log(`  🔔 Found ${expiringResult.recordset.length} test attempts needing reminder`);

            let reminderCount = 0;
            for (const expiring of expiringResult.recordset) {
                try {
                    const daysText = expiring.days_until_expiry <= 0
                        ? 'หมดอายุแล้ว'
                        : `จะหมดอายุใน ${expiring.days_until_expiry} วัน`;

                    await this.createNotification(
                        expiring.user_id,
                        'TEST_DUE_SOON',
                        `ผลทดสอบ "${expiring.test_name}" ${daysText} กรุณาทำแบบทดสอบใหม่`,
                        `/tests/${expiring.test_id}`,
                        expiring.test_id.toString()
                    );

                    reminderCount++;
                } catch (notifyError) {
                    console.error(`    ❌ Error sending test reminder to user ${expiring.user_id}:`, notifyError.message);
                }
            }

            console.log(`  📬 Sent ${reminderCount} test renewal reminders`);
            return reminderCount;
        } catch (error) {
            console.error('  ❌ Error sending test renewal reminders:', error.message);
            return 0;
        }
    }

    /**
     * Get statistics about recurring tests
     */
    async getTestStatistics() {
        try {
            const pool = await poolPromise;

            // Check if required columns exist
            const columnCheck = await pool.request().query(`
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'tests' AND COLUMN_NAME = 'is_recurring'
            `);

            if (columnCheck.recordset.length === 0) {
                return { recurring_tests: 0, valid_results: 0, expiring_soon: 0, expired_results: 0 };
            }

            const result = await pool.request().query(`
                SELECT
                    COUNT(DISTINCT t.test_id) as recurring_tests,
                    COUNT(DISTINCT CASE WHEN ta.renewal_status = 'valid' THEN ta.attempt_id END) as valid_results,
                    COUNT(DISTINCT CASE WHEN ta.renewal_status = 'due_soon' THEN ta.attempt_id END) as expiring_soon,
                    COUNT(DISTINCT CASE WHEN ta.renewal_status = 'expired' THEN ta.attempt_id END) as expired_results
                FROM tests t
                LEFT JOIN TestAttempts ta ON t.test_id = ta.test_id AND ta.status = 'Completed' AND ta.passed = 1
                WHERE t.is_recurring = 1
            `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting test statistics:', error.message);
            return null;
        }
    }

    /**
     * Calculate and set expiry date when user completes a recurring test
     * Call this method when a user passes a recurring test
     */
    static async setTestExpiryDate(attemptId, testId) {
        try {
            const pool = await poolPromise;

            // Get test recurrence settings
            const testResult = await pool.request()
                .input('testId', sql.Int, testId)
                .query(`
                    SELECT is_recurring, recurrence_type, recurrence_months
                    FROM tests
                    WHERE test_id = @testId
                `);

            if (testResult.recordset.length === 0 || !testResult.recordset[0].is_recurring) {
                return null; // Not a recurring test
            }

            const test = testResult.recordset[0];
            let expiryDate;

            if (test.recurrence_type === 'calendar_year') {
                // Expires at end of current year
                expiryDate = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
            } else if (test.recurrence_type === 'custom_months' && test.recurrence_months) {
                // Expires after specified months
                expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + test.recurrence_months);
            } else {
                // Default: expires end of current year
                expiryDate = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
            }

            // Update the attempt with expiry date
            await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .input('expiryDate', sql.DateTime2, expiryDate)
                .input('testYear', sql.Int, new Date().getFullYear())
                .query(`
                    UPDATE TestAttempts
                    SET expiry_date = @expiryDate,
                        test_year = @testYear,
                        renewal_status = 'valid'
                    WHERE attempt_id = @attemptId
                `);

            console.log(`  📅 Set test expiry date to ${expiryDate.toISOString()} for attempt ${attemptId}`);
            return expiryDate;
        } catch (error) {
            console.error('Error setting test expiry date:', error.message);
            return null;
        }
    }
}

// Create singleton instance
const scheduler = new RecurringCourseScheduler();

module.exports = {
    RecurringCourseScheduler,
    scheduler
};
