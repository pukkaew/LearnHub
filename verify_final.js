const { poolPromise } = require('./config/database');

async function verifyFinal() {
    try {
        const pool = await poolPromise;

        console.log('🔍 กำลังตรวจสอบ Course ID: 101 (FINAL TEST)...\n');

        const result = await pool.request()
            .input('courseId', 101)
            .query(`
                SELECT
                    course_id,
                    course_code,
                    title,
                    duration_hours,
                    max_students,
                    created_at
                FROM Courses
                WHERE course_id = @courseId
            `);

        if (result.recordset.length === 0) {
            console.log('❌ ไม่พบ Course ID 101');
            process.exit(1);
        }

        const course = result.recordset[0];

        console.log('📋 ข้อมูล Course ID: 101');
        console.log('='.repeat(70));
        console.log(`Course ID:       ${course.course_id}`);
        console.log(`Course Code:     ${course.course_code}`);
        console.log(`Title:           ${course.title}`);
        console.log(`Duration Hours:  ${course.duration_hours}`);
        console.log(`Max Students:    ${course.max_students}`);
        console.log(`Created At:      ${course.created_at}`);
        console.log('='.repeat(70));

        console.log('\n✅ การตรวจสอบขั้นสุดท้าย:');

        // Check duration is 2.5
        const durationValue = parseFloat(course.duration_hours);
        const durationCheck = durationValue === 2.5;
        const durationIcon = durationCheck ? '✅' : '❌';
        console.log(`${durationIcon} duration_hours = 2.5: ${course.duration_hours} (${typeof course.duration_hours})`);

        // Check title exists
        const titleCheck = course.title && course.title.length > 0;
        const titleIcon = titleCheck ? '✅' : '❌';
        console.log(`${titleIcon} title exists and not empty: "${course.title}"`);

        // Check max_students is null
        const maxStudentsCheck = course.max_students === null;
        const maxStudentsIcon = maxStudentsCheck ? '✅' : '❌';
        console.log(`${maxStudentsIcon} max_students is null (not set): ${course.max_students}`);

        console.log('\n' + '='.repeat(70));
        if (durationCheck && titleCheck && maxStudentsCheck) {
            console.log('');
            console.log('🎉🎉🎉 ยินดีด้วย! ระบบทำงานถูกต้อง 100% 🎉🎉🎉');
            console.log('');
            console.log('✅ duration_hours รองรับทศนิยม (2.5) แล้ว!');
            console.log('✅ title mapping ทำงานถูกต้อง!');
            console.log('✅ max_students เป็น null เมื่อไม่กรอก!');
            console.log('');
            console.log('🚀 ระบบพร้อมใช้งาน Production 100%');
            console.log('');
        } else {
            console.log('⚠️ พบปัญหา:');
            if (!durationCheck) console.log('   - duration_hours ไม่ใช่ 2.5');
            if (!titleCheck) console.log('   - title ว่างหรือไม่มี');
            if (!maxStudentsCheck) console.log('   - max_students ไม่ใช่ null');
        }
        console.log('='.repeat(70));

        process.exit(durationCheck && titleCheck && maxStudentsCheck ? 0 : 1);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyFinal();
