const { poolPromise } = require('../config/database');

/**
 * Migration: Update test type terminology to training-appropriate naming
 * Date: 2025-11-22
 * Purpose: Change from education-focused (exam, learning) to training-focused (assessment, training)
 */

async function up() {
    console.log('🔄 Starting migration: Update test type terminology...\n');

    try {
        const pool = await poolPromise;

        // Check current test types in database
        console.log('📊 Checking current test types in database...');
        const currentTypes = await pool.request().query(`
            SELECT type, COUNT(*) as count
            FROM tests
            GROUP BY type
            ORDER BY count DESC
        `);

        if (currentTypes.recordset.length === 0) {
            console.log('  ℹ️  No tests found in database. Nothing to migrate.');
            console.log('✅ Migration completed (no data to update).\n');
            return;
        }

        console.log('  Current test types:');
        currentTypes.recordset.forEach(row => {
            console.log(`    - ${row.type}: ${row.count} tests`);
        });

        // Mapping old names to new names
        const typeMapping = {
            // Old (education-focused) → New (training-focused)
            'pre_test': 'pre_training_assessment',
            'post_test': 'post_training_assessment',
            'diagnostic_test': 'pre_training_assessment',  // Merge with pre-training

            'quiz': 'knowledge_check',
            'lesson_quiz': 'knowledge_check',  // Merge with knowledge_check
            'chapter_quiz': 'knowledge_check',  // Merge with knowledge_check
            'formative_assessment': 'progress_assessment',
            'checkpoint_quiz': 'progress_assessment',  // Merge with progress_assessment

            'midterm_exam': 'midcourse_assessment',
            'final_exam': 'final_assessment',
            'summative_assessment': 'final_assessment',  // Merge with final_assessment
            'certification_exam': 'certification_assessment',

            'practice_test': 'practice_exercise',
            'mock_exam': 'practice_exercise',  // Merge with practice_exercise
            'self_assessment': 'practice_exercise'  // Merge with practice_exercise
        };

        console.log('\n🔄 Updating test types...');

        let totalUpdated = 0;
        for (const [oldType, newType] of Object.entries(typeMapping)) {
            const result = await pool.request()
                .query(`
                    UPDATE tests
                    SET type = '${newType}',
                        updated_at = GETDATE()
                    WHERE type = '${oldType}';
                    SELECT @@ROWCOUNT as updated;
                `);

            const updated = result.recordset[0].updated;
            if (updated > 0) {
                console.log(`  ✅ ${oldType} → ${newType} (${updated} tests)`);
                totalUpdated += updated;
            }
        }

        if (totalUpdated === 0) {
            console.log('  ℹ️  No tests needed updating (already using new terminology).');
        } else {
            console.log(`\n✅ Migration completed! Updated ${totalUpdated} tests.\n`);
        }

        // Show final state
        console.log('📊 Final test types:');
        const finalTypes = await pool.request().query(`
            SELECT type, COUNT(*) as count
            FROM tests
            GROUP BY type
            ORDER BY count DESC
        `);

        finalTypes.recordset.forEach(row => {
            console.log(`  - ${row.type}: ${row.count} tests`);
        });
        console.log('');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back migration: Revert test type terminology...\n');

    try {
        const pool = await poolPromise;

        // Reverse mapping (new → old)
        const reverseMapping = {
            'pre_training_assessment': 'pre_test',
            'post_training_assessment': 'post_test',
            'knowledge_check': 'quiz',
            'progress_assessment': 'formative_assessment',
            'midcourse_assessment': 'midterm_exam',
            'final_assessment': 'final_exam',
            'certification_assessment': 'certification_exam',
            'practice_exercise': 'practice_test'
        };

        console.log('🔄 Reverting test types...');

        let totalReverted = 0;
        for (const [newType, oldType] of Object.entries(reverseMapping)) {
            const result = await pool.request()
                .query(`
                    UPDATE tests
                    SET type = '${oldType}',
                        updated_at = GETDATE()
                    WHERE type = '${newType}';
                    SELECT @@ROWCOUNT as reverted;
                `);

            const reverted = result.recordset[0].reverted;
            if (reverted > 0) {
                console.log(`  ✅ ${newType} → ${oldType} (${reverted} tests)`);
                totalReverted += reverted;
            }
        }

        console.log(`\n✅ Rollback completed! Reverted ${totalReverted} tests.\n`);

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
