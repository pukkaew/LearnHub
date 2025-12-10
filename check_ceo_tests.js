/**
 * Check tests for CEO position specifically
 */

const { poolPromise, sql } = require('./config/database');

async function checkCEOTests() {
    try {
        const pool = await poolPromise;
        const positionId = 65; // CEO

        console.log('='.repeat(80));
        console.log(`ตรวจสอบข้อสอบสำหรับตำแหน่ง CEO (position_id = ${positionId})`);
        console.log('='.repeat(80));

        // 1. Check using findByJobPosition query (same as Test.findByJobPosition)
        console.log('\n1. ผลจาก findByJobPosition query:');
        const result1 = await pool.request()
            .input('positionId', sql.Int, positionId)
            .query(`
                SELECT DISTINCT t.*,
                       p.position_name,
                       (SELECT COUNT(*) FROM questions WHERE test_id = t.test_id) as question_count,
                       COALESCE(tp.test_order, 999) as test_order
                FROM tests t
                LEFT JOIN positions p ON t.position_id = p.position_id
                LEFT JOIN TestPositions tp ON t.test_id = tp.test_id AND tp.position_id = @positionId AND tp.is_active = 1
                WHERE t.status = 'Published'
                  AND t.type IN ('job_application_test', 'aptitude_test', 'personality_test')
                  AND (
                      -- Global tests (for all positions)
                      t.is_global_applicant_test = 1
                      -- Tests assigned via TestPositions table (many-to-many)
                      OR tp.position_id IS NOT NULL
                      -- Legacy: Tests with direct position_id (old column)
                      OR t.position_id = @positionId
                  )
                ORDER BY test_order, t.created_at DESC
            `);
        console.log(`พบ ${result1.recordset.length} ข้อสอบ:`);
        result1.recordset.forEach((t, i) => {
            console.log(`  ${i+1}. [ID:${t.test_id}] ${t.title}`);
            console.log(`     Type: ${t.type}`);
            console.log(`     Question count: ${t.question_count}`);
            console.log(`     is_global_applicant_test: ${t.is_global_applicant_test}`);
            console.log(`     test_order: ${t.test_order}`);
        });

        // 2. Check all tests with is_global_applicant_test = 1
        console.log('\n2. ข้อสอบ Global ทั้งหมด:');
        const result2 = await pool.request().query(`
            SELECT test_id, title, type, status, is_global_applicant_test,
                   (SELECT COUNT(*) FROM questions WHERE test_id = t.test_id) as question_count
            FROM tests t
            WHERE is_global_applicant_test = 1
        `);
        console.log(`พบ ${result2.recordset.length} ข้อสอบ Global:`);
        result2.recordset.forEach(t => {
            console.log(`  - [${t.test_id}] ${t.title} (${t.type}, ${t.status}) - ${t.question_count} questions`);
        });

        // 3. Check TestPositions for CEO
        console.log('\n3. TestPositions สำหรับ CEO:');
        const result3 = await pool.request()
            .input('positionId', sql.Int, positionId)
            .query(`
                SELECT tp.*, t.title as test_title, t.type as test_type, t.status as test_status
                FROM TestPositions tp
                JOIN Tests t ON tp.test_id = t.test_id
                WHERE tp.position_id = @positionId
            `);
        console.log(`พบ ${result3.recordset.length} รายการ:`);
        result3.recordset.forEach(tp => {
            console.log(`  - Test: [${tp.test_id}] ${tp.test_title}`);
            console.log(`    Type: ${tp.test_type}, Status: ${tp.test_status}`);
            console.log(`    is_active: ${tp.is_active}, is_required: ${tp.is_required}, test_order: ${tp.test_order}`);
        });

        // 4. Check if test types are correct
        console.log('\n4. ตรวจสอบ test types:');
        const result4 = await pool.request().query(`
            SELECT test_id, title, type, status
            FROM tests
            WHERE type IN ('job_application_test', 'aptitude_test', 'personality_test', 'pre_employment_test')
              AND status = 'Published'
        `);
        console.log(`ข้อสอบที่มี type ถูกต้องและ status = Published:`);
        result4.recordset.forEach(t => {
            console.log(`  - [${t.test_id}] ${t.title} (type: ${t.type})`);
        });

        // 5. Check all tests regardless of type
        console.log('\n5. ข้อสอบทั้งหมดในระบบ:');
        const result5 = await pool.request().query(`
            SELECT test_id, title, type, status, is_global_applicant_test
            FROM tests
            ORDER BY test_id
        `);
        result5.recordset.forEach(t => {
            console.log(`  - [${t.test_id}] ${t.title} (type: ${t.type}, status: ${t.status}, global: ${t.is_global_applicant_test})`);
        });

        // 6. Check Questions for each test
        console.log('\n6. คำถามในแต่ละข้อสอบ:');
        for (const test of result5.recordset) {
            const questions = await pool.request()
                .input('testId', sql.Int, test.test_id)
                .query(`
                    SELECT COUNT(*) as count FROM Questions WHERE test_id = @testId AND is_active = 1
                `);
            console.log(`  [${test.test_id}] ${test.title}: ${questions.recordset[0].count} active questions`);
        }

        // 7. Simulate what applicant sees
        console.log('\n7. Simulation - เมื่อผู้สมัครตำแหน่ง CEO เริ่มทำข้อสอบ:');
        console.log('   ใช้ PositionTestSet.getTestsByPosition:');

        const testsForPosition = await pool.request()
            .input('positionId', sql.Int, positionId)
            .query(`
                -- Global tests (ทุกตำแหน่งต้องสอบ)
                SELECT
                    NULL as set_id,
                    @positionId as position_id,
                    t.test_id,
                    0 as test_order,
                    'global' as test_category,
                    1 as is_required,
                    100 as weight_percent,
                    NULL as passing_score_override,
                    1 as is_active,
                    t.created_at,
                    t.updated_at,
                    t.title as test_title,
                    t.description as test_description,
                    t.type as test_type,
                    t.time_limit,
                    t.total_marks,
                    t.passing_marks,
                    t.status as test_status,
                    'global' as assignment_type,
                    (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count
                FROM Tests t
                WHERE t.is_global_applicant_test = 1
                  AND t.status = 'Published'
                  AND t.type IN ('job_application_test', 'aptitude_test', 'pre_employment_test')

                UNION ALL

                -- Tests from TestPositions (เลือกหลายตำแหน่ง)
                SELECT
                    NULL as set_id,
                    tp.position_id,
                    t.test_id,
                    tp.test_order,
                    'position' as test_category,
                    tp.is_required,
                    tp.weight_percent,
                    tp.passing_score_override,
                    tp.is_active,
                    tp.created_at,
                    tp.created_at as updated_at,
                    t.title as test_title,
                    t.description as test_description,
                    t.type as test_type,
                    t.time_limit,
                    t.total_marks,
                    t.passing_marks,
                    t.status as test_status,
                    'position' as assignment_type,
                    (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count
                FROM TestPositions tp
                JOIN Tests t ON tp.test_id = t.test_id
                WHERE tp.position_id = @positionId
                  AND tp.is_active = 1
                  AND t.status = 'Published'
                  AND t.is_global_applicant_test = 0

                UNION ALL

                -- Tests from PositionTestSets (legacy - เลือกตำแหน่งเดียว)
                SELECT
                    pts.set_id,
                    pts.position_id,
                    t.test_id,
                    pts.test_order,
                    pts.test_category,
                    pts.is_required,
                    pts.weight_percent,
                    pts.passing_score_override,
                    pts.is_active,
                    pts.created_at,
                    pts.updated_at,
                    t.title as test_title,
                    t.description as test_description,
                    t.type as test_type,
                    t.time_limit,
                    t.total_marks,
                    t.passing_marks,
                    t.status as test_status,
                    'legacy' as assignment_type,
                    (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count
                FROM PositionTestSets pts
                JOIN Tests t ON pts.test_id = t.test_id
                WHERE pts.position_id = @positionId
                  AND pts.is_active = 1
                  AND t.status = 'Published'
                  AND t.is_global_applicant_test = 0
                  AND NOT EXISTS (
                      SELECT 1 FROM TestPositions tp2
                      WHERE tp2.test_id = t.test_id
                        AND tp2.position_id = @positionId
                        AND tp2.is_active = 1
                  )

                ORDER BY test_order ASC, created_at ASC
            `);

        console.log(`   พบ ${testsForPosition.recordset.length} ข้อสอบที่ต้องทำ:`);
        testsForPosition.recordset.forEach((t, i) => {
            console.log(`\n   ${i+1}. [${t.test_id}] ${t.test_title}`);
            console.log(`      Type: ${t.test_type}`);
            console.log(`      Status: ${t.test_status}`);
            console.log(`      Assignment: ${t.assignment_type}`);
            console.log(`      Questions: ${t.question_count}`);
            console.log(`      is_required: ${t.is_required}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('การตรวจสอบเสร็จสิ้น');
        console.log('='.repeat(80));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCEOTests();
