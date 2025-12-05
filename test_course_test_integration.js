/**
 * Comprehensive Integration Test: Course & Test System
 * ทดสอบแบบละเอียดครบทุก flow
 */

const { poolPromise, sql } = require('./config/database');

async function runComprehensiveTest() {
    const pool = await poolPromise;
    const results = {
        passed: [],
        failed: []
    };

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   COMPREHENSIVE COURSE & TEST INTEGRATION TEST');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        // ===== TEST 1: สร้าง Test แบบ Standalone (ไม่ผูก Course) =====
        console.log('📝 TEST 1: สร้าง Test แบบ Standalone (ไม่ผูก Course)');
        console.log('─'.repeat(60));

        const test1Result = await pool.request()
            .input('title', sql.NVarChar(255), 'แบบทดสอบความรู้ทั่วไป IT')
            .input('description', sql.NVarChar(sql.MAX), 'ทดสอบความรู้พื้นฐาน IT สำหรับพนักงานใหม่')
            .input('type', sql.NVarChar(50), 'Quiz')
            .input('passingMarks', sql.Int, 60)
            .input('attemptsAllowed', sql.Int, 3)
            .input('instructorId', sql.Int, 17)
            .input('status', sql.NVarChar(20), 'Active')
            .query(`
                INSERT INTO tests (title, description, type, passing_marks, attempts_allowed, instructor_id, status, created_at, updated_at)
                OUTPUT INSERTED.test_id
                VALUES (@title, @description, @type, @passingMarks, @attemptsAllowed, @instructorId, @status, GETDATE(), GETDATE())
            `);

        const standaloneTestId = test1Result.recordset[0].test_id;
        console.log(`   ✅ สร้าง Test ID: ${standaloneTestId} สำเร็จ`);

        // ตรวจสอบว่า course_id เป็น NULL
        const verifyTest1 = await pool.request()
            .input('testId', sql.Int, standaloneTestId)
            .query('SELECT test_id, title, course_id FROM tests WHERE test_id = @testId');

        if (verifyTest1.recordset[0].course_id === null) {
            console.log(`   ✅ course_id = NULL (ถูกต้อง - เป็น Standalone Test)`);
            results.passed.push('TEST 1: สร้าง Standalone Test');
        } else {
            console.log(`   ❌ course_id ไม่เป็น NULL`);
            results.failed.push('TEST 1: สร้าง Standalone Test');
        }
        console.log();

        // ===== TEST 2: สร้าง Course ใหม่ (ไม่มี Quiz) =====
        console.log('📝 TEST 2: สร้าง Course ใหม่ (ไม่มี Quiz ในบทเรียน)');
        console.log('─'.repeat(60));

        const course1Result = await pool.request()
            .input('title', sql.NVarChar(255), 'หลักสูตรพื้นฐานความปลอดภัยข้อมูล')
            .input('description', sql.NVarChar(sql.MAX), 'เรียนรู้เกี่ยวกับความปลอดภัยของข้อมูลในองค์กร')
            .input('category', sql.NVarChar(100), 'IT Security')
            .input('difficultyLevel', sql.NVarChar(50), 'Beginner')
            .input('instructorId', sql.Int, 17)
            .input('status', sql.NVarChar(50), 'Published')
            .input('durationHours', sql.Decimal(5, 2), 2.5)
            .query(`
                INSERT INTO courses (title, description, category, difficulty_level, instructor_id, status, duration_hours, created_at, updated_at)
                OUTPUT INSERTED.course_id
                VALUES (@title, @description, @category, @difficultyLevel, @instructorId, @status, @durationHours, GETDATE(), GETDATE())
            `);

        const course1Id = course1Result.recordset[0].course_id;
        console.log(`   ✅ สร้าง Course ID: ${course1Id} สำเร็จ`);

        // เพิ่ม Lesson (Material) ให้ Course
        await pool.request()
            .input('courseId', sql.Int, course1Id)
            .input('title', sql.NVarChar(255), 'บทที่ 1: ความปลอดภัยข้อมูลเบื้องต้น')
            .input('type', sql.NVarChar(50), 'lesson')
            .input('content', sql.NVarChar(sql.MAX), 'เนื้อหาบทที่ 1')
            .input('orderIndex', sql.Int, 1)
            .input('isRequired', sql.Bit, 1)
            .query(`
                INSERT INTO course_materials (course_id, title, type, content, order_index, is_required, created_at)
                VALUES (@courseId, @title, @type, @content, @orderIndex, @isRequired, GETDATE())
            `);

        await pool.request()
            .input('courseId', sql.Int, course1Id)
            .input('title', sql.NVarChar(255), 'บทที่ 2: การป้องกันข้อมูลส่วนบุคคล')
            .input('type', sql.NVarChar(50), 'lesson')
            .input('content', sql.NVarChar(sql.MAX), 'เนื้อหาบทที่ 2')
            .input('orderIndex', sql.Int, 2)
            .input('isRequired', sql.Bit, 1)
            .query(`
                INSERT INTO course_materials (course_id, title, type, content, order_index, is_required, created_at)
                VALUES (@courseId, @title, @type, @content, @orderIndex, @isRequired, GETDATE())
            `);

        console.log(`   ✅ เพิ่ม 2 บทเรียนให้ Course สำเร็จ`);

        // ตรวจสอบว่าไม่มี Test ผูกกับ Course นี้
        const testsLinkedToCourse1 = await pool.request()
            .input('courseId', sql.Int, course1Id)
            .query('SELECT COUNT(*) as count FROM tests WHERE course_id = @courseId');

        if (testsLinkedToCourse1.recordset[0].count === 0) {
            console.log(`   ✅ ไม่มี Test ผูกกับ Course นี้ (ถูกต้อง)`);
            results.passed.push('TEST 2: สร้าง Course ไม่มี Quiz');
        } else {
            console.log(`   ❌ มี Test ผูกกับ Course ทั้งที่ไม่ได้สร้าง`);
            results.failed.push('TEST 2: สร้าง Course ไม่มี Quiz');
        }
        console.log();

        // ===== TEST 3: สร้าง Test ใหม่แล้วผูกกับ Course ที่มีอยู่ =====
        console.log('📝 TEST 3: สร้าง Test ใหม่แล้วผูกกับ Course');
        console.log('─'.repeat(60));

        const test3Result = await pool.request()
            .input('title', sql.NVarChar(255), 'แบบทดสอบท้ายหลักสูตรความปลอดภัยข้อมูล')
            .input('description', sql.NVarChar(sql.MAX), 'ทดสอบความเข้าใจหลังจบหลักสูตร')
            .input('type', sql.NVarChar(50), 'Final')
            .input('passingMarks', sql.Int, 70)
            .input('attemptsAllowed', sql.Int, 2)
            .input('instructorId', sql.Int, 17)
            .input('courseId', sql.Int, course1Id)
            .input('status', sql.NVarChar(20), 'Active')
            .query(`
                INSERT INTO tests (title, description, type, passing_marks, attempts_allowed, instructor_id, course_id, status, created_at, updated_at)
                OUTPUT INSERTED.test_id
                VALUES (@title, @description, @type, @passingMarks, @attemptsAllowed, @instructorId, @courseId, @status, GETDATE(), GETDATE())
            `);

        const linkedTestId = test3Result.recordset[0].test_id;
        console.log(`   ✅ สร้าง Test ID: ${linkedTestId} และผูกกับ Course ID: ${course1Id}`);

        // ตรวจสอบการเชื่อมต่อ
        const verifyTest3 = await pool.request()
            .input('testId', sql.Int, linkedTestId)
            .query('SELECT test_id, title, course_id FROM tests WHERE test_id = @testId');

        if (verifyTest3.recordset[0].course_id === course1Id) {
            console.log(`   ✅ course_id = ${course1Id} (ถูกต้อง)`);
            results.passed.push('TEST 3: สร้าง Test ผูกกับ Course');
        } else {
            console.log(`   ❌ course_id ไม่ถูกต้อง`);
            results.failed.push('TEST 3: สร้าง Test ผูกกับ Course');
        }
        console.log();

        // ===== TEST 4: ตรวจสอบ Available Tests API Logic =====
        console.log('📝 TEST 4: ตรวจสอบ Available Tests API (tests ที่ยังไม่ผูก Course)');
        console.log('─'.repeat(60));

        const availableTests = await pool.request().query(`
            SELECT test_id, title, course_id
            FROM tests
            WHERE status = 'Active' AND (course_id IS NULL OR course_id = 0)
        `);

        console.log(`   📋 Available Tests (ไม่ผูก Course): ${availableTests.recordset.length} รายการ`);
        availableTests.recordset.forEach(t => {
            console.log(`      - Test ID ${t.test_id}: ${t.title}`);
        });

        // ตรวจสอบว่า Standalone Test อยู่ใน Available และ Linked Test ไม่อยู่
        const standaloneInAvailable = availableTests.recordset.some(t => t.test_id === standaloneTestId);
        const linkedInAvailable = availableTests.recordset.some(t => t.test_id === linkedTestId);

        if (standaloneInAvailable && !linkedInAvailable) {
            console.log(`   ✅ Standalone Test อยู่ใน Available, Linked Test ไม่อยู่ (ถูกต้อง)`);
            results.passed.push('TEST 4: Available Tests API Logic');
        } else {
            console.log(`   ❌ Logic ไม่ถูกต้อง (standalone: ${standaloneInAvailable}, linked: ${linkedInAvailable})`);
            results.failed.push('TEST 4: Available Tests API Logic');
        }
        console.log();

        // ===== TEST 5: ทดสอบ User Enrollment =====
        console.log('📝 TEST 5: ทดสอบ User Enrollment');
        console.log('─'.repeat(60));

        const userId = 17; // ใช้ user ที่มีอยู่

        // ลงทะเบียนเรียน
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('courseId', sql.Int, course1Id)
            .query(`
                INSERT INTO user_courses (user_id, course_id, enrollment_date, status, progress)
                VALUES (@userId, @courseId, GETDATE(), 'active', 0)
            `);

        console.log(`   ✅ User ${userId} ลงทะเบียน Course ${course1Id} สำเร็จ`);

        // ตรวจสอบการลงทะเบียน
        const enrollment = await pool.request()
            .input('userId', sql.Int, userId)
            .input('courseId', sql.Int, course1Id)
            .query('SELECT * FROM user_courses WHERE user_id = @userId AND course_id = @courseId');

        if (enrollment.recordset.length > 0 && enrollment.recordset[0].progress === 0) {
            console.log(`   ✅ Enrollment ถูกต้อง, Progress เริ่มต้น = 0%`);
            results.passed.push('TEST 5: User Enrollment');
        } else {
            console.log(`   ❌ Enrollment ไม่ถูกต้อง`);
            results.failed.push('TEST 5: User Enrollment');
        }
        console.log();

        // ===== TEST 6: ทดสอบ Material Progress =====
        console.log('📝 TEST 6: ทดสอบ Material Progress Tracking');
        console.log('─'.repeat(60));

        // ดึง materials ของ course
        const materials = await pool.request()
            .input('courseId', sql.Int, course1Id)
            .query('SELECT material_id, title, is_required FROM course_materials WHERE course_id = @courseId AND is_required = 1 ORDER BY order_index');

        console.log(`   📋 Required Materials: ${materials.recordset.length} รายการ`);
        materials.recordset.forEach(m => {
            console.log(`      - Material ID ${m.material_id}: ${m.title}`);
        });

        // Mark บทที่ 1 เป็น complete
        const material1Id = materials.recordset[0].material_id;
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('courseId', sql.Int, course1Id)
            .input('materialId', sql.Int, material1Id)
            .query(`
                INSERT INTO user_material_progress (user_id, course_id, material_id, is_completed, completed_at)
                VALUES (@userId, @courseId, @materialId, 1, GETDATE())
            `);

        console.log(`   ✅ Mark Material ${material1Id} เป็น Complete`);

        // คำนวณ Progress ใหม่
        const progressCalc = await pool.request()
            .input('userId', sql.Int, userId)
            .input('courseId', sql.Int, course1Id)
            .query(`
                SELECT
                    (SELECT COUNT(*) FROM course_materials WHERE course_id = @courseId AND is_required = 1) as total,
                    (SELECT COUNT(*) FROM user_material_progress ump
                     INNER JOIN course_materials cm ON ump.material_id = cm.material_id
                     WHERE ump.user_id = @userId AND ump.course_id = @courseId AND ump.is_completed = 1 AND cm.is_required = 1) as completed
            `);

        const { total, completed } = progressCalc.recordset[0];
        const expectedProgress = Math.round((completed / total) * 100);
        console.log(`   📊 Progress: ${completed}/${total} = ${expectedProgress}%`);

        if (expectedProgress === 50) {
            console.log(`   ✅ Progress คำนวณถูกต้อง (1/2 = 50%)`);
            results.passed.push('TEST 6: Material Progress Tracking');
        } else {
            console.log(`   ❌ Progress ไม่ถูกต้อง`);
            results.failed.push('TEST 6: Material Progress Tracking');
        }
        console.log();

        // ===== TEST 7: ทดสอบ Lesson Document (ไม่ควรนับใน Progress) =====
        console.log('📝 TEST 7: ทดสอบ Lesson Document (is_required = 0)');
        console.log('─'.repeat(60));

        // เพิ่ม lesson_document ที่แนบกับบทที่ 1
        await pool.request()
            .input('courseId', sql.Int, course1Id)
            .input('title', sql.NVarChar(255), 'เอกสารประกอบบทที่ 1.pdf')
            .input('type', sql.NVarChar(50), 'lesson_document')
            .input('parentMaterialId', sql.Int, material1Id)
            .input('orderIndex', sql.Int, 3)
            .input('isRequired', sql.Bit, 0) // ไม่บังคับ
            .query(`
                INSERT INTO course_materials (course_id, title, type, parent_material_id, order_index, is_required, created_at)
                VALUES (@courseId, @title, @type, @parentMaterialId, @orderIndex, @isRequired, GETDATE())
            `);

        console.log(`   ✅ เพิ่ม lesson_document (is_required = 0)`);

        // คำนวณ Progress อีกครั้ง (ไม่ควรเปลี่ยน)
        const progressCalc2 = await pool.request()
            .input('userId', sql.Int, userId)
            .input('courseId', sql.Int, course1Id)
            .query(`
                SELECT
                    (SELECT COUNT(*) FROM course_materials WHERE course_id = @courseId AND is_required = 1) as total,
                    (SELECT COUNT(*) FROM user_material_progress ump
                     INNER JOIN course_materials cm ON ump.material_id = cm.material_id
                     WHERE ump.user_id = @userId AND ump.course_id = @courseId AND ump.is_completed = 1 AND cm.is_required = 1) as completed
            `);

        const total2 = progressCalc2.recordset[0].total;
        const completed2 = progressCalc2.recordset[0].completed;
        const progress2 = Math.round((completed2 / total2) * 100);

        console.log(`   📊 Progress หลังเพิ่ม lesson_document: ${completed2}/${total2} = ${progress2}%`);

        if (total2 === 2 && progress2 === 50) {
            console.log(`   ✅ lesson_document ไม่ถูกนับใน required materials (ถูกต้อง)`);
            results.passed.push('TEST 7: Lesson Document ไม่นับใน Progress');
        } else {
            console.log(`   ❌ lesson_document ถูกนับผิดพลาด`);
            results.failed.push('TEST 7: Lesson Document ไม่นับใน Progress');
        }
        console.log();

        // ===== TEST 8: ทดสอบ Complete Course =====
        console.log('📝 TEST 8: ทดสอบ Complete ทุก Material');
        console.log('─'.repeat(60));

        // Mark บทที่ 2 เป็น complete
        const material2Id = materials.recordset[1].material_id;
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('courseId', sql.Int, course1Id)
            .input('materialId', sql.Int, material2Id)
            .query(`
                INSERT INTO user_material_progress (user_id, course_id, material_id, is_completed, completed_at)
                VALUES (@userId, @courseId, @materialId, 1, GETDATE())
            `);

        console.log(`   ✅ Mark Material ${material2Id} เป็น Complete`);

        // คำนวณ Progress สุดท้าย
        const progressCalc3 = await pool.request()
            .input('userId', sql.Int, userId)
            .input('courseId', sql.Int, course1Id)
            .query(`
                SELECT
                    (SELECT COUNT(*) FROM course_materials WHERE course_id = @courseId AND is_required = 1) as total,
                    (SELECT COUNT(*) FROM user_material_progress ump
                     INNER JOIN course_materials cm ON ump.material_id = cm.material_id
                     WHERE ump.user_id = @userId AND ump.course_id = @courseId AND ump.is_completed = 1 AND cm.is_required = 1) as completed
            `);

        const total3 = progressCalc3.recordset[0].total;
        const completed3 = progressCalc3.recordset[0].completed;
        const progress3 = Math.round((completed3 / total3) * 100);

        console.log(`   📊 Final Progress: ${completed3}/${total3} = ${progress3}%`);

        if (progress3 === 100) {
            console.log(`   ✅ Course Complete! Progress = 100%`);
            results.passed.push('TEST 8: Complete Course 100%');
        } else {
            console.log(`   ❌ Progress ไม่ถึง 100%`);
            results.failed.push('TEST 8: Complete Course 100%');
        }
        console.log();

        // ===== TEST 9: ตรวจสอบ Tests ที่ผูกกับ Course =====
        console.log('📝 TEST 9: ตรวจสอบ Tests ทั้งหมดที่ผูกกับ Course');
        console.log('─'.repeat(60));

        const testsForCourse = await pool.request()
            .input('courseId', sql.Int, course1Id)
            .query(`
                SELECT test_id, title, type, course_id
                FROM tests
                WHERE course_id = @courseId
            `);

        console.log(`   📋 Tests ที่ผูกกับ Course ${course1Id}: ${testsForCourse.recordset.length} รายการ`);
        testsForCourse.recordset.forEach(t => {
            console.log(`      - Test ID ${t.test_id}: ${t.title} (${t.type})`);
        });

        if (testsForCourse.recordset.length === 1) {
            console.log(`   ✅ มี 1 Test ผูกกับ Course (ถูกต้อง)`);
            results.passed.push('TEST 9: Tests linked to Course');
        } else {
            console.log(`   ❌ จำนวน Test ไม่ถูกต้อง`);
            results.failed.push('TEST 9: Tests linked to Course');
        }
        console.log();

        // ===== สรุปผล =====
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('   TEST RESULTS SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`   ✅ PASSED: ${results.passed.length}`);
        results.passed.forEach(p => console.log(`      - ${p}`));
        console.log();
        console.log(`   ❌ FAILED: ${results.failed.length}`);
        results.failed.forEach(f => console.log(`      - ${f}`));
        console.log();
        console.log(`   📊 SUCCESS RATE: ${Math.round((results.passed.length / (results.passed.length + results.failed.length)) * 100)}%`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        // แสดงสถานะฐานข้อมูลหลังทดสอบ
        console.log('📊 DATABASE STATE AFTER TEST:');
        console.log('─'.repeat(60));

        const courseCount = await pool.request().query('SELECT COUNT(*) as count FROM courses');
        const testCount = await pool.request().query('SELECT COUNT(*) as count FROM tests');
        const materialCount = await pool.request().query('SELECT COUNT(*) as count FROM course_materials');
        const enrollmentCount = await pool.request().query('SELECT COUNT(*) as count FROM user_courses');
        const progressCount = await pool.request().query('SELECT COUNT(*) as count FROM user_material_progress');

        console.log(`   - Courses: ${courseCount.recordset[0].count}`);
        console.log(`   - Tests: ${testCount.recordset[0].count}`);
        console.log(`   - Course Materials: ${materialCount.recordset[0].count}`);
        console.log(`   - User Enrollments: ${enrollmentCount.recordset[0].count}`);
        console.log(`   - Material Progress Records: ${progressCount.recordset[0].count}`);
        console.log();

    } catch (error) {
        console.error('❌ TEST ERROR:', error.message);
        console.error(error.stack);
    }

    process.exit(0);
}

runComprehensiveTest();
