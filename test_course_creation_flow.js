const Course = require('./models/Course');

async function testCourseCreationFlow() {
    try {
        console.log('🧪 ทดสอบการสร้าง Course แบบละเอียด\n');
        console.log('='.repeat(80));

        // สร้างข้อมูลที่ครบถ้วนตามฟอร์ม
        const completeFormData = {
            // Step 1: ข้อมูลพื้นฐาน
            course_code: 'CRS-2025-0001',
            course_name: 'หลักสูตรทดสอบระบบ',
            category_id: 1,
            difficulty_level: 'Beginner',
            course_type: 'mandatory',
            language: 'th',
            instructor_name: 'ผู้สอนทดสอบ',

            // Step 2: รายละเอียด
            description: '<p>คำอธิบายหลักสูตรทดสอบ</p>',
            learning_objectives: [
                'วัตถุประสงค์ที่ 1: ทดสอบระบบ',
                'วัตถุประสงค์ที่ 2: ตรวจสอบการทำงาน',
                'วัตถุประสงค์ที่ 3: แก้ไข bug'
            ],
            target_positions: ['developer', 'engineer'],
            target_departments: ['it', 'development'],
            prerequisite_knowledge: 'ไม่มีความรู้พื้นฐานที่จำเป็น',
            duration_hours: 8,
            duration_minutes: 0,
            max_students: 50,

            // Step 3: เนื้อหา
            thumbnail: '/uploads/images/test.jpg',
            intro_video_url: null,
            lessons: [
                {
                    title: 'บทที่ 1: แนะนำ',
                    duration: 60,
                    description: 'แนะนำหลักสูตร'
                },
                {
                    title: 'บทที่ 2: เนื้อหาหลัก',
                    duration: 120,
                    description: 'เนื้อหาหลักของหลักสูตร'
                },
                {
                    title: 'บทที่ 3: สรุป',
                    duration: 30,
                    description: 'สรุปหลักสูตร'
                }
            ],

            // Step 4: การประเมินผล
            passing_score: 75,
            max_attempts: 3,
            certificate_validity: 365,
            status: 'active',
            is_published: true,

            // ข้อมูลเพิ่มเติม
            created_by: 1  // Admin user
        };

        console.log('\n📊 ข้อมูลที่เตรียมส่งไปสร้าง Course:');
        console.log('─'.repeat(80));
        console.log(JSON.stringify(completeFormData, null, 2));

        console.log('\n\n🔄 กำลังเรียก Course.create()...\n');
        const result = await Course.create(completeFormData);

        console.log('\n📥 ผลลัพธ์จาก Course.create():');
        console.log('─'.repeat(80));
        console.log(JSON.stringify(result, null, 2));

        if (result.success) {
            const courseId = result.data.course_id;
            console.log(`\n✅ สร้าง Course สำเร็จ! ID = ${courseId}`);

            console.log('\n\n🔍 ดึงข้อมูลที่บันทึกจาก Database...\n');
            const savedCourse = await Course.findById(courseId);

            console.log('📦 ข้อมูลที่บันทึกใน Database:');
            console.log('='.repeat(80));

            // แสดงข้อมูลทีละฟิลด์
            console.log('\n📍 STEP 1: ข้อมูลพื้นฐาน');
            console.log('─'.repeat(80));
            console.log(`  course_code: "${savedCourse.course_code}" ${!savedCourse.course_code ? '❌ NULL!' : '✅'}`);
            console.log(`  course_name: "${savedCourse.course_name}" ${!savedCourse.course_name ? '❌ NULL!' : '✅'}`);
            console.log(`  difficulty_level: "${savedCourse.difficulty_level}" ${!savedCourse.difficulty_level ? '❌ NULL!' : '✅'}`);
            console.log(`  course_type: "${savedCourse.course_type}" ${!savedCourse.course_type ? '❌ NULL!' : '✅'}`);
            console.log(`  language: "${savedCourse.language}" ${!savedCourse.language ? '❌ NULL!' : '✅'}`);
            console.log(`  instructor_name: "${savedCourse.instructor_name}" ${!savedCourse.instructor_name ? '❌ NULL!' : '✅'}`);

            console.log('\n📍 STEP 2: รายละเอียดหลักสูตร');
            console.log('─'.repeat(80));

            const objectives = Array.isArray(savedCourse.learning_objectives)
                ? savedCourse.learning_objectives
                : (savedCourse.learning_objectives ? JSON.parse(savedCourse.learning_objectives) : []);
            console.log(`  learning_objectives: ${objectives.length} รายการ ${objectives.length === 0 ? '❌ ว่างเปล่า!' : '✅'}`);
            if (objectives.length > 0) {
                objectives.forEach((obj, i) => {
                    console.log(`     ${i + 1}. ${obj}`);
                });
            }

            console.log(`  target_audience: ${savedCourse.target_audience ? '✅ มีข้อมูล' : '❌ NULL!'}`);
            if (savedCourse.target_audience) {
                const ta = typeof savedCourse.target_audience === 'string'
                    ? JSON.parse(savedCourse.target_audience)
                    : savedCourse.target_audience;
                console.log(`     positions: ${JSON.stringify(ta.positions || [])}`);
                console.log(`     departments: ${JSON.stringify(ta.departments || [])}`);
            }

            console.log(`  prerequisite_knowledge: ${savedCourse.prerequisite_knowledge ? '✅' : '❌ NULL'}`);
            console.log(`  duration_hours: ${savedCourse.duration_hours || 0}`);
            console.log(`  max_students: ${savedCourse.max_students || 'NULL'}`);

            console.log('\n📍 STEP 3: เนื้อหาและสื่อ');
            console.log('─'.repeat(80));
            console.log(`  thumbnail: "${savedCourse.thumbnail || 'NULL'}"`);

            const lessons = Array.isArray(savedCourse.lessons)
                ? savedCourse.lessons
                : (savedCourse.lessons ? JSON.parse(savedCourse.lessons) : []);
            console.log(`  lessons: ${lessons.length} บท ${lessons.length === 0 ? '❌ ว่างเปล่า!' : '✅'}`);
            if (lessons.length > 0) {
                lessons.forEach((lesson, i) => {
                    console.log(`     ${i + 1}. ${lesson.title || lesson.material_name} (${lesson.duration || lesson.duration_minutes || 0} นาที)`);
                });
            }

            console.log('\n📍 STEP 4: การประเมินผล');
            console.log('─'.repeat(80));
            console.log(`  passing_score: ${savedCourse.passing_score || 'NULL'} ${!savedCourse.passing_score ? '❌' : '✅'}`);
            console.log(`  max_attempts: ${savedCourse.max_attempts || 'NULL'} ${!savedCourse.max_attempts ? '❌' : '✅'}`);
            console.log(`  certificate_validity: ${savedCourse.certificate_validity || 'NULL'}`);

            // เปรียบเทียบข้อมูลที่ส่งไปกับที่บันทึก
            console.log('\n\n' + '='.repeat(80));
            console.log('📊 เปรียบเทียบ: ข้อมูลที่ส่งไป VS ข้อมูลที่บันทึก');
            console.log('='.repeat(80));

            const issues = [];

            if (completeFormData.course_code !== savedCourse.course_code) {
                issues.push(`❌ course_code: ส่งไป="${completeFormData.course_code}" แต่ได้="${savedCourse.course_code}"`);
            }
            if (completeFormData.course_type !== savedCourse.course_type) {
                issues.push(`❌ course_type: ส่งไป="${completeFormData.course_type}" แต่ได้="${savedCourse.course_type}"`);
            }
            if (completeFormData.language !== savedCourse.language) {
                issues.push(`❌ language: ส่งไป="${completeFormData.language}" แต่ได้="${savedCourse.language}"`);
            }
            if (completeFormData.learning_objectives.length !== objectives.length) {
                issues.push(`❌ learning_objectives: ส่งไป ${completeFormData.learning_objectives.length} รายการ แต่ได้ ${objectives.length} รายการ`);
            }
            if (completeFormData.lessons.length !== lessons.length) {
                issues.push(`❌ lessons: ส่งไป ${completeFormData.lessons.length} บท แต่ได้ ${lessons.length} บท`);
            }
            if (completeFormData.passing_score !== savedCourse.passing_score) {
                issues.push(`❌ passing_score: ส่งไป=${completeFormData.passing_score} แต่ได้=${savedCourse.passing_score}`);
            }
            if (completeFormData.max_attempts !== savedCourse.max_attempts) {
                issues.push(`❌ max_attempts: ส่งไป=${completeFormData.max_attempts} แต่ได้=${savedCourse.max_attempts}`);
            }

            if (issues.length > 0) {
                console.log('\n❌ พบความแตกต่าง:');
                issues.forEach(issue => console.log('  ' + issue));
            } else {
                console.log('\n✅ ข้อมูลทั้งหมดตรงกัน!');
            }

        } else {
            console.log('\n❌ สร้าง Course ไม่สำเร็จ!');
            console.log('Error:', result.message);
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

testCourseCreationFlow();
