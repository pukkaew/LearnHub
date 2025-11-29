// ═══════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE COURSE API TEST - ทดสอบทุกฟังก์ชันแบบละเอียด
// ═══════════════════════════════════════════════════════════════════════════

const { poolPromise, sql } = require('./config/database');
const Course = require('./models/Course');

let testResults = [];
let passCount = 0;
let failCount = 0;
let validUserId = null;
let validCategoryId = null;
let createdCourseIds = [];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function logSection(title) {
    console.log('\n' + '─'.repeat(60));
    console.log(`📋 ${title}`);
    console.log('─'.repeat(60));
}

function logTest(testName, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${testName}`);
    if (message) console.log(`         └─ ${message}`);
    testResults.push({ testName, passed, message });
    if (passed) passCount++; else failCount++;
}

async function cleanup() {
    const pool = await poolPromise;
    for (const courseId of createdCourseIds) {
        try {
            await pool.request().input('id', sql.Int, courseId)
                .query('DELETE FROM course_materials WHERE course_id = @id');
            await pool.request().input('id', sql.Int, courseId)
                .query('DELETE FROM tests WHERE course_id = @id');
            await pool.request().input('id', sql.Int, courseId)
                .query('DELETE FROM user_courses WHERE course_id = @id');
            await pool.request().input('id', sql.Int, courseId)
                .query('DELETE FROM courses WHERE course_id = @id');
        } catch (e) {}
    }
}

async function setup() {
    console.log('🔧 Setting up test environment...');
    const pool = await poolPromise;

    const userResult = await pool.request()
        .query('SELECT TOP 1 user_id, first_name FROM users WHERE is_active = 1');
    validUserId = userResult.recordset[0]?.user_id;

    const catResult = await pool.request()
        .query('SELECT TOP 1 category_id, category_name FROM CourseCategories WHERE is_active = 1');
    validCategoryId = catResult.recordset[0]?.category_id;

    console.log(`   User: ${userResult.recordset[0]?.first_name} (ID: ${validUserId})`);
    console.log(`   Category: ${catResult.recordset[0]?.category_name} (ID: ${validCategoryId})`);

    if (!validUserId || !validCategoryId) {
        console.log('❌ Required data not found. Aborting.');
        process.exit(1);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: COURSE CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function testCRUD() {
    logSection('SECTION 1: COURSE CRUD OPERATIONS');
    let testCourseId = null;

    // CREATE
    console.log('\n🔹 1.1 CREATE Operations');

    // Test 1.1.1: Create minimal course
    try {
        const data = {
            course_name: 'CRUD Test Course',
            course_code: 'CRUD-001',
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId
        };
        const result = await Course.create(data);
        testCourseId = result.data?.course_id;
        if (testCourseId) createdCourseIds.push(testCourseId);
        logTest('Create minimal course', result.success, `ID: ${testCourseId}`);
    } catch (e) {
        logTest('Create minimal course', false, e.message);
    }

    // Test 1.1.2: Create full course with all fields
    try {
        const data = {
            course_name: 'Full CRUD Test Course',
            course_code: 'CRUD-002',
            category_id: validCategoryId,
            difficulty_level: 'Intermediate',
            course_type: 'mandatory',
            language: 'th',
            description: 'Full test course with all fields',
            learning_objectives: ['Obj1', 'Obj2', 'Obj3'],
            duration_hours: 5,
            duration_minutes: 30,
            max_students: 100,
            passing_score: 80,
            max_attempts: 3,
            certificate_validity: '365',
            created_by: validUserId,
            instructor_id: validUserId,
            instructor_name: 'Test Instructor',
            lessons: [
                { title: 'Lesson 1', duration: 30, description: 'Desc 1', has_quiz: false },
                { title: 'Lesson 2', duration: 45, description: 'Desc 2', has_quiz: true }
            ]
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);
        logTest('Create full course with lessons & quiz', result.success,
            `ID: ${result.data?.course_id}`);
    } catch (e) {
        logTest('Create full course with lessons & quiz', false, e.message);
    }

    // READ
    console.log('\n🔹 1.2 READ Operations');

    // Test 1.2.1: Find by ID
    try {
        const course = await Course.findById(testCourseId);
        logTest('FindById - existing course', !!course,
            course ? `Title: ${course.title}` : 'Not found');
    } catch (e) {
        logTest('FindById - existing course', false, e.message);
    }

    // Test 1.2.2: Find by invalid ID
    try {
        const course = await Course.findById(999999);
        logTest('FindById - non-existing ID returns null', course === null);
    } catch (e) {
        logTest('FindById - non-existing ID', false, e.message);
    }

    // Test 1.2.3: FindAll
    try {
        const result = await Course.findAll(1, 10);
        logTest('FindAll - pagination',
            result.data && Array.isArray(result.data),
            `Found ${result.data?.length || 0} courses, Total: ${result.total}`);
    } catch (e) {
        logTest('FindAll - pagination', false, e.message);
    }

    // Test 1.2.4: FindAll with filters
    try {
        const result = await Course.findAll(1, 10, { difficulty_level: 'Intermediate' });
        logTest('FindAll - with filter',
            result.data && Array.isArray(result.data),
            `Found ${result.data?.length || 0} intermediate courses`);
    } catch (e) {
        logTest('FindAll - with filter', false, e.message);
    }

    // UPDATE
    console.log('\n🔹 1.3 UPDATE Operations');

    // Test 1.3.1: Update title
    try {
        const result = await Course.update(testCourseId, {
            course_name: 'Updated Course Title'
        });
        logTest('Update course title', result.success);
    } catch (e) {
        logTest('Update course title', false, e.message);
    }

    // Test 1.3.2: Update multiple fields
    try {
        const result = await Course.update(testCourseId, {
            description: 'Updated description',
            difficulty_level: 'Advanced',
            max_students: 200
        });
        logTest('Update multiple fields', result.success);
    } catch (e) {
        logTest('Update multiple fields', false, e.message);
    }

    // Test 1.3.3: Verify update
    try {
        const course = await Course.findById(testCourseId);
        const updated = course?.difficulty_level === 'Advanced';
        logTest('Verify update persisted', updated,
            `difficulty_level: ${course?.difficulty_level}`);
    } catch (e) {
        logTest('Verify update persisted', false, e.message);
    }

    // DELETE
    console.log('\n🔹 1.4 DELETE Operations');

    // Test 1.4.1: Delete course
    try {
        const result = await Course.delete(testCourseId, validUserId);
        logTest('Delete course (soft delete)', result.success);
    } catch (e) {
        logTest('Delete course', false, e.message);
    }

    // Test 1.4.2: Verify soft delete
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, testCourseId)
            .query('SELECT is_active, is_published FROM courses WHERE course_id = @id');
        const course = result.recordset[0];
        logTest('Verify soft delete (is_active=0)',
            course?.is_active === false,
            `is_active: ${course?.is_active}`);
    } catch (e) {
        logTest('Verify soft delete', false, e.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: CATEGORY OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function testCategories() {
    logSection('SECTION 2: CATEGORY OPERATIONS');

    // Test 2.1: Get all categories
    try {
        const categories = await Course.getCategories();
        logTest('Get all categories',
            Array.isArray(categories) && categories.length > 0,
            `Found ${categories.length} categories`);
    } catch (e) {
        logTest('Get all categories', false, e.message);
    }

    // Test 2.2: Category has required fields
    try {
        const categories = await Course.getCategories();
        const cat = categories[0];
        const hasFields = cat &&
            'category_id' in cat &&
            'category_name' in cat;
        logTest('Category has required fields', hasFields,
            `Fields: category_id, category_name, course_count`);
    } catch (e) {
        logTest('Category has required fields', false, e.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: LESSON/MATERIAL OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function testLessons() {
    logSection('SECTION 3: LESSON/MATERIAL OPERATIONS');

    // Create course with lessons
    let courseId = null;
    try {
        const data = {
            course_name: 'Lesson Test Course',
            course_code: 'LESSON-001',
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId,
            lessons: [
                { title: 'บทที่ 1: Introduction', duration: 30, description: 'Intro', has_quiz: false },
                { title: 'บทที่ 2: Content', duration: 60, description: 'Main', has_quiz: true },
                { title: 'บทที่ 3: Practice', duration: 90, description: 'Practice', has_quiz: false },
                { title: 'บทที่ 4: Summary', duration: 30, description: 'Summary', has_quiz: true }
            ]
        };
        const result = await Course.create(data);
        courseId = result.data?.course_id;
        if (courseId) createdCourseIds.push(courseId);
        logTest('Create course with 4 lessons', result.success);
    } catch (e) {
        logTest('Create course with lessons', false, e.message);
        return;
    }

    // Test 3.1: Verify lessons created
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, courseId)
            .query('SELECT * FROM course_materials WHERE course_id = @id ORDER BY order_index');
        logTest('Lessons saved to database',
            result.recordset.length === 4,
            `Count: ${result.recordset.length}/4`);
    } catch (e) {
        logTest('Lessons saved to database', false, e.message);
    }

    // Test 3.2: Lesson order preserved
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, courseId)
            .query('SELECT title, order_index FROM course_materials WHERE course_id = @id ORDER BY order_index');
        const ordered = result.recordset.every((r, i) => r.order_index === i + 1);
        logTest('Lesson order preserved', ordered,
            result.recordset.map(r => `${r.order_index}:${r.title.substring(0,10)}`).join(', '));
    } catch (e) {
        logTest('Lesson order preserved', false, e.message);
    }

    // Test 3.3: Quiz/Knowledge checks created
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, courseId)
            .query("SELECT * FROM tests WHERE course_id = @id AND type = 'knowledge_check'");
        logTest('Knowledge checks created for quiz lessons',
            result.recordset.length === 2,
            `Count: ${result.recordset.length}/2`);
    } catch (e) {
        logTest('Knowledge checks created', false, e.message);
    }

    // Test 3.4: Add lesson via addLesson
    try {
        const result = await Course.addLesson(courseId, {
            lesson_title: 'บทที่ 5: Extra Content',
            lesson_order: 5,
            lesson_type: 'video',
            duration_minutes: 45,
            lesson_description: 'Additional content'
        });
        logTest('Add lesson via addLesson()', result.success);
    } catch (e) {
        logTest('Add lesson via addLesson()', false, e.message);
    }

    // Test 3.5: Lessons included in findById
    try {
        const course = await Course.findById(courseId);
        logTest('FindById includes lessons',
            course?.lessons && course.lessons.length >= 4,
            `Lessons in response: ${course?.lessons?.length}`);
    } catch (e) {
        logTest('FindById includes lessons', false, e.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: TARGET AUDIENCE
// ═══════════════════════════════════════════════════════════════════════════

async function testTargetAudience() {
    logSection('SECTION 4: TARGET AUDIENCE');

    const pool = await poolPromise;

    // Get valid positions and departments
    const posResult = await pool.request()
        .query('SELECT TOP 3 position_id FROM Positions WHERE is_active = 1');
    const deptResult = await pool.request()
        .query('SELECT TOP 3 unit_id FROM OrganizationUnits WHERE is_active = 1');

    const positions = posResult.recordset.map(r => r.position_id.toString());
    const departments = deptResult.recordset.map(r => r.unit_id.toString());

    // Test 4.1: Course with positions only
    let courseId = null;
    try {
        const data = {
            course_name: 'Target Positions Only',
            course_code: 'TARGET-001',
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId,
            target_positions: positions,
            target_departments: []
        };
        const result = await Course.create(data);
        courseId = result.data?.course_id;
        if (courseId) createdCourseIds.push(courseId);

        const course = await pool.request()
            .input('id', sql.Int, courseId)
            .query('SELECT target_audience FROM courses WHERE course_id = @id');
        const audience = JSON.parse(course.recordset[0]?.target_audience || '{}');

        logTest('Course with positions only',
            audience.positions?.length === positions.length,
            `Positions: ${audience.positions?.length}`);
    } catch (e) {
        logTest('Course with positions only', false, e.message);
    }

    // Test 4.2: Course with departments only
    try {
        const data = {
            course_name: 'Target Departments Only',
            course_code: 'TARGET-002',
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId,
            target_positions: [],
            target_departments: departments
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);

        const course = await pool.request()
            .input('id', sql.Int, result.data?.course_id)
            .query('SELECT target_audience FROM courses WHERE course_id = @id');
        const audience = JSON.parse(course.recordset[0]?.target_audience || '{}');

        logTest('Course with departments only',
            audience.departments?.length === departments.length,
            `Departments: ${audience.departments?.length}`);
    } catch (e) {
        logTest('Course with departments only', false, e.message);
    }

    // Test 4.3: Course with both positions and departments
    try {
        const data = {
            course_name: 'Target Both',
            course_code: 'TARGET-003',
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId,
            target_positions: positions,
            target_departments: departments
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);

        const course = await pool.request()
            .input('id', sql.Int, result.data?.course_id)
            .query('SELECT target_audience FROM courses WHERE course_id = @id');
        const audience = JSON.parse(course.recordset[0]?.target_audience || '{}');

        logTest('Course with both positions & departments',
            audience.positions?.length > 0 && audience.departments?.length > 0,
            `Pos: ${audience.positions?.length}, Dept: ${audience.departments?.length}`);
    } catch (e) {
        logTest('Course with both', false, e.message);
    }

    // Test 4.4: Course open for all (no target)
    try {
        const data = {
            course_name: 'Open For All',
            course_code: 'TARGET-004',
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId
            // No target_positions or target_departments
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);

        const course = await pool.request()
            .input('id', sql.Int, result.data?.course_id)
            .query('SELECT target_audience FROM courses WHERE course_id = @id');

        logTest('Course open for all (null target)',
            course.recordset[0]?.target_audience === null,
            `target_audience: ${course.recordset[0]?.target_audience}`);
    } catch (e) {
        logTest('Course open for all', false, e.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: SPECIAL FEATURES
// ═══════════════════════════════════════════════════════════════════════════

async function testSpecialFeatures() {
    logSection('SECTION 5: SPECIAL FEATURES');

    // Test 5.1: Get popular courses
    try {
        const popular = await Course.getPopular(5);
        logTest('Get popular courses', Array.isArray(popular),
            `Found ${popular.length} popular courses`);
    } catch (e) {
        logTest('Get popular courses', false, e.message);
    }

    // Test 5.2: Get recommended courses
    try {
        const recommended = await Course.getRecommended(validUserId, 5);
        logTest('Get recommended courses for user', Array.isArray(recommended),
            `Found ${recommended.length} recommendations`);
    } catch (e) {
        logTest('Get recommended courses', false, e.message);
    }

    // Test 5.3: Get courses by instructor
    try {
        const courses = await Course.getByInstructor(validUserId);
        logTest('Get courses by instructor', Array.isArray(courses),
            `Found ${courses.length} courses`);
    } catch (e) {
        logTest('Get courses by instructor', false, e.message);
    }

    // Test 5.4: Toggle publish
    let courseId = null;
    try {
        // Create a course first
        const data = {
            course_name: 'Publish Test',
            course_code: 'PUB-001',
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId
        };
        const result = await Course.create(data);
        courseId = result.data?.course_id;
        if (courseId) createdCourseIds.push(courseId);

        // Unpublish
        const unpubResult = await Course.togglePublish(courseId, false);
        logTest('Toggle publish (unpublish)', unpubResult.success);
    } catch (e) {
        logTest('Toggle publish', false, e.message);
    }

    // Test 5.5: Toggle publish back
    if (courseId) {
        try {
            const pubResult = await Course.togglePublish(courseId, true);
            logTest('Toggle publish (publish)', pubResult.success);
        } catch (e) {
            logTest('Toggle publish back', false, e.message);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: STATISTICS & PROGRESS
// ═══════════════════════════════════════════════════════════════════════════

async function testStatistics() {
    logSection('SECTION 6: STATISTICS & PROGRESS');

    // Create a course for testing
    let courseId = null;
    try {
        const data = {
            course_name: 'Statistics Test Course',
            course_code: 'STATS-001',
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId,
            lessons: [
                { title: 'Lesson 1', duration: 30, description: 'Test', has_quiz: false }
            ]
        };
        const result = await Course.create(data);
        courseId = result.data?.course_id;
        if (courseId) createdCourseIds.push(courseId);
    } catch (e) {
        console.log('   ⚠️  Could not create test course for statistics');
        return;
    }

    // Test 6.1: Get course statistics
    try {
        const stats = await Course.getCourseStatistics(courseId);
        logTest('Get course statistics',
            stats && 'overall' in stats,
            `Has overall, by_department, trends`);
    } catch (e) {
        logTest('Get course statistics', false, e.message);
    }

    // Test 6.2: Get course progress details
    try {
        const progress = await Course.getCourseProgressDetails(courseId);
        logTest('Get course progress details', Array.isArray(progress),
            `Found ${progress.length} enrollment records`);
    } catch (e) {
        logTest('Get course progress details', false, e.message);
    }

    // Test 6.3: Get progress with filters
    try {
        const progress = await Course.getCourseProgressDetails(courseId, {
            status: 'COMPLETED'
        });
        logTest('Get progress with status filter', Array.isArray(progress),
            `Completed: ${progress.length}`);
    } catch (e) {
        logTest('Get progress with filter', false, e.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: DATA VALIDATION & EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

async function testValidation() {
    logSection('SECTION 7: DATA VALIDATION & EDGE CASES');

    // Test 7.1: Very long course name
    try {
        const data = {
            course_name: 'A'.repeat(200) + ' Test Course',
            course_code: 'LONG-001',
            category_id: validCategoryId,
            created_by: validUserId,
            instructor_id: validUserId
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);
        logTest('Very long course name (200+ chars)', result.success);
    } catch (e) {
        logTest('Very long course name', false, e.message);
    }

    // Test 7.2: Unicode/Thai characters
    try {
        const data = {
            course_name: 'หลักสูตร ภาษาไทย 日本語 한국어 ' + Date.now(),
            course_code: 'UNICODE-001',
            category_id: validCategoryId,
            description: 'คำอธิบาย ภาษาไทย with English and 数字',
            learning_objectives: ['เป้าหมาย 1', 'เป้าหมาย 2'],
            created_by: validUserId,
            instructor_id: validUserId
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);
        logTest('Unicode/Thai characters', result.success);
    } catch (e) {
        logTest('Unicode/Thai characters', false, e.message);
    }

    // Test 7.3: Special characters
    try {
        const data = {
            course_name: 'Course with "quotes" & <tags> ' + Date.now(),
            course_code: 'SPECIAL-001',
            category_id: validCategoryId,
            description: 'Description with "quotes" & <script>test</script>',
            created_by: validUserId,
            instructor_id: validUserId
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);
        logTest('Special characters handling', result.success);
    } catch (e) {
        logTest('Special characters', false, e.message);
    }

    // Test 7.4: Empty description
    try {
        const data = {
            course_name: 'Course No Description ' + Date.now(),
            course_code: 'NODESC-001',
            category_id: validCategoryId,
            description: '',
            created_by: validUserId,
            instructor_id: validUserId
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);
        logTest('Empty description allowed', result.success);
    } catch (e) {
        logTest('Empty description', false, e.message);
    }

    // Test 7.5: Zero duration
    try {
        const data = {
            course_name: 'Zero Duration Course ' + Date.now(),
            course_code: 'ZERO-001',
            category_id: validCategoryId,
            duration_hours: 0,
            duration_minutes: 0,
            created_by: validUserId,
            instructor_id: validUserId
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);
        logTest('Zero duration allowed', result.success);
    } catch (e) {
        logTest('Zero duration', false, e.message);
    }

    // Test 7.6: Null optional fields
    try {
        const data = {
            course_name: 'Null Fields Course ' + Date.now(),
            course_code: 'NULL-001',
            category_id: validCategoryId,
            description: null,
            passing_score: null,
            max_attempts: null,
            max_students: null,
            certificate_validity: null,
            created_by: validUserId,
            instructor_id: validUserId
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);
        logTest('Null optional fields handled', result.success);
    } catch (e) {
        logTest('Null optional fields', false, e.message);
    }

    // Test 7.7: FindById with invalid input
    try {
        await Course.findById('invalid');
        logTest('FindById rejects invalid input', false, 'Should have thrown');
    } catch (e) {
        logTest('FindById rejects invalid input',
            e.message.includes('Invalid') || e.message.includes('Validation'),
            'Properly rejected');
    }

    // Test 7.8: FindById with negative ID
    try {
        await Course.findById(-1);
        logTest('FindById rejects negative ID', false, 'Should have thrown');
    } catch (e) {
        logTest('FindById rejects negative ID', true, 'Properly rejected');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: LEARNING OBJECTIVES
// ═══════════════════════════════════════════════════════════════════════════

async function testLearningObjectives() {
    logSection('SECTION 8: LEARNING OBJECTIVES');

    // Test 8.1: Single objective
    try {
        const data = {
            course_name: 'Single Objective Course',
            course_code: 'OBJ-001',
            category_id: validCategoryId,
            learning_objectives: ['เป้าหมายเดียว'],
            created_by: validUserId,
            instructor_id: validUserId
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);

        const course = await Course.findById(result.data?.course_id);
        logTest('Single learning objective',
            course?.learning_objectives?.length === 1,
            `Count: ${course?.learning_objectives?.length}`);
    } catch (e) {
        logTest('Single learning objective', false, e.message);
    }

    // Test 8.2: Many objectives
    try {
        const objectives = Array.from({length: 10}, (_, i) => `เป้าหมายที่ ${i + 1}`);
        const data = {
            course_name: 'Many Objectives Course',
            course_code: 'OBJ-002',
            category_id: validCategoryId,
            learning_objectives: objectives,
            created_by: validUserId,
            instructor_id: validUserId
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);

        const course = await Course.findById(result.data?.course_id);
        logTest('Many learning objectives (10)',
            course?.learning_objectives?.length === 10,
            `Count: ${course?.learning_objectives?.length}`);
    } catch (e) {
        logTest('Many learning objectives', false, e.message);
    }

    // Test 8.3: Empty objectives array
    try {
        const data = {
            course_name: 'No Objectives Course',
            course_code: 'OBJ-003',
            category_id: validCategoryId,
            learning_objectives: [],
            created_by: validUserId,
            instructor_id: validUserId
        };
        const result = await Course.create(data);
        if (result.data?.course_id) createdCourseIds.push(result.data.course_id);
        logTest('Empty objectives array allowed', result.success);
    } catch (e) {
        logTest('Empty objectives array', false, e.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════

async function runAllTests() {
    console.log('═'.repeat(60));
    console.log('   🧪 COMPREHENSIVE COURSE API TEST');
    console.log('   ทดสอบทุกฟังก์ชัน Course แบบละเอียด');
    console.log('═'.repeat(60));

    const startTime = Date.now();

    try {
        await setup();

        await testCRUD();
        await testCategories();
        await testLessons();
        await testTargetAudience();
        await testSpecialFeatures();
        await testStatistics();
        await testValidation();
        await testLearningObjectives();

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await cleanup();
        console.log('   ✅ Cleanup complete');

    } catch (error) {
        console.error('\n❌ Test runner error:', error.message);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('   📊 TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log(`   Total Tests: ${passCount + failCount}`);
    console.log(`   ✅ Passed: ${passCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
    console.log(`   Duration: ${duration} seconds`);
    console.log('═'.repeat(60));

    if (failCount > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.filter(t => !t.passed).forEach(t => {
            console.log(`   • ${t.testName}`);
            if (t.message) console.log(`     └─ ${t.message}`);
        });
    }

    console.log('\n✅ All tests completed!');
    process.exit(failCount > 0 ? 1 : 0);
}

runAllTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
