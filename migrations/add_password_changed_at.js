const { poolPromise } = require('../config/database');

async function addPasswordChangedAtColumn() {
    try {
        const pool = await poolPromise;

        console.log('🔄 Adding password_changed_at column to users table...');

        // Check if column already exists
        const checkResult = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'users'
            AND COLUMN_NAME = 'password_changed_at'
        `);

        if (checkResult.recordset.length > 0) {
            console.log('✅ Column password_changed_at already exists');
            return;
        }

        // Add the column
        await pool.request().query(`
            ALTER TABLE users
            ADD password_changed_at DATETIME NULL
        `);

        console.log('✅ Added password_changed_at column');

        // Set initial values for existing users (set to current date)
        await pool.request().query(`
            UPDATE users
            SET password_changed_at = created_at
            WHERE password_changed_at IS NULL
        `);

        console.log('✅ Initialized password_changed_at for existing users');

        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    addPasswordChangedAtColumn()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = addPasswordChangedAtColumn;
