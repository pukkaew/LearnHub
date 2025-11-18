const { poolPromise, sql } = require('./config/database');
const Course = require('./models/Course');

async function createTestCourse() {
    try {
        console.log('🎯 Creating REAL Test Course for User Verification\n');
        console.log('='.repeat(80));

        // Create a course with data that matches EXACTLY what the form would send
        const courseData = {
            // Step 1: ข้อมูลพื้นฐาน (Basic Info)
            course_code: 'VERIFY-2025-001',
            course_name: 'หลักสูตรทดสอบการแสดงผลครบถ้วน',
            category_id: 1,
            category: 'การพัฒนาซอฟต์แวร์',
            difficulty_level: 'Intermediate',  // ← Form sends "Intermediate"
            course_type: 'mandatory',          // ← Form sends "mandatory" (บังคับ)
            language: 'th',                    // ← Form sends "th" (ภาษาไทย)
            description: '<p><strong>หลักสูตรนี้</strong> ออกแบบมาเพื่อทดสอบการแสดงผลข้อมูลทุกฟิลด์ให้ตรงกับที่กรอกในฟอร์ม</p><p>ครอบคลุมทั้ง HTML formatting และข้อความภาษาไทย</p>',

            // Step 2: รายละเอียด (Details)
            instructor_name: 'ผศ.ดร.สมชาย ใจดี',
            duration_hours: 40,
            duration_minutes: 0,
            max_enrollments: 150,

            // Step 3: เนื้อหา (Content)
            learning_objectives: [
                'เข้าใจหลักการและแนวคิดพื้นฐานของเทคโนโลยีสารสนเทศ',
                'สามารถประยุกต์ใช้ความรู้ในการแก้ปัญหาเชิงปฏิบัติได้',
                'พัฒนาทักษะการคิดวิเคราะห์และการทำงานเป็นทีม',
                'มีความรู้ด้านเครื่องมือและเทคนิคที่ทันสมัย',
                'สามารถสื่อสารและนำเสนอผลงานได้อย่างมืออาชีพ'
            ],
            target_positions: ['developer', 'engineer', 'analyst', 'manager'],
            target_departments: ['IT', 'Development', 'Technology', 'Digital'],
            prerequisite_knowledge: 'มีพื้นฐานการใช้คอมพิวเตอร์ และความเข้าใจเบื้องต้นเกี่ยวกับการเขียนโปรแกรม แนะนำให้มีประสบการณ์อย่างน้อย 1 ปี',
            lessons: [
                {
                    title: 'บทที่ 1: ความรู้พื้นฐานและการเตรียมความพร้อม',
                    description: 'แนะนำหลักสูตร ทำความรู้จักกับเครื่องมือ และเตรียมสภาพแวดล้อมการเรียนรู้',
                    duration: 120
                },
                {
                    title: 'บทที่ 2: ทฤษฎีและหลักการสำคัญ',
                    description: 'เรียนรู้ทฤษฎีพื้นฐาน หลักการทำงาน และแนวคิดสำคัญ',
                    duration: 180
                },
                {
                    title: 'บทที่ 3: การฝึกปฏิบัติและเทคนิคการใช้งาน',
                    description: 'ฝึกปฏิบัติกับเครื่องมือจริง เรียนรู้เทคนิคและ best practices',
                    duration: 240
                },
                {
                    title: 'บทที่ 4: โปรเจกต์จำลองและกรณีศึกษา',
                    description: 'ทำโปรเจกต์จำลองสถานการณ์จริง วิเคราะห์กรณีศึกษา',
                    duration: 300
                },
                {
                    title: 'บทที่ 5: โปรเจกต์จริงและการนำเสนอผลงาน',
                    description: 'พัฒนาโปรเจกต์จริงจากความต้องการของธุรกิจ และนำเสนอผลงาน',
                    duration: 360
                }
            ],

            // Step 4: การประเมิน (Assessment)
            passing_score: 75,
            max_attempts: 3,

            // Step 5: การตั้งค่า (Settings)
            status: 'Published',
            is_published: true,
            certificate_validity: '2 ปี',
            intro_video_url: 'https://youtube.com/example',
            show_correct_answers: true
        };

        console.log('📝 Course Data Summary:');
        console.log('─'.repeat(80));
        console.log(`   ชื่อหลักสูตร:            ${courseData.course_name}`);
        console.log(`   รหัสหลักสูตร:            ${courseData.course_code}`);
        console.log(`   ระดับความยาก:           ${courseData.difficulty_level}`);
        console.log(`   ประเภท:                  ${courseData.course_type}`);
        console.log(`   ภาษา:                    ${courseData.language}`);
        console.log(`   ผู้สอน:                  ${courseData.instructor_name}`);
        console.log(`   ระยะเวลา:                ${courseData.duration_hours} ชั่วโมง`);
        console.log(`   จำนวนผู้เรียนสูงสุด:     ${courseData.max_enrollments} คน`);
        console.log(`   เกณฑ์ผ่าน:               ${courseData.passing_score}%`);
        console.log(`   ทำได้สูงสุด:             ${courseData.max_attempts} ครั้ง`);
        console.log(`   วัตถุประสงค์:            ${courseData.learning_objectives.length} รายการ`);
        console.log(`   บทเรียน:                 ${courseData.lessons.length} บท`);
        console.log('');

        console.log('💾 Creating course...');
        const result = await Course.create(courseData);

        if (!result.success) {
            console.error('❌ Failed:', result.message);
            process.exit(1);
        }

        const courseId = result.data.course_id;
        console.log(`✅ Course created with ID: ${courseId}\n`);

        // Verify retrieval
        console.log('🔍 Verifying data...');
        const retrieved = await Course.findById(courseId);

        if (!retrieved) {
            console.error('❌ Failed to retrieve');
            process.exit(1);
        }

        console.log('✅ Data verified\n');

        console.log('='.repeat(80));
        console.log('🎉 SUCCESS! Test Course Created');
        console.log('='.repeat(80));
        console.log('');
        console.log('📍 กรุณาเปิดเว็บเบราว์เซอร์และไปที่:');
        console.log('');
        console.log(`   🔗 http://localhost:3000/courses/${courseId}`);
        console.log('');
        console.log('='.repeat(80));
        console.log('📊 ข้อมูลที่ควรแสดง:');
        console.log('─'.repeat(80));
        console.log('');
        console.log('ส่วน HEADER:');
        console.log(`  - ชื่อ: "${courseData.course_name}"`);
        console.log(`  - คำอธิบาย: มีข้อความ HTML`);
        console.log(`  - ผู้สอน: "${courseData.instructor_name}"`);
        console.log(`  - ระยะเวลา: ${courseData.duration_hours} ชั่วโมง`);
        console.log(`  - หมวดหมู่: "${courseData.category}"`);
        console.log(`  - ระดับ: "ปานกลาง" (จาก Intermediate)`);
        console.log('');
        console.log('ส่วน SIDEBAR "ข้อมูลคอร์ส":');
        console.log(`  - ระดับความยาก: "ปานกลาง"`);
        console.log(`  - ระยะเวลา: ${courseData.duration_hours} ชั่วโมง`);
        console.log(`  - ภาษา: "ภาษาไทย"`);
        console.log(`  - ประเภท: "บังคับ"`);
        console.log(`  - จำนวนผู้เรียนสูงสุด: ${courseData.max_enrollments} คน`);
        console.log(`  - เกณฑ์ผ่าน: ${courseData.passing_score}%`);
        console.log(`  - ทำได้สูงสุด: ${courseData.max_attempts} ครั้ง`);
        console.log(`  - ใบประกาศนียบัตร: มี (${courseData.certificate_validity})`);
        console.log('');
        console.log('TAB "ภาพรวม":');
        console.log(`  - วัตถุประสงค์: ${courseData.learning_objectives.length} รายการ`);
        courseData.learning_objectives.forEach((obj, i) => {
            console.log(`    ${i + 1}. ${obj}`);
        });
        console.log(`  - ความต้องการพื้นฐาน: "${courseData.prerequisite_knowledge.substring(0, 60)}..."`);
        console.log('');
        console.log('TAB "หลักสูตร":');
        console.log(`  - บทเรียน: ${courseData.lessons.length} บท`);
        courseData.lessons.forEach((lesson, i) => {
            console.log(`    ${i + 1}. ${lesson.title} (${lesson.duration} นาที)`);
        });
        console.log('');
        console.log('='.repeat(80));
        console.log('❓ หากข้อมูลแสดงไม่ตรงตามด้านบน กรุณา:');
        console.log('   1. Screenshot หน้าจอที่แสดงผลไม่ถูก');
        console.log('   2. บอกว่าฟิลด์ไหนแสดงผลไม่ตรง');
        console.log('   3. บอกว่าแสดงอะไรแทน');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

createTestCourse();
