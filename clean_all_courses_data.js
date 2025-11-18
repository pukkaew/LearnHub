const { poolPromise } = require('./config/database');

async function cleanAllCourses() {
    try {
        console.log('🧹 เริ่มล้างข้อมูล Courses ทั้งหมด...\n');

        const pool = await poolPromise;

        // 1. นับจำนวน courses ที่มีอยู่
        const countResult = await pool.request().query(`
            SELECT COUNT(*) as total FROM courses
        `);
        const totalCourses = countResult.recordset[0].total;

        console.log(`📊 พบหลักสูตรในระบบ: ${totalCourses} รายการ\n`);

        if (totalCourses === 0) {
            console.log('✅ ไม่มีข้อมูลที่ต้องลบ\n');
            process.exit(0);
            return;
        }

        // 2. นับจำนวน course_materials
        const materialsResult = await pool.request().query(`
            SELECT COUNT(*) as total FROM course_materials
        `);
        const totalMaterials = materialsResult.recordset[0].total;

        console.log(`📊 พบเนื้อหา/บทเรียน: ${totalMaterials} รายการ\n`);

        // 3. ลบข้อมูล course_materials ก่อน (เพราะมี foreign key)
        console.log('🗑️  กำลังลบข้อมูล course_materials...');
        await pool.request().query(`DELETE FROM course_materials`);
        console.log(`✅ ลบ course_materials สำเร็จ (${totalMaterials} รายการ)\n`);

        // 4. ลบข้อมูล enrollments (ถ้ามี)
        console.log('🗑️  กำลังตรวจสอบและลบข้อมูล enrollments...');
        try {
            const enrollmentsResult = await pool.request().query(`
                SELECT COUNT(*) as total FROM enrollments
            `);
            const totalEnrollments = enrollmentsResult.recordset[0].total;

            if (totalEnrollments > 0) {
                await pool.request().query(`DELETE FROM enrollments`);
                console.log(`✅ ลบ enrollments สำเร็จ (${totalEnrollments} รายการ)\n`);
            } else {
                console.log('✅ ไม่มี enrollments ที่ต้องลบ\n');
            }
        } catch (error) {
            console.log('⚠️  ไม่พบตาราง enrollments หรือไม่มีข้อมูล\n');
        }

        // 5. ลบข้อมูล course_reviews (ถ้ามี)
        console.log('🗑️  กำลังตรวจสอบและลบข้อมูล course_reviews...');
        try {
            const reviewsResult = await pool.request().query(`
                SELECT COUNT(*) as total FROM course_reviews
            `);
            const totalReviews = reviewsResult.recordset[0].total;

            if (totalReviews > 0) {
                await pool.request().query(`DELETE FROM course_reviews`);
                console.log(`✅ ลบ course_reviews สำเร็จ (${totalReviews} รายการ)\n`);
            } else {
                console.log('✅ ไม่มี course_reviews ที่ต้องลบ\n');
            }
        } catch (error) {
            console.log('⚠️  ไม่พบตาราง course_reviews หรือไม่มีข้อมูล\n');
        }

        // 6. ลบข้อมูล courses
        console.log('🗑️  กำลังลบข้อมูล courses...');
        await pool.request().query(`DELETE FROM courses`);
        console.log(`✅ ลบ courses สำเร็จ (${totalCourses} รายการ)\n`);

        // 7. Reset IDENTITY counter (เริ่มนับ ID ใหม่จาก 1)
        console.log('🔄 กำลัง Reset IDENTITY counter...');
        try {
            await pool.request().query(`DBCC CHECKIDENT ('courses', RESEED, 0)`);
            console.log('✅ Reset courses IDENTITY เป็น 0 แล้ว (ID ถัดไปจะเป็น 1)\n');
        } catch (error) {
            console.log('⚠️  ไม่สามารถ Reset IDENTITY ได้:', error.message, '\n');
        }

        try {
            await pool.request().query(`DBCC CHECKIDENT ('course_materials', RESEED, 0)`);
            console.log('✅ Reset course_materials IDENTITY เป็น 0 แล้ว\n');
        } catch (error) {
            console.log('⚠️  ไม่สามารถ Reset course_materials IDENTITY ได้\n');
        }

        // 8. ตรวจสอบผลลัพธ์
        const verifyResult = await pool.request().query(`
            SELECT COUNT(*) as total FROM courses
        `);
        const remainingCourses = verifyResult.recordset[0].total;

        console.log('=' .repeat(60));
        if (remainingCourses === 0) {
            console.log('✅ ล้างข้อมูลสำเร็จ! ไม่มีหลักสูตรเหลืออยู่ในระบบ');
            console.log('🎉 ระบบพร้อมสำหรับสร้างหลักสูตรใหม่');
        } else {
            console.log(`⚠️  ยังเหลือหลักสูตร ${remainingCourses} รายการ`);
        }
        console.log('=' .repeat(60));

        process.exit(0);

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// เรียกใช้งาน
cleanAllCourses();
