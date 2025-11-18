const { poolPromise } = require('./config/database');

async function checkCourseData() {
    try {
        console.log('🔍 ตรวจสอบข้อมูลหลักสูตร ID = 2...\n');

        const pool = await poolPromise;

        // ดึงข้อมูลหลักสูตร
        const courseResult = await pool.request().query`
            SELECT * FROM courses WHERE course_id = 2
        `;

        if (courseResult.recordset.length === 0) {
            console.log('❌ ไม่พบหลักสูตร ID = 2\n');
            process.exit(1);
            return;
        }

        const course = courseResult.recordset[0];

        console.log('📊 ข้อมูลหลักสูตรจาก Database:\n');
        console.log('=' .repeat(60));
        console.log(`Course ID: ${course.course_id}`);
        console.log(`Title: ${course.title}`);
        console.log(`Course Code: ${course.course_code}`);
        console.log(`Category: ${course.category}`);
        console.log(`Course Type: ${course.course_type}`);
        console.log(`Language: ${course.language}`);
        console.log('');
        console.log(`⭐ Passing Score: ${course.passing_score}%`);
        console.log(`🔄 Max Attempts: ${course.max_attempts}`);
        console.log(`👥 Max Students: ${course.max_students}`);
        console.log(`📜 Certificate Validity: ${course.certificate_validity}`);
        console.log('');
        console.log(`📅 Start Date: ${course.start_date}`);
        console.log(`📅 End Date: ${course.end_date}`);
        console.log('');
        console.log(`Learning Objectives: ${course.learning_objectives ? 'Yes' : 'No'}`);
        console.log(`Target Audience: ${course.target_audience ? 'Yes' : 'No'}`);
        console.log('=' .repeat(60));

        // ดึงบทเรียน
        const lessonsResult = await pool.request().query`
            SELECT * FROM course_materials
            WHERE course_id = 2
            ORDER BY order_index
        `;

        console.log(`\n📚 บทเรียนทั้งหมด: ${lessonsResult.recordset.length} บท\n`);
        console.log('=' .repeat(60));

        lessonsResult.recordset.forEach((lesson, index) => {
            console.log(`\nบทที่ ${index + 1}:`);
            console.log(`  Title: ${lesson.title}`);
            console.log(`  Duration: ${lesson.duration_minutes} นาที`);
            console.log(`  Type: ${lesson.type}`);
            console.log(`  📹 Video URL (file_path): ${lesson.file_path || 'ไม่มี'}`);
            console.log(`  Content: ${lesson.content || 'ไม่มี'}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('\n✅ ข้อมูลถูกบันทึกครบถ้วน');
        console.log('\nตอนนี้ตรวจสอบว่าหน้า detail แสดงผลถูกต้องหรือไม่:');
        console.log('🔗 http://localhost:3000/courses/2\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        console.error(error);
        process.exit(1);
    }
}

checkCourseData();
