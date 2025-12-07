/**
 * Clean Data Script
 * ล้างข้อมูล: ข้อสอบ, Course, ผู้สมัครงาน, การทำข้อสอบ, ประวัติทำ, อบรม, คะแนน, ผลสอบ
 */

const { poolPromise, sql } = require('./config/database');

async function cleanData() {
    const pool = await poolPromise;

    console.log('========================================');
    console.log('   CLEAN DATA SCRIPT');
    console.log('========================================\n');

    // ลำดับการลบ (ลบตารางลูกก่อนตารางแม่)
    const tablesToClean = [
        // 1. Proctoring (ข้อมูลการคุมสอบ)
        { name: 'proctoring_violations', desc: 'การละเมิดระหว่างสอบ' },
        { name: 'proctoring_screenshots', desc: 'ภาพหน้าจอระหว่างสอบ' },
        { name: 'proctoring_reports', desc: 'รายงานการคุมสอบ' },
        { name: 'proctoring_sessions', desc: 'เซสชันการคุมสอบ' },

        // 2. User Answers & Test Results (คำตอบและผลสอบ)
        { name: 'UserAnswers', desc: 'คำตอบของผู้ใช้' },
        { name: 'test_results', desc: 'ผลสอบ' },
        { name: 'test_sessions', desc: 'เซสชันการสอบ' },

        // 3. Test Attempts (การทำข้อสอบ - ทั้ง user และ applicant)
        { name: 'TestAttempts', desc: 'การทำข้อสอบของผู้ใช้' },
        { name: 'ApplicantTestAttempts', desc: 'การทำข้อสอบของผู้สมัคร' },
        { name: 'ApplicantTestResults', desc: 'ผลสอบของผู้สมัคร' },
        { name: 'ApplicantTestAssignments', desc: 'การมอบหมายข้อสอบให้ผู้สมัคร' },

        // 4. Applicants (ผู้สมัครงาน)
        { name: 'ApplicantNotes', desc: 'บันทึกผู้สมัคร' },
        { name: 'Applicants', desc: 'ผู้สมัครงาน' },

        // 5. Questions & Tests (คำถามและข้อสอบ)
        { name: 'TestQuestions', desc: 'คำถามในข้อสอบ' },
        { name: 'QuestionOptions', desc: 'ตัวเลือกคำถาม' },
        { name: 'AnswerOptions', desc: 'ตัวเลือกคำตอบ' },
        { name: 'Questions', desc: 'คำถาม' },
        { name: 'QuestionBank', desc: 'คลังข้อสอบ' },
        { name: 'tests', desc: 'ข้อสอบ' },

        // 6. Course Progress & Enrollment (ความก้าวหน้าและการลงทะเบียน)
        { name: 'lesson_time_logs', desc: 'บันทึกเวลาเรียน' },
        { name: 'lesson_progress', desc: 'ความก้าวหน้าบทเรียน' },
        { name: 'user_material_progress', desc: 'ความก้าวหน้าเนื้อหา' },
        { name: 'user_courses', desc: 'การลงทะเบียนเรียน' },
        { name: 'course_reviews', desc: 'รีวิวหลักสูตร' },

        // 7. Course Content (เนื้อหาหลักสูตร)
        { name: 'course_materials', desc: 'เนื้อหาหลักสูตร' },
        { name: 'lessons', desc: 'บทเรียน' },
        { name: 'chapters', desc: 'บท' },
        { name: 'courses', desc: 'หลักสูตร' },
        { name: 'CourseCategories', desc: 'หมวดหมู่หลักสูตร' },

        // 8. User Activities & Achievements (กิจกรรมและความสำเร็จ)
        { name: 'user_achievements', desc: 'ความสำเร็จของผู้ใช้' },
        { name: 'points_transactions', desc: 'ธุรกรรมคะแนน' },
        { name: 'leaderboards', desc: 'กระดานผู้นำ' },
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const table of tablesToClean) {
        try {
            // ตรวจสอบว่าตารางมีอยู่หรือไม่
            const checkResult = await pool.request().query(`
                SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = '${table.name}'
            `);

            if (checkResult.recordset[0].cnt === 0) {
                console.log(`⏭️  ${table.name} - ไม่พบตาราง (ข้าม)`);
                skipCount++;
                continue;
            }

            // นับจำนวนข้อมูลก่อนลบ
            const countResult = await pool.request().query(`SELECT COUNT(*) as cnt FROM [${table.name}]`);
            const rowCount = countResult.recordset[0].cnt;

            if (rowCount === 0) {
                console.log(`⏭️  ${table.name} - ไม่มีข้อมูล (ข้าม)`);
                skipCount++;
                continue;
            }

            // ลบข้อมูล
            await pool.request().query(`DELETE FROM [${table.name}]`);
            console.log(`✅ ${table.name} - ลบ ${rowCount} รายการ (${table.desc})`);
            successCount++;

        } catch (error) {
            console.log(`❌ ${table.name} - Error: ${error.message}`);
            errorCount++;
        }
    }

    console.log('\n========================================');
    console.log('   สรุปผลการล้างข้อมูล');
    console.log('========================================');
    console.log(`✅ สำเร็จ: ${successCount} ตาราง`);
    console.log(`⏭️  ข้าม: ${skipCount} ตาราง`);
    console.log(`❌ ผิดพลาด: ${errorCount} ตาราง`);
    console.log('========================================\n');

    return { successCount, skipCount, errorCount };
}

// Run
cleanData()
    .then(result => {
        console.log('ล้างข้อมูลเสร็จสิ้น!');
        process.exit(0);
    })
    .catch(error => {
        console.error('เกิดข้อผิดพลาด:', error);
        process.exit(1);
    });
