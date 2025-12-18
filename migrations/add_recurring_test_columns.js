/**
 * Migration: Add recurring test columns
 * ข้อสอบที่ต้องทำซ้ำทุกปี/ทุกรอบ
 */

const { poolPromise, sql } = require('../config/database');

async function up() {
    console.log('🔄 Running migration: add_recurring_test_columns');

    const pool = await poolPromise;

    // Add columns to tests table
    const columnsToAdd = [
        { name: 'is_recurring', type: 'BIT', default: '0' },
        { name: 'recurrence_type', type: 'NVARCHAR(50)', default: null },  // 'calendar_year', 'custom_months'
        { name: 'recurrence_months', type: 'INT', default: null },          // 6, 12, 24, 36
        { name: 'notify_days_before', type: 'INT', default: '30' }
    ];

    for (const col of columnsToAdd) {
        try {
            const checkQuery = `
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'tests' AND COLUMN_NAME = '${col.name}'
            `;
            const checkResult = await pool.request().query(checkQuery);

            if (checkResult.recordset.length === 0) {
                const defaultClause = col.default !== null ? `DEFAULT ${col.default}` : '';
                const alterQuery = `ALTER TABLE tests ADD ${col.name} ${col.type} ${defaultClause}`;
                await pool.request().query(alterQuery);
                console.log(`  ✅ Added column: tests.${col.name}`);
            } else {
                console.log(`  ⏭️ Column already exists: tests.${col.name}`);
            }
        } catch (error) {
            console.error(`  ❌ Error adding column ${col.name}:`, error.message);
        }
    }

    // Add columns to TestAttempts table for tracking test completion expiry
    const testAttemptColumns = [
        { name: 'expiry_date', type: 'DATETIME2', default: null },
        { name: 'test_year', type: 'INT', default: null },
        { name: 'renewal_status', type: 'NVARCHAR(50)', default: "'valid'" }  // 'valid', 'due_soon', 'expired'
    ];

    // Check if TestAttempts table exists
    const tableCheck = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TestAttempts'
    `);

    if (tableCheck.recordset.length > 0) {
        for (const col of testAttemptColumns) {
            try {
                const checkQuery = `
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = 'TestAttempts' AND COLUMN_NAME = '${col.name}'
                `;
                const checkResult = await pool.request().query(checkQuery);

                if (checkResult.recordset.length === 0) {
                    const defaultClause = col.default !== null ? `DEFAULT ${col.default}` : '';
                    const alterQuery = `ALTER TABLE TestAttempts ADD ${col.name} ${col.type} ${defaultClause}`;
                    await pool.request().query(alterQuery);
                    console.log(`  ✅ Added column: TestAttempts.${col.name}`);
                } else {
                    console.log(`  ⏭️ Column already exists: TestAttempts.${col.name}`);
                }
            } catch (error) {
                console.error(`  ❌ Error adding column ${col.name}:`, error.message);
            }
        }
    } else {
        console.log('  ⚠️ TestAttempts table not found, skipping TestAttempts columns');
    }

    console.log('✅ Migration completed: add_recurring_test_columns');
}

async function down() {
    console.log('🔄 Rolling back migration: add_recurring_test_columns');

    const pool = await poolPromise;

    const testColumns = ['is_recurring', 'recurrence_type', 'recurrence_months', 'notify_days_before'];
    const testAttemptColumns = ['expiry_date', 'test_year', 'renewal_status'];

    for (const col of testColumns) {
        try {
            await pool.request().query(`ALTER TABLE tests DROP COLUMN ${col}`);
            console.log(`  ✅ Dropped column: tests.${col}`);
        } catch (error) {
            console.log(`  ⏭️ Could not drop tests.${col}: ${error.message}`);
        }
    }

    for (const col of testAttemptColumns) {
        try {
            await pool.request().query(`ALTER TABLE TestAttempts DROP COLUMN ${col}`);
            console.log(`  ✅ Dropped column: TestAttempts.${col}`);
        } catch (error) {
            console.log(`  ⏭️ Could not drop TestAttempts.${col}: ${error.message}`);
        }
    }

    console.log('✅ Rollback completed: add_recurring_test_columns');
}

// Run migration
if (require.main === module) {
    up()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
}

module.exports = { up, down };
