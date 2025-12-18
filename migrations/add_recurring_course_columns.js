/**
 * Migration: Add Recurring Course Columns
 * Description: Add columns to support annual/recurring training courses
 *
 * Tables affected:
 * - courses: is_recurring, recurrence_type, recurrence_months, notify_days_before
 * - user_courses: certificate_expiry_date, training_year, renewal_status
 */

const { poolPromise, sql } = require('../config/database');

async function runMigration() {
    console.log('=== Running Migration: Add Recurring Course Columns ===\n');

    try {
        const pool = await poolPromise;

        // =====================================================
        // 1. Add columns to courses table
        // =====================================================
        console.log('1. Adding columns to courses table...');

        // Check and add is_recurring
        const checkIsRecurring = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses' AND COLUMN_NAME = 'is_recurring'
        `);
        if (checkIsRecurring.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE courses ADD is_recurring BIT DEFAULT 0
            `);
            console.log('   + Added: is_recurring (BIT)');
        } else {
            console.log('   - Skipped: is_recurring (already exists)');
        }

        // Check and add recurrence_type
        const checkRecurrenceType = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses' AND COLUMN_NAME = 'recurrence_type'
        `);
        if (checkRecurrenceType.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE courses ADD recurrence_type NVARCHAR(50) NULL
            `);
            console.log('   + Added: recurrence_type (NVARCHAR(50))');
        } else {
            console.log('   - Skipped: recurrence_type (already exists)');
        }

        // Check and add recurrence_months
        const checkRecurrenceMonths = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses' AND COLUMN_NAME = 'recurrence_months'
        `);
        if (checkRecurrenceMonths.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE courses ADD recurrence_months INT NULL
            `);
            console.log('   + Added: recurrence_months (INT)');
        } else {
            console.log('   - Skipped: recurrence_months (already exists)');
        }

        // Check and add notify_days_before
        const checkNotifyDays = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses' AND COLUMN_NAME = 'notify_days_before'
        `);
        if (checkNotifyDays.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE courses ADD notify_days_before INT DEFAULT 30
            `);
            console.log('   + Added: notify_days_before (INT, default 30)');
        } else {
            console.log('   - Skipped: notify_days_before (already exists)');
        }

        console.log('   Courses table updated.\n');

        // =====================================================
        // 2. Add columns to user_courses table
        // =====================================================
        console.log('2. Adding columns to user_courses table...');

        // Check and add certificate_expiry_date
        const checkExpiryDate = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'user_courses' AND COLUMN_NAME = 'certificate_expiry_date'
        `);
        if (checkExpiryDate.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE user_courses ADD certificate_expiry_date DATETIME2 NULL
            `);
            console.log('   + Added: certificate_expiry_date (DATETIME2)');
        } else {
            console.log('   - Skipped: certificate_expiry_date (already exists)');
        }

        // Check and add training_year
        const checkTrainingYear = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'user_courses' AND COLUMN_NAME = 'training_year'
        `);
        if (checkTrainingYear.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE user_courses ADD training_year INT NULL
            `);
            console.log('   + Added: training_year (INT)');
        } else {
            console.log('   - Skipped: training_year (already exists)');
        }

        // Check and add renewal_status
        const checkRenewalStatus = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'user_courses' AND COLUMN_NAME = 'renewal_status'
        `);
        if (checkRenewalStatus.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE user_courses ADD renewal_status NVARCHAR(50) DEFAULT 'valid'
            `);
            console.log('   + Added: renewal_status (NVARCHAR(50), default "valid")');
        } else {
            console.log('   - Skipped: renewal_status (already exists)');
        }

        console.log('   user_courses table updated.\n');

        // =====================================================
        // 3. Verify migration
        // =====================================================
        console.log('3. Verifying migration...');

        const coursesColumns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            AND COLUMN_NAME IN ('is_recurring', 'recurrence_type', 'recurrence_months', 'notify_days_before')
            ORDER BY COLUMN_NAME
        `);
        console.log('   Courses table new columns:');
        coursesColumns.recordset.forEach(col => {
            console.log(`     - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT || 'none'})`);
        });

        const userCoursesColumns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'user_courses'
            AND COLUMN_NAME IN ('certificate_expiry_date', 'training_year', 'renewal_status')
            ORDER BY COLUMN_NAME
        `);
        console.log('   user_courses table new columns:');
        userCoursesColumns.recordset.forEach(col => {
            console.log(`     - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT || 'none'})`);
        });

        console.log('\n=== Migration completed successfully! ===');
        process.exit(0);

    } catch (error) {
        console.error('\n=== Migration failed! ===');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

runMigration();
