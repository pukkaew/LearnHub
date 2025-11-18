const { poolPromise } = require('./config/database');

async function checkLatestCourse() {
    try {
        console.log('🔍 ตรวจสอบหลักสูตรล่าสุดในระบบ...\n');

        const pool = await poolPromise;

        // ดึงหลักสูตรล่าสุด
        const result = await pool.request().query(`
            SELECT TOP 1 * FROM courses
            ORDER BY course_id DESC
        `);

        if (result.recordset.length === 0) {
            console.log('❌ ไม่พบหลักสูตรในระบบ\n');
            process.exit(0);
            return;
        }

        const course = result.recordset[0];

        console.log('📊 หลักสูตรล่าสุด:\n');
        console.log('=' .repeat(60));
        console.log(`Course ID: ${course.course_id}`);
        console.log(`Title: ${course.title}`);
        console.log(`Course Code: ${course.course_code}`);
        console.log('');
        console.log('🎯 ค่าที่น่าสงสัย:');
        console.log(`  Max Students: ${course.max_students} ${course.max_students === 50 ? '← ค่า default?' : ''}`);
        console.log(`  Passing Score: ${course.passing_score}% ${course.passing_score === 70 ? '← ค่า default?' : ''}`);
        console.log(`  Max Attempts: ${course.max_attempts} ${course.max_attempts === 3 ? '← ค่า default?' : ''}`);
        console.log('');
        console.log('📋 ข้อมูลอื่นๆ:');
        console.log(`  Course Type: ${course.course_type}`);
        console.log(`  Language: ${course.language}`);
        console.log(`  Category: ${course.category}`);
        console.log(`  Difficulty: ${course.difficulty_level}`);
        console.log(`  Start Date: ${course.start_date || 'ไม่ระบุ'}`);
        console.log(`  End Date: ${course.end_date || 'ไม่ระบุ'}`);
        console.log('=' .repeat(60));

        console.log('\n💡 สรุป:');
        if (course.max_students === 50 || course.passing_score === 70 || course.max_attempts === 3) {
            console.log('⚠️  พบค่า default ในระบบ:');
            if (course.max_students === 50) console.log('  - Max Students = 50 (อาจเป็นค่า default)');
            if (course.passing_score === 70) console.log('  - Passing Score = 70% (ค่า default จาก JavaScript)');
            if (course.max_attempts === 3) console.log('  - Max Attempts = 3 (ค่า default จาก JavaScript)');
            console.log('\nถ้าคุณไม่ได้กรอกค่าเหล่านี้ แสดงว่าระบบใส่ค่า default ให้อัตโนมัติ');
        } else {
            console.log('✅ ไม่พบค่า default - คุณได้กรอกค่าเหล่านี้เอง');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        console.error(error);
        process.exit(1);
    }
}

checkLatestCourse();
