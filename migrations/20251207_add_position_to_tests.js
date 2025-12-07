/**
 * Migration: Add position_id to Tests table
 * This allows linking tests to job positions for applicant testing
 */

const { poolPromise, sql } = require('../config/database');

async function up() {
    try {
        const pool = await poolPromise;
        console.log('Adding position_id column to Tests table...');

        // Check if column already exists
        const checkColumn = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Tests' AND COLUMN_NAME = 'position_id'
        `);

        if (checkColumn.recordset.length === 0) {
            // Add position_id column
            await pool.request().query(`
                ALTER TABLE Tests
                ADD position_id INT NULL
            `);
            console.log('✓ Added position_id column');

            // Add foreign key constraint to positions table
            await pool.request().query(`
                ALTER TABLE Tests
                ADD CONSTRAINT FK_Tests_Positions
                FOREIGN KEY (position_id) REFERENCES positions(position_id)
            `);
            console.log('✓ Added foreign key constraint');

            // Create index for better performance
            await pool.request().query(`
                CREATE INDEX IX_Tests_position_id ON Tests(position_id)
            `);
            console.log('✓ Created index on position_id');
        } else {
            console.log('✓ position_id column already exists');
        }

        console.log('Migration completed successfully!');
        return { success: true };
    } catch (error) {
        console.error('Migration failed:', error);
        return { success: false, error: error.message };
    }
}

async function down() {
    try {
        const pool = await poolPromise;
        console.log('Removing position_id column from Tests table...');

        // Drop index
        await pool.request().query(`
            IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Tests_position_id')
            DROP INDEX IX_Tests_position_id ON Tests
        `);

        // Drop foreign key
        await pool.request().query(`
            IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Tests_Positions')
            ALTER TABLE Tests DROP CONSTRAINT FK_Tests_Positions
        `);

        // Drop column
        await pool.request().query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Tests' AND COLUMN_NAME = 'position_id')
            ALTER TABLE Tests DROP COLUMN position_id
        `);

        console.log('Rollback completed successfully!');
        return { success: true };
    } catch (error) {
        console.error('Rollback failed:', error);
        return { success: false, error: error.message };
    }
}

// Run migration if called directly
if (require.main === module) {
    up().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { up, down };
