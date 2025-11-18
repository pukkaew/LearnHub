const Course = require('./models/Course');
const { poolPromise } = require('./config/database');

async function testDetailPage() {
    try {
        await poolPromise;
        console.log('✅ Connected to database\n');

        console.log('='.repeat(60));
        console.log('Testing Detail Page Display for Course 6');
        console.log('='.repeat(60));

        // Get course data (this is what the API returns)
        const course = await Course.findById(6);

        if (!course) {
            console.log('❌ Course 6 not found!');
            process.exit(1);
        }

        console.log('\n📋 COURSE DETAIL PAGE DATA');
        console.log('='.repeat(60));

        // 1. Header Section
        console.log('\n1. HEADER SECTION:');
        console.log(`   Title: ${course.title || '❌ Missing'}`);
        console.log(`   Code: ${course.course_code || '❌ Missing'}`);
        console.log(`   Category: ${course.category || '❌ Missing'}`);
        console.log(`   Difficulty: ${course.difficulty_level || '❌ Missing'}`);
        console.log(`   Instructor: ${course.instructor_name || '❌ Missing'}`);

        // 2. Sidebar Info
        console.log('\n2. SIDEBAR INFO:');
        console.log(`   Language: ${course.language || '❌ Missing'}`);
        const languageDisplay = course.language === 'th' ? 'ไทย' :
                               course.language === 'en' ? 'อังกฤษ' :
                               course.language === 'both' ? 'ไทย-อังกฤษ' : course.language;
        console.log(`   → Display: ${languageDisplay}`);

        console.log(`   Type: ${course.course_type || '❌ Missing'}`);
        const typeDisplay = course.course_type === 'mandatory' ? 'บังคับ' :
                           course.course_type === 'optional' ? 'เลือกเรียน' :
                           course.course_type === 'recommended' ? 'แนะนำ' : course.course_type;
        console.log(`   → Display: ${typeDisplay}`);

        console.log(`   Max Students: ${course.max_students || '❌ Missing'}`);
        console.log(`   Passing Score: ${course.passing_score || '❌ Missing'}%`);
        console.log(`   Max Attempts: ${course.max_attempts || '❌ Missing'}`);
        console.log(`   Certificate Validity: ${course.certificate_validity || '❌ Missing'} days`);
        const certDisplay = course.certificate_validity ?
                           `${course.certificate_validity} วัน (${Math.floor(course.certificate_validity / 365)} ปี)` :
                           'ไม่มีกำหนด';
        console.log(`   → Display: ${certDisplay}`);

        // 3. Overview Tab
        console.log('\n3. OVERVIEW TAB:');
        console.log(`   Description: ${course.description ? course.description.substring(0, 50) + '...' : '❌ Missing'}`);

        console.log('\n   Learning Objectives:');
        if (course.learning_objectives && course.learning_objectives.length > 0) {
            console.log(`   ✅ ${course.learning_objectives.length} objectives`);
            course.learning_objectives.forEach((obj, i) => {
                console.log(`      ${i + 1}. ${obj}`);
            });
        } else {
            console.log('   ❌ No learning objectives');
        }

        console.log('\n   Target Audience:');
        if (course.target_audience &&
            (course.target_audience.positions || course.target_audience.departments)) {
            console.log('   ✅ Found target audience');
            console.log(`   Raw data:`, course.target_audience);

            // Simulate mapping (we need to fetch positions and departments names)
            const pool = await poolPromise;

            if (course.target_audience.positions && course.target_audience.positions.length > 0) {
                console.log('\n   Positions:');
                for (const posId of course.target_audience.positions) {
                    const result = await pool.request()
                        .query(`SELECT position_name FROM Positions WHERE position_id = ${posId}`);
                    if (result.recordset.length > 0) {
                        console.log(`      - ${result.recordset[0].position_name} (ID: ${posId})`);
                    } else {
                        console.log(`      - ❌ Position ID ${posId} not found`);
                    }
                }
            }

            if (course.target_audience.departments && course.target_audience.departments.length > 0) {
                console.log('\n   Departments:');
                for (const deptId of course.target_audience.departments) {
                    const result = await pool.request()
                        .query(`SELECT unit_name_th FROM OrganizationUnits WHERE unit_id = ${deptId}`);
                    if (result.recordset.length > 0) {
                        console.log(`      - ${result.recordset[0].unit_name_th} (ID: ${deptId})`);
                    } else {
                        console.log(`      - ❌ Department ID ${deptId} not found`);
                    }
                }
            }
        } else {
            console.log('   ❌ No target audience → Will show "เหมาะสำหรับทุกคน"');
        }

        // 4. Curriculum Tab
        console.log('\n4. CURRICULUM TAB:');
        if (course.lessons && course.lessons.length > 0) {
            console.log(`   ✅ ${course.lessons.length} lessons\n`);
            course.lessons.forEach((lesson, i) => {
                console.log(`   Lesson ${i + 1}: ${lesson.title}`);
                console.log(`      Duration: ${lesson.duration_minutes || 0} minutes`);
                console.log(`      Description: ${lesson.content ? lesson.content.substring(0, 40) + '...' : 'None'}`);
                console.log(`      Video URL: ${lesson.video_url || '❌ No video'}`);

                if (lesson.video_url) {
                    const isYouTube = lesson.video_url.includes('youtube.com') ||
                                     lesson.video_url.includes('youtu.be');
                    console.log(`      → YouTube link: ${isYouTube ? '✅ Yes' : '❌ No'}`);
                    console.log(`      → Will show: "ดูวิดีโอ" link + URL display`);
                }
                console.log('');
            });
        } else {
            console.log('   ❌ No lessons → Will show "ยังไม่มีบทเรียนที่กำหนด"');
        }

        // 5. Summary
        console.log('='.repeat(60));
        console.log('DISPLAY CHECK SUMMARY');
        console.log('='.repeat(60));

        const checks = {
            'Basic Info (title, code, category)': !!(course.title && course.course_code && course.category),
            'Language (translated)': !!course.language,
            'Course Type (translated)': !!course.course_type,
            'Max Students': !!course.max_students,
            'Passing Score': !!course.passing_score,
            'Max Attempts': !!course.max_attempts,
            'Certificate Validity': !!course.certificate_validity,
            'Learning Objectives': course.learning_objectives && course.learning_objectives.length > 0,
            'Target Audience (positions/departments)': course.target_audience &&
                (course.target_audience.positions?.length > 0 || course.target_audience.departments?.length > 0),
            'Lessons with Videos': course.lessons && course.lessons.length > 0 &&
                course.lessons.some(l => l.video_url)
        };

        console.log('');
        Object.entries(checks).forEach(([item, status]) => {
            console.log(`${status ? '✅' : '❌'} ${item}`);
        });

        const passed = Object.values(checks).filter(Boolean).length;
        const total = Object.keys(checks).length;

        console.log(`\n📊 Result: ${passed}/${total} checks passed`);

        if (passed === total) {
            console.log('\n🎉 Course 6 detail page should display correctly!');
            console.log('\n👉 Open http://localhost:3000/courses/6 to verify');
        } else {
            console.log('\n⚠️  Some data is missing, detail page may have empty sections');
        }

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testDetailPage();
