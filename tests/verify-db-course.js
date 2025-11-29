/**
 * ตรวจสอบหลักสูตรที่สร้างล่าสุดใน Database
 */

const { poolPromise, sql } = require('../config/database');

async function verifyCoursesInDB() {
    try {
        const pool = await poolPromise;

        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║         VERIFY COURSES IN DATABASE - ตรวจสอบฐานข้อมูล          ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        // ดึงหลักสูตร 5 รายการล่าสุด
        const result = await pool.request().query(`
            SELECT TOP 5
                course_id,
                title,
                course_code,
                course_type,
                difficulty_level,
                language,
                status,
                is_active,
                created_at
            FROM Courses
            ORDER BY created_at DESC
        `);

        console.log(`📊 พบหลักสูตร ${result.recordset.length} รายการล่าสุด:\n`);

        result.recordset.forEach((course, index) => {
            console.log(`┌───────────── หลักสูตรที่ ${index + 1} ─────────────┐`);
            console.log(`│ ID:         ${course.course_id}`);
            console.log(`│ ชื่อ:       ${course.title}`);
            console.log(`│ รหัส:       ${course.course_code}`);
            console.log(`│ ประเภท:     ${course.course_type}`);
            console.log(`│ ระดับ:      ${course.difficulty_level}`);
            console.log(`│ ภาษา:       ${course.language}`);
            console.log(`│ สถานะ:      ${course.status}`);
            console.log(`│ Active:     ${course.is_active}`);
            console.log(`│ สร้างเมื่อ:  ${course.created_at}`);
            console.log('└────────────────────────────────────────┘\n');
        });

        // ค้นหาหลักสูตร "ทดสอบครบลูป" ที่เพิ่งสร้าง
        const testCourses = await pool.request().query(`
            SELECT course_id, title, created_at
            FROM Courses
            WHERE title LIKE N'%ทดสอบครบลูป%'
            ORDER BY created_at DESC
        `);

        if (testCourses.recordset.length > 0) {
            console.log('═══════════════════════════════════════════════════════════');
            console.log('✅ พบหลักสูตรที่สร้างจากการทดสอบ:');
            testCourses.recordset.forEach(c => {
                console.log(`   📚 ${c.title} (ID: ${c.course_id})`);
                console.log(`      สร้างเมื่อ: ${c.created_at}`);
            });
            console.log('═══════════════════════════════════════════════════════════');
        }

        // สรุป
        const totalCount = await pool.request().query('SELECT COUNT(*) as total FROM Courses');
        console.log(`\n📈 จำนวนหลักสูตรทั้งหมดในระบบ: ${totalCount.recordset[0].total} หลักสูตร`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyCoursesInDB();
