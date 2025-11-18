const Course = require('./models/Course');

async function checkCourse1() {
    try {
        console.log('🔍 ตรวจสอบ Course ID 1\n');
        console.log('='.repeat(80));

        const course = await Course.findById(1);

        if (!course) {
            console.log('❌ ไม่พบ Course ID 1');
            console.log('\n💡 กรุณาสร้าง Course จากหน้า http://localhost:3000/courses/create ก่อน');
            process.exit(1);
        }

        console.log('\n✅ พบ Course ID 1');
        console.log(`ชื่อ: "${course.title || course.course_name}"\n`);
        console.log('='.repeat(80));
        console.log('📊 ข้อมูลที่บันทึกใน Database:');
        console.log('='.repeat(80));

        // แสดงข้อมูลทีละฟิลด์
        console.log('\n📍 STEP 1: ข้อมูลพื้นฐาน');
        console.log('─'.repeat(80));
        console.log(`  course_code: ${course.course_code || 'NULL ❌'}`);
        console.log(`  title: ${course.title || course.course_name || 'NULL ❌'}`);
        console.log(`  category_id: ${course.category_id || 'NULL'}`);
        console.log(`  category_name: ${course.category_name || 'NULL'}`);
        console.log(`  difficulty_level: ${course.difficulty_level || 'NULL ❌'}`);
        console.log(`  course_type: ${course.course_type || 'NULL ❌'}`);
        console.log(`  language: ${course.language || 'NULL ❌'}`);
        console.log(`  instructor_name: ${course.instructor_name || 'NULL'}`);

        console.log('\n📍 STEP 2: รายละเอียดหลักสูตร');
        console.log('─'.repeat(80));
        console.log(`  description: ${course.description ? course.description.substring(0, 80) + '...' : 'NULL'}`);

        const objectives = Array.isArray(course.learning_objectives)
            ? course.learning_objectives
            : (course.learning_objectives ? JSON.parse(course.learning_objectives) : []);
        console.log(`  learning_objectives: ${objectives.length} รายการ`);
        if (objectives.length > 0) {
            objectives.forEach((obj, i) => {
                console.log(`     ${i + 1}. ${obj.substring(0, 60)}...`);
            });
        }

        console.log(`  target_audience: ${course.target_audience ? 'มีข้อมูล' : 'NULL ❌'}`);
        if (course.target_audience) {
            const ta = typeof course.target_audience === 'string'
                ? JSON.parse(course.target_audience)
                : course.target_audience;
            console.log(`     positions: ${JSON.stringify(ta.positions || [])}`);
            console.log(`     departments: ${JSON.stringify(ta.departments || [])}`);
        }

        console.log(`  prerequisite_knowledge: ${course.prerequisite_knowledge ? course.prerequisite_knowledge.substring(0, 60) + '...' : 'NULL'}`);
        console.log(`  duration_hours: ${course.duration_hours || 0}`);
        console.log(`  duration_minutes: ${course.duration_minutes || 0}`);
        console.log(`  max_students: ${course.max_students || 'NULL (จะแสดง "ไม่จำกัด")'}`);

        console.log('\n📍 STEP 3: เนื้อหาและสื่อ');
        console.log('─'.repeat(80));
        console.log(`  thumbnail/course_image: ${course.thumbnail || course.course_image || 'NULL (ใช้รูปเริ่มต้น)'}`);
        console.log(`  intro_video_url: ${course.intro_video_url || 'NULL'}`);

        const lessons = Array.isArray(course.lessons)
            ? course.lessons
            : (course.lessons ? JSON.parse(course.lessons) : []);
        console.log(`  lessons: ${lessons.length} บท`);
        if (lessons.length > 0) {
            lessons.forEach((lesson, i) => {
                console.log(`     ${i + 1}. ${lesson.title} (${lesson.duration_minutes || lesson.duration || 0} นาที)`);
            });
        } else {
            console.log('     ❌ ไม่มีบทเรียน! Tab หลักสูตรจะว่าง');
        }

        console.log('\n📍 STEP 4: การประเมินผล');
        console.log('─'.repeat(80));
        console.log(`  passing_score: ${course.passing_score || 'NULL'}%`);
        console.log(`  max_attempts: ${course.max_attempts || 'NULL (จะแสดง "ไม่จำกัด")'}`);
        console.log(`  certificate_validity: ${course.certificate_validity || 'NULL'}`);
        console.log(`  status: ${course.status || 'NULL'}`);
        console.log(`  is_published: ${course.is_published || false}`);

        // วิเคราะห์ปัญหา
        console.log('\n' + '='.repeat(80));
        console.log('🔍 วิเคราะห์ปัญหา:');
        console.log('='.repeat(80));

        const issues = [];

        if (!course.course_code) issues.push('❌ course_code: NULL - รหัสหลักสูตรไม่แสดง');
        if (!course.difficulty_level) issues.push('❌ difficulty_level: NULL - ระดับความยากไม่แสดง');
        if (!course.course_type) issues.push('❌ course_type: NULL - ประเภทหลักสูตรไม่แสดง');
        if (!course.language) issues.push('❌ language: NULL - ภาษาไม่แสดง');
        if (objectives.length === 0) issues.push('❌ learning_objectives: ว่าง - วัตถุประสงค์ไม่แสดง');
        if (!course.target_audience) issues.push('❌ target_audience: NULL - กลุ่มเป้าหมายไม่แสดง');
        if (lessons.length === 0) issues.push('❌ lessons: ว่าง - Tab หลักสูตรจะว่างเปล่า');
        if (!course.max_students) issues.push('⚠️  max_students: NULL (จะแสดง "ไม่จำกัด")');
        if (!course.passing_score) issues.push('⚠️  passing_score: NULL (จะแสดง "ไม่ระบุ")');

        if (issues.length > 0) {
            console.log('\n❌ พบปัญหา:');
            issues.forEach(issue => console.log('  ' + issue));
        } else {
            console.log('\n✅ ไม่พบปัญหาข้อมูลที่สำคัญ');
        }

        // สรุปสิ่งที่ควรแสดง
        console.log('\n' + '='.repeat(80));
        console.log('📋 สิ่งที่ควรแสดงในหน้า http://localhost:3000/courses/1:');
        console.log('='.repeat(80));

        console.log('\n📍 Header:');
        console.log(`  ชื่อ: ${course.title || course.course_name || 'ไม่มี ❌'}`);
        console.log(`  รหัส: ${course.course_code || 'ไม่มี ❌'}`);
        console.log(`  หมวด: ${course.category_name || 'ไม่มี'}`);
        console.log(`  ระดับ: ${course.difficulty_level || 'ไม่มี ❌'} → ต้องแปลเป็น "เริ่มต้น/ปานกลาง/ขั้นสูง"`);
        console.log(`  ผู้สอน: ${course.instructor_name || 'ไม่ระบุ'}`);

        console.log('\n📍 Sidebar:');
        console.log(`  ภาษา: ${course.language || 'ไม่มี ❌'} → ต้องแปลเป็น "ภาษาไทย/ภาษาอังกฤษ/ไทย-อังกฤษ"`);
        console.log(`  ประเภท: ${course.course_type || 'ไม่มี ❌'} → ต้องแปลเป็น "บังคับ/เลือก/แนะนำ"`);
        console.log(`  จำนวนผู้เรียน: ${course.max_students ? course.max_students + ' คน' : 'ไม่จำกัด'}`);
        console.log(`  เกณฑ์ผ่าน: ${course.passing_score ? course.passing_score + '%' : 'ไม่ระบุ'}`);
        console.log(`  ทำได้: ${course.max_attempts ? course.max_attempts + ' ครั้ง' : 'ไม่จำกัด'}`);

        console.log('\n📍 Tab "ภาพรวม":');
        console.log(`  วิดีโอแนะนำ: ${course.intro_video_url ? 'มี' : 'ไม่มี'}`);
        console.log(`  วัตถุประสงค์: ${objectives.length} รายการ`);
        console.log(`  กลุ่มเป้าหมาย: ${course.target_audience ? 'มี' : 'ไม่มี ❌'}`);

        console.log('\n📍 Tab "หลักสูตร":');
        console.log(`  บทเรียน: ${lessons.length} บท ${lessons.length === 0 ? '❌ (จะว่างเปล่า!)' : '✅'}`);

        console.log('\n' + '='.repeat(80));
        console.log('💡 คำแนะนำ:');
        console.log('='.repeat(80));

        if (issues.length > 0) {
            console.log('\n1. เปิดหน้า http://localhost:3000/courses/1 ใน Browser');
            console.log('2. Screenshot หน้าจอที่แสดงผลไม่ถูกต้อง');
            console.log('3. บอกว่าส่วนไหนแสดงไม่ถูก ควรแสดงอะไร');
            console.log('\nหรือ:');
            console.log('สร้าง Course ใหม่จากฟอร์ม โดยกรอกข้อมูลให้ครบทุกฟิลด์');
        } else {
            console.log('\nข้อมูลครบถ้วน กรุณาตรวจสอบว่าหน้าแสดงผลถูกต้องหรือไม่');
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

checkCourse1();
