const { poolPromise, sql } = require('./config/database');

async function seedSampleTestData() {
    try {
        const pool = await poolPromise;

        console.log('🌱 Starting to seed sample test data...\n');

        // Check if we already have test data
        const existingTest = await pool.request().query('SELECT TOP 1 test_id FROM tests WHERE status = \'Published\'');
        if (existingTest.recordset.length > 0) {
            console.log('⚠️  Found existing test data. Adding more tests...\n');
        }

        // 1. Create a sample course first (if not exists)
        console.log('📚 Creating sample course...');
        const courseResult = await pool.request()
            .input('title', sql.NVarChar(255), 'ความปลอดภัยในห้องเย็น')
            .input('description', sql.NVarChar(sql.MAX), 'คอร์สเรียนเกี่ยวกับความปลอดภัยในการทำงานในห้องเย็น การป้องกันอันตราย และมาตรการความปลอดภัยที่ต้องปฏิบัติ')
            .input('category', sql.NVarChar(100), 'Safety')
            .input('difficultyLevel', sql.NVarChar(50), 'Beginner')
            .input('courseType', sql.NVarChar(50), 'mandatory')
            .input('language', sql.NVarChar(20), 'th')
            .input('instructorId', sql.Int, 17)
            .input('durationHours', sql.Decimal(5, 2), 2.5)
            .input('status', sql.NVarChar(50), 'Published')
            .input('passingScore', sql.Int, 70)
            .query(`
                INSERT INTO courses (
                    title, description, category, difficulty_level, course_type, language,
                    instructor_id, duration_hours, status, passing_score,
                    is_published, is_free, created_at, updated_at
                ) VALUES (
                    @title, @description, @category, @difficultyLevel, @courseType, @language,
                    @instructorId, @durationHours, @status, @passingScore,
                    1, 1, GETDATE(), GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS course_id;
            `);

        const courseId = courseResult.recordset[0].course_id;
        console.log(`   ✅ Course created with ID: ${courseId}`);

        // 2. Create a sample test linked to the course
        console.log('\n📝 Creating sample test...');
        const testResult = await pool.request()
            .input('courseId', sql.Int, courseId)
            .input('instructorId', sql.Int, 17)
            .input('title', sql.NVarChar(255), 'แบบทดสอบความปลอดภัยในห้องเย็น')
            .input('description', sql.NVarChar(sql.MAX), 'แบบทดสอบความรู้เกี่ยวกับความปลอดภัยในการทำงานในห้องเย็น')
            .input('type', sql.NVarChar(50), 'Quiz')
            .input('timeLimit', sql.Int, 30) // 30 minutes
            .input('totalMarks', sql.Int, 50) // 5 questions x 10 marks each
            .input('passingMarks', sql.Int, 35) // 70%
            .input('attemptsAllowed', sql.Int, 3)
            .input('status', sql.NVarChar(20), 'Published')
            .input('language', sql.NVarChar(10), 'th')
            .query(`
                INSERT INTO tests (
                    course_id, instructor_id, title, description, type,
                    time_limit, total_marks, passing_marks, attempts_allowed,
                    randomize_questions, show_results, status, language,
                    created_at
                ) VALUES (
                    @courseId, @instructorId, @title, @description, @type,
                    @timeLimit, @totalMarks, @passingMarks, @attemptsAllowed,
                    1, 1, @status, @language,
                    GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS test_id;
            `);

        const testId = testResult.recordset[0].test_id;
        console.log(`   ✅ Test created with ID: ${testId}`);

        // 3. Create sample questions with options
        console.log('\n❓ Creating sample questions...');

        const questions = [
            {
                text: 'อุณหภูมิที่เหมาะสมในห้องเย็นสำหรับเก็บรักษาอาหารแช่แข็งคืออะไร?',
                type: 'multiple_choice',
                points: 10,
                options: [
                    { text: '-18°C หรือต่ำกว่า', is_correct: true },
                    { text: '0°C', is_correct: false },
                    { text: '4°C', is_correct: false },
                    { text: '10°C', is_correct: false }
                ]
            },
            {
                text: 'อุปกรณ์ป้องกันภัยส่วนบุคคล (PPE) ที่จำเป็นต้องสวมใส่เมื่อทำงานในห้องเย็นคืออะไร?',
                type: 'multiple_choice',
                points: 10,
                options: [
                    { text: 'ถุงมือกันหนาว เสื้อกันหนาว รองเท้านิรภัย', is_correct: true },
                    { text: 'เสื้อยืดธรรมดา', is_correct: false },
                    { text: 'รองเท้าแตะ', is_correct: false },
                    { text: 'แว่นกันแดด', is_correct: false }
                ]
            },
            {
                text: 'หากติดอยู่ในห้องเย็นและประตูถูกล็อค ควรทำอย่างไรเป็นอันดับแรก?',
                type: 'multiple_choice',
                points: 10,
                options: [
                    { text: 'กดปุ่มฉุกเฉินหรือโทรแจ้งเหตุทันที', is_correct: true },
                    { text: 'นั่งรอคนมาช่วย', is_correct: false },
                    { text: 'พยายามทุบประตู', is_correct: false },
                    { text: 'นอนหลับรอ', is_correct: false }
                ]
            },
            {
                text: 'ระยะเวลาสูงสุดที่พนักงานควรทำงานต่อเนื่องในห้องเย็นคืออะไร?',
                type: 'multiple_choice',
                points: 10,
                options: [
                    { text: '30-60 นาที แล้วออกมาพัก', is_correct: true },
                    { text: '4-5 ชั่วโมง', is_correct: false },
                    { text: 'ทั้งวัน', is_correct: false },
                    { text: '10 นาที', is_correct: false }
                ]
            },
            {
                text: 'สัญญาณของอาการไฮโปเทอร์เมีย (Hypothermia) คืออะไร?',
                type: 'multiple_choice',
                points: 10,
                options: [
                    { text: 'ตัวสั่น พูดไม่ชัด สับสน ง่วงนอนผิดปกติ', is_correct: true },
                    { text: 'ร้อนวูบวาบ เหงื่อออก', is_correct: false },
                    { text: 'ปวดท้อง คลื่นไส้', is_correct: false },
                    { text: 'ผื่นคัน แพ้อาหาร', is_correct: false }
                ]
            }
        ];

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            // Insert question (using correct column names)
            const questionResult = await pool.request()
                .input('testId', sql.Int, testId)
                .input('questionText', sql.NVarChar(sql.MAX), q.text)
                .input('questionType', sql.NVarChar(50), q.type)
                .input('points', sql.Int, q.points)
                .input('createdBy', sql.Int, 17)
                .query(`
                    INSERT INTO questions (
                        test_id, question_text, question_type, points, is_active, created_by, created_date
                    ) VALUES (
                        @testId, @questionText, @questionType, @points, 1, @createdBy, GETDATE()
                    );
                    SELECT SCOPE_IDENTITY() AS question_id;
                `);

            const questionId = questionResult.recordset[0].question_id;
            console.log(`   ✅ Question ${i + 1} created with ID: ${questionId}`);

            // Insert options for this question (using QuestionOptions table with correct columns)
            for (let j = 0; j < q.options.length; j++) {
                const opt = q.options[j];
                await pool.request()
                    .input('questionId', sql.Int, questionId)
                    .input('optionText', sql.NVarChar(sql.MAX), opt.text)
                    .input('isCorrect', sql.Bit, opt.is_correct ? 1 : 0)
                    .input('optionOrder', sql.Int, j + 1)
                    .query(`
                        INSERT INTO QuestionOptions (
                            question_id, option_text, is_correct, option_order, created_date
                        ) VALUES (
                            @questionId, @optionText, @isCorrect, @optionOrder, GETDATE()
                        )
                    `);
            }
            console.log(`      📌 ${q.options.length} options added`);
        }

        // 4. Create a second test (standalone, not linked to course)
        console.log('\n📝 Creating second standalone test...');
        const test2Result = await pool.request()
            .input('instructorId', sql.Int, 17)
            .input('title', sql.NVarChar(255), 'แบบทดสอบทั่วไป - ความรู้พื้นฐาน')
            .input('description', sql.NVarChar(sql.MAX), 'แบบทดสอบความรู้พื้นฐานทั่วไปสำหรับพนักงานใหม่')
            .input('type', sql.NVarChar(50), 'Assessment')
            .input('timeLimit', sql.Int, 15) // 15 minutes
            .input('totalMarks', sql.Int, 30) // 3 questions x 10 marks each
            .input('passingMarks', sql.Int, 21) // 70%
            .input('attemptsAllowed', sql.Int, 2)
            .input('status', sql.NVarChar(20), 'Published')
            .input('language', sql.NVarChar(10), 'th')
            .query(`
                INSERT INTO tests (
                    course_id, instructor_id, title, description, type,
                    time_limit, total_marks, passing_marks, attempts_allowed,
                    randomize_questions, show_results, status, language,
                    created_at
                ) VALUES (
                    NULL, @instructorId, @title, @description, @type,
                    @timeLimit, @totalMarks, @passingMarks, @attemptsAllowed,
                    1, 1, @status, @language,
                    GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS test_id;
            `);

        const test2Id = test2Result.recordset[0].test_id;
        console.log(`   ✅ Test 2 created with ID: ${test2Id}`);

        const questions2 = [
            {
                text: 'บริษัท รักชัยห้องเย็น จำกัด ดำเนินธุรกิจเกี่ยวกับอะไร?',
                type: 'multiple_choice',
                points: 10,
                options: [
                    { text: 'ห้องเย็นและคลังสินค้าควบคุมอุณหภูมิ', is_correct: true },
                    { text: 'ร้านอาหาร', is_correct: false },
                    { text: 'โรงงานผลิตรถยนต์', is_correct: false },
                    { text: 'ธนาคาร', is_correct: false }
                ]
            },
            {
                text: 'การรักษาความสะอาดในที่ทำงานมีความสำคัญอย่างไร?',
                type: 'multiple_choice',
                points: 10,
                options: [
                    { text: 'ป้องกันอุบัติเหตุและรักษาคุณภาพสินค้า', is_correct: true },
                    { text: 'ไม่สำคัญ', is_correct: false },
                    { text: 'เพื่อความสวยงามเท่านั้น', is_correct: false },
                    { text: 'เป็นเรื่องของแม่บ้านเท่านั้น', is_correct: false }
                ]
            },
            {
                text: 'เมื่อพบอุบัติเหตุในที่ทำงาน ควรทำอย่างไร?',
                type: 'multiple_choice',
                points: 10,
                options: [
                    { text: 'แจ้งหัวหน้างานทันทีและให้การช่วยเหลือเบื้องต้น', is_correct: true },
                    { text: 'เพิกเฉย', is_correct: false },
                    { text: 'ถ่ายรูปโพสต์ลงโซเชียล', is_correct: false },
                    { text: 'กลับบ้าน', is_correct: false }
                ]
            }
        ];

        for (let i = 0; i < questions2.length; i++) {
            const q = questions2[i];

            const questionResult = await pool.request()
                .input('testId', sql.Int, test2Id)
                .input('questionText', sql.NVarChar(sql.MAX), q.text)
                .input('questionType', sql.NVarChar(50), q.type)
                .input('points', sql.Int, q.points)
                .input('createdBy', sql.Int, 17)
                .query(`
                    INSERT INTO questions (
                        test_id, question_text, question_type, points, is_active, created_by, created_date
                    ) VALUES (
                        @testId, @questionText, @questionType, @points, 1, @createdBy, GETDATE()
                    );
                    SELECT SCOPE_IDENTITY() AS question_id;
                `);

            const questionId = questionResult.recordset[0].question_id;
            console.log(`   ✅ Question ${i + 1} created with ID: ${questionId}`);

            for (let j = 0; j < q.options.length; j++) {
                const opt = q.options[j];
                await pool.request()
                    .input('questionId', sql.Int, questionId)
                    .input('optionText', sql.NVarChar(sql.MAX), opt.text)
                    .input('isCorrect', sql.Bit, opt.is_correct ? 1 : 0)
                    .input('optionOrder', sql.Int, j + 1)
                    .query(`
                        INSERT INTO QuestionOptions (
                            question_id, option_text, is_correct, option_order, created_date
                        ) VALUES (
                            @questionId, @optionText, @isCorrect, @optionOrder, GETDATE()
                        )
                    `);
            }
            console.log(`      📌 ${q.options.length} options added`);
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ Sample data seeded successfully!');
        console.log('='.repeat(50));
        console.log(`\n📊 Summary:`);
        console.log(`   • Course ID: ${courseId} - ความปลอดภัยในห้องเย็น`);
        console.log(`   • Test ID: ${testId} - แบบทดสอบความปลอดภัยในห้องเย็น (5 questions)`);
        console.log(`   • Test ID: ${test2Id} - แบบทดสอบทั่วไป (3 questions)`);
        console.log(`\n🔗 You can access:`);
        console.log(`   • Course: http://localhost:3000/courses/${courseId}`);
        console.log(`   • Test 1: http://localhost:3000/tests/${testId}`);
        console.log(`   • Test 2: http://localhost:3000/tests/${test2Id}`);
        console.log(`   • Take Test 1: http://localhost:3000/tests/${testId}/take`);
        console.log(`   • Take Test 2: http://localhost:3000/tests/${test2Id}/take`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}

seedSampleTestData();
