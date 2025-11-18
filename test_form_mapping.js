const { poolPromise, sql } = require('./config/database');
const Course = require('./models/Course');

async function testFormMapping() {
    try {
        console.log('🔍 FORM FIELD MAPPING TEST\n');
        console.log('='.repeat(90));
        console.log('Testing: Form Input → Database → Display Output\n');

        const pool = await poolPromise;

        // Simulate EXACT form data as user would submit
        const formData = {
            // Step 1: ข้อมูลพื้นฐาน
            course_code: 'TEST-FORM-001',
            course_name: 'ทดสอบ Form Mapping',
            category_id: 1,
            category: 'IT',
            difficulty_level: 'Intermediate',  // ← Form sends "Intermediate" (capital I)
            course_type: 'Online',              // ← Form sends "Online" (capital O)
            language: 'th',                     // ← Form sends 'th'
            description: '<p>คำอธิบายทดสอบ</p>',

            // Step 2: รายละเอียด
            instructor_name: 'อาจารย์ทดสอบ',
            duration_hours: 10,
            duration_minutes: 30,
            price: 1500,
            is_free: false,
            max_enrollments: 50,

            // Step 3: เนื้อหา
            learning_objectives: ['วัตถุประสงค์ 1', 'วัตถุประสงค์ 2'],
            target_positions: ['developer'],
            target_departments: ['IT'],
            prerequisite_knowledge: 'ไม่มี',
            lessons: [
                { title: 'บทที่ 1', description: 'รายละเอียด', duration: 60 }
            ],

            // Step 4: การประเมิน
            passing_score: 70,
            max_attempts: 3,

            // Step 5: การตั้งค่า
            status: 'Published',
            is_published: true,
            certificate_validity: '1 ปี'
        };

        console.log('📝 STEP 1: Form Data (What user submits)');
        console.log('─'.repeat(90));
        console.log(`   course_name: "${formData.course_name}"`);
        console.log(`   difficulty_level: "${formData.difficulty_level}" ← Form value`);
        console.log(`   course_type: "${formData.course_type}" ← Form value`);
        console.log(`   language: "${formData.language}"`);
        console.log(`   instructor_name: "${formData.instructor_name}"`);
        console.log(`   duration: ${formData.duration_hours}h ${formData.duration_minutes}m`);
        console.log(`   price: ${formData.price}`);
        console.log(`   max_enrollments: ${formData.max_enrollments}`);
        console.log(`   passing_score: ${formData.passing_score}`);
        console.log(`   max_attempts: ${formData.max_attempts}`);
        console.log('');

        // Create course
        console.log('💾 STEP 2: Saving to Database...');
        const result = await Course.create(formData);

        if (!result.success) {
            console.error('❌ Failed to create course:', result.message);
            process.exit(1);
        }

        const courseId = result.data.course_id;
        console.log(`✅ Saved with ID: ${courseId}\n`);

        // Retrieve course
        console.log('🔄 STEP 3: Reading from Database...');
        const retrieved = await Course.findById(courseId);

        if (!retrieved) {
            console.error('❌ Failed to retrieve course');
            process.exit(1);
        }
        console.log('✅ Retrieved successfully\n');

        // Simulate API response (what browser receives)
        const apiResponse = {
            ...retrieved,
            enrollment_status: null,
            progress_percentage: 0,
            is_enrolled: false
        };

        // Compare
        console.log('📊 STEP 4: Field-by-Field Comparison');
        console.log('='.repeat(90));
        console.log('Field Name                Form Input → DB Value → Display Output       Match?');
        console.log('─'.repeat(90));

        const comparisons = [
            {
                field: 'Title',
                form: formData.course_name,
                db: retrieved.title,
                display: apiResponse.title || apiResponse.course_name
            },
            {
                field: 'Difficulty Level',
                form: formData.difficulty_level,
                db: retrieved.difficulty_level,
                display: retrieved.difficulty_level,
                displayText: `getDifficultyText("${retrieved.difficulty_level}")`
            },
            {
                field: 'Course Type',
                form: formData.course_type,
                db: retrieved.course_type,
                display: retrieved.course_type
            },
            {
                field: 'Language',
                form: formData.language,
                db: retrieved.language,
                display: retrieved.language
            },
            {
                field: 'Instructor',
                form: formData.instructor_name,
                db: retrieved.instructor_name,
                display: apiResponse.instructor_name
            },
            {
                field: 'Duration (hours)',
                form: Math.ceil(formData.duration_hours + (formData.duration_minutes / 60)),
                db: retrieved.duration_hours,
                display: apiResponse.duration_hours
            },
            {
                field: 'Price',
                form: formData.price,
                db: parseFloat(retrieved.price),
                display: parseFloat(apiResponse.price)
            },
            {
                field: 'Max Students',
                form: formData.max_enrollments,
                db: retrieved.max_students,
                display: apiResponse.max_students
            },
            {
                field: 'Passing Score',
                form: formData.passing_score,
                db: retrieved.passing_score,
                display: apiResponse.passing_score
            },
            {
                field: 'Max Attempts',
                form: formData.max_attempts,
                db: retrieved.max_attempts,
                display: apiResponse.max_attempts
            }
        ];

        let allMatch = true;
        comparisons.forEach(comp => {
            const formToDb = comp.form == comp.db;
            const dbToDisplay = comp.db == comp.display;
            const match = formToDb && dbToDisplay;

            const icon = match ? '✅' : '❌';
            const formStr = String(comp.form).substring(0, 20);
            const dbStr = String(comp.db).substring(0, 20);
            const displayStr = String(comp.display).substring(0, 20);

            console.log(`${icon} ${comp.field.padEnd(20)} ${formStr.padEnd(12)} → ${dbStr.padEnd(12)} → ${displayStr.padEnd(12)}`);

            if (comp.displayText) {
                console.log(`   Display function: ${comp.displayText}`);
            }

            if (!match) {
                allMatch = false;
                if (!formToDb) console.log(`   ⚠️  Form→DB mismatch!`);
                if (!dbToDisplay) console.log(`   ⚠️  DB→Display mismatch!`);
            }
        });

        console.log('');
        console.log('='.repeat(90));
        console.log('🎨 DISPLAY SIMULATION');
        console.log('='.repeat(90));
        console.log('');
        console.log('What user sees in "ข้อมูลคอร์ส" sidebar:');
        console.log('');

        // Simulate getDifficultyText
        const getDifficultyText = (level) => {
            if (!level) return 'ไม่ระบุ';
            const texts = {
                'beginner': 'เริ่มต้น',
                'intermediate': 'ปานกลาง',
                'advanced': 'ขั้นสูง'
            };
            const normalizedLevel = level.toLowerCase();
            return texts[normalizedLevel] || level;
        };

        const getCourseTypeText = (type) => {
            const map = { 'Online': 'ออนไลน์', 'Onsite': 'ในสถานที่', 'Hybrid': 'ผสมผสาน' };
            return map[type] || type || 'ไม่ระบุ';
        };

        const getLanguageText = (lang) => {
            const map = { 'th': 'ไทย', 'en': 'English', 'zh': '中文' };
            return map[lang] || lang || 'ไม่ระบุ';
        };

        console.log(`   ระดับความยาก:           ${getDifficultyText(apiResponse.difficulty_level)}`);
        console.log(`   ระยะเวลา:                ${apiResponse.duration_hours || 0} ชั่วโมง`);
        console.log(`   ภาษา:                    ${getLanguageText(apiResponse.language)}`);
        console.log(`   ประเภท:                  ${getCourseTypeText(apiResponse.course_type)}`);
        console.log(`   ราคา:                    ${apiResponse.price ? Number(apiResponse.price).toLocaleString('th-TH') + ' บาท' : 'ฟรี'}`);
        console.log(`   จำนวนผู้เรียนสูงสุด:     ${apiResponse.max_students ? apiResponse.max_students + ' คน' : 'ไม่จำกัด'}`);
        console.log(`   เกณฑ์ผ่าน:               ${apiResponse.passing_score ? apiResponse.passing_score + '%' : 'ไม่ระบุ'}`);
        console.log(`   ทำได้สูงสุด:             ${apiResponse.max_attempts ? apiResponse.max_attempts + ' ครั้ง' : 'ไม่จำกัด'}`);

        console.log('');
        console.log('='.repeat(90));
        if (allMatch) {
            console.log('✅ SUCCESS: All fields mapped correctly from Form → DB → Display!');
        } else {
            console.log('❌ FAILURE: Some fields are not mapping correctly!');
        }
        console.log('='.repeat(90));

        // Cleanup
        await pool.request()
            .input('courseId', sql.Int, courseId)
            .query('DELETE FROM course_materials WHERE course_id = @courseId');
        await pool.request()
            .input('courseId', sql.Int, courseId)
            .query('DELETE FROM courses WHERE course_id = @courseId');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testFormMapping();
