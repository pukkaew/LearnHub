const { sql, poolPromise } = require('./config/database');

async function testCourseCreation() {
    try {
        console.log('🧪 เริ่มทดสอบการสร้างหลักสูตร...\n');

        // เชื่อมต่อฐานข้อมูล
        const pool = await poolPromise;
        console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ\n');

        // ลบหลักสูตรทดสอบเก่า (ถ้ามี)
        await pool.request().query`DELETE FROM courses WHERE course_code = 'TEST-2025-001'`;
        console.log('🧹 ลบหลักสูตรทดสอบเก่าแล้ว\n');

        // สร้างหลักสูตรทดสอบ
        const testCourseData = {
            title: 'หลักสูตรทดสอบระบบ - ฉบับสมบูรณ์',
            course_code: 'TEST-2025-001',
            category: 'Technology',
            difficulty_level: 'intermediate',
            course_type: 'mandatory',
            language: 'th',
            description: 'หลักสูตรนี้สร้างขึ้นเพื่อทดสอบว่าระบบบันทึกข้อมูลครบถ้วนหรือไม่ รวมถึงการทดสอบฟิลด์ต่างๆ ทั้งหมด',
            learning_objectives: JSON.stringify([
                'เข้าใจการทำงานของระบบ',
                'สามารถสร้างหลักสูตรได้อย่างถูกต้อง',
                'ตรวจสอบความครบถ้วนของข้อมูล'
            ]),
            target_audience: JSON.stringify({
                positions: ['developer', 'engineer'],
                departments: ['it', 'development']
            }),
            passing_score: 75,
            max_attempts: 3,
            certificate_validity: '365',
            max_students: 50,
            instructor_id: null,  // ใช้ NULL เพราะไม่มีผู้สอนในระบบ
            status: 'draft'
        };

        console.log('📝 ข้อมูลหลักสูตรที่จะสร้าง:');
        console.log(JSON.stringify(testCourseData, null, 2));
        console.log('');

        // INSERT หลักสูตร
        const result = await pool.request().query`
            INSERT INTO courses (
                title, course_code, category, difficulty_level,
                course_type, language, description, learning_objectives,
                target_audience, passing_score, max_attempts,
                certificate_validity, max_students, instructor_id, status
            )
            OUTPUT inserted.course_id
            VALUES (
                ${testCourseData.title},
                ${testCourseData.course_code},
                ${testCourseData.category},
                ${testCourseData.difficulty_level},
                ${testCourseData.course_type},
                ${testCourseData.language},
                ${testCourseData.description},
                ${testCourseData.learning_objectives},
                ${testCourseData.target_audience},
                ${testCourseData.passing_score},
                ${testCourseData.max_attempts},
                ${testCourseData.certificate_validity},
                ${testCourseData.max_students},
                ${testCourseData.instructor_id},
                ${testCourseData.status}
            )
        `;

        const courseId = result.recordset[0].course_id;
        console.log(`✅ สร้างหลักสูตรสำเร็จ! ID = ${courseId}\n`);

        // ตรวจสอบข้อมูลที่บันทึก
        const checkResult = await pool.request().query`
            SELECT * FROM courses WHERE course_id = ${courseId}
        `;

        const savedCourse = checkResult.recordset[0];

        console.log('📊 ตรวจสอบข้อมูลที่บันทึก:\n');

        const checks = [
            { field: 'course_code', expected: 'TEST-2025-001', actual: savedCourse.course_code },
            { field: 'title', expected: testCourseData.title, actual: savedCourse.title },
            { field: 'category', expected: 'Technology', actual: savedCourse.category },
            { field: 'course_type', expected: 'mandatory', actual: savedCourse.course_type },
            { field: 'language', expected: 'th', actual: savedCourse.language },
            { field: 'learning_objectives', expected: 'array (3 items)', actual: savedCourse.learning_objectives ? JSON.parse(savedCourse.learning_objectives).length + ' items' : 'NULL' },
            { field: 'target_audience', expected: 'object', actual: savedCourse.target_audience ? 'exists' : 'NULL' },
            { field: 'passing_score', expected: 75, actual: savedCourse.passing_score },
            { field: 'max_attempts', expected: 3, actual: savedCourse.max_attempts },
            { field: 'certificate_validity', expected: '365', actual: savedCourse.certificate_validity },
            { field: 'max_students', expected: 50, actual: savedCourse.max_students }
        ];

        let allPassed = true;

        checks.forEach(check => {
            const passed = check.actual !== null && check.actual !== undefined;
            const icon = passed ? '✅' : '❌';
            const status = passed ? 'OK' : 'NULL';

            console.log(`${icon} ${check.field}: ${check.actual || 'NULL'} (expected: ${check.expected}) - ${status}`);

            if (!passed) {
                allPassed = false;
            }
        });

        console.log('\n' + '='.repeat(60));
        if (allPassed) {
            console.log('✅ การทดสอบผ่านทั้งหมด! ข้อมูลครบถ้วน');
        } else {
            console.log('❌ การทดสอบไม่ผ่าน! พบฟิลด์ที่เป็น NULL');
        }
        console.log('='.repeat(60));

        process.exit(0);

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testCourseCreation();
