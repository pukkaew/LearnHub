const { poolPromise } = require('./config/database');
const Course = require('./models/Course');

async function testCreateCourse() {
    try {
        await poolPromise;
        console.log('✅ Connected to database\n');

        // Prepare complete course data with all fields
        const courseData = {
            title: 'หลักสูตรทดสอบระบบ - Complete Test with Valid IDs',
            course_code: 'CRS-TEST-FINAL',
            description: 'นี่คือหลักสูตรทดสอบที่มีข้อมูลครบถ้วนทุกฟิลด์ เพื่อตรวจสอบว่าระบบบันทึกข้อมูลได้ถูกต้องหรือไม่ รวมถึงการแสดงผลบนหน้า detail page',
            category_id: 1,
            difficulty_level: 'beginner',
            instructor_id: 17, // System Administrator

            // Fields ที่มักจะเป็น NULL
            course_type: 'mandatory',
            language: 'th',
            max_students: 50,
            passing_score: 75,
            max_attempts: 3,
            certificate_validity: '365', // 1 year in days

            // Learning objectives
            learning_objectives: [
                'เข้าใจหลักการทำงานของระบบ',
                'สามารถสร้างและจัดการหลักสูตรได้',
                'เข้าใจการแสดงผลข้อมูลบนหน้า detail'
            ],

            // Target audience with positions and departments
            // Note: Course.create() expects these as separate fields, not nested in target_audience
            target_positions: [28], // IT Manager (only available position)
            target_departments: [1, 41, 48],  // Company HQ, Head Office, IT Dept

            // Lessons with YouTube video URLs
            lessons: [
                {
                    title: 'บทที่ 1: บทนำ',
                    duration: 30,
                    description: 'แนะนำหลักสูตรและเนื้อหาที่จะเรียน',
                    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                },
                {
                    title: 'บทที่ 2: เนื้อหาหลัก',
                    duration: 45,
                    description: 'เนื้อหาหลักของบทเรียน',
                    video_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0'
                },
                {
                    title: 'บทที่ 3: สรุป',
                    duration: 20,
                    description: 'สรุปเนื้อหาที่เรียนมา',
                    video_url: 'https://youtu.be/jNQXAC9IVRw'
                }
            ],

            status: 'published'
        };

        console.log('='.repeat(60));
        console.log('Creating Course with Complete Data');
        console.log('='.repeat(60));
        console.log('\nCourse Data:');
        console.log('  Title:', courseData.title);
        console.log('  Code:', courseData.course_code);
        console.log('  Type:', courseData.course_type);
        console.log('  Language:', courseData.language);
        console.log('  Max Students:', courseData.max_students);
        console.log('  Passing Score:', courseData.passing_score);
        console.log('  Max Attempts:', courseData.max_attempts);
        console.log('  Certificate Validity:', courseData.certificate_validity);
        console.log('\nLearning Objectives:', courseData.learning_objectives.length, 'items');
        courseData.learning_objectives.forEach((obj, i) => {
            console.log(`  ${i + 1}. ${obj}`);
        });
        console.log('\nTarget Audience:');
        console.log('  Positions:', courseData.target_positions);
        console.log('  Departments:', courseData.target_departments);
        console.log('\nLessons:', courseData.lessons.length, 'lessons');
        courseData.lessons.forEach((lesson, i) => {
            console.log(`  ${i + 1}. ${lesson.title} (${lesson.duration} min)`);
            console.log(`     Video: ${lesson.video_url}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('Calling Course.create()...');
        console.log('='.repeat(60));

        const createResult = await Course.create(courseData);

        if (!createResult.success) {
            console.log('\n❌ Failed to create course:', createResult.message);
            process.exit(1);
        }

        const newCourseId = createResult.data.course_id;

        console.log('\n✅ Course created successfully!');
        console.log(`   Course ID: ${newCourseId}`);

        // Now verify the data was saved correctly
        console.log('\n' + '='.repeat(60));
        console.log('Verifying Saved Data');
        console.log('='.repeat(60));

        const savedCourse = await Course.findById(newCourseId);

        console.log('\n1. Basic Fields:');
        console.log(`   course_code: ${savedCourse.course_code || 'NULL ❌'}`);
        console.log(`   course_type: ${savedCourse.course_type || 'NULL ❌'}`);
        console.log(`   language: ${savedCourse.language || 'NULL ❌'}`);
        console.log(`   max_students: ${savedCourse.max_students || 'NULL ❌'}`);
        console.log(`   passing_score: ${savedCourse.passing_score || 'NULL ❌'}`);
        console.log(`   max_attempts: ${savedCourse.max_attempts || 'NULL ❌'}`);
        console.log(`   certificate_validity: ${savedCourse.certificate_validity || 'NULL ❌'}`);

        console.log('\n2. Learning Objectives:');
        if (savedCourse.learning_objectives && savedCourse.learning_objectives.length > 0) {
            console.log(`   ✅ Found ${savedCourse.learning_objectives.length} objectives`);
            savedCourse.learning_objectives.forEach((obj, i) => {
                console.log(`   ${i + 1}. ${obj}`);
            });
        } else {
            console.log('   ❌ NULL or empty');
        }

        console.log('\n3. Target Audience:');
        if (savedCourse.target_audience &&
            (savedCourse.target_audience.positions || savedCourse.target_audience.departments)) {
            console.log('   ✅ Found target audience data');
            console.log('   Positions:', savedCourse.target_audience.positions);
            console.log('   Departments:', savedCourse.target_audience.departments);
        } else {
            console.log('   ❌ NULL or empty');
        }

        console.log('\n4. Lessons with Video URLs:');
        if (savedCourse.lessons && savedCourse.lessons.length > 0) {
            console.log(`   ✅ Found ${savedCourse.lessons.length} lessons`);
            savedCourse.lessons.forEach((lesson, i) => {
                console.log(`\n   Lesson ${i + 1}: ${lesson.title}`);
                console.log(`   Duration: ${lesson.duration_minutes} min`);
                console.log(`   video_url: ${lesson.video_url || 'NULL ❌'}`);
                console.log(`   file_path: ${lesson.file_path || 'NULL ❌'}`);
            });
        } else {
            console.log('   ❌ No lessons found');
        }

        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));

        const checks = {
            'course_code': savedCourse.course_code,
            'course_type': savedCourse.course_type,
            'language': savedCourse.language,
            'max_students': savedCourse.max_students,
            'passing_score': savedCourse.passing_score,
            'max_attempts': savedCourse.max_attempts,
            'certificate_validity': savedCourse.certificate_validity,
            'learning_objectives': savedCourse.learning_objectives && savedCourse.learning_objectives.length > 0,
            'target_audience': savedCourse.target_audience &&
                              (savedCourse.target_audience.positions || savedCourse.target_audience.departments),
            'lessons_with_videos': savedCourse.lessons && savedCourse.lessons.length > 0 &&
                                  savedCourse.lessons.some(l => l.video_url)
        };

        const passed = Object.values(checks).filter(Boolean).length;
        const total = Object.keys(checks).length;

        console.log(`\nTest Results: ${passed}/${total} checks passed\n`);
        Object.entries(checks).forEach(([field, value]) => {
            console.log(`  ${value ? '✅' : '❌'} ${field}`);
        });

        if (passed === total) {
            console.log('\n🎉 ALL TESTS PASSED! System is working correctly!');
            console.log(`\nYou can view the course at: http://localhost:3000/courses/${newCourseId}`);
        } else {
            console.log('\n❌ Some tests failed. Need to investigate and fix.');
        }

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testCreateCourse();
