const { poolPromise } = require('../config/database');

async function addApplicantFields() {
    try {
        const pool = await poolPromise;

        console.log('🔄 Adding applicant-related fields to users table...');

        // Check and add user_type column
        const checkUserType = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'users'
            AND COLUMN_NAME = 'user_type'
        `);

        if (checkUserType.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE users
                ADD user_type NVARCHAR(20) DEFAULT 'EMPLOYEE' NOT NULL
            `);
            console.log('✅ Added user_type column (default: EMPLOYEE)');
        } else {
            console.log('⏭️  user_type column already exists');
        }

        // Check and add id_card_number column
        const checkIdCard = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'users'
            AND COLUMN_NAME = 'id_card_number'
        `);

        if (checkIdCard.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE users
                ADD id_card_number NVARCHAR(13) NULL
            `);
            console.log('✅ Added id_card_number column');

            // Add unique constraint for id_card_number (only for non-null values)
            await pool.request().query(`
                CREATE UNIQUE INDEX UQ_users_id_card_number
                ON users(id_card_number)
                WHERE id_card_number IS NOT NULL
            `);
            console.log('✅ Added unique index for id_card_number');
        } else {
            console.log('⏭️  id_card_number column already exists');
        }

        // Check and add applied_position column
        const checkPosition = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'users'
            AND COLUMN_NAME = 'applied_position'
        `);

        if (checkPosition.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE users
                ADD applied_position NVARCHAR(100) NULL
            `);
            console.log('✅ Added applied_position column');
        } else {
            console.log('⏭️  applied_position column already exists');
        }

        // Check and add auto_disable_after_test column
        const checkAutoDisable = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'users'
            AND COLUMN_NAME = 'auto_disable_after_test'
        `);

        if (checkAutoDisable.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE users
                ADD auto_disable_after_test BIT DEFAULT 0 NOT NULL
            `);
            console.log('✅ Added auto_disable_after_test column');
        } else {
            console.log('⏭️  auto_disable_after_test column already exists');
        }

        // Update existing users to be EMPLOYEE type
        const updateResult = await pool.request().query(`
            UPDATE users
            SET user_type = 'EMPLOYEE'
            WHERE user_type IS NULL OR user_type = ''
        `);
        console.log(`✅ Updated ${updateResult.rowsAffected[0]} existing users to EMPLOYEE type`);

        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    addApplicantFields()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = addApplicantFields;
