const { poolPromise } = require('./config/database');

async function createTestCourse() {
    try {
        console.log('🧪 สร้างหลักสูตรทดสอบพร้อม VDO และข้อมูลครบถ้วน...\n');

        const pool = await poolPromise;

        // ข้อมูลหลักสูตรทดสอบ
        const testCourseData = {
            title: 'หลักสูตรทดสอบระบบ - พร้อม Video',
            course_code: 'TEST-VIDEO-001',
            category: 'Technology',
            difficulty_level: 'intermediate',
            course_type: 'mandatory',
            language: 'th',
            description: 'หลักสูตรนี้สร้างขึ้นเพื่อทดสอบการแสดง Video และข้อมูลต่างๆ',
            learning_objectives: JSON.stringify([
                'เข้าใจการทำงานของระบบ',
                'สามารถสร้างหลักสูตรได้อย่างถูกต้อง',
                'ตรวจสอบการแสดงผล Video'
            ]),
            target_audience: JSON.stringify({
                positions: ['developer', 'engineer'],
                departments: ['it', 'development']
            }),
            passing_score: 80,
            max_attempts: 5,
            certificate_validity: '365',
            max_students: 100,
            start_date: '2025-01-01',
            end_date: '2025-12-31',
            instructor_id: null,
            status: 'Published'
        };

        console.log('📝 ข้อมูลหลักสูตร:');
        console.log(`  - ชื่อ: ${testCourseData.title}`);
        console.log(`  - เกณฑ์ผ่าน: ${testCourseData.passing_score}%`);
        console.log(`  - ทำได้สูงสุด: ${testCourseData.max_attempts} ครั้ง`);
        console.log(`  - วันเริ่ม: ${testCourseData.start_date}`);
        console.log(`  - วันสิ้นสุด: ${testCourseData.end_date}\n`);

        // INSERT หลักสูตร
        const result = await pool.request().query`
            INSERT INTO courses (
                title, course_code, category, difficulty_level,
                course_type, language, description, learning_objectives,
                target_audience, passing_score, max_attempts,
                certificate_validity, max_students, start_date, end_date,
                instructor_id, status, created_at, updated_at
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
                ${testCourseData.start_date},
                ${testCourseData.end_date},
                ${testCourseData.instructor_id},
                ${testCourseData.status},
                GETDATE(),
                GETDATE()
            )
        `;

        const courseId = result.recordset[0].course_id;
        console.log(`✅ สร้างหลักสูตรสำเร็จ! ID = ${courseId}\n`);

        // สร้างบทเรียนพร้อม Video URLs
        const lessons = [
            {
                title: 'บทที่ 1: Introduction',
                content: 'บทแนะนำหลักสูตร',
                duration: 30,
                video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            },
            {
                title: 'บทที่ 2: Advanced Topics',
                content: 'หัวข้อขั้นสูง',
                duration: 45,
                video_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0'
            },
            {
                title: 'บทที่ 3: Practical Examples',
                content: 'ตัวอย่างการใช้งานจริง',
                duration: 60,
                video_url: 'https://vimeo.com/148751763'
            }
        ];

        console.log('📚 กำลังสร้างบทเรียน...');
        for (let i = 0; i < lessons.length; i++) {
            const lesson = lessons[i];
            await pool.request().query`
                INSERT INTO course_materials (
                    course_id, title, content, type, file_path,
                    order_index, duration_minutes, created_at
                )
                VALUES (
                    ${courseId},
                    ${lesson.title},
                    ${lesson.content},
                    'lesson',
                    ${lesson.video_url},
                    ${i + 1},
                    ${lesson.duration},
                    GETDATE()
                )
            `;
            console.log(`  ✅ ${lesson.title} (Video: ${lesson.video_url})`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ สร้างหลักสูตรทดสอบสำเร็จ!');
        console.log(`🔗 ดูหลักสูตร: http://localhost:3000/courses/${courseId}`);
        console.log('='.repeat(60));

        process.exit(0);

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        console.error(error);
        process.exit(1);
    }
}

createTestCourse();
