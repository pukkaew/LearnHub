/**
 * ลบข้อมูล Course ทั้งหมดพร้อมข้อมูลที่เกี่ยวข้อง
 */

const { poolPromise } = require('./config/database');

async function cleanAllCourses() {
    try {
        console.log('\n🧹 เริ่มลบข้อมูล Course ทั้งหมด...\n');

        const pool = await poolPromise;

        // 1. นับจำนวนคอร์สก่อนลบ
        const countResult = await pool.request().query('SELECT COUNT(*) as total FROM courses');
        const totalCourses = countResult.recordset[0].total;
        console.log(`📊 พบคอร์สทั้งหมด: ${totalCourses} คอร์ส`);

        if (totalCourses === 0) {
            console.log('✅ ไม่มีคอร์สที่ต้องลบ');
            process.exit(0);
        }

        // 2. ลบข้อมูลที่เกี่ยวข้องกับคอร์ส (ตามลำดับ foreign key)
        console.log('\n🗑️  กำลังลบข้อมูลที่เกี่ยวข้อง...');

        // ลบ leaderboards
        let result = await pool.request().query('DELETE FROM leaderboards WHERE course_id IN (SELECT course_id FROM courses)');
        console.log(`   ✓ ลบ leaderboards: ${result.rowsAffected[0]} รายการ`);

        // ลบ user_courses
        result = await pool.request().query('DELETE FROM user_courses WHERE course_id IN (SELECT course_id FROM courses)');
        console.log(`   ✓ ลบ user_courses: ${result.rowsAffected[0]} รายการ`);

        // ลบ QuestionBank
        result = await pool.request().query('DELETE FROM QuestionBank WHERE course_id IN (SELECT course_id FROM courses)');
        console.log(`   ✓ ลบ QuestionBank: ${result.rowsAffected[0]} รายการ`);

        // ลบ course_materials
        result = await pool.request().query('DELETE FROM course_materials WHERE course_id IN (SELECT course_id FROM courses)');
        console.log(`   ✓ ลบ course_materials: ${result.rowsAffected[0]} รายการ`);

        // ลบ tests (มี FK ทั้ง courses → tests และ tests → courses)
        // ต้องปิด FK constraint ชั่วคราวหรือลบทีละส่วน
        console.log('   ⚙️  กำลังจัดการ tests...');

        // Set FK เป็น NULL ใน courses ก่อน
        await pool.request().query('UPDATE courses SET test_id = NULL WHERE test_id IS NOT NULL');
        console.log('   ✓ Clear test_id ใน courses');

        // ลบ tests ทั้งหมด (ไม่ใช่แค่ tests ที่เกี่ยวกับ courses เท่านั้น)
        result = await pool.request().query('DELETE FROM tests');
        console.log(`   ✓ ลบ tests ทั้งหมด: ${result.rowsAffected[0]} รายการ`);

        // 3. ลบ courses
        console.log('\n🗑️  กำลังลบคอร์ส...');
        result = await pool.request().query('DELETE FROM courses');
        console.log(`   ✓ ลบ courses: ${result.rowsAffected[0]} คอร์ส`);

        // 4. Reset IDENTITY (ถ้าต้องการให้ course_id เริ่มจาก 1 ใหม่)
        console.log('\n🔄 Reset Identity...');
        try {
            await pool.request().query('DBCC CHECKIDENT (\'courses\', RESEED, 0)');
            console.log('   ✓ Reset courses IDENTITY');
        } catch (e) {
            console.log('   ⚠️  courses identity reset skipped');
        }

        try {
            await pool.request().query('DBCC CHECKIDENT (\'tests\', RESEED, 0)');
            console.log('   ✓ Reset tests IDENTITY');
        } catch (e) {
            console.log('   ⚠️  tests identity reset skipped');
        }

        // 5. ตรวจสอบผลลัพธ์
        console.log('\n✅ ลบข้อมูลสำเร็จ!');

        const finalCount = await pool.request().query('SELECT COUNT(*) as total FROM courses');
        console.log(`📊 คอร์สที่เหลือ: ${finalCount.recordset[0].total} คอร์ส`);

        console.log('\n✨ เสร็จสิ้น - ฐานข้อมูลถูกล้างแล้ว\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ เกิดข้อผิดพลาด:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

cleanAllCourses();
