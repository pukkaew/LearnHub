const { poolPromise, sql } = require('./config/database');

async function testCourseComplete() {
    try {
        console.log('🧪 Testing Complete Course Creation and Display\n');
        console.log('='.repeat(60));

        const pool = await poolPromise;

        // 1. สร้าง Course ทดสอบ
        console.log('\n📝 Step 1: Creating test course...');

        const testData = {
            course_code: 'TEST-2025-001',
            title: 'หลักสูตรทดสอบระบบ',
            description: '<p>นี่คือคำอธิบายหลักสูตรทดสอบที่มีเนื้อหาครบถ้วน</p>',
            category: 'การพัฒนาซอฟต์แวร์',
            difficulty_level: 'Intermediate',
            course_type: 'Online',
            language: 'th',
            instructor_name: 'อาจารย์ทดสอบ ระบบ',
            thumbnail: '/uploads/test-image.jpg',
            duration_hours: 40,
            price: 2500,
            is_free: 0,
            status: 'Published',
            max_students: 50,
            learning_objectives: JSON.stringify([
                'เข้าใจหลักการพื้นฐานของการพัฒนาซอฟต์แวร์',
                'สามารถเขียนโปรแกรมได้อย่างมีประสิทธิภาพ',
                'สามารถทำงานเป็นทีมได้'
            ]),
            target_audience: JSON.stringify({
                positions: ['developer', 'engineer'],
                departments: ['IT', 'Development']
            }),
            prerequisite_knowledge: 'มีพื้นฐานการเขียนโปรแกรม',
            passing_score: 70,
            max_attempts: 3,
            is_published: 1
        };

        const insertResult = await pool.request()
            .input('courseCode', sql.NVarChar(50), testData.course_code)
            .input('title', sql.NVarChar(255), testData.title)
            .input('description', sql.NVarChar(sql.MAX), testData.description)
            .input('category', sql.NVarChar(100), testData.category)
            .input('difficultyLevel', sql.NVarChar(50), testData.difficulty_level)
            .input('courseType', sql.NVarChar(50), testData.course_type)
            .input('language', sql.NVarChar(20), testData.language)
            .input('instructorName', sql.NVarChar(255), testData.instructor_name)
            .input('thumbnail', sql.NVarChar(500), testData.thumbnail)
            .input('durationHours', sql.Int, testData.duration_hours)
            .input('price', sql.Decimal(10, 2), testData.price)
            .input('isFree', sql.Bit, testData.is_free)
            .input('status', sql.NVarChar(50), testData.status)
            .input('maxStudents', sql.Int, testData.max_students)
            .input('learningObjectives', sql.NVarChar(sql.MAX), testData.learning_objectives)
            .input('targetAudience', sql.NVarChar(sql.MAX), testData.target_audience)
            .input('prerequisiteKnowledge', sql.NVarChar(sql.MAX), testData.prerequisite_knowledge)
            .input('passingScore', sql.Int, testData.passing_score)
            .input('maxAttempts', sql.Int, testData.max_attempts)
            .input('isPublished', sql.Bit, testData.is_published)
            .query(`
                INSERT INTO courses (
                    course_code, title, description, category, difficulty_level, course_type, language,
                    instructor_name, thumbnail, duration_hours, price, is_free, status,
                    max_students, learning_objectives, target_audience, prerequisite_knowledge,
                    passing_score, max_attempts, is_published,
                    created_at, updated_at
                ) VALUES (
                    @courseCode, @title, @description, @category, @difficultyLevel, @courseType, @language,
                    @instructorName, @thumbnail, @durationHours, @price, @isFree, @status,
                    @maxStudents, @learningObjectives, @targetAudience, @prerequisiteKnowledge,
                    @passingScore, @maxAttempts, @isPublished,
                    GETDATE(), GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS course_id;
            `);

        const courseId = insertResult.recordset[0].course_id;
        console.log(`✅ Course created with ID: ${courseId}\n`);

        // 2. เพิ่มบทเรียน
        console.log('📚 Step 2: Adding lessons...');
        const lessons = [
            { title: 'บทที่ 1: บทนำ', description: 'รู้จักกับหลักสูตร', duration: 30 },
            { title: 'บทที่ 2: พื้นฐาน', description: 'ความรู้พื้นฐานที่จำเป็น', duration: 60 },
            { title: 'บทที่ 3: ปฏิบัติการ', description: 'ฝึกปฏิบัติจริง', duration: 90 }
        ];

        for (let i = 0; i < lessons.length; i++) {
            await pool.request()
                .input('courseId', sql.Int, courseId)
                .input('title', sql.NVarChar(255), lessons[i].title)
                .input('content', sql.NVarChar(sql.MAX), lessons[i].description)
                .input('type', sql.NVarChar(50), 'lesson')
                .input('orderIndex', sql.Int, i + 1)
                .input('duration', sql.Int, lessons[i].duration)
                .query(`
                    INSERT INTO course_materials (
                        course_id, title, content, type, order_index, duration_minutes, created_at
                    ) VALUES (
                        @courseId, @title, @content, @type, @orderIndex, @duration, GETDATE()
                    )
                `);
            console.log(`   ✓ ${lessons[i].title}`);
        }
        console.log(`✅ Added ${lessons.length} lessons\n`);

        // 3. ดึงข้อมูลกลับมาตรวจสอบ
        console.log('🔍 Step 3: Retrieving course data...');
        const result = await pool.request()
            .input('courseId', sql.Int, courseId)
            .query(`
                SELECT *
                FROM courses
                WHERE course_id = @courseId
            `);

        const course = result.recordset[0];

        console.log('\n' + '='.repeat(60));
        console.log('📊 COURSE DATA VERIFICATION');
        console.log('='.repeat(60));
        console.log(`Course ID: ${course.course_id}`);
        console.log(`Course Code: ${course.course_code}`);
        console.log(`Title: ${course.title}`);
        console.log(`Category: ${course.category}`);
        console.log(`Difficulty: ${course.difficulty_level}`);
        console.log(`Type: ${course.course_type}`);
        console.log(`Language: ${course.language}`);
        console.log(`Instructor Name: ${course.instructor_name}`);
        console.log(`Duration: ${course.duration_hours} hours`);
        console.log(`Price: ${course.price} บาท`);
        console.log(`Max Students: ${course.max_students}`);
        console.log(`Passing Score: ${course.passing_score}%`);
        console.log(`Max Attempts: ${course.max_attempts}`);
        console.log(`Status: ${course.status}`);
        console.log(`Published: ${course.is_published ? 'Yes' : 'No'}`);

        // Parse JSON fields
        console.log('\n📋 Learning Objectives:');
        try {
            const objectives = JSON.parse(course.learning_objectives);
            objectives.forEach((obj, i) => {
                console.log(`   ${i + 1}. ${obj}`);
            });
        } catch (e) {
            console.log('   ⚠️ Error parsing objectives');
        }

        console.log('\n👥 Target Audience:');
        try {
            const audience = JSON.parse(course.target_audience);
            console.log(`   Positions: ${audience.positions.join(', ')}`);
            console.log(`   Departments: ${audience.departments.join(', ')}`);
        } catch (e) {
            console.log('   ⚠️ Error parsing audience');
        }

        console.log(`\n📖 Prerequisites: ${course.prerequisite_knowledge}`);

        // 4. ดึงบทเรียน
        console.log('\n📚 Course Materials:');
        const materialsResult = await pool.request()
            .input('courseId', sql.Int, courseId)
            .query(`
                SELECT *
                FROM course_materials
                WHERE course_id = @courseId
                ORDER BY order_index
            `);

        materialsResult.recordset.forEach(material => {
            console.log(`   ${material.order_index}. ${material.title} (${material.duration_minutes} นาที)`);
            console.log(`      ${material.content || ''}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ All data verified successfully!');
        console.log('='.repeat(60));

        // 5. เปรียบเทียบข้อมูล
        console.log('\n🔄 COMPARISON: Input vs Stored Data');
        console.log('='.repeat(60));

        const comparisons = [
            { field: 'Course Code', input: testData.course_code, stored: course.course_code },
            { field: 'Title', input: testData.title, stored: course.title },
            { field: 'Category', input: testData.category, stored: course.category },
            { field: 'Difficulty', input: testData.difficulty_level, stored: course.difficulty_level },
            { field: 'Type', input: testData.course_type, stored: course.course_type },
            { field: 'Language', input: testData.language, stored: course.language },
            { field: 'Instructor', input: testData.instructor_name, stored: course.instructor_name },
            { field: 'Duration', input: testData.duration_hours, stored: course.duration_hours },
            { field: 'Price', input: testData.price, stored: parseFloat(course.price) },
            { field: 'Max Students', input: testData.max_students, stored: course.max_students },
            { field: 'Passing Score', input: testData.passing_score, stored: course.passing_score },
            { field: 'Max Attempts', input: testData.max_attempts, stored: course.max_attempts }
        ];

        let allMatch = true;
        comparisons.forEach(comp => {
            const match = comp.input == comp.stored;
            const icon = match ? '✅' : '❌';
            console.log(`${icon} ${comp.field.padEnd(20)}: ${comp.input} ${match ? '==' : '!='} ${comp.stored}`);
            if (!match) allMatch = false;
        });

        console.log('\n' + '='.repeat(60));
        if (allMatch) {
            console.log('🎉 SUCCESS: All data matches perfectly!');
        } else {
            console.log('⚠️  WARNING: Some data does not match!');
        }
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testCourseComplete();
