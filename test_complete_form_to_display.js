const { poolPromise, sql } = require('./config/database');
const Course = require('./models/Course');

async function testCompleteFlow() {
    try {
        console.log('🔄 COMPLETE FORM → DATABASE → DISPLAY FLOW TEST\n');
        console.log('='.repeat(100));
        console.log('');

        // ========================================
        // STEP 1: SIMULATE FORM DATA
        // ========================================
        console.log('📝 STEP 1: FORM DATA (what collectFormData() sends)');
        console.log('─'.repeat(100));

        // This simulates EXACTLY what the form sends via collectFormData() + submitCourse()
        const formData = {
            // Basic Info (Step 1)
            course_code: 'FLOWTEST-2025-001',
            course_name: 'หลักสูตรทดสอบ Flow ครบวงจร',  // ← Form sends "course_name"
            category_id: 1,
            difficulty_level: 'Intermediate',  // ← Capital I
            course_type: 'mandatory',          // ← บังคับ (not Online!)
            language: 'th',                    // ← ภาษาไทย
            description: '<p><strong>คำอธิบาย</strong> หลักสูตรทดสอบการไหลของข้อมูล</p>',

            // Details (Step 2)
            instructor_name: 'อาจารย์ทดสอบ สมบูรณ์',
            duration_hours: 20,
            duration_minutes: 30,  // ← Will be added to duration_hours
            max_enrollments: 100,  // ← Will map to BOTH enrollment_limit AND max_students

            // Content (Step 3)
            learning_objectives: [  // ← Already an array from collectFormData()
                'เป้าหมายที่ 1: เข้าใจระบบ',
                'เป้าหมายที่ 2: ใช้งานได้',
                'เป้าหมายที่ 3: แก้ปัญหาได้'
            ],
            target_positions: ['developer', 'engineer'],
            target_departments: ['IT', 'Development'],
            prerequisite_knowledge: 'มีพื้นฐานการใช้คอมพิวเตอร์',
            lessons: [  // ← Already structured from collectFormData()
                {
                    title: 'บทที่ 1: บทนำ',
                    description: 'แนะนำหลักสูตร',
                    duration: 60
                },
                {
                    title: 'บทที่ 2: ทฤษฎี',
                    description: 'เรียนรู้ทฤษฎี',
                    duration: 90
                },
                {
                    title: 'บทที่ 3: ปฏิบัติ',
                    description: 'ฝึกปฏิบัติ',
                    duration: 120
                }
            ],

            // Assessment (Step 4) - Added by submitCourse()
            test_id: null,
            passing_score: 75,    // ← Copied from new_passing_score
            max_attempts: 3,      // ← Copied from new_max_attempts
            show_correct_answers: true,

            // Settings (Step 5)
            status: 'Published',
            is_published: true,
            certificate_validity: '1 ปี',
            intro_video_url: 'https://youtube.com/test'
        };

        console.log('Form Fields Summary:');
        console.log(`  course_name:           "${formData.course_name}"`);
        console.log(`  course_code:           "${formData.course_code}"`);
        console.log(`  difficulty_level:      "${formData.difficulty_level}"`);
        console.log(`  course_type:           "${formData.course_type}"`);
        console.log(`  language:              "${formData.language}"`);
        console.log(`  instructor_name:       "${formData.instructor_name}"`);
        console.log(`  duration_hours:        ${formData.duration_hours}`);
        console.log(`  duration_minutes:      ${formData.duration_minutes}`);
        console.log(`  max_enrollments:       ${formData.max_enrollments}`);
        console.log(`  passing_score:         ${formData.passing_score}`);
        console.log(`  max_attempts:          ${formData.max_attempts}`);
        console.log(`  certificate_validity:  "${formData.certificate_validity}"`);
        console.log(`  learning_objectives:   [${formData.learning_objectives.length} items]`);
        console.log(`  lessons:               [${formData.lessons.length} items]`);
        console.log('');

        // ========================================
        // STEP 2: CREATE VIA Course.create()
        // ========================================
        console.log('='.repeat(100));
        console.log('💾 STEP 2: Course.create() Processing');
        console.log('─'.repeat(100));

        console.log('Field Transformations:');
        console.log(`  course_name              → title                      (field rename)`);
        console.log(`  category_id              → category                   (lookup: 1 → "การพัฒนาซอฟต์แวร์")`);
        console.log(`  duration_hours + minutes → duration_hours             (20 + 0.5 = 20.5 → ceil 21)`);
        console.log(`  max_enrollments          → enrollment_limit           (same value: 100)`);
        console.log(`  max_enrollments          → max_students               (same value: 100)`);
        console.log(`  learning_objectives[]    → learning_objectives JSON   (array → JSON string)`);
        console.log(`  target_positions/depts   → target_audience JSON       (merge → JSON object)`);
        console.log(`  lessons[]                → course_materials table     (separate inserts)`);
        console.log('');

        console.log('Creating course...');
        const createResult = await Course.create(formData);

        if (!createResult.success) {
            console.error('❌ Failed to create:', createResult.message);
            process.exit(1);
        }

        const courseId = createResult.data.course_id;
        console.log(`✅ Course created with ID: ${courseId}`);
        console.log('');

        // ========================================
        // STEP 3: RAW DATABASE VALUES
        // ========================================
        console.log('='.repeat(100));
        console.log('🗄️  STEP 3: RAW DATABASE VALUES');
        console.log('─'.repeat(100));

        const pool = await poolPromise;
        const rawResult = await pool.request()
            .input('courseId', sql.Int, courseId)
            .query(`
                SELECT
                    course_id,
                    course_code,
                    title,
                    category,
                    difficulty_level,
                    course_type,
                    language,
                    instructor_name,
                    duration_hours,
                    price,
                    enrollment_limit,
                    max_students,
                    passing_score,
                    max_attempts,
                    certificate_validity,
                    learning_objectives,
                    target_audience,
                    prerequisite_knowledge
                FROM courses
                WHERE course_id = @courseId
            `);

        const rawData = rawResult.recordset[0];

        console.log('Database Column                Raw Value');
        console.log('─'.repeat(100));
        console.log(`course_code                    "${rawData.course_code}"`);
        console.log(`title                          "${rawData.title}"`);
        console.log(`category                       "${rawData.category}"`);
        console.log(`difficulty_level               "${rawData.difficulty_level}"`);
        console.log(`course_type                    "${rawData.course_type}"`);
        console.log(`language                       "${rawData.language}"`);
        console.log(`instructor_name                "${rawData.instructor_name}"`);
        console.log(`duration_hours                 ${rawData.duration_hours}`);
        console.log(`price                          ${rawData.price}`);
        console.log(`enrollment_limit               ${rawData.enrollment_limit}`);
        console.log(`max_students                   ${rawData.max_students}`);
        console.log(`passing_score                  ${rawData.passing_score}`);
        console.log(`max_attempts                   ${rawData.max_attempts}`);
        console.log(`certificate_validity           "${rawData.certificate_validity}"`);
        console.log(`learning_objectives (JSON)     ${rawData.learning_objectives?.substring(0, 50)}...`);
        console.log(`target_audience (JSON)         ${rawData.target_audience?.substring(0, 50)}...`);

        const materialsResult = await pool.request()
            .input('courseId', sql.Int, courseId)
            .query(`SELECT COUNT(*) as count FROM course_materials WHERE course_id = @courseId`);

        console.log(`course_materials (count)       ${materialsResult.recordset[0].count} rows`);
        console.log('');

        // ========================================
        // STEP 4: Course.findById() RESULT
        // ========================================
        console.log('='.repeat(100));
        console.log('🔍 STEP 4: Course.findById() Processed Data');
        console.log('─'.repeat(100));

        const processedData = await Course.findById(courseId);

        console.log('Field Name                     Processed Value');
        console.log('─'.repeat(100));
        console.log(`title                          "${processedData.title}"`);
        console.log(`course_name (alias)            "${processedData.course_name}"`);
        console.log(`course_code                    "${processedData.course_code}"`);
        console.log(`category                       "${processedData.category}"`);
        console.log(`difficulty_level               "${processedData.difficulty_level}"`);
        console.log(`course_type                    "${processedData.course_type}"`);
        console.log(`language                       "${processedData.language}"`);
        console.log(`instructor_name                "${processedData.instructor_name}"`);
        console.log(`duration_hours                 ${processedData.duration_hours}`);
        console.log(`price                          ${processedData.price}`);
        console.log(`max_students                   ${processedData.max_students}`);
        console.log(`passing_score                  ${processedData.passing_score}`);
        console.log(`max_attempts                   ${processedData.max_attempts}`);
        console.log(`certificate_validity           "${processedData.certificate_validity}"`);
        console.log(`learning_objectives (Array)    [${processedData.learning_objectives?.length} items]`);
        console.log(`target_audience (Object)       {positions: ${processedData.target_audience?.positions?.length}, depts: ${processedData.target_audience?.departments?.length}}`);
        console.log(`lessons (Array)                [${processedData.lessons?.length} items]`);
        console.log('');

        // ========================================
        // STEP 5: DISPLAY VALUES
        // ========================================
        console.log('='.repeat(100));
        console.log('🎨 STEP 5: WHAT SHOULD DISPLAY ON SCREEN');
        console.log('─'.repeat(100));

        const getDifficultyText = (level) => {
            if (!level) return 'ไม่ระบุ';
            const texts = {
                'beginner': 'เริ่มต้น',
                'intermediate': 'ปานกลาง',
                'advanced': 'ขั้นสูง'
            };
            return texts[level.toLowerCase()] || level;
        };

        const getCourseTypeText = (type) => {
            const map = {
                'mandatory': 'บังคับ',
                'elective': 'เลือก',
                'recommended': 'แนะนำ'
            };
            return map[type] || type || 'ไม่ระบุ';
        };

        const getLanguageText = (lang) => {
            const map = {
                'th': 'ภาษาไทย',
                'en': 'ภาษาอังกฤษ',
                'th-en': 'ไทย-อังกฤษ'
            };
            return map[lang] || lang || 'ไม่ระบุ';
        };

        console.log('Display Location               Display Value');
        console.log('─'.repeat(100));
        console.log(`Page Title                     "${processedData.title} - Rukchai Hongyen LearnHub"`);
        console.log(`Course Header                  "${processedData.title}"`);
        console.log(`Difficulty Badge               "${getDifficultyText(processedData.difficulty_level)}"`);
        console.log(`Course Type                    "${getCourseTypeText(processedData.course_type)}"`);
        console.log(`Language                       "${getLanguageText(processedData.language)}"`);
        console.log(`Instructor                     "${processedData.instructor_name}"`);
        console.log(`Duration                       "${processedData.duration_hours} ชั่วโมง"`);
        console.log(`Max Students                   "${processedData.max_students} คน"`);
        console.log(`Passing Score                  "${processedData.passing_score}%"`);
        console.log(`Max Attempts                   "${processedData.max_attempts} ครั้ง"`);
        console.log(`Certificate                    "มี (${processedData.certificate_validity})"`);
        console.log(`Lessons Count                  "${processedData.lessons?.length} บทเรียน"`);
        console.log('');

        // ========================================
        // STEP 6: VERIFICATION
        // ========================================
        console.log('='.repeat(100));
        console.log('✅ VERIFICATION: Form → Database → Display');
        console.log('='.repeat(100));
        console.log('');

        const checks = [
            {
                field: 'Title',
                form: formData.course_name,
                db: rawData.title,
                processed: processedData.title,
                display: processedData.title
            },
            {
                field: 'Difficulty',
                form: formData.difficulty_level,
                db: rawData.difficulty_level,
                processed: processedData.difficulty_level,
                display: getDifficultyText(processedData.difficulty_level)
            },
            {
                field: 'Course Type',
                form: formData.course_type,
                db: rawData.course_type,
                processed: processedData.course_type,
                display: getCourseTypeText(processedData.course_type)
            },
            {
                field: 'Language',
                form: formData.language,
                db: rawData.language,
                processed: processedData.language,
                display: getLanguageText(processedData.language)
            },
            {
                field: 'Instructor',
                form: formData.instructor_name,
                db: rawData.instructor_name,
                processed: processedData.instructor_name,
                display: processedData.instructor_name
            },
            {
                field: 'Duration',
                form: formData.duration_hours + (formData.duration_minutes / 60),
                db: rawData.duration_hours,
                processed: processedData.duration_hours,
                display: processedData.duration_hours
            },
            {
                field: 'Max Students',
                form: formData.max_enrollments,
                db: rawData.max_students,
                processed: processedData.max_students,
                display: processedData.max_students
            },
            {
                field: 'Passing Score',
                form: formData.passing_score,
                db: rawData.passing_score,
                processed: processedData.passing_score,
                display: processedData.passing_score
            },
            {
                field: 'Max Attempts',
                form: formData.max_attempts,
                db: rawData.max_attempts,
                processed: processedData.max_attempts,
                display: processedData.max_attempts
            },
            {
                field: 'Certificate',
                form: formData.certificate_validity,
                db: rawData.certificate_validity,
                processed: processedData.certificate_validity,
                display: processedData.certificate_validity
            },
            {
                field: 'Lessons',
                form: formData.lessons.length,
                db: materialsResult.recordset[0].count,
                processed: processedData.lessons?.length,
                display: processedData.lessons?.length
            }
        ];

        console.log('Field             Form Input    →  DB Value     →  Processed   →  Display      Status');
        console.log('─'.repeat(100));

        let allPass = true;
        checks.forEach(check => {
            // Check if form → db → processed chain matches
            let formMatch = true;
            let dbMatch = true;

            // For duration, form value gets ceil'd
            if (check.field === 'Duration') {
                formMatch = Math.ceil(check.form) == check.db;
            } else {
                formMatch = check.form == check.db;
            }

            dbMatch = check.db == check.processed;

            const match = formMatch && dbMatch;
            const icon = match ? '✅' : '❌';

            const formStr = String(check.form).substring(0, 12).padEnd(12);
            const dbStr = String(check.db).substring(0, 12).padEnd(12);
            const procStr = String(check.processed).substring(0, 12).padEnd(12);
            const dispStr = String(check.display).substring(0, 12).padEnd(12);

            console.log(`${icon} ${check.field.padEnd(14)} ${formStr} ${dbStr} ${procStr} ${dispStr}`);

            if (!match) allPass = false;
        });

        console.log('');
        console.log('='.repeat(100));

        if (allPass) {
            console.log('🎉 SUCCESS! ALL DATA FLOWS CORRECTLY!');
            console.log('');
            console.log('✅ Form data → Database: MATCHED');
            console.log('✅ Database → Course.findById(): MATCHED');
            console.log('✅ Course.findById() → Display: READY');
            console.log('');
            console.log('📊 Field Name Transformations:');
            console.log('   • course_name (form) → title (database) → title/course_name (display)');
            console.log('   • category_id (form) → category (database via lookup)');
            console.log('   • duration_hours + duration_minutes (form) → duration_hours (database, ceil)');
            console.log('   • max_enrollments (form) → enrollment_limit + max_students (database)');
            console.log('   • learning_objectives array (form) → JSON (database) → array (display)');
            console.log('   • target_positions/departments (form) → target_audience JSON (database) → object (display)');
            console.log('   • lessons array (form) → course_materials table (database) → lessons array (display)');
            console.log('');
            console.log('🌐 ตรวจสอบการแสดงผลจริงได้ที่:');
            console.log(`   http://localhost:3000/courses/${courseId}`);
            console.log('');
            console.log('📋 ควรแสดง:');
            console.log(`   • หัวข้อ: "${formData.course_name}"`);
            console.log(`   • ระดับ: "ปานกลาง" (จาก "${formData.difficulty_level}")`);
            console.log(`   • ประเภท: "บังคับ" (จาก "${formData.course_type}")`);
            console.log(`   • ภาษา: "ภาษาไทย" (จาก "${formData.language}")`);
            console.log(`   • ผู้สอน: "${formData.instructor_name}"`);
            console.log(`   • ระยะเวลา: 21 ชั่วโมง (จาก ${formData.duration_hours} + ${formData.duration_minutes} นาที)`);
            console.log(`   • จำนวนผู้เรียน: ${formData.max_enrollments} คน`);
            console.log(`   • เกณฑ์ผ่าน: ${formData.passing_score}%`);
            console.log(`   • จำนวนครั้งที่ทำได้: ${formData.max_attempts} ครั้ง`);
            console.log(`   • ใบประกาศนียบัตร: มี (1 ปี)`);
            console.log(`   • บทเรียน: ${formData.lessons.length} บท`);
            console.log('');
        } else {
            console.log('❌ MISMATCH DETECTED!');
            console.log('');
            console.log('Some fields are not matching. Please review the comparison table above.');
        }

        console.log('='.repeat(100));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testCompleteFlow();
