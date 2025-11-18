const { poolPromise, sql } = require('./config/database');
const Course = require('./models/Course');

async function testCompleteFlow() {
    try {
        console.log('🧪 Testing Complete Course Creation → Display Flow\n');
        console.log('='.repeat(80));

        const pool = await poolPromise;

        // Clean previous test data
        console.log('\n🧹 Step 1: Cleaning test data...');
        await pool.request().query(`DELETE FROM courses WHERE course_code LIKE 'TEST-%'`);
        console.log('✅ Test data cleaned\n');

        // Create a complete course with ALL fields (simulating form submission)
        console.log('📝 Step 2: Creating test course with complete data...');

        const courseData = {
            // Step 1: Basic Info
            course_code: 'TEST-2025-FULL',
            course_name: 'หลักสูตรทดสอบแบบครบถ้วน',
            category_id: 1,
            category: 'การพัฒนาซอฟต์แวร์',
            difficulty_level: 'Intermediate',
            course_type: 'Online',
            language: 'th',
            description: '<p>นี่คือคำอธิบายหลักสูตรที่มีเนื้อหาครบถ้วนสมบูรณ์</p>',

            // Step 2: Details
            instructor_name: 'ดร.ทดสอบ สมบูรณ์',
            duration_hours: 40,
            duration_minutes: 30,
            price: 3500,
            is_free: false,
            max_enrollments: 100, // This should populate both enrollment_limit AND max_students

            // Step 3: Learning Content
            learning_objectives: [
                'เข้าใจหลักการพื้นฐานของการพัฒนาซอฟต์แวร์อย่างถ่องแท้',
                'สามารถเขียนโปรแกรมได้อย่างมีประสิทธิภาพและถูกต้อง',
                'สามารถทำงานเป็นทีมและสื่อสารได้ดี',
                'มีความรู้ในการออกแบบระบบ'
            ],
            target_positions: ['developer', 'engineer', 'architect'],
            target_departments: ['IT', 'Development', 'Technology'],
            prerequisite_knowledge: 'มีพื้นฐานการเขียนโปรแกรมและเข้าใจ OOP',
            lessons: [
                {
                    title: 'บทที่ 1: บทนำสู่การพัฒนาซอฟต์แวร์',
                    description: 'เรียนรู้พื้นฐานของการพัฒนาซอฟต์แวร์',
                    duration: 45
                },
                {
                    title: 'บทที่ 2: หลักการเขียนโปรแกรม',
                    description: 'ฝึกปฏิบัติการเขียนโปรแกรมพื้นฐาน',
                    duration: 90
                },
                {
                    title: 'บทที่ 3: การออกแบบระบบ',
                    description: 'เรียนรู้การออกแบบสถาปัตยกรรมระบบ',
                    duration: 120
                },
                {
                    title: 'บทที่ 4: โปรเจกต์จริง',
                    description: 'ทำโปรเจกต์จริงเพื่อฝึกปฏิบัติ',
                    duration: 180
                }
            ],

            // Step 4: Assessment (simulating form data)
            passing_score: 75, // Added via course-wizard.js fix
            max_attempts: 5, // Added via course-wizard.js fix

            // Step 5: Settings
            status: 'Published',
            is_published: true,
            certificate_validity: '1 ปี',
            intro_video_url: 'https://example.com/intro.mp4',
            show_correct_answers: true
        };

        console.log('\n📊 Input Course Data:');
        console.log(JSON.stringify(courseData, null, 2));

        // Create the course
        const createResult = await Course.create(courseData);

        if (!createResult.success) {
            console.error('❌ Failed to create course:', createResult.message);
            process.exit(1);
        }

        const courseId = createResult.data.course_id;
        console.log(`\n✅ Course created with ID: ${courseId}\n`);

        // Retrieve the course using Course.findById (same as API)
        console.log('🔍 Step 3: Retrieving course via API...');
        const retrievedCourse = await Course.findById(courseId);

        if (!retrievedCourse) {
            console.error('❌ Failed to retrieve course');
            process.exit(1);
        }

        console.log('✅ Course retrieved successfully\n');

        // Compare input vs retrieved
        console.log('='.repeat(80));
        console.log('📋 COMPARISON: Input vs Retrieved Data');
        console.log('='.repeat(80));
        console.log('');

        const comparisons = [
            { field: 'course_code', input: courseData.course_code, retrieved: retrievedCourse.course_code },
            { field: 'title', input: courseData.course_name, retrieved: retrievedCourse.title },
            { field: 'description', input: courseData.description, retrieved: retrievedCourse.description },
            { field: 'category', input: courseData.category, retrieved: retrievedCourse.category },
            { field: 'difficulty_level', input: courseData.difficulty_level, retrieved: retrievedCourse.difficulty_level },
            { field: 'course_type', input: courseData.course_type, retrieved: retrievedCourse.course_type },
            { field: 'language', input: courseData.language, retrieved: retrievedCourse.language },
            { field: 'instructor_name', input: courseData.instructor_name, retrieved: retrievedCourse.instructor_name },
            { field: 'duration_hours', input: Math.ceil((courseData.duration_hours || 0) + (courseData.duration_minutes || 0) / 60), retrieved: retrievedCourse.duration_hours },
            { field: 'price', input: parseFloat(courseData.price), retrieved: parseFloat(retrievedCourse.price) },
            { field: 'max_students', input: courseData.max_enrollments, retrieved: retrievedCourse.max_students },
            { field: 'enrollment_limit', input: courseData.max_enrollments, retrieved: retrievedCourse.enrollment_limit },
            { field: 'passing_score', input: courseData.passing_score, retrieved: retrievedCourse.passing_score },
            { field: 'max_attempts', input: courseData.max_attempts, retrieved: retrievedCourse.max_attempts },
            { field: 'prerequisite_knowledge', input: courseData.prerequisite_knowledge, retrieved: retrievedCourse.prerequisite_knowledge },
            { field: 'prerequisites_text', input: courseData.prerequisite_knowledge, retrieved: retrievedCourse.prerequisites_text },
            { field: 'is_published', input: courseData.is_published ? 1 : 0, retrieved: retrievedCourse.is_published },
            { field: 'certificate_validity', input: courseData.certificate_validity, retrieved: retrievedCourse.certificate_validity },
            { field: 'intro_video_url', input: courseData.intro_video_url, retrieved: retrievedCourse.intro_video_url },
            { field: 'show_correct_answers', input: courseData.show_correct_answers ? 1 : 0, retrieved: retrievedCourse.show_correct_answers }
        ];

        let allMatch = true;
        comparisons.forEach(comp => {
            const match = comp.input == comp.retrieved;
            const icon = match ? '✅' : '❌';
            if (!match) allMatch = false;
            console.log(`${icon} ${comp.field.padEnd(30)}: ${String(comp.input).substring(0, 40).padEnd(42)} ${match ? '==' : '!='} ${String(comp.retrieved).substring(0, 40)}`);
        });

        // Check learning objectives
        console.log('\n📋 Learning Objectives:');
        console.log('   Input type:', typeof courseData.learning_objectives, '- isArray:', Array.isArray(courseData.learning_objectives));
        console.log('   Retrieved type:', typeof retrievedCourse.learning_objectives, '- isArray:', Array.isArray(retrievedCourse.learning_objectives));

        if (Array.isArray(retrievedCourse.learning_objectives)) {
            const objectivesMatch = courseData.learning_objectives.length === retrievedCourse.learning_objectives.length;
            const icon = objectivesMatch ? '✅' : '❌';
            console.log(`   ${icon} Count: ${courseData.learning_objectives.length} == ${retrievedCourse.learning_objectives.length}`);

            retrievedCourse.learning_objectives.forEach((obj, i) => {
                const matches = obj === courseData.learning_objectives[i];
                const objIcon = matches ? '✅' : '❌';
                console.log(`   ${objIcon} ${i + 1}. ${obj}`);
            });
        } else {
            console.log('   ❌ Retrieved learning_objectives is not an array!');
            allMatch = false;
        }

        // Check target audience
        console.log('\n👥 Target Audience:');
        console.log('   Input type:', typeof courseData.target_positions);
        console.log('   Retrieved type:', typeof retrievedCourse.target_audience);

        if (typeof retrievedCourse.target_audience === 'object') {
            console.log('   ✅ Is object');
            if (retrievedCourse.target_audience.positions) {
                console.log(`   ✅ Positions: ${retrievedCourse.target_audience.positions.join(', ')}`);
            }
            if (retrievedCourse.target_audience.departments) {
                console.log(`   ✅ Departments: ${retrievedCourse.target_audience.departments.join(', ')}`);
            }
        } else {
            console.log('   ❌ Retrieved target_audience is not an object!');
            allMatch = false;
        }

        // Check lessons
        console.log('\n📚 Lessons:');
        console.log(`   Input count: ${courseData.lessons.length}`);
        console.log(`   Retrieved count: ${retrievedCourse.lessons ? retrievedCourse.lessons.length : 0}`);

        if (retrievedCourse.lessons && retrievedCourse.lessons.length === courseData.lessons.length) {
            console.log('   ✅ Lesson count matches');
            retrievedCourse.lessons.forEach((lesson, i) => {
                const matches = lesson.title === courseData.lessons[i].title;
                const icon = matches ? '✅' : '❌';
                console.log(`   ${icon} ${i + 1}. ${lesson.title} (${lesson.duration_minutes || 0} min)`);
            });
        } else {
            console.log('   ❌ Lesson count does not match!');
            allMatch = false;
        }

        console.log('\n' + '='.repeat(80));
        if (allMatch) {
            console.log('🎉 SUCCESS: All data matches perfectly!');
            console.log('✅ Course creation and display are working correctly!');
        } else {
            console.log('⚠️  WARNING: Some data does not match!');
            console.log('❌ There are issues with data persistence or retrieval.');
        }
        console.log('='.repeat(80));

        console.log('\n📄 Full Retrieved Course Object (for debugging):');
        console.log(JSON.stringify(retrievedCourse, null, 2));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testCompleteFlow();
