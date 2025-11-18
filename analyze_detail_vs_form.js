const Course = require('./models/Course');

async function analyzeDetailVsForm() {
    try {
        console.log('🔍 วิเคราะห์การแสดงผลหน้า Detail เทียบกับฟอร์มสร้าง\n');
        console.log('='.repeat(100));

        const courseId = 2;
        const course = await Course.findById(courseId);

        if (!course) {
            console.error('❌ ไม่พบหลักสูตร ID:', courseId);
            process.exit(1);
        }

        console.log(`\n📊 วิเคราะห์หลักสูตร: "${course.title || course.course_name}"`);
        console.log('URL: http://localhost:3000/courses/2\n');
        console.log('='.repeat(100));

        // ==================== STEP 1: ข้อมูลพื้นฐาน ====================
        console.log('\n📍 STEP 1: ข้อมูลพื้นฐาน (Basic Information)');
        console.log('─'.repeat(100));

        const step1Fields = [
            {
                name: 'course_name',
                label: 'ชื่อหลักสูตร',
                value: course.title || course.course_name,
                location: 'Header - <h1 id="course-title">',
                required: true,
                display: course.title || course.course_name ? '✅ แสดง' : '❌ ไม่แสดง'
            },
            {
                name: 'course_code',
                label: 'รหัสหลักสูตร',
                value: course.course_code,
                location: 'Header - <p id="course-code"> (ใต้ชื่อหลักสูตร)',
                required: true,
                display: course.course_code ? '✅ แสดง' : '❌ ไม่แสดง'
            },
            {
                name: 'category',
                label: 'หมวดหมู่',
                value: course.category_name,
                location: 'Header - Badge <span id="category-badge">',
                required: true,
                display: course.category_name ? '✅ แสดง' : '❌ ไม่แสดง'
            },
            {
                name: 'difficulty_level',
                label: 'ระดับความยาก',
                value: course.difficulty_level,
                mapping: {
                    'Beginner': 'เริ่มต้น',
                    'Intermediate': 'ปานกลาง',
                    'Advanced': 'ขั้นสูง'
                },
                shouldDisplay: course.difficulty_level ?
                    ({ 'beginner': 'เริ่มต้น', 'intermediate': 'ปานกลาง', 'advanced': 'ขั้นสูง' }[course.difficulty_level.toLowerCase()] || course.difficulty_level) :
                    'ไม่ระบุ',
                location: 'Header - Badge <span id="difficulty-badge"> และ Sidebar',
                required: true,
                display: course.difficulty_level ? '✅ แสดง' : '❌ ไม่แสดง'
            },
            {
                name: 'course_type',
                label: 'ประเภทหลักสูตร',
                value: course.course_type,
                mapping: {
                    'mandatory': 'บังคับ',
                    'elective': 'เลือก',
                    'recommended': 'แนะนำ'
                },
                shouldDisplay: course.course_type ?
                    ({ 'mandatory': 'บังคับ', 'elective': 'เลือก', 'recommended': 'แนะนำ' }[course.course_type] || course.course_type) :
                    'ไม่ระบุ',
                location: 'Sidebar - <span id="sidebar-course-type">',
                required: true,
                display: course.course_type ? '✅ แสดง' : '❌ ไม่แสดง'
            },
            {
                name: 'language',
                label: 'ภาษาที่ใช้สอน',
                value: course.language,
                mapping: {
                    'th': 'ภาษาไทย',
                    'en': 'ภาษาอังกฤษ',
                    'th-en': 'ไทย-อังกฤษ'
                },
                shouldDisplay: course.language ?
                    ({ 'th': 'ภาษาไทย', 'en': 'ภาษาอังกฤษ', 'th-en': 'ไทย-อังกฤษ' }[course.language] || course.language) :
                    'ไม่ระบุ',
                location: 'Sidebar - <span id="sidebar-language">',
                required: true,
                display: course.language ? '✅ แสดง' : '❌ ไม่แสดง'
            },
            {
                name: 'instructor_name',
                label: 'ผู้สอน',
                value: course.instructor_name,
                location: 'Header - <span id="instructor-name"> และ Sidebar "ผู้สอน"',
                required: false,
                display: course.instructor_name ? '✅ แสดง' : '⚠️  ไม่บังคับ (ไม่มีข้อมูล)'
            }
        ];

        step1Fields.forEach(field => {
            console.log(`\n${field.display} ${field.label}`);
            console.log(`   ฟิลด์: ${field.name}`);
            console.log(`   ค่าใน DB: "${field.value || 'NULL'}"`);
            if (field.mapping) {
                console.log(`   ต้องแสดงเป็น: "${field.shouldDisplay}"`);
            }
            console.log(`   ตำแหน่งแสดง: ${field.location}`);
            if (!field.value && field.required) {
                console.log(`   ⚠️  WARNING: ฟิลด์บังคับแต่ไม่มีข้อมูล!`);
            }
        });

        // ==================== STEP 2: รายละเอียดหลักสูตร ====================
        console.log('\n\n📍 STEP 2: รายละเอียดหลักสูตร (Course Details)');
        console.log('─'.repeat(100));

        console.log('\n✅ คำอธิบายหลักสูตร (Description)');
        console.log(`   ฟิลด์: description`);
        console.log(`   ค่าใน DB: ${course.description ? `"${course.description.substring(0, 80)}..."` : 'NULL'}`);
        console.log(`   ตำแหน่งแสดง:`);
        console.log(`      - Header: <p id="course-description"> (แสดงข้อความสั้น, ตัด HTML)`);
        console.log(`      - Tab ภาพรวม: <div id="course-full-description"> (แสดงเต็ม, รวม HTML)`);
        console.log(`   รูปแบบ: Rich Text Editor (HTML)`);
        if (course.description) {
            const hasHTML = course.description.includes('<');
            console.log(`   มี HTML tags: ${hasHTML ? 'Yes' : 'No'}`);
        }

        console.log('\n✅ วัตถุประสงค์การเรียนรู้ (Learning Objectives)');
        const objectives = Array.isArray(course.learning_objectives)
            ? course.learning_objectives
            : (course.learning_objectives ? JSON.parse(course.learning_objectives) : []);
        console.log(`   ฟิลด์: learning_objectives (Array)`);
        console.log(`   จำนวน: ${objectives.length} รายการ (ต้องมีอย่างน้อย 3)`);
        console.log(`   ตำแหน่งแสดง: Tab ภาพรวม - <ul id="learning-objectives">`);
        if (objectives.length > 0) {
            objectives.forEach((obj, i) => {
                console.log(`   ${i + 1}. ${obj.substring(0, 70)}${obj.length > 70 ? '...' : ''}`);
            });
        } else {
            console.log(`   ⚠️  WARNING: ไม่มีวัตถุประสงค์!`);
        }

        console.log('\n✅ กลุ่มเป้าหมาย (Target Audience)');
        console.log(`   ตำแหน่งแสดง: Tab ภาพรวม - <div id="target-audience">`);

        if (course.target_audience) {
            const targetAudience = typeof course.target_audience === 'string'
                ? JSON.parse(course.target_audience)
                : course.target_audience;

            console.log(`\n   📌 ตำแหน่งเป้าหมาย (target_positions):`);
            console.log(`      ค่าใน DB: ${JSON.stringify(targetAudience.positions || [])}`);
            console.log(`      ต้องแสดง: ชื่อจาก database (positions table) หรือชื่อเดิมถ้าไม่ match`);
            console.log(`      จำนวน: ${targetAudience.positions?.length || 0} ตำแหน่ง`);

            console.log(`\n   📌 แผนกเป้าหมาย (target_departments):`);
            console.log(`      ค่าใน DB: ${JSON.stringify(targetAudience.departments || [])}`);
            console.log(`      ต้องแสดง: ชื่อจาก database (OrganizationUnits) หรือชื่อเดิมถ้าไม่ match`);
            console.log(`      จำนวน: ${targetAudience.departments?.length || 0} แผนก`);
        } else {
            console.log(`   ⚠️  ไม่มีข้อมูลกลุ่มเป้าหมาย → แสดง "เหมาะสำหรับทุกคน"`);
        }

        console.log('\n✅ ความรู้พื้นฐานที่ต้องมี (Prerequisite Knowledge)');
        console.log(`   ฟิลด์: prerequisite_knowledge`);
        console.log(`   ค่าใน DB: ${course.prerequisite_knowledge ? `"${course.prerequisite_knowledge.substring(0, 80)}..."` : 'NULL'}`);
        console.log(`   ตำแหน่งแสดง: Tab ภาพรวม - <div id="prerequisites">`);
        console.log(`   ไม่บังคับ: ถ้าไม่มี แสดง "ไม่มีความต้องการพื้นฐานพิเศษ"`);

        console.log('\n✅ ระยะเวลาเรียน (Duration)');
        console.log(`   ฟิลด์: duration_hours + duration_minutes`);
        console.log(`   ค่าใน DB: ${course.duration_hours || 0} ชั่วโมง ${course.duration_minutes || 0} นาที`);
        console.log(`   ตำแหน่งแสดง:`);
        console.log(`      - Header: <span id="course-duration">`);
        console.log(`      - Sidebar: <span id="sidebar-duration">`);
        console.log(`   รูปแบบแสดง: "${course.duration_hours || 0} ชั่วโมง"`);

        console.log('\n✅ จำนวนผู้เรียนสูงสุด (Max Enrollments)');
        console.log(`   ฟิลด์: max_enrollments → เก็บใน max_students`);
        console.log(`   ค่าใน DB: ${course.max_students || 'NULL'}`);
        console.log(`   ตำแหน่งแสดง: Sidebar - <span id="sidebar-max-students">`);
        console.log(`   รูปแบบแสดง: ${course.max_students ? `"${course.max_students} คน"` : '"ไม่จำกัด"'}`);

        // ==================== STEP 3: เนื้อหาและสื่อ ====================
        console.log('\n\n📍 STEP 3: เนื้อหาและสื่อการสอน (Content and Media)');
        console.log('─'.repeat(100));

        console.log('\n✅ รูปหน้าปกหลักสูตร (Course Image)');
        console.log(`   ฟิลด์: course_image / thumbnail`);
        console.log(`   ค่าใน DB: ${course.thumbnail || course.course_image || 'NULL'}`);
        console.log(`   ตำแหน่งแสดง: Header - <img id="course-thumbnail">`);
        console.log(`   รูปแบบ: 16:9, ไม่เกิน 2MB`);
        if (!course.thumbnail && !course.course_image) {
            console.log(`   ⚠️  ไม่มีรูป → แสดงรูปเริ่มต้น /images/course-default.jpg`);
        }

        console.log('\n✅ วิดีโอแนะนำหลักสูตร (Intro Video)');
        console.log(`   ฟิลด์: intro_video_url`);
        console.log(`   ค่าใน DB: ${course.intro_video_url || 'NULL'}`);
        console.log(`   ตำแหน่งแสดง: Tab ภาพรวม - <div id="intro-video-section">`);
        console.log(`   รูปแบบ: YouTube/Vimeo embed หรือ video player`);
        if (course.intro_video_url) {
            if (course.intro_video_url.includes('youtube.com') || course.intro_video_url.includes('youtu.be')) {
                console.log(`   ประเภท: YouTube`);
            } else if (course.intro_video_url.includes('vimeo.com')) {
                console.log(`   ประเภท: Vimeo`);
            } else {
                console.log(`   ประเภท: Direct video file`);
            }
        } else {
            console.log(`   ไม่บังคับ: ไม่มีวิดีโอ → ไม่แสดงส่วนนี้`);
        }

        console.log('\n✅ บทเรียน (Lessons)');
        const lessons = Array.isArray(course.lessons)
            ? course.lessons
            : (course.lessons ? JSON.parse(course.lessons) : []);
        console.log(`   ฟิลด์: lessons (Array)`);
        console.log(`   จำนวน: ${lessons.length} บท`);
        console.log(`   ตำแหน่งแสดง: Tab "หลักสูตร" - <div id="course-curriculum">`);
        console.log(`   ⚠️  IMPORTANT: ต้องแสดงทันทีเมื่อโหลดหน้า (ไม่รอ API curriculum)`);

        if (lessons.length > 0) {
            console.log(`\n   รายการบทเรียน:`);
            lessons.forEach((lesson, i) => {
                console.log(`\n   บทที่ ${i + 1}:`);
                console.log(`      ชื่อ: ${lesson.title}`);
                console.log(`      ระยะเวลา: ${lesson.duration_minutes || lesson.duration || 0} นาที`);
                console.log(`      คำอธิบาย: ${lesson.description ? lesson.description.substring(0, 60) + '...' : 'ไม่มี'}`);
                console.log(`      วิดีโอ: ${lesson.video_url || 'ไม่มี'}`);
            });

            console.log(`\n   รูปแบบการแสดง:`);
            console.log(`      - เลขลำดับ (1, 2, 3, ...)`);
            console.log(`      - ชื่อบทเรียน`);
            console.log(`      - คำอธิบาย (ถ้ามี)`);
            console.log(`      - ระยะเวลา พร้อมไอคอน clock`);
            console.log(`      - ไอคอน play ถ้ามีวิดีโอ`);
        } else {
            console.log(`   ⚠️  WARNING: ไม่มีบทเรียน! ต้องมีอย่างน้อย 1 บท`);
        }

        console.log('\n✅ เอกสารประกอบ (Course Materials)');
        console.log(`   ฟิลด์: course_materials`);
        console.log(`   ตำแหน่งแสดง: Tab "เอกสาร" - <div id="course-materials">`);
        console.log(`   รูปแบบ: PDF, PPT, DOC (ไม่เกิน 50MB/ไฟล์)`);
        console.log(`   ไม่บังคับ: ถ้าไม่มี แสดง "ยังไม่มีเอกสารประกอบการเรียน"`);

        console.log('\n✅ ลิงก์ภายนอก (External Links)');
        console.log(`   ฟิลด์: external_links`);
        console.log(`   ไม่บังคับ`);

        // ==================== STEP 4: การประเมินผล ====================
        console.log('\n\n📍 STEP 4: การประเมินผล (Assessment)');
        console.log('─'.repeat(100));

        console.log('\n✅ เกณฑ์การผ่าน (Passing Score)');
        console.log(`   ฟิลด์: passing_score`);
        console.log(`   ค่าใน DB: ${course.passing_score || 'NULL'}%`);
        console.log(`   ตำแหน่งแสดง: Sidebar - <span id="sidebar-passing-score">`);
        console.log(`   รูปแบบแสดง: ${course.passing_score ? `"${course.passing_score}%"` : '"ไม่ระบุ"'}`);

        console.log('\n✅ จำนวนครั้งที่ทำได้ (Max Attempts)');
        console.log(`   ฟิลด์: max_attempts`);
        console.log(`   ค่าใน DB: ${course.max_attempts || 'NULL'}`);
        console.log(`   ตำแหน่งแสดง: Sidebar - <span id="sidebar-max-attempts">`);
        console.log(`   รูปแบบแสดง: ${course.max_attempts ? `"${course.max_attempts} ครั้ง"` : '"ไม่จำกัด"'}`);

        console.log('\n✅ ใบประกาศนียบัตร (Certificate)');
        console.log(`   ฟิลด์: certificate_validity`);
        console.log(`   ค่าใน DB: "${course.certificate_validity || 'NULL'}"`);
        console.log(`   ตำแหน่งแสดง: Sidebar - <span id="sidebar-certificate">`);
        if (course.certificate_validity) {
            console.log(`   รูปแบบแสดง: "มี (${course.certificate_validity})" (สีเขียว, มีไอคอน check)`);
        } else {
            console.log(`   รูปแบบแสดง: "ไม่มี" (สีเทา, มีไอคอน times)`);
        }

        console.log('\n✅ หลักสูตรที่ต้องผ่านก่อน (Prerequisites Courses)');
        console.log(`   ฟิลด์: prerequisites (course IDs)`);
        console.log(`   ไม่แสดงในหน้า detail (ใช้ใน enrollment modal)`);

        console.log('\n✅ การลงทะเบียน (Enrollment Settings)');
        console.log(`   ฟิลด์: enrollment_start, enrollment_end`);
        console.log(`   ค่าใน DB: ${course.enrollment_start || 'NULL'} - ${course.enrollment_end || 'NULL'}`);
        console.log(`   ไม่แสดงโดยตรง (ใช้ตรวจสอบสถานะการลงทะเบียน)`);

        // ==================== ADDITIONAL INFO ====================
        console.log('\n\n📍 ข้อมูลเพิ่มเติมที่แสดง (Additional Display Info)');
        console.log('─'.repeat(100));

        console.log('\n✅ วันที่เผยแพร่ (Published Date)');
        console.log(`   ฟิลด์: created_at`);
        console.log(`   ค่าใน DB: ${course.created_at}`);
        console.log(`   ตำแหน่งแสดง: Sidebar - <span id="publish-date">`);
        console.log(`   รูปแบบ: วันที่ภาษาไทย`);

        console.log('\n✅ อัพเดทล่าสุด (Last Updated)');
        console.log(`   ฟิลด์: updated_at`);
        console.log(`   ค่าใน DB: ${course.updated_at}`);
        console.log(`   ตำแหน่งแสดง: Sidebar - <span id="update-date">`);
        console.log(`   รูปแบบ: วันที่ภาษาไทย`);

        console.log('\n✅ จำนวนผู้เรียน (Enrolled Count)');
        console.log(`   ฟิลด์: enrolled_count`);
        console.log(`   ค่าใน DB: ${course.enrolled_count || 0}`);
        console.log(`   ตำแหน่งแสดง: Header - <span id="enrolled-count">`);
        console.log(`   รูปแบบ: "${course.enrolled_count || 0} คน"`);

        console.log('\n✅ คะแนนรีวิว (Rating)');
        console.log(`   ฟิลด์: rating, rating_count`);
        console.log(`   ค่าใน DB: ${course.rating || 0} (${course.rating_count || 0} รีวิว)`);
        console.log(`   ตำแหน่งแสดง: Header - <div id="rating-display">`);

        // ==================== TABS SUMMARY ====================
        console.log('\n\n📑 สรุปการแสดงผลแต่ละ TAB');
        console.log('='.repeat(100));

        console.log('\n📌 TAB "ภาพรวม" (Overview)');
        console.log('   ต้องแสดง:');
        console.log('   1. วิดีโอแนะนำหลักสูตร (ถ้ามี)');
        console.log('   2. เกี่ยวกับคอร์สนี้ (คำอธิบายเต็ม HTML)');
        console.log('   3. วัตถุประสงค์การเรียนรู้ (รายการ)');
        console.log('   4. กลุ่มเป้าหมาย (ตำแหน่ง + แผนก จาก database)');
        console.log('   5. ความต้องการพื้นฐาน');

        console.log('\n📌 TAB "หลักสูตร" (Curriculum)');
        console.log('   ต้องแสดง:');
        console.log('   1. บทเรียนทั้งหมด (แสดงทันทีจาก courseData.lessons)');
        console.log('   2. แต่ละบท: เลขที่, ชื่อ, คำอธิบาย, ระยะเวลา, ไอคอนวิดีโอ');
        console.log(`   สถานะ: ${lessons.length > 0 ? `✅ มี ${lessons.length} บท` : '❌ ไม่มีบทเรียน'}`);

        console.log('\n📌 TAB "เอกสาร" (Materials)');
        console.log('   ต้องแสดง:');
        console.log('   1. เอกสารประกอบการเรียน (ถ้ามี)');
        console.log('   2. ถ้าไม่มี: "ยังไม่มีเอกสารประกอบการเรียน"');

        console.log('\n📌 TAB "การอภิปราย" (Discussions)');
        console.log('   แสดงการอภิปราย (ถ้ามี)');

        console.log('\n📌 TAB "รีวิว" (Reviews)');
        console.log('   แสดงรีวิว (ถ้ามี)');

        // ==================== CRITICAL CHECKS ====================
        console.log('\n\n⚠️  การตรวจสอบสำคัญ (CRITICAL CHECKS)');
        console.log('='.repeat(100));

        const criticalChecks = [];

        // Check 1: ภาษา
        if (course.language) {
            const langMap = { 'th': 'ภาษาไทย', 'en': 'ภาษาอังกฤษ', 'th-en': 'ไทย-อังกฤษ' };
            if (langMap[course.language]) {
                criticalChecks.push({ status: '✅', message: `ภาษา: "${course.language}" → ต้องแสดง "${langMap[course.language]}"` });
            } else {
                criticalChecks.push({ status: '⚠️ ', message: `ภาษา: "${course.language}" ไม่อยู่ใน mapping!` });
            }
        }

        // Check 2: ประเภทหลักสูตร
        if (course.course_type) {
            const typeMap = { 'mandatory': 'บังคับ', 'elective': 'เลือก', 'recommended': 'แนะนำ' };
            if (typeMap[course.course_type]) {
                criticalChecks.push({ status: '✅', message: `ประเภท: "${course.course_type}" → ต้องแสดง "${typeMap[course.course_type]}"` });
            } else {
                criticalChecks.push({ status: '⚠️ ', message: `ประเภท: "${course.course_type}" ไม่อยู่ใน mapping!` });
            }
        }

        // Check 3: ระดับความยาก
        if (course.difficulty_level) {
            const diffMap = { 'beginner': 'เริ่มต้น', 'intermediate': 'ปานกลาง', 'advanced': 'ขั้นสูง' };
            const normalized = course.difficulty_level.toLowerCase();
            if (diffMap[normalized]) {
                criticalChecks.push({ status: '✅', message: `ระดับ: "${course.difficulty_level}" → ต้องแสดง "${diffMap[normalized]}"` });
            } else {
                criticalChecks.push({ status: '⚠️ ', message: `ระดับ: "${course.difficulty_level}" ไม่อยู่ใน mapping!` });
            }
        }

        // Check 4: รหัสหลักสูตร
        if (course.course_code) {
            criticalChecks.push({ status: '✅', message: `รหัสหลักสูตร: แสดงใต้ชื่อหลักสูตร "รหัสหลักสูตร: ${course.course_code}"` });
        } else {
            criticalChecks.push({ status: '❌', message: 'รหัสหลักสูตร: ไม่มีข้อมูล!' });
        }

        // Check 5: บทเรียน
        if (lessons.length > 0) {
            criticalChecks.push({ status: '✅', message: `บทเรียน: ต้องแสดงทันที ${lessons.length} บท ใน Tab "หลักสูตร"` });
        } else {
            criticalChecks.push({ status: '❌', message: 'บทเรียน: ไม่มีบทเรียน!' });
        }

        // Check 6: กลุ่มเป้าหมาย
        if (course.target_audience) {
            const ta = typeof course.target_audience === 'string' ? JSON.parse(course.target_audience) : course.target_audience;
            criticalChecks.push({ status: '✅', message: `กลุ่มเป้าหมาย: แสดงชื่อจาก database (positions & OrganizationUnits)` });
        } else {
            criticalChecks.push({ status: '⚠️ ', message: 'กลุ่มเป้าหมาย: ไม่มีข้อมูล → แสดง "เหมาะสำหรับทุกคน"' });
        }

        // Check 7: ไม่มีฟิลด์ราคา
        criticalChecks.push({ status: '✅', message: 'ราคา: ไม่แสดง (ระบบไม่ใช้ฟิลด์ราคา)' });

        criticalChecks.forEach(check => {
            console.log(`${check.status} ${check.message}`);
        });

        console.log('\n' + '='.repeat(100));
        console.log('🎯 สรุป');
        console.log('='.repeat(100));
        console.log('\nกรุณาเปิด Developer Tools (F12) และตรวจสอบ:\n');
        console.log('1. Console: ดู mapping ที่โหลดมา');
        console.log('   - พิมพ์: positionsMapping');
        console.log('   - พิมพ์: departmentsMapping');
        console.log('   - พิมพ์: courseData.lessons\n');
        console.log('2. Network: ตรวจสอบ API calls');
        console.log('   - GET /courses/api/target-positions');
        console.log('   - GET /courses/api/target-departments');
        console.log('   - GET /courses/api/2\n');
        console.log('3. Elements: ตรวจสอบ HTML elements ตาม ID ข้างต้น\n');
        console.log('='.repeat(100));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

analyzeDetailVsForm();
