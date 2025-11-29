// Comprehensive Course Creation Test
// ทดสอบการสร้างหลักสูตรทุกเงื่อนไข

const { poolPromise, sql } = require('./config/database');
const Course = require('./models/Course');

let testResults = [];
let passCount = 0;
let failCount = 0;
let validUserId = null;
let validCategoryId = null;

// Helper functions
function logTest(testName, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${testName}`);
    if (message) console.log(`         ${message}`);
    testResults.push({ testName, passed, message });
    if (passed) passCount++; else failCount++;
}

async function cleanup(courseId) {
    if (!courseId) return;
    const pool = await poolPromise;
    try {
        await pool.request().input('courseId', sql.Int, courseId)
            .query('DELETE FROM course_materials WHERE course_id = @courseId');
        await pool.request().input('courseId', sql.Int, courseId)
            .query('DELETE FROM tests WHERE course_id = @courseId');
        await pool.request().input('courseId', sql.Int, courseId)
            .query('DELETE FROM courses WHERE course_id = @courseId');
    } catch (e) {
        // Ignore cleanup errors
    }
}

async function setup() {
    console.log('🔧 Setting up test environment...\n');
    const pool = await poolPromise;

    // Get valid user
    const userResult = await pool.request()
        .query('SELECT TOP 1 user_id FROM users WHERE is_active = 1');
    validUserId = userResult.recordset[0]?.user_id;

    // Get valid category
    const catResult = await pool.request()
        .query('SELECT TOP 1 category_id FROM CourseCategories WHERE is_active = 1');
    validCategoryId = catResult.recordset[0]?.category_id;

    console.log(`   Valid User ID: ${validUserId}`);
    console.log(`   Valid Category ID: ${validCategoryId}\n`);

    if (!validUserId) {
        console.log('❌ No valid user found. Aborting tests.');
        process.exit(1);
    }
}

// ============================================
// TEST CASES
// ============================================

async function test01_BasicCourseCreation() {
    console.log('\n📋 Test 01: Basic Course Creation (Minimal Data)');
    try {
        const data = {
            course_name: 'Test Basic Course ' + Date.now(),
            course_code: 'BASIC-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId
        };

        const result = await Course.create(data);
        await cleanup(result.data?.course_id);

        logTest('Basic course creation', result.success,
            result.success ? `Course ID: ${result.data?.course_id}` : result.message);
    } catch (error) {
        logTest('Basic course creation', false, error.message);
    }
}

async function test02_FullCourseCreation() {
    console.log('\n📋 Test 02: Full Course Creation (All Fields)');
    try {
        const data = {
            course_name: 'Full Test Course ' + Date.now(),
            course_code: 'FULL-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            difficulty_level: 'Intermediate',
            course_type: 'mandatory',
            language: 'th',
            description: 'This is a comprehensive test course with all fields populated.',
            learning_objectives: ['Objective 1', 'Objective 2', 'Objective 3'],
            prerequisite_knowledge: 'Basic understanding of the subject',
            duration_hours: 10,
            duration_minutes: 30,
            max_students: 50,
            passing_score: 80,
            max_attempts: 3,
            certificate_validity: '365',
            enrollment_start: new Date(),
            enrollment_end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            created_by: validUserId,
            instructor_id: validUserId,
            instructor_name: 'Test Instructor'
        };

        const result = await Course.create(data);
        await cleanup(result.data?.course_id);

        logTest('Full course creation', result.success,
            result.success ? `Course ID: ${result.data?.course_id}` : result.message);
    } catch (error) {
        logTest('Full course creation', false, error.message);
    }
}

async function test03_CourseWithLessons() {
    console.log('\n📋 Test 03: Course with Lessons');
    try {
        const data = {
            course_name: 'Course With Lessons ' + Date.now(),
            course_code: 'LESSON-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId,
            lessons: [
                { title: 'บทที่ 1: บทนำ', duration: 30, description: 'Introduction to the course', has_quiz: false },
                { title: 'บทที่ 2: เนื้อหาหลัก', duration: 60, description: 'Main content', has_quiz: false },
                { title: 'บทที่ 3: Workshop', duration: 90, description: 'Hands-on practice', has_quiz: false },
                { title: 'บทที่ 4: สรุป', duration: 30, description: 'Summary and review', has_quiz: false }
            ]
        };

        const result = await Course.create(data);

        // Verify lessons were created
        let lessonCount = 0;
        if (result.success && result.data?.course_id) {
            const pool = await poolPromise;
            const lessonResult = await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query('SELECT COUNT(*) as count FROM course_materials WHERE course_id = @courseId');
            lessonCount = lessonResult.recordset[0].count;
        }

        await cleanup(result.data?.course_id);

        logTest('Course with 4 lessons', result.success && lessonCount === 4,
            `Lessons created: ${lessonCount}/4`);
    } catch (error) {
        logTest('Course with lessons', false, error.message);
    }
}

async function test04_CourseWithQuiz() {
    console.log('\n📋 Test 04: Course with Quiz/Knowledge Check');
    try {
        const data = {
            course_name: 'Course With Quiz ' + Date.now(),
            course_code: 'QUIZ-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId,
            lessons: [
                {
                    title: 'บทที่ 1: Introduction',
                    duration: 30,
                    description: 'Intro lesson',
                    has_quiz: true,
                    quiz_name: 'แบบทดสอบท้ายบทที่ 1',
                    quiz_passing_score: 70,
                    quiz_max_attempts: 3
                },
                {
                    title: 'บทที่ 2: Advanced',
                    duration: 45,
                    description: 'Advanced lesson',
                    has_quiz: true,
                    quiz_name: 'แบบทดสอบท้ายบทที่ 2',
                    quiz_passing_score: 80,
                    quiz_max_attempts: 2
                }
            ]
        };

        const result = await Course.create(data);

        // Verify quizzes were created
        let quizCount = 0;
        if (result.success && result.data?.course_id) {
            const pool = await poolPromise;
            const quizResult = await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query("SELECT COUNT(*) as count FROM tests WHERE course_id = @courseId AND type = 'knowledge_check'");
            quizCount = quizResult.recordset[0].count;
        }

        await cleanup(result.data?.course_id);

        logTest('Course with quizzes', result.success && quizCount === 2,
            `Quizzes created: ${quizCount}/2`);
    } catch (error) {
        logTest('Course with quizzes', false, error.message);
    }
}

async function test05_CourseWithTargetAudience() {
    console.log('\n📋 Test 05: Course with Target Audience (Positions & Departments)');
    try {
        // Get valid position and department
        const pool = await poolPromise;
        const posResult = await pool.request().query('SELECT TOP 2 position_id FROM Positions WHERE is_active = 1');
        const deptResult = await pool.request().query('SELECT TOP 2 unit_id FROM OrganizationUnits WHERE is_active = 1');

        const positions = posResult.recordset.map(r => r.position_id.toString());
        const departments = deptResult.recordset.map(r => r.unit_id.toString());

        const data = {
            course_name: 'Course With Target ' + Date.now(),
            course_code: 'TARGET-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId,
            target_positions: positions,
            target_departments: departments
        };

        const result = await Course.create(data);

        // Verify target_audience was saved
        let hasTargetAudience = false;
        if (result.success && result.data?.course_id) {
            const courseResult = await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query('SELECT target_audience FROM courses WHERE course_id = @courseId');
            hasTargetAudience = !!courseResult.recordset[0]?.target_audience;
        }

        await cleanup(result.data?.course_id);

        logTest('Course with target audience', result.success && hasTargetAudience,
            `Target audience saved: ${hasTargetAudience}`);
    } catch (error) {
        logTest('Course with target audience', false, error.message);
    }
}

async function test06_CourseTypes() {
    console.log('\n📋 Test 06: Different Course Types');
    const courseTypes = ['mandatory', 'optional', 'recommended'];

    for (const type of courseTypes) {
        try {
            const data = {
                course_name: `Course Type ${type} ` + Date.now(),
                course_code: `TYPE-${type.toUpperCase()}-` + Math.floor(Math.random() * 10000),
                category_id: validCategoryId,
                course_type: type,
                created_by: validUserId,
                instructor_id: validUserId
            };

            const result = await Course.create(data);

            // Verify course_type was saved
            let savedType = null;
            if (result.success && result.data?.course_id) {
                const pool = await poolPromise;
                const typeResult = await pool.request()
                    .input('courseId', sql.Int, result.data.course_id)
                    .query('SELECT course_type FROM courses WHERE course_id = @courseId');
                savedType = typeResult.recordset[0]?.course_type;
            }

            await cleanup(result.data?.course_id);

            logTest(`Course type: ${type}`, result.success && savedType === type,
                `Saved type: ${savedType}`);
        } catch (error) {
            logTest(`Course type: ${type}`, false, error.message);
        }
    }
}

async function test07_CourseLanguages() {
    console.log('\n📋 Test 07: Different Languages');
    const languages = ['th', 'en'];

    for (const lang of languages) {
        try {
            const data = {
                course_name: `Course Lang ${lang} ` + Date.now(),
                course_code: `LANG-${lang.toUpperCase()}-` + Math.floor(Math.random() * 10000),
                category_id: validCategoryId,
                language: lang,
                created_by: validUserId,
                instructor_id: validUserId
            };

            const result = await Course.create(data);

            // Verify language was saved
            let savedLang = null;
            if (result.success && result.data?.course_id) {
                const pool = await poolPromise;
                const langResult = await pool.request()
                    .input('courseId', sql.Int, result.data.course_id)
                    .query('SELECT language FROM courses WHERE course_id = @courseId');
                savedLang = langResult.recordset[0]?.language;
            }

            await cleanup(result.data?.course_id);

            logTest(`Course language: ${lang}`, result.success && savedLang === lang,
                `Saved language: ${savedLang}`);
        } catch (error) {
            logTest(`Course language: ${lang}`, false, error.message);
        }
    }
}

async function test08_DifficultyLevels() {
    console.log('\n📋 Test 08: Different Difficulty Levels');
    const levels = ['Beginner', 'Intermediate', 'Advanced'];

    for (const level of levels) {
        try {
            const data = {
                course_name: `Course ${level} ` + Date.now(),
                course_code: `DIFF-${level.substring(0,3).toUpperCase()}-` + Math.floor(Math.random() * 10000),
                category_id: validCategoryId,
                difficulty_level: level,
                created_by: validUserId,
                instructor_id: validUserId
            };

            const result = await Course.create(data);

            // Verify difficulty was saved
            let savedLevel = null;
            if (result.success && result.data?.course_id) {
                const pool = await poolPromise;
                const levelResult = await pool.request()
                    .input('courseId', sql.Int, result.data.course_id)
                    .query('SELECT difficulty_level FROM courses WHERE course_id = @courseId');
                savedLevel = levelResult.recordset[0]?.difficulty_level;
            }

            await cleanup(result.data?.course_id);

            logTest(`Difficulty: ${level}`, result.success && savedLevel === level,
                `Saved level: ${savedLevel}`);
        } catch (error) {
            logTest(`Difficulty: ${level}`, false, error.message);
        }
    }
}

async function test09_LearningObjectives() {
    console.log('\n📋 Test 09: Learning Objectives');
    try {
        const objectives = [
            'เข้าใจหลักการพื้นฐาน',
            'สามารถนำไปประยุกต์ใช้ได้',
            'วิเคราะห์ปัญหาและหาทางแก้ไข',
            'สร้างผลงานได้ด้วยตนเอง',
            'ประเมินผลงานของตนเองและผู้อื่น'
        ];

        const data = {
            course_name: 'Course Objectives ' + Date.now(),
            course_code: 'OBJ-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            learning_objectives: objectives,
            created_by: validUserId,
            instructor_id: validUserId
        };

        const result = await Course.create(data);

        // Verify objectives were saved
        let savedObjectives = [];
        if (result.success && result.data?.course_id) {
            const pool = await poolPromise;
            const objResult = await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query('SELECT learning_objectives FROM courses WHERE course_id = @courseId');
            const objStr = objResult.recordset[0]?.learning_objectives;
            if (objStr) {
                try {
                    savedObjectives = JSON.parse(objStr);
                } catch (e) {}
            }
        }

        await cleanup(result.data?.course_id);

        logTest('Learning objectives (5 items)',
            result.success && savedObjectives.length === 5,
            `Saved objectives: ${savedObjectives.length}/5`);
    } catch (error) {
        logTest('Learning objectives', false, error.message);
    }
}

async function test10_CertificateValidity() {
    console.log('\n📋 Test 10: Certificate Validity Options');
    const validityOptions = [null, '365', '730', '1095'];

    for (const validity of validityOptions) {
        try {
            const data = {
                course_name: `Course Cert ${validity || 'unlimited'} ` + Date.now(),
                course_code: `CERT-` + Math.floor(Math.random() * 10000),
                category_id: validCategoryId,
                certificate_validity: validity,
                created_by: validUserId,
                instructor_id: validUserId
            };

            const result = await Course.create(data);

            // Verify certificate_validity was saved
            let savedValidity = 'not_checked';
            if (result.success && result.data?.course_id) {
                const pool = await poolPromise;
                const certResult = await pool.request()
                    .input('courseId', sql.Int, result.data.course_id)
                    .query('SELECT certificate_validity FROM courses WHERE course_id = @courseId');
                savedValidity = certResult.recordset[0]?.certificate_validity;
            }

            await cleanup(result.data?.course_id);

            const expectedMatch = (savedValidity === validity) ||
                                  (validity === null && savedValidity === null);
            logTest(`Certificate validity: ${validity || 'unlimited'}`,
                result.success && expectedMatch,
                `Saved: ${savedValidity}`);
        } catch (error) {
            logTest(`Certificate validity: ${validity || 'unlimited'}`, false, error.message);
        }
    }
}

async function test11_MaxStudentsAndAttempts() {
    console.log('\n📋 Test 11: Max Students & Max Attempts');
    try {
        const data = {
            course_name: 'Course Limits ' + Date.now(),
            course_code: 'LIMIT-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            max_students: 100,
            max_attempts: 5,
            passing_score: 75,
            created_by: validUserId,
            instructor_id: validUserId
        };

        const result = await Course.create(data);

        let savedData = {};
        if (result.success && result.data?.course_id) {
            const pool = await poolPromise;
            const dataResult = await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query('SELECT max_students, max_attempts, passing_score FROM courses WHERE course_id = @courseId');
            savedData = dataResult.recordset[0] || {};
        }

        await cleanup(result.data?.course_id);

        const allMatch = savedData.max_students === 100 &&
                        savedData.max_attempts === 5 &&
                        savedData.passing_score === 75;
        logTest('Max students/attempts/passing_score', result.success && allMatch,
            `max_students=${savedData.max_students}, max_attempts=${savedData.max_attempts}, passing_score=${savedData.passing_score}`);
    } catch (error) {
        logTest('Max students/attempts', false, error.message);
    }
}

async function test12_CourseWithoutInstructor() {
    console.log('\n📋 Test 12: Course with Instructor Name Only (No ID)');
    try {
        const data = {
            course_name: 'Course No Instructor ID ' + Date.now(),
            course_code: 'NOINST-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            instructor_name: 'ผู้สอนภายนอก (External Instructor)',
            created_by: validUserId,
            lessons: [] // No lessons with quiz to avoid instructor_id requirement
        };

        const result = await Course.create(data);

        let savedName = null;
        if (result.success && result.data?.course_id) {
            const pool = await poolPromise;
            const nameResult = await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query('SELECT instructor_name FROM courses WHERE course_id = @courseId');
            savedName = nameResult.recordset[0]?.instructor_name;
        }

        await cleanup(result.data?.course_id);

        logTest('Course with instructor name only', result.success,
            `Saved instructor_name: ${savedName}`);
    } catch (error) {
        logTest('Course with instructor name only', false, error.message);
    }
}

async function test13_DurationCalculation() {
    console.log('\n📋 Test 13: Duration Hours + Minutes Calculation');
    try {
        const data = {
            course_name: 'Course Duration ' + Date.now(),
            course_code: 'DUR-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            duration_hours: 2,
            duration_minutes: 45, // Should be 2.75 hours total
            created_by: validUserId,
            instructor_id: validUserId
        };

        const result = await Course.create(data);

        let savedDuration = null;
        if (result.success && result.data?.course_id) {
            const pool = await poolPromise;
            const durResult = await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query('SELECT duration_hours FROM courses WHERE course_id = @courseId');
            savedDuration = parseFloat(durResult.recordset[0]?.duration_hours);
        }

        await cleanup(result.data?.course_id);

        // 2 hours + 45 minutes = 2.75 hours
        const expected = 2.75;
        const isCorrect = Math.abs(savedDuration - expected) < 0.01;
        logTest('Duration calculation (2h 45m = 2.75h)', result.success && isCorrect,
            `Saved: ${savedDuration} hours (expected: ${expected})`);
    } catch (error) {
        logTest('Duration calculation', false, error.message);
    }
}

async function test14_EmptyLessonsArray() {
    console.log('\n📋 Test 14: Course with Empty Lessons Array');
    try {
        const data = {
            course_name: 'Course Empty Lessons ' + Date.now(),
            course_code: 'EMPTY-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            lessons: [],
            created_by: validUserId,
            instructor_id: validUserId
        };

        const result = await Course.create(data);
        await cleanup(result.data?.course_id);

        logTest('Course with empty lessons array', result.success,
            result.success ? 'Created successfully' : result.message);
    } catch (error) {
        logTest('Course with empty lessons array', false, error.message);
    }
}

async function test15_SpecialCharactersInName() {
    console.log('\n📋 Test 15: Special Characters in Course Name');
    try {
        const data = {
            course_name: 'หลักสูตร "Test" & การเรียนรู้ <Advanced> ' + Date.now(),
            course_code: 'SPEC-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            description: 'Description with "quotes" & <tags> and สัญลักษณ์พิเศษ',
            created_by: validUserId,
            instructor_id: validUserId
        };

        const result = await Course.create(data);

        let savedName = null;
        if (result.success && result.data?.course_id) {
            const pool = await poolPromise;
            const nameResult = await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query('SELECT title FROM courses WHERE course_id = @courseId');
            savedName = nameResult.recordset[0]?.title;
        }

        await cleanup(result.data?.course_id);

        logTest('Special characters in name', result.success && savedName?.includes('"'),
            `Saved name contains special chars: ${!!savedName}`);
    } catch (error) {
        logTest('Special characters in name', false, error.message);
    }
}

async function test16_ManyLessons() {
    console.log('\n📋 Test 16: Course with Many Lessons (10+)');
    try {
        const lessons = [];
        for (let i = 1; i <= 15; i++) {
            lessons.push({
                title: `บทที่ ${i}: เนื้อหาส่วนที่ ${i}`,
                duration: 20 + (i * 5),
                description: `This is lesson ${i} description`,
                has_quiz: false
            });
        }

        const data = {
            course_name: 'Course Many Lessons ' + Date.now(),
            course_code: 'MANY-' + Math.floor(Math.random() * 10000),
            category_id: validCategoryId,
            lessons: lessons,
            created_by: validUserId,
            instructor_id: validUserId
        };

        const result = await Course.create(data);

        let lessonCount = 0;
        if (result.success && result.data?.course_id) {
            const pool = await poolPromise;
            const countResult = await pool.request()
                .input('courseId', sql.Int, result.data.course_id)
                .query('SELECT COUNT(*) as count FROM course_materials WHERE course_id = @courseId');
            lessonCount = countResult.recordset[0].count;
        }

        await cleanup(result.data?.course_id);

        logTest('Course with 15 lessons', result.success && lessonCount === 15,
            `Lessons created: ${lessonCount}/15`);
    } catch (error) {
        logTest('Course with many lessons', false, error.message);
    }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   🧪 COMPREHENSIVE COURSE CREATION TEST');
    console.log('   ทดสอบการสร้างหลักสูตรทุกเงื่อนไข');
    console.log('═══════════════════════════════════════════════════════════');

    const startTime = Date.now();

    await setup();

    // Run all tests
    await test01_BasicCourseCreation();
    await test02_FullCourseCreation();
    await test03_CourseWithLessons();
    await test04_CourseWithQuiz();
    await test05_CourseWithTargetAudience();
    await test06_CourseTypes();
    await test07_CourseLanguages();
    await test08_DifficultyLevels();
    await test09_LearningObjectives();
    await test10_CertificateValidity();
    await test11_MaxStudentsAndAttempts();
    await test12_CourseWithoutInstructor();
    await test13_DurationCalculation();
    await test14_EmptyLessonsArray();
    await test15_SpecialCharactersInName();
    await test16_ManyLessons();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total Tests: ${passCount + failCount}`);
    console.log(`   ✅ Passed: ${passCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
    console.log(`   Duration: ${duration} seconds`);
    console.log('═══════════════════════════════════════════════════════════');

    if (failCount > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.filter(t => !t.passed).forEach(t => {
            console.log(`   - ${t.testName}: ${t.message}`);
        });
    }

    process.exit(failCount > 0 ? 1 : 0);
}

runAllTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
