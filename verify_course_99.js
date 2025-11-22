const { poolPromise } = require('./config/database');

async function verifyCourse99() {
    try {
        const pool = await poolPromise;

        console.log('🔍 กำลังตรวจสอบ Course ID: 99...\n');

        const result = await pool.request()
            .input('courseId', 99)
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
            console.log('❌ ไม่พบ Course ID 99');
            process.exit(1);
        }

        const course = result.recordset[0];

        console.log('📋 ข้อมูล Course ID: 99');
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
        const durationCheck = course.duration_hours === 2.5;
        const durationIcon = durationCheck ? '✅' : '❌';
        console.log(`${durationIcon} duration_hours = 2.5: ${course.duration_hours}`);

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
            console.log('🎉 ตรวจสอบสำเร็จ! ข้อมูลบันทึกถูกต้องทั้งหมด');
            console.log('✅ duration_hours รองรับทศนิยม (2.5) แล้ว!');
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

verifyCourse99();
