const fetch = require('node-fetch');

async function testCourseAPI() {
    try {
        console.log('🧪 ทดสอบ API /courses/api/2...\n');

        const response = await fetch('http://localhost:3000/courses/api/2');
        const data = await response.json();

        if (!data.success) {
            console.log('❌ API ไม่สำเร็จ:', data.message);
            return;
        }

        const course = data.data;

        console.log('📊 ข้อมูลที่ได้จาก API:\n');
        console.log('=' .repeat(60));
        console.log(`Course ID: ${course.course_id}`);
        console.log(`Title: ${course.title}`);
        console.log('');
        console.log('🎯 ตรวจสอบฟิลด์ที่สำคัญ:');
        console.log('');
        console.log(`⭐ Passing Score: ${course.passing_score !== undefined ? course.passing_score + '%' : '❌ ไม่มี'}`);
        console.log(`🔄 Max Attempts: ${course.max_attempts !== undefined ? course.max_attempts + ' ครั้ง' : '❌ ไม่มี'}`);
        console.log(`👥 Max Students: ${course.max_students !== undefined ? course.max_students + ' คน' : '❌ ไม่มี'}`);
        console.log(`📜 Certificate Validity: ${course.certificate_validity || '❌ ไม่มี'}`);
        console.log('');
        console.log(`📅 Start Date: ${course.start_date || '❌ ไม่มี'}`);
        console.log(`📅 End Date: ${course.end_date || '❌ ไม่มี'}`);
        console.log('');
        console.log(`📚 Lessons: ${course.lessons ? course.lessons.length + ' บท' : '❌ ไม่มี'}`);

        if (course.lessons && course.lessons.length > 0) {
            console.log('');
            console.log('📹 ตรวจสอบ Video URLs:');
            course.lessons.forEach((lesson, index) => {
                console.log(`  บทที่ ${index + 1}: ${lesson.title}`);
                console.log(`    video_url: ${lesson.video_url || '❌ ไม่มี'}`);
            });
        }

        console.log('');
        console.log('='.repeat(60));

        // สรุปปัญหา
        const issues = [];
        if (course.passing_score === undefined || course.passing_score === null) {
            issues.push('❌ passing_score ไม่มีค่า');
        }
        if (course.max_attempts === undefined || course.max_attempts === null) {
            issues.push('❌ max_attempts ไม่มีค่า');
        }
        if (!course.start_date) {
            issues.push('⚠️  start_date ไม่มีค่า');
        }
        if (!course.end_date) {
            issues.push('⚠️  end_date ไม่มีค่า');
        }
        if (course.lessons && course.lessons.length > 0) {
            course.lessons.forEach((lesson, index) => {
                if (!lesson.video_url) {
                    issues.push(`❌ บทที่ ${index + 1} ไม่มี video_url`);
                }
            });
        }

        if (issues.length > 0) {
            console.log('\n⚠️  ปัญหาที่พบ:\n');
            issues.forEach(issue => console.log(`  ${issue}`));
        } else {
            console.log('\n✅ ข้อมูลครบถ้วนทั้งหมด!');
        }

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
    }
}

testCourseAPI();
