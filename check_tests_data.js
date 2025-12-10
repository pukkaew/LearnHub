/**
 * Script to check tests data in database
 */

const { poolPromise, sql } = require('./config/database');

async function checkTestsData() {
    try {
        const pool = await poolPromise;
        console.log('='.repeat(80));
        console.log('ตรวจสอบข้อมูลข้อสอบในระบบ');
        console.log('='.repeat(80));

        // 1. Check all tests
        console.log('\n1. รายการข้อสอบทั้งหมด:');
        const tests = await pool.request().query(`
            SELECT
                t.test_id,
                t.title,
                t.type,
                t.status,
                t.passing_marks,
                t.time_limit,
                t.questions_to_show,
                t.is_global_applicant_test,
                t.position_id,
                (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count,
                (SELECT COUNT(*) FROM TestQuestions WHERE test_id = t.test_id) as test_questions_count
            FROM Tests t
            WHERE t.status IN ('Published', 'Active', 'Draft')
            ORDER BY t.created_at DESC
        `);
        console.log(`พบ ${tests.recordset.length} ข้อสอบ:`);
        tests.recordset.forEach((t, i) => {
            console.log(`  ${i+1}. [ID:${t.test_id}] ${t.title}`);
            console.log(`     Type: ${t.type}, Status: ${t.status}`);
            console.log(`     Questions: ${t.question_count} (in Questions table), TestQuestions: ${t.test_questions_count}`);
            console.log(`     questions_to_show: ${t.questions_to_show || 'ALL'}, time_limit: ${t.time_limit} min`);
            console.log(`     is_global: ${t.is_global_applicant_test ? 'YES' : 'NO'}, position_id: ${t.position_id || 'None'}`);
        });

        // 2. Check Questions table details
        console.log('\n2. รายละเอียดคำถามในแต่ละข้อสอบ:');
        for (const test of tests.recordset) {
            const questions = await pool.request()
                .input('testId', sql.Int, test.test_id)
                .query(`
                    SELECT
                        q.question_id,
                        q.question_type,
                        q.question_text,
                        q.points,
                        q.is_active,
                        (SELECT COUNT(*) FROM QuestionOptions WHERE question_id = q.question_id) as option_count
                    FROM Questions q
                    WHERE q.test_id = @testId
                    ORDER BY q.question_id
                `);

            console.log(`\n  Test [ID:${test.test_id}] ${test.title}: ${questions.recordset.length} คำถาม`);
            questions.recordset.forEach((q, i) => {
                const truncatedText = q.question_text ? q.question_text.substring(0, 50) + '...' : 'No text';
                console.log(`    ${i+1}. [Q:${q.question_id}] Type: ${q.question_type}, Points: ${q.points}, Active: ${q.is_active}, Options: ${q.option_count}`);
                console.log(`       Text: ${truncatedText}`);
            });
        }

        // 3. Check TestPositions
        console.log('\n3. การกำหนดข้อสอบให้ตำแหน่ง (TestPositions):');
        const testPositions = await pool.request().query(`
            SELECT
                tp.id,
                tp.test_id,
                tp.position_id,
                tp.test_order,
                tp.is_required,
                tp.is_active,
                t.title as test_title,
                p.position_name
            FROM TestPositions tp
            JOIN Tests t ON tp.test_id = t.test_id
            JOIN Positions p ON tp.position_id = p.position_id
            ORDER BY tp.position_id, tp.test_order
        `);
        console.log(`พบ ${testPositions.recordset.length} รายการ:`);
        testPositions.recordset.forEach((tp, i) => {
            console.log(`  ${i+1}. Position: ${tp.position_name} (${tp.position_id}) -> Test: ${tp.test_title} (${tp.test_id})`);
            console.log(`     Order: ${tp.test_order}, Required: ${tp.is_required}, Active: ${tp.is_active}`);
        });

        // 4. Check PositionTestSets (legacy)
        console.log('\n4. ชุดข้อสอบตามตำแหน่ง (PositionTestSets - legacy):');
        const posTestSets = await pool.request().query(`
            SELECT
                pts.*,
                t.title as test_title,
                p.position_name
            FROM PositionTestSets pts
            JOIN Tests t ON pts.test_id = t.test_id
            JOIN Positions p ON pts.position_id = p.position_id
            WHERE pts.is_active = 1
            ORDER BY pts.position_id, pts.test_order
        `);
        console.log(`พบ ${posTestSets.recordset.length} รายการ:`);
        posTestSets.recordset.forEach((ps, i) => {
            console.log(`  ${i+1}. Position: ${ps.position_name} (${ps.position_id}) -> Test: ${ps.test_title} (${ps.test_id})`);
        });

        // 5. Check Positions
        console.log('\n5. รายการตำแหน่งงาน:');
        const positions = await pool.request().query(`
            SELECT position_id, position_name, is_active
            FROM Positions
            WHERE is_active = 1 OR is_active IS NULL
            ORDER BY position_name
        `);
        console.log(`พบ ${positions.recordset.length} ตำแหน่ง:`);
        positions.recordset.forEach((p, i) => {
            console.log(`  ${i+1}. [${p.position_id}] ${p.position_name}`);
        });

        // 6. Check Applicants
        console.log('\n6. รายการผู้สมัคร:');
        const applicants = await pool.request().query(`
            SELECT TOP 10
                a.applicant_id,
                a.first_name,
                a.last_name,
                a.test_code,
                a.position_id,
                a.status,
                p.position_name
            FROM Applicants a
            LEFT JOIN Positions p ON a.position_id = p.position_id
            ORDER BY a.created_at DESC
        `);
        console.log(`แสดง 10 รายการล่าสุด:`);
        applicants.recordset.forEach((a, i) => {
            console.log(`  ${i+1}. [${a.applicant_id}] ${a.first_name} ${a.last_name}`);
            console.log(`     Test Code: ${a.test_code}, Position: ${a.position_name || 'N/A'} (${a.position_id})`);
            console.log(`     Status: ${a.status}`);
        });

        // 7. Check Global Tests
        console.log('\n7. ข้อสอบ Global (สำหรับทุกตำแหน่ง):');
        const globalTests = await pool.request().query(`
            SELECT
                test_id,
                title,
                type,
                status,
                (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count
            FROM Tests t
            WHERE is_global_applicant_test = 1
        `);
        console.log(`พบ ${globalTests.recordset.length} ข้อสอบ Global:`);
        globalTests.recordset.forEach((t, i) => {
            console.log(`  ${i+1}. [${t.test_id}] ${t.title} - ${t.question_count} questions (${t.status})`);
        });

        // 8. Check ApplicantTestAttempts
        console.log('\n8. ประวัติการสอบของผู้สมัคร (ApplicantTestAttempts):');
        const attempts = await pool.request().query(`
            SELECT TOP 10
                ata.*,
                a.first_name,
                a.last_name,
                t.title as test_title
            FROM ApplicantTestAttempts ata
            JOIN Applicants a ON ata.applicant_id = a.applicant_id
            JOIN Tests t ON ata.test_id = t.test_id
            ORDER BY ata.started_at DESC
        `);
        console.log(`แสดง 10 รายการล่าสุด:`);
        attempts.recordset.forEach((at, i) => {
            console.log(`  ${i+1}. ${at.first_name} ${at.last_name} -> ${at.test_title}`);
            console.log(`     Status: ${at.status}, Score: ${at.score}, Percentage: ${at.percentage}%`);
        });

        // 9. Test findByJobPosition method simulation
        console.log('\n9. ทดสอบดึงข้อสอบตามตำแหน่ง (findByJobPosition):');
        if (positions.recordset.length > 0) {
            const testPositionId = positions.recordset[0].position_id;
            const testByPos = await pool.request()
                .input('positionId', sql.Int, testPositionId)
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
            console.log(`ตำแหน่ง: ${positions.recordset[0].position_name} (${testPositionId})`);
            console.log(`พบ ${testByPos.recordset.length} ข้อสอบ:`);
            testByPos.recordset.forEach((t, i) => {
                console.log(`  ${i+1}. [${t.test_id}] ${t.title} - ${t.question_count} questions`);
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('การตรวจสอบเสร็จสิ้น');
        console.log('='.repeat(80));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTestsData();
