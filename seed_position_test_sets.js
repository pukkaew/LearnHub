/**
 * Seed Position Test Sets
 * สร้างข้อมูลตัวอย่างสำหรับชุดข้อสอบตามตำแหน่ง
 */

const { poolPromise, sql } = require('./config/database');

async function seedPositionTestSets() {
    try {
        const pool = await poolPromise;
        console.log('Connected to database');

        // 1. ดึงรายการ Positions ที่มีอยู่
        const positions = await pool.request().query(`
            SELECT position_id, position_name FROM Positions WHERE is_active = 1
        `);
        console.log(`Found ${positions.recordset.length} positions`);

        if (positions.recordset.length === 0) {
            console.log('No positions found. Creating sample position...');
            const posResult = await pool.request().query(`
                INSERT INTO Positions (position_name, position_type, is_active)
                OUTPUT INSERTED.position_id, INSERTED.position_name
                VALUES (N'พนักงานทดสอบ', 'permanent', 1)
            `);
            positions.recordset.push(posResult.recordset[0]);
        }

        // 2. ดึงรายการ Tests ที่มีอยู่
        const tests = await pool.request().query(`
            SELECT test_id, title FROM Tests WHERE status = 'Published'
        `);
        console.log(`Found ${tests.recordset.length} published tests`);

        if (tests.recordset.length === 0) {
            console.log('No published tests found. Please create some tests first.');
            process.exit(1);
        }

        // 3. สร้าง PositionTestSets สำหรับตำแหน่งแรก
        const firstPosition = positions.recordset[0];
        console.log(`\nCreating test sets for position: ${firstPosition.position_name}`);

        // ลบข้อมูลเก่า (ถ้ามี)
        await pool.request()
            .input('positionId', sql.Int, firstPosition.position_id)
            .query(`
                DELETE FROM ApplicantTestProgress WHERE position_id = @positionId;
                DELETE FROM PositionTestSetConfig WHERE position_id = @positionId;
                DELETE FROM PositionTestSets WHERE position_id = @positionId;
            `);

        // เพิ่มข้อสอบเข้าชุด (สูงสุด 3 ข้อสอบ)
        const categories = ['general', 'language', 'specific'];
        const testCount = Math.min(tests.recordset.length, 3);

        for (let i = 0; i < testCount; i++) {
            const test = tests.recordset[i];
            const category = categories[i % categories.length];

            await pool.request()
                .input('positionId', sql.Int, firstPosition.position_id)
                .input('testId', sql.Int, test.test_id)
                .input('testOrder', sql.Int, i + 1)
                .input('testCategory', sql.NVarChar(50), category)
                .input('isRequired', sql.Bit, i < 2 ? 1 : 0) // 2 ข้อแรกบังคับ
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

            console.log(`  Added test: ${test.title} (order: ${i + 1}, category: ${category}, required: ${i < 2})`);
        }

        // 4. สร้าง Config สำหรับตำแหน่ง
        await pool.request()
            .input('positionId', sql.Int, firstPosition.position_id)
            .query(`
                INSERT INTO PositionTestSetConfig (
                    position_id, passing_criteria, min_average_score, max_attempts_per_test
                ) VALUES (
                    @positionId, 'all_pass', 60, 1
                )
            `);
        console.log('\nCreated position config (passing_criteria: all_pass, min_average: 60%)');

        // 5. แสดงสรุป
        console.log('\n=== Summary ===');
        const summary = await pool.request()
            .input('positionId', sql.Int, firstPosition.position_id)
            .query(`
                SELECT
                    p.position_name,
                    COUNT(pts.set_id) as test_count,
                    SUM(CASE WHEN pts.is_required = 1 THEN 1 ELSE 0 END) as required_count
                FROM Positions p
                LEFT JOIN PositionTestSets pts ON p.position_id = pts.position_id AND pts.is_active = 1
                WHERE p.position_id = @positionId
                GROUP BY p.position_name
            `);

        if (summary.recordset.length > 0) {
            const s = summary.recordset[0];
            console.log(`Position: ${s.position_name}`);
            console.log(`Total tests: ${s.test_count}`);
            console.log(`Required tests: ${s.required_count}`);
        }

        console.log('\nSeed completed successfully!');
        console.log(`\nYou can now test the multi-test dashboard with any applicant for position: ${firstPosition.position_name}`);

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seedPositionTestSets();
