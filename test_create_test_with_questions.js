const { poolPromise, sql } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // First, let's check if there's a course to attach test to
        const courseResult = await pool.request().query(`
            SELECT TOP 1 course_id, title FROM courses WHERE is_active = 1
        `);

        const courseId = courseResult.recordset.length > 0 ? courseResult.recordset[0].course_id : null;
        console.log('Course found:', courseResult.recordset[0] || 'No course, test will be standalone');

        // Get an instructor user
        const userResult = await pool.request().query(`
            SELECT TOP 1 u.user_id, u.first_name, u.last_name
            FROM Users u
            INNER JOIN Roles r ON u.role_id = r.role_id
            WHERE r.role_name IN ('Admin', 'Instructor')
        `);

        if (userResult.recordset.length === 0) {
            console.log('No admin/instructor user found');
            process.exit(1);
        }

        const userId = userResult.recordset[0].user_id;
        console.log('User:', userResult.recordset[0].first_name, userResult.recordset[0].last_name);

        // Test 1: Create test with basic info
        console.log('\n--- Test 1: Create Test ---');

        const Test = require('./models/Test');
        const Question = require('./models/Question');

        const testData = {
            course_id: courseId,
            instructor_id: userId,
            title: 'Test Question Creation ' + new Date().toISOString(),
            description: 'Test to verify question creation works',
            type: 'Quiz',
            time_limit: 30,
            total_marks: 0,
            passing_marks: 60,
            attempts_allowed: 3,
            randomize_questions: true,
            show_results: true,
            status: 'Active',
            is_graded: true,
            is_required: false
        };

        const testResult = await Test.create(testData);
        console.log('Test created:', testResult);

        if (!testResult.success) {
            console.error('Failed to create test');
            process.exit(1);
        }

        const testId = testResult.data.test_id;
        console.log('Test ID:', testId);

        // Test 2: Create multiple choice question
        console.log('\n--- Test 2: Create Multiple Choice Question ---');

        const mcQuestion = {
            test_id: testId,
            question_type: 'multiple_choice',
            question_text: 'What is 2 + 2?',
            points: 1,
            explanation: 'Basic arithmetic',
            created_by: userId,
            options: [
                { text: '3', is_correct: false },
                { text: '4', is_correct: true },
                { text: '5', is_correct: false },
                { text: '6', is_correct: false }
            ]
        };

        const mcResult = await Question.create(mcQuestion);
        console.log('Multiple choice question created:', mcResult);

        // Test 3: Create true/false question
        console.log('\n--- Test 3: Create True/False Question ---');

        const tfQuestion = {
            test_id: testId,
            question_type: 'true_false',
            question_text: 'The sun rises in the east.',
            points: 1,
            explanation: 'Basic geography',
            created_by: userId,
            options: [
                { text: 'True', is_correct: true },
                { text: 'False', is_correct: false }
            ]
        };

        const tfResult = await Question.create(tfQuestion);
        console.log('True/False question created:', tfResult);

        // Test 4: Create essay question (no options)
        console.log('\n--- Test 4: Create Essay Question ---');

        const essayQuestion = {
            test_id: testId,
            question_type: 'essay',
            question_text: 'Describe the importance of software testing.',
            points: 5,
            explanation: 'Should mention testing benefits',
            created_by: userId
        };

        const essayResult = await Question.create(essayQuestion);
        console.log('Essay question created:', essayResult);

        // Verify: Get all questions for this test
        console.log('\n--- Verification: Get Questions by Test ID ---');

        const questions = await Question.findByTestId(testId);
        console.log('Questions found:', questions.length);
        questions.forEach((q, i) => {
            console.log(`  ${i+1}. [${q.question_type}] ${q.question_text.substring(0, 50)}...`);
            if (q.options && q.options.length > 0) {
                console.log(`     Options: ${q.options.length}`);
            }
        });

        // Update test total marks
        const totalMarks = questions.reduce((sum, q) => sum + parseFloat(q.points || 0), 0);
        await Test.update(testId, { total_marks: totalMarks });
        console.log(`\nTotal marks updated to: ${totalMarks}`);

        console.log('\n=== ALL TESTS PASSED ===');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
})();
