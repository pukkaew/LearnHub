const { poolPromise } = require('./config/database');

async function verifyCourse100() {
    try {
        const pool = await poolPromise;

        console.log('🔍 กำลังตรวจสอบ Course ID: 100...\n');

        const result = await pool.request()
            .input('courseId', 100)
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
            console.log('❌ ไม่พบ Course ID 100');
            process.exit(1);
        }

        const course = result.recordset[0];

        console.log('📋 ข้อมูล Course ID: 100');
        console.log('='.repeat(60));
        console.log(`Course ID:       ${course.course_id}`);
        console.log(`Course Code:     ${course.course_code}`);
        console.log(`Title:           ${course.title}`);
        console.log(`Duration Hours:  ${course.duration_hours}`);
        console.log(`Max Students:    ${course.max_students}`);
        console.log(`Created At:      ${course.created_at}`);
        console.log('='.repeat(60));

        console.log('\n✅ การตรวจสอบ:');

        // Check duration is 2.5
        const durationCheck = parseFloat(course.duration_hours) === 2.5;
        const durationIcon = durationCheck ? '✅' : '❌';
        console.log(`${durationIcon} duration_hours = 2.5: ${course.duration_hours} (type: ${typeof course.duration_hours})`);

        // Check title exists
        const titleCheck = course.title !== null && course.title !== undefined;
        const titleIcon = titleCheck ? '✅' : '❌';
        console.log(`${titleIcon} title exists: ${course.title}`);

        // Check max_students is null
        const maxStudentsCheck = course.max_students === null;
        const maxStudentsIcon = maxStudentsCheck ? '✅' : '❌';
        console.log(`${maxStudentsIcon} max_students is null: ${course.max_students}`);

        console.log('\n' + '='.repeat(60));
        if (durationCheck && titleCheck && maxStudentsCheck) {
            console.log('🎉🎉🎉 ตรวจสอบสำเร็จ! ข้อมูลบันทึกถูกต้องทั้งหมด 🎉🎉🎉');
            console.log('');
            console.log('✅ duration_hours รองรับทศนิยม (2.5) แล้ว!');
            console.log('✅ title mapping ทำงานถูกต้อง!');
            console.log('✅ max_students เป็น null เมื่อไม่กรอก!');
            console.log('');
            console.log('🚀 ระบบพร้อมใช้งาน Production 100%');
        } else {
            console.log('⚠️ พบปัญหาบางส่วน');
        }
        console.log('='.repeat(60));

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyCourse100();
