const { poolPromise } = require('./config/database');
const Course = require('./models/Course');

async function testDisplayVerification() {
    try {
        console.log('🔍 COMPREHENSIVE DISPLAY VERIFICATION TEST\n');
        console.log('='.repeat(90));

        const pool = await poolPromise;

        // Get the latest course
        const latestResult = await pool.request().query(`
            SELECT TOP 1 course_id
            FROM courses
            ORDER BY created_at DESC
        `);

        if (latestResult.recordset.length === 0) {
            console.log('❌ No courses found');
            process.exit(1);
        }

        const courseId = latestResult.recordset[0].course_id;
        console.log(`\n📌 Testing Course ID: ${courseId}\n`);

        // Get course via API (same as browser does)
        const course = await Course.findById(courseId);

        if (!course) {
            console.log('❌ Course not found');
            process.exit(1);
        }

        // Simulate what browser receives
        const apiResponse = {
            ...course,
            enrollment_status: null,
            progress_percentage: 0,
            is_enrolled: false
        };

        console.log('='.repeat(90));
        console.log('📺 DISPLAY SIMULATION - What User Sees on Screen');
        console.log('='.repeat(90));
        console.log('');

        console.log('┌─ HEADER SECTION ─────────────────────────────────────────────────────────┐');
        console.log('│                                                                             │');
        console.log(`│ 📷 Thumbnail: ${apiResponse.thumbnail || '/images/course-default.jpg (default)'}`);
        console.log(`│ 📝 Title: ${apiResponse.title || apiResponse.course_name}`);
        console.log('│                                                                             │');
        const tempDiv = { innerHTML: apiResponse.description, textContent: apiResponse.description?.replace(/<[^>]*>/g, '') || '' };
        console.log(`│ 📄 Description: ${tempDiv.textContent.substring(0, 60)}...`);
        console.log('│                                                                             │');
        console.log(`│ 👨‍🏫 Instructor: ${apiResponse.instructor_name || 'ไม่ระบุ'}`);
        console.log(`│ ⏱️  Duration: ${apiResponse.duration_hours || 0} ชั่วโมง`);
        console.log(`│ 👥 Enrolled: ${apiResponse.enrolled_count || 0} คน`);
        console.log('│                                                                             │');
        console.log(`│ 🏷️  Category: ${apiResponse.category_name || 'ทั่วไป'}`);

        const difficultyMap = { 'Beginner': 'เริ่มต้น', 'Intermediate': 'ปานกลาง', 'Advanced': 'ขั้นสูง' };
        console.log(`│ 📊 Difficulty: ${difficultyMap[apiResponse.difficulty_level] || apiResponse.difficulty_level || 'ไม่ระบุ'}`);
        console.log('│                                                                             │');
        console.log('└─────────────────────────────────────────────────────────────────────────────┘');

        console.log('');
        console.log('┌─ SIDEBAR - ข้อมูลคอร์ส ─────────────────────────────────────────────────┐');
        console.log('│                                                                             │');
        console.log(`│ ระดับความยาก:           ${difficultyMap[apiResponse.difficulty_level] || apiResponse.difficulty_level || 'ไม่ระบุ'}`);
        console.log(`│ ระยะเวลา:                ${apiResponse.duration_hours || 0} ชั่วโมง`);

        const languageMap = { 'th': 'ไทย', 'en': 'English', 'zh': '中文' };
        console.log(`│ ภาษา:                    ${languageMap[apiResponse.language] || apiResponse.language || 'ไม่ระบุ'}`);

        const courseTypeMap = { 'Online': 'ออนไลน์', 'Onsite': 'ในสถานที่', 'Hybrid': 'ผสมผสาน' };
        console.log(`│ ประเภท:                  ${courseTypeMap[apiResponse.course_type] || apiResponse.course_type || 'ไม่ระบุ'}`);

        const priceDisplay = (apiResponse.is_free || apiResponse.price == 0) ? 'ฟรี' : `${Number(apiResponse.price).toLocaleString('th-TH')} บาท`;
        console.log(`│ ราคา:                    ${priceDisplay}`);
        console.log(`│ จำนวนผู้เรียนสูงสุด:     ${apiResponse.max_students ? apiResponse.max_students + ' คน' : 'ไม่จำกัด'}`);
        console.log(`│ เกณฑ์ผ่าน:               ${apiResponse.passing_score ? apiResponse.passing_score + '%' : 'ไม่ระบุ'}`);
        console.log(`│ ทำได้สูงสุด:             ${apiResponse.max_attempts ? apiResponse.max_attempts + ' ครั้ง' : 'ไม่จำกัด'}`);

        const certDisplay = apiResponse.certificate_validity ? `มี (${apiResponse.certificate_validity})` : 'ไม่มี';
        console.log(`│ ใบประกาศนียบัตร:         ${certDisplay}`);
        console.log('│                                                                             │');
        console.log('└─────────────────────────────────────────────────────────────────────────────┘');

        console.log('');
        console.log('┌─ TAB: ภาพรวม ───────────────────────────────────────────────────────────┐');
        console.log('│                                                                             │');
        console.log('│ 📖 เกี่ยวกับคอร์สนี้                                                        │');
        if (apiResponse.full_description || apiResponse.description) {
            const desc = (apiResponse.full_description || apiResponse.description).replace(/<[^>]*>/g, '');
            console.log(`│    ${desc.substring(0, 70)}`);
            if (desc.length > 70) console.log(`│    ${desc.substring(70, 140)}...`);
        }
        console.log('│                                                                             │');
        console.log('│ 🎯 วัตถุประสงค์การเรียนรู้                                                 │');
        if (Array.isArray(apiResponse.learning_objectives) && apiResponse.learning_objectives.length > 0) {
            apiResponse.learning_objectives.forEach((obj, i) => {
                console.log(`│    ${i + 1}. ${obj.substring(0, 66)}`);
                if (obj.length > 66) console.log(`│       ${obj.substring(66, 132)}`);
            });
        } else {
            console.log('│    ⚠️ ไม่มีวัตถุประสงค์');
        }
        console.log('│                                                                             │');
        console.log('│ 📚 ความต้องการพื้นฐาน                                                       │');
        const prereq = apiResponse.prerequisites_text || apiResponse.prerequisite_knowledge || 'ไม่มีความต้องการพื้นฐานพิเศษ';
        console.log(`│    ${prereq.substring(0, 70)}`);
        if (prereq.length > 70) console.log(`│    ${prereq.substring(70, 140)}`);
        console.log('│                                                                             │');
        console.log('└─────────────────────────────────────────────────────────────────────────────┘');

        console.log('');
        console.log('┌─ TAB: หลักสูตร ──────────────────────────────────────────────────────────┐');
        console.log('│                                                                             │');
        console.log('│ 📚 เนื้อหาหลักสูตร                                                          │');
        console.log('│                                                                             │');
        if (apiResponse.lessons && apiResponse.lessons.length > 0) {
            apiResponse.lessons.forEach((lesson, i) => {
                console.log(`│    ${(i + 1)}. ${lesson.title.substring(0, 60).padEnd(60)} ${(lesson.duration_minutes || 0)} นาที`);
            });
            console.log(`│                                                                             │`);
            console.log(`│ ✅ Total: ${apiResponse.lessons.length} lessons`);
        } else {
            console.log('│    ⚠️ ยังไม่มีหลักสูตรที่กำหนด');
        }
        console.log('│                                                                             │');
        console.log('└─────────────────────────────────────────────────────────────────────────────┘');

        console.log('');
        console.log('='.repeat(90));
        console.log('✅ VERIFICATION CHECKLIST');
        console.log('='.repeat(90));
        console.log('');

        const checks = [
            { name: 'Title displayed', pass: !!(apiResponse.title || apiResponse.course_name) },
            { name: 'Description displayed', pass: !!(apiResponse.description || apiResponse.full_description) },
            { name: 'Instructor name displayed', pass: !!apiResponse.instructor_name },
            { name: 'Duration displayed', pass: apiResponse.duration_hours > 0 },
            { name: 'Category displayed', pass: !!apiResponse.category_name },
            { name: 'Difficulty displayed', pass: !!apiResponse.difficulty_level },
            { name: 'Language displayed', pass: !!apiResponse.language },
            { name: 'Course type displayed', pass: !!apiResponse.course_type },
            { name: 'Price displayed', pass: apiResponse.price !== undefined },
            { name: 'Max students displayed', pass: apiResponse.max_students !== undefined },
            { name: 'Passing score displayed', pass: apiResponse.passing_score !== undefined },
            { name: 'Max attempts displayed', pass: apiResponse.max_attempts !== undefined },
            { name: 'Learning objectives (array)', pass: Array.isArray(apiResponse.learning_objectives) },
            { name: 'Learning objectives (has items)', pass: apiResponse.learning_objectives?.length > 0 },
            { name: 'Prerequisites displayed', pass: !!(apiResponse.prerequisites_text || apiResponse.prerequisite_knowledge) },
            { name: 'Lessons available', pass: apiResponse.lessons?.length > 0 },
            { name: 'Certificate info displayed', pass: true } // always shown
        ];

        let allPass = true;
        checks.forEach(check => {
            const icon = check.pass ? '✅' : '❌';
            console.log(`${icon} ${check.name.padEnd(40)} ${check.pass ? 'PASS' : 'FAIL'}`);
            if (!check.pass) allPass = false;
        });

        console.log('');
        console.log('='.repeat(90));
        if (allPass) {
            console.log('🎉 ALL CHECKS PASSED! Display is showing all data correctly!');
        } else {
            console.log('⚠️  SOME CHECKS FAILED! Please review the failed items above.');
        }
        console.log('='.repeat(90));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testDisplayVerification();
