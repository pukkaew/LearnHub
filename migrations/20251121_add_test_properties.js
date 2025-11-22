const { poolPromise, sql } = require('../config/database');

/**
 * Migration: Add test property columns to tests table
 * Date: 2025-11-21
 * Purpose: Add columns for is_graded, is_required, is_passing_required, score_weight, show_score_breakdown
 */

async function up() {
    console.log('🔄 Starting migration: Add test property columns...');

    try {
        const pool = await poolPromise;

        // Check if columns already exist
        const checkResult = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'tests'
            AND COLUMN_NAME IN ('is_graded', 'is_required', 'is_passing_required', 'score_weight', 'show_score_breakdown')
        `);

        const existingColumns = checkResult.recordset.map(r => r.COLUMN_NAME);
        console.log('📋 Existing columns:', existingColumns.length > 0 ? existingColumns : 'None');

        // Add columns that don't exist
        const columnsToAdd = [
            { name: 'is_graded', sql: 'ALTER TABLE tests ADD is_graded BIT NULL DEFAULT 1' },
            { name: 'is_required', sql: 'ALTER TABLE tests ADD is_required BIT NULL DEFAULT 0' },
            { name: 'is_passing_required', sql: 'ALTER TABLE tests ADD is_passing_required BIT NULL DEFAULT 0' },
            { name: 'score_weight', sql: 'ALTER TABLE tests ADD score_weight INT NULL' },
            { name: 'show_score_breakdown', sql: 'ALTER TABLE tests ADD show_score_breakdown BIT NULL DEFAULT 1' }
        ];

        for (const column of columnsToAdd) {
            if (!existingColumns.includes(column.name)) {
                console.log(`  ➕ Adding column: ${column.name}...`);
                await pool.request().query(column.sql);
                console.log(`  ✅ Column ${column.name} added successfully`);
            } else {
                console.log(`  ⏭️  Column ${column.name} already exists, skipping`);
            }
        }

        // Update existing tests with default values based on test_type if needed
        console.log('\n🔄 Updating existing tests with default values...');
        await pool.request().query(`
            UPDATE tests
            SET
                is_graded = CASE
                    WHEN type IN ('final_exam', 'midterm_exam', 'summative_assessment', 'certification_exam') THEN 1
                    ELSE 0
                END,
                is_required = CASE
                    WHEN type IN ('final_exam', 'midterm_exam', 'certification_exam') THEN 1
                    ELSE 0
                END,
                is_passing_required = CASE
                    WHEN type IN ('final_exam', 'certification_exam') THEN 1
                    ELSE 0
                END,
                score_weight = CASE
                    WHEN type = 'final_exam' THEN 50
                    WHEN type = 'midterm_exam' THEN 40
                    WHEN type = 'certification_exam' THEN 100
                    WHEN type = 'summative_assessment' THEN 30
                    WHEN type = 'formative_assessment' THEN 10
                    ELSE NULL
                END,
                show_score_breakdown = 1
            WHERE is_graded IS NULL
        `);

        console.log('✅ Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back migration: Remove test property columns...');

    try {
        const pool = await poolPromise;

        const columnsToRemove = ['is_graded', 'is_required', 'is_passing_required', 'score_weight', 'show_score_breakdown'];

        for (const column of columnsToRemove) {
            console.log(`  ➖ Removing column: ${column}...`);
            try {
                await pool.request().query(`ALTER TABLE tests DROP COLUMN ${column}`);
                console.log(`  ✅ Column ${column} removed successfully`);
            } catch (error) {
                if (error.message.includes('does not exist')) {
                    console.log(`  ⏭️  Column ${column} doesn't exist, skipping`);
                } else {
                    throw error;
                }
            }
        }

        console.log('✅ Rollback completed successfully!\n');

    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    const command = process.argv[2];

    if (command === 'down') {
        down().then(() => process.exit(0)).catch(err => {
            console.error(err);
            process.exit(1);
        });
    } else {
        up().then(() => process.exit(0)).catch(err => {
            console.error(err);
            process.exit(1);
        });
    }
}

module.exports = { up, down };
