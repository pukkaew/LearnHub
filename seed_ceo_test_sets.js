const { poolPromise, sql } = require('./config/database');

async function seedCEOTestSets() {
    try {
        const pool = await poolPromise;
        console.log('Connected to database');

        const positionId = 65; // CEO position

        // ดึงรายการ Tests ที่มีอยู่
        const tests = await pool.request().query(`
            SELECT test_id, title FROM Tests WHERE status = 'Published'
        `);
        console.log(`Found ${tests.recordset.length} published tests`);

        if (tests.recordset.length === 0) {
            console.log('No published tests found.');
            process.exit(1);
        }

        // ลบข้อมูลเก่า
        await pool.request()
            .input('positionId', sql.Int, positionId)
            .query(`
                DELETE FROM ApplicantTestProgress WHERE position_id = @positionId;
                DELETE FROM PositionTestSetConfig WHERE position_id = @positionId;
                DELETE FROM PositionTestSets WHERE position_id = @positionId;
            `);

        // เพิ่มข้อสอบเข้าชุด
        const categories = ['general', 'language'];
        const testCount = Math.min(tests.recordset.length, 2);

        for (let i = 0; i < testCount; i++) {
            const test = tests.recordset[i];
            const category = categories[i % categories.length];

            await pool.request()
                .input('positionId', sql.Int, positionId)
                .input('testId', sql.Int, test.test_id)
                .input('testOrder', sql.Int, i + 1)
                .input('testCategory', sql.NVarChar(50), category)
                .input('isRequired', sql.Bit, 1)
                .input('weightPercent', sql.Int, 100)
                .query(`
                    INSERT INTO PositionTestSets (
                        position_id, test_id, test_order, test_category,
                        is_required, weight_percent
                    ) VALUES (
                        @positionId, @testId, @testOrder, @testCategory,
                        @isRequired, @weightPercent
                    )
                `);

            console.log(`Added test: ${test.title}`);
        }

        // สร้าง Config
        await pool.request()
            .input('positionId', sql.Int, positionId)
            .query(`
                INSERT INTO PositionTestSetConfig (
                    position_id, passing_criteria, min_average_score, max_attempts_per_test
                ) VALUES (
                    @positionId, 'all_pass', 60, 1
                )
            `);

        console.log('\nSeed completed for CEO position!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

seedCEOTestSets();
