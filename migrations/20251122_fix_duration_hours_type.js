const { poolPromise } = require('../config/database');

/**
 * Migration: แก้ไข column type ของ duration_hours จาก INT เป็น DECIMAL(5,2)
 * เพื่อรองรับการเก็บค่าทศนิยม เช่น 2.5 ชั่วโมง
 *
 * วันที่: 2025-11-22
 */

async function up() {
    try {
        const pool = await poolPromise;

        console.log('🔧 Migration: แก้ไข duration_hours type จาก INT → DECIMAL(5,2)\n');

        // Check current type
        const checkType = await pool.request().query(`
            SELECT DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Courses' AND COLUMN_NAME = 'duration_hours'
        `);

        const currentType = checkType.recordset[0]?.DATA_TYPE;
        console.log(`📊 Current type: ${currentType}`);

        if (currentType === 'int') {
            console.log('🔄 Step 1: Dropping default constraint...');

            // Get constraint name
            const constraintResult = await pool.request().query(`
                SELECT dc.name AS constraint_name
                FROM sys.default_constraints dc
                INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
                WHERE c.name = 'duration_hours'
                AND OBJECT_NAME(dc.parent_object_id) = 'Courses'
            `);

            if (constraintResult.recordset.length > 0) {
                const constraintName = constraintResult.recordset[0].constraint_name;
                console.log(`   Found constraint: ${constraintName}`);

                await pool.request().query(`
                    ALTER TABLE Courses DROP CONSTRAINT ${constraintName}
                `);

                console.log('   ✅ Constraint dropped');
            }

            console.log('🔄 Step 2: Altering column type...');

            // Alter the column type
            await pool.request().query(`
                ALTER TABLE Courses
                ALTER COLUMN duration_hours DECIMAL(5,2)
            `);

            console.log('   ✅ Column type changed to DECIMAL(5,2)');

            console.log('🔄 Step 3: Re-adding default constraint...');

            // Add default constraint back
            await pool.request().query(`
                ALTER TABLE Courses
                ADD CONSTRAINT DF_Courses_duration_hours DEFAULT (0) FOR duration_hours
            `);

            console.log('   ✅ Default constraint re-added');

            // Verify the change
            const verify = await pool.request().query(`
                SELECT DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Courses' AND COLUMN_NAME = 'duration_hours'
            `);

            const newType = verify.recordset[0];
            console.log(`\n✅ Verification:`);
            console.log(`   Type: ${newType.DATA_TYPE}`);
            console.log(`   Precision: ${newType.NUMERIC_PRECISION}`);
            console.log(`   Scale: ${newType.NUMERIC_SCALE}`);

            console.log('\n🎉 Migration completed successfully!');
        } else if (currentType === 'decimal') {
            console.log('✅ Column is already DECIMAL - no changes needed');
        } else {
            console.log(`⚠️  Unexpected type: ${currentType}`);
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

async function down() {
    try {
        const pool = await poolPromise;

        console.log('🔄 Rollback: duration_hours DECIMAL(5,2) → INT\n');

        await pool.request().query(`
            ALTER TABLE Courses
            ALTER COLUMN duration_hours INT
        `);

        console.log('✅ Rollback completed');
        process.exit(0);

    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        process.exit(1);
    }
}

// Run migration
if (require.main === module) {
    const command = process.argv[2];
    if (command === 'down') {
        down();
    } else {
        up();
    }
}

module.exports = { up, down };
