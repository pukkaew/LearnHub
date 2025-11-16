const { poolPromise } = require('./config/database');

async function runMigration() {
    try {
        const pool = await poolPromise;

        console.log('Adding test_id column to Courses table...\n');

        // Check if column already exists
        const checkColumn = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Courses'
            AND COLUMN_NAME = 'test_id'
        `);

        if (checkColumn.recordset[0].count === 0) {
            // Add test_id column
            await pool.request().query(`
                ALTER TABLE Courses
                ADD test_id INT NULL
            `);
            console.log('✅ Column test_id added to Courses table');
        } else {
            console.log('⚠️ Column test_id already exists in Courses table');
        }

        // Check if Tests table exists
        const checkTestsTable = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'Tests'
        `);

        if (checkTestsTable.recordset[0].count > 0) {
            // Check if foreign key exists
            const checkFK = await pool.request().query(`
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE
                WHERE CONSTRAINT_NAME = 'FK_Courses_Tests'
            `);

            if (checkFK.recordset[0].count === 0) {
                await pool.request().query(`
                    ALTER TABLE Courses
                    ADD CONSTRAINT FK_Courses_Tests
                    FOREIGN KEY (test_id) REFERENCES Tests(test_id)
                    ON DELETE SET NULL
                `);
                console.log('✅ Foreign key constraint FK_Courses_Tests created');
            } else {
                console.log('⚠️ Foreign key constraint FK_Courses_Tests already exists');
            }
        }

        console.log('\n✅ Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

runMigration();
