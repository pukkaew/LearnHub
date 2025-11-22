const { poolPromise } = require('./config/database');

async function verifyLastCourse() {
    try {
        const pool = await poolPromise;

        console.log('🔍 กำลังตรวจสอบคอร์สล่าสุดที่สร้าง...\n');

        // Get the latest course
        const result = await pool.request().query(`
            SELECT TOP 1
                course_id,
                course_code,
                title,
                description,
                category,
                difficulty_level,
                course_type,
                language,
                duration_hours,
                max_students,
                passing_score,
                max_attempts,
                created_at
            FROM Courses
            ORDER BY course_id DESC
        `);

        if (result.recordset.length === 0) {
            console.log('❌ ไม่พบคอร์สในระบบ');
            return;
        }

        const course = result.recordset[0];

        console.log('📋 ข้อมูลคอร์สล่าสุด:');
        console.log('='.repeat(60));
        console.log(`Course ID:       ${course.course_id}`);
        console.log(`Course Code:     ${course.course_code}`);
        console.log(`Title:           ${course.title}`);
        console.log(`Description:     ${course.description.substring(0, 50)}...`);
        console.log(`Category:        ${course.category}`);
        console.log(`Difficulty:      ${course.difficulty_level}`);
        console.log(`Course Type:     ${course.course_type}`);
        console.log(`Language:        ${course.language}`);
        console.log(`Duration Hours:  ${course.duration_hours}`);
        console.log(`Max Students:    ${course.max_students}`);
        console.log(`Passing Score:   ${course.passing_score}`);
        console.log(`Max Attempts:    ${course.max_attempts}`);
        console.log(`Created At:      ${course.created_at}`);
        console.log('='.repeat(60));

        // Verification checks
        console.log('\n✅ การตรวจสอบ:');

        const checks = [];

        // Check title
        checks.push({
            name: 'title field exists',
            pass: course.title !== null && course.title !== undefined,
            value: course.title
        });

        // Check duration is decimal
        checks.push({
            name: 'duration_hours is decimal (2.5)',
            pass: course.duration_hours === 2.5,
            value: course.duration_hours
        });

        // Check max_students (should be null if not set)
        checks.push({
            name: 'max_students (null if not set)',
            pass: course.max_students === null || typeof course.max_students === 'number',
            value: course.max_students
        });

        // Check course_type
        checks.push({
            name: 'course_type is valid',
            pass: ['mandatory', 'optional', 'recommended'].includes(course.course_type),
            value: course.course_type
        });

        // Check language
        checks.push({
            name: 'language is valid',
            pass: ['th', 'en'].includes(course.language),
            value: course.language
        });

        checks.forEach(check => {
            const icon = check.pass ? '✅' : '❌';
            console.log(`${icon} ${check.name}: ${check.value}`);
        });

        // Get learning objectives
        const objectives = await pool.request()
            .input('courseId', course.course_id)
            .query('SELECT objective_text FROM CourseLearningObjectives WHERE course_id = @courseId');

        console.log(`\n📝 Learning Objectives (${objectives.recordset.length} items):`);
        objectives.recordset.forEach((obj, i) => {
            console.log(`   ${i + 1}. ${obj.objective_text}`);
        });

        // Get lessons
        const lessons = await pool.request()
            .input('courseId', course.course_id)
            .query('SELECT lesson_number, lesson_title, duration FROM Lessons WHERE course_id = @courseId ORDER BY lesson_number');

        console.log(`\n📚 Lessons (${lessons.recordset.length} items):`);
        lessons.recordset.forEach((lesson) => {
            console.log(`   ${lesson.lesson_number}. ${lesson.lesson_title} (${lesson.duration} min)`);
        });

        // Summary
        const allPassed = checks.every(c => c.pass);
        console.log('\n' + '='.repeat(60));
        if (allPassed && objectives.recordset.length >= 3 && lessons.recordset.length >= 1) {
            console.log('🎉 ตรวจสอบสำเร็จ! ข้อมูลบันทึกถูกต้องทั้งหมด');
        } else {
            console.log('⚠️ พบปัญหาบางส่วน กรุณาตรวจสอบ');
        }
        console.log('='.repeat(60));

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyLastCourse();
