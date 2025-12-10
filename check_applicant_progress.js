/**
 * Check applicant test progress
 */

const { poolPromise, sql } = require('./config/database');
const PositionTestSet = require('./models/PositionTestSet');

async function checkApplicantProgress() {
    try {
        const pool = await poolPromise;

        // Get applicant with test code APLMIZ8G5GT (CEO position)
        const applicant = await pool.request()
            .input('testCode', sql.NVarChar(20), 'APLMIZ8G5GT')
            .query(`
                SELECT a.*, p.position_name
                FROM Applicants a
                LEFT JOIN Positions p ON a.position_id = p.position_id
                WHERE a.test_code = @testCode
            `);

        if (applicant.recordset.length === 0) {
            console.log('ไม่พบผู้สมัคร');
            process.exit(1);
        }

        const app = applicant.recordset[0];
        console.log('='.repeat(80));
        console.log('ข้อมูลผู้สมัคร:');
        console.log(`  ID: ${app.applicant_id}`);
        console.log(`  ชื่อ: ${app.first_name} ${app.last_name}`);
        console.log(`  ตำแหน่ง: ${app.position_name} (${app.position_id})`);
        console.log(`  test_code: ${app.test_code}`);
        console.log(`  status: ${app.status}`);
        console.log('='.repeat(80));

        // Check ApplicantTestProgress table
        console.log('\n1. ข้อมูลใน ApplicantTestProgress:');
        const progress = await pool.request()
            .input('applicantId', sql.Int, app.applicant_id)
            .query(`
                SELECT * FROM ApplicantTestProgress WHERE applicant_id = @applicantId
            `);
        console.log(`  พบ ${progress.recordset.length} รายการ`);
        progress.recordset.forEach((p, i) => {
            console.log(`  ${i+1}. test_id: ${p.test_id}, status: ${p.status}, score: ${p.score}`);
        });

        // Initialize tests for this applicant
        console.log('\n2. เรียก PositionTestSet.initializeApplicantTests:');
        const initResult = await PositionTestSet.initializeApplicantTests(
            app.applicant_id,
            app.position_id
        );
        console.log('  Result:', initResult);

        // Check ApplicantTestProgress again
        console.log('\n3. ข้อมูลใน ApplicantTestProgress หลัง initialize:');
        const progress2 = await pool.request()
            .input('applicantId', sql.Int, app.applicant_id)
            .query(`
                SELECT atp.*, t.title as test_title
                FROM ApplicantTestProgress atp
                LEFT JOIN Tests t ON atp.test_id = t.test_id
                WHERE atp.applicant_id = @applicantId
            `);
        console.log(`  พบ ${progress2.recordset.length} รายการ`);
        progress2.recordset.forEach((p, i) => {
            console.log(`  ${i+1}. [${p.test_id}] ${p.test_title}, status: ${p.status}, score: ${p.score}`);
        });

        // Call getApplicantTestProgress
        console.log('\n4. เรียก PositionTestSet.getApplicantTestProgress:');
        const testProgress = await PositionTestSet.getApplicantTestProgress(
            app.applicant_id,
            app.position_id
        );
        console.log(`  พบ ${testProgress.length} ข้อสอบ:`);
        testProgress.forEach((t, i) => {
            console.log(`\n  ${i+1}. [${t.test_id}] ${t.test_title}`);
            console.log(`     status: ${t.status}`);
            console.log(`     test_type: ${t.test_type}`);
            console.log(`     question_count: ${t.question_count}`);
            console.log(`     is_required: ${t.is_required}`);
        });

        // Call getTestsByPosition
        console.log('\n5. เรียก PositionTestSet.getTestsByPosition:');
        const testsForPosition = await PositionTestSet.getTestsByPosition(app.position_id);
        console.log(`  พบ ${testsForPosition.length} ข้อสอบ:`);
        testsForPosition.forEach((t, i) => {
            console.log(`\n  ${i+1}. [${t.test_id}] ${t.test_title}`);
            console.log(`     assignment_type: ${t.assignment_type}`);
            console.log(`     question_count: ${t.question_count}`);
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

checkApplicantProgress();
