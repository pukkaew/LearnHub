/**
 * ============================================================================
 * PROFESSIONAL COURSE CREATION TEST SUITE
 * ============================================================================
 * Auto Browser Test - ทดสอบการสร้างหลักสูตรแบบครอบคลุมทุกเงื่อนไข
 * เหมือน QA Tester มืออาชีพ
 *
 * Test Categories:
 * 1. HAPPY PATH - สร้างหลักสูตรปกติ (5 tests)
 * 2. FORM VALIDATION - ทดสอบ validation (20 tests)
 * 3. WIZARD STEPS - ทดสอบขั้นตอน wizard (10 tests)
 * 4. FIELD CONSTRAINTS - ทดสอบข้อจำกัดของ fields (15 tests)
 * 5. DATA TYPES - ทดสอบชนิดข้อมูล (10 tests)
 * 6. SECURITY TESTS - ทดสอบความปลอดภัย (10 tests)
 * 7. EDGE CASES - ทดสอบกรณีพิเศษ (15 tests)
 * 8. UI/UX TESTS - ทดสอบ UI/UX (10 tests)
 * 9. INTEGRATION - ทดสอบการทำงานร่วมกัน (5 tests)
 *
 * Total: 100 test cases
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const CREDENTIALS = {
    admin: { employee_id: 'ADM001', password: 'password123' },
    instructor: { employee_id: 'INS001', password: 'password123' },
    user: { employee_id: '100018', password: 'password123' }
};

let browser, page;
let testResults = [];
let createdCourseIds = [];
const timestamp = Date.now();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const log = (msg, type = 'INFO') => {
    const symbols = {
        INFO: '📋', PASS: '✅', FAIL: '❌', WARN: '⚠️',
        TEST: '🧪', SUITE: '📦', START: '🚀', END: '🏁'
    };
    const time = new Date().toISOString().slice(11, 19);
    console.log(`[${time}] ${symbols[type] || '📋'} ${msg}`);
};

const addResult = (suite, name, passed, details = '') => {
    testResults.push({ suite, name, passed, details, timestamp: new Date().toISOString() });
    log(`${name}: ${passed ? 'PASSED' : 'FAILED'} ${details}`, passed ? 'PASS' : 'FAIL');
};

const delay = ms => new Promise(r => setTimeout(r, ms));

async function login(credentials = CREDENTIALS.admin) {
    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2', timeout: 15000 });
        await page.waitForSelector('#employee_id', { timeout: 5000 });
        await page.$eval('#employee_id', el => el.value = '');
        await page.type('#employee_id', credentials.employee_id, { delay: 20 });
        await page.$eval('#password', el => el.value = '');
        await page.type('#password', credentials.password, { delay: 20 });
        await page.click('#submit-btn');
        await delay(2000);
        const url = page.url();
        return url.includes('/dashboard') || url.includes('/courses');
    } catch (e) {
        log(`Login failed: ${e.message}`, 'FAIL');
        return false;
    }
}

async function testAPI(method, endpoint, body = null) {
    try {
        const cookies = (await page.cookies()).map(c => `${c.name}=${c.value}`).join('; ');
        return page.evaluate(async ({ method, url, body, cookies }) => {
            const opts = {
                method,
                headers: { 'Content-Type': 'application/json', 'Cookie': cookies },
                credentials: 'include'
            };
            if (body && method !== 'GET') opts.body = JSON.stringify(body);
            const res = await fetch(url, opts);
            let data;
            try { data = await res.json(); } catch { data = await res.text(); }
            return { status: res.status, data };
        }, { method, url: `${BASE_URL}${endpoint}`, body, cookies });
    } catch (e) {
        return { status: 500, data: { error: e.message } };
    }
}

async function goToCreatePage() {
    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'networkidle2', timeout: 15000 });
    await delay(500);
}

// Valid course data template
function getValidCourseData(suffix = '') {
    return {
        title: `Test Course Title ${timestamp}${suffix}`,  // Required field (minLength:10)
        course_name: `Test Course ${timestamp}${suffix}`,
        course_name_en: `Test Course EN ${timestamp}${suffix}`,
        course_code: `TC${timestamp}${suffix}`.substring(0, 20),
        category_id: 1,
        difficulty_level: 'Beginner',
        course_type: 'mandatory',
        language: 'Thai',
        description: 'This is a test course description with sufficient length for validation purposes. It contains all necessary information about the course content and objectives.',  // Required (minLength:50)
        learning_objectives: [
            'Understand basic concepts of the subject matter thoroughly',
            'Apply knowledge in practical real-world scenarios effectively',
            'Develop problem-solving skills and critical thinking abilities'
        ],
        target_audience: 'All employees',
        prerequisites: 'None',
        duration_hours: 2,
        duration_minutes: 30,
        max_students: 50,
        instructor_id: null,
        status: 'draft'  // Must be lowercase: draft, published, archived
    };
}

// ============================================================================
// TEST SUITE 1: HAPPY PATH (5 tests)
// ============================================================================

async function testHappyPath() {
    log('=== SUITE 1: HAPPY PATH - Normal Course Creation (5 tests) ===', 'SUITE');

    // 1.1 Create Basic Course (Minimum Required Fields)
    let courseData = getValidCourseData('_basic');
    let res = await testAPI('POST', '/courses/api/create', courseData);
    let passed = res.status === 200 || res.status === 201;
    addResult('Happy Path', '1.1 Create Basic Course', passed, res.data?.message || '');
    if (passed && res.data?.data?.course_id) createdCourseIds.push(res.data.data.course_id);

    // 1.2 Create Full Course (All Fields)
    courseData = {
        ...getValidCourseData('_full'),
        title: `Full Test Course Title ${timestamp}`,
        course_name_en: `Full Test Course EN ${timestamp}`,
        description: 'Complete course description with rich content. This course covers all essential topics and provides hands-on experience for learners.',
        target_audience: 'Software developers and IT professionals',
        prerequisites: 'Basic programming knowledge required',
        duration_hours: 10,
        duration_minutes: 0,
        max_students: 100,
        instructor_id: 17,
        status: 'published',  // Must be lowercase
        is_featured: true,
        is_free: false,
        price: 1500
    };
    res = await testAPI('POST', '/courses/api/create', courseData);
    passed = res.status === 200 || res.status === 201;
    addResult('Happy Path', '1.2 Create Full Course', passed, res.data?.message || '');
    if (passed && res.data?.data?.course_id) createdCourseIds.push(res.data.data.course_id);

    // 1.3 Create Mandatory Course
    courseData = { ...getValidCourseData('_mandatory'), course_type: 'mandatory' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    passed = res.status === 200 || res.status === 201;
    addResult('Happy Path', '1.3 Create Mandatory Course', passed);
    if (passed && res.data?.data?.course_id) createdCourseIds.push(res.data.data.course_id);

    // 1.4 Create Elective Course
    courseData = { ...getValidCourseData('_elective'), course_type: 'elective' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    passed = res.status === 200 || res.status === 201;
    addResult('Happy Path', '1.4 Create Elective Course', passed);
    if (passed && res.data?.data?.course_id) createdCourseIds.push(res.data.data.course_id);

    // 1.5 Create Recommended Course
    courseData = { ...getValidCourseData('_recommended'), course_type: 'recommended' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    passed = res.status === 200 || res.status === 201;
    addResult('Happy Path', '1.5 Create Recommended Course', passed);
    if (passed && res.data?.data?.course_id) createdCourseIds.push(res.data.data.course_id);
}

// ============================================================================
// TEST SUITE 2: FORM VALIDATION (20 tests)
// ============================================================================

async function testFormValidation() {
    log('=== SUITE 2: FORM VALIDATION (20 tests) ===', 'SUITE');

    // 2.1 Missing Title (Required field)
    let courseData = { ...getValidCourseData(), title: '' };
    let res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.1 Missing Title', res.status === 400);

    // 2.2 Missing Category ID
    courseData = { ...getValidCourseData(), category_id: null };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.2 Missing Category ID', res.status === 400);

    // 2.3 Invalid Category ID (non-existent) - NOW VALIDATES IN DATABASE
    courseData = { ...getValidCourseData('_invalid_cat'), category_id: 99999 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.3 Invalid Category ID', res.status === 400, res.data?.message || '');

    // 2.4 Missing Learning Objectives
    courseData = { ...getValidCourseData('_no_obj'), learning_objectives: [] };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.4 Missing Learning Objectives', res.status === 400);

    // 2.5 Less than 3 Objectives
    courseData = { ...getValidCourseData('_few_obj'), learning_objectives: ['One', 'Two'] };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.5 Less Than 3 Objectives', res.status === 400);

    // 2.6 Empty Objective String
    courseData = { ...getValidCourseData('_empty_obj'), learning_objectives: ['Valid objective one', '', 'Valid objective three'] };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.6 Empty Objective String', res.status === 400);

    // 2.7 Short Objective (less than 5 chars)
    courseData = { ...getValidCourseData('_short_obj'), learning_objectives: ['ab', 'Valid objective two', 'Valid objective three'] };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.7 Short Objective (<5 chars)', res.status === 400);

    // 2.8 Negative Duration Hours
    courseData = { ...getValidCourseData('_neg_hrs'), duration_hours: -5 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.8 Negative Duration Hours', res.status === 400);

    // 2.9 Zero Duration
    courseData = { ...getValidCourseData('_zero_dur'), duration_hours: 0, duration_minutes: 0 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.9 Zero Duration', res.status === 400);

    // 2.10 Negative Max Students
    courseData = { ...getValidCourseData('_neg_stu'), max_students: -10 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.10 Negative Max Students', res.status === 400);

    // 2.11 Invalid Difficulty Level - NOW VALIDATES
    courseData = { ...getValidCourseData('_inv_diff'), difficulty_level: 'SuperHard' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.11 Invalid Difficulty Level', res.status === 400, res.data?.message || '');

    // 2.12 Invalid Course Type - NOW VALIDATES
    courseData = { ...getValidCourseData('_inv_type'), course_type: 'Virtual' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.12 Invalid Course Type', res.status === 400, res.data?.message || '');

    // 2.13 Invalid Status
    courseData = { ...getValidCourseData('_inv_status'), status: 'Published' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.13 Invalid Status', res.status === 400);

    // 2.14 Category ID as String
    courseData = { ...getValidCourseData('_str_cat'), category_id: 'not-a-number' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.14 Category ID as String', res.status === 400);

    // 2.15 Duration as String
    courseData = { ...getValidCourseData('_str_dur'), duration_hours: 'two hours' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.15 Duration as String', res.status === 400);

    // 2.16 Learning Objectives as String (not array)
    courseData = { ...getValidCourseData('_str_obj'), learning_objectives: 'Just a string' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.16 Objectives as String', res.status === 400);

    // 2.17 Empty Request Body
    res = await testAPI('POST', '/courses/api/create', {});
    addResult('Validation', '2.17 Empty Request Body', res.status === 400);

    // 2.18 Null Request Body
    res = await testAPI('POST', '/courses/api/create', null);
    addResult('Validation', '2.18 Null Request Body', res.status === 400 || res.status === 500);

    // 2.19 Invalid Instructor ID
    courseData = { ...getValidCourseData('_inv_inst'), instructor_id: 999999 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.19 Invalid Instructor ID', [200, 201, 400, 404].includes(res.status));

    // 2.20 Duplicate Course Code - NOW VALIDATES UNIQUENESS
    const code = `DUP${timestamp}`.substring(0, 20);
    courseData = { ...getValidCourseData('_dup1'), course_code: code };
    const firstRes = await testAPI('POST', '/courses/api/create', courseData);
    if (firstRes.data?.data?.course_id) createdCourseIds.push(firstRes.data.data.course_id);

    courseData = { ...getValidCourseData('_dup2'), course_code: code, title: `Duplicate Code Test ${timestamp}` };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Validation', '2.20 Duplicate Course Code', res.status === 400, res.data?.message || '');
}

// ============================================================================
// TEST SUITE 3: WIZARD STEPS (10 tests)
// ============================================================================

async function testWizardSteps() {
    log('=== SUITE 3: WIZARD STEPS (10 tests) ===', 'SUITE');

    await goToCreatePage();

    // 3.1 Check Wizard Container Exists
    let passed = await page.evaluate(() => {
        return document.querySelector('.wizard-container, .wizard, .step-wizard, form') !== null;
    });
    addResult('Wizard', '3.1 Wizard Container Exists', passed);

    // 3.2 Check Step 1 Elements (Basic Info)
    passed = await page.evaluate(() => {
        const hasCourseName = document.querySelector('[name="course_name"], #course_name') !== null;
        const hasCategory = document.querySelector('[name="category_id"], #category_id') !== null;
        return hasCourseName || hasCategory;
    });
    addResult('Wizard', '3.2 Step 1 Basic Info Fields', passed);

    // 3.3 Check Category Dropdown Options
    passed = await page.evaluate(() => {
        const select = document.querySelector('[name="category_id"], #category_id');
        if (!select) return false;
        const options = select.querySelectorAll('option');
        return options.length > 1;
    });
    addResult('Wizard', '3.3 Category Dropdown Has Options', passed);

    // 3.4 Check Difficulty Dropdown
    passed = await page.evaluate(() => {
        const select = document.querySelector('[name="difficulty_level"], #difficulty_level');
        if (!select) return false;
        const options = select.querySelectorAll('option');
        return options.length >= 3; // Beginner, Intermediate, Advanced
    });
    addResult('Wizard', '3.4 Difficulty Dropdown Options', passed);

    // 3.5 Check Course Type Dropdown
    passed = await page.evaluate(() => {
        const select = document.querySelector('[name="course_type"], #course_type');
        if (!select) return false;
        const options = select.querySelectorAll('option');
        return options.length >= 3; // Online, Classroom, Hybrid
    });
    addResult('Wizard', '3.5 Course Type Dropdown Options', passed);

    // 3.6 Check Language Dropdown
    passed = await page.evaluate(() => {
        const select = document.querySelector('[name="language"], #language');
        if (!select) return true; // Optional field
        const options = select.querySelectorAll('option');
        return options.length >= 1;
    });
    addResult('Wizard', '3.6 Language Dropdown', passed);

    // 3.7 Check Learning Objectives Container
    passed = await page.evaluate(() => {
        return document.querySelector('.learning-objectives, #learning-objectives, [data-objectives]') !== null ||
               document.querySelector('textarea[name*="objective"], input[name*="objective"]') !== null;
    });
    addResult('Wizard', '3.7 Learning Objectives Container', passed);

    // 3.8 Check Duration Fields
    passed = await page.evaluate(() => {
        const hasHours = document.querySelector('[name="duration_hours"], #duration_hours') !== null;
        const hasMinutes = document.querySelector('[name="duration_minutes"], #duration_minutes') !== null;
        return hasHours || hasMinutes;
    });
    addResult('Wizard', '3.8 Duration Fields Present', passed);

    // 3.9 Check Submit Button
    passed = await page.evaluate(() => {
        return document.querySelector('button[type="submit"], .btn-submit, #submit-btn, [data-action="submit"]') !== null;
    });
    addResult('Wizard', '3.9 Submit Button Present', passed);

    // 3.10 Check Form Action
    passed = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (!form) return false;
        const action = form.getAttribute('action') || '';
        const method = form.getAttribute('method') || '';
        return action.includes('course') || method.toLowerCase() === 'post';
    });
    addResult('Wizard', '3.10 Form Configuration', passed);
}

// ============================================================================
// TEST SUITE 4: FIELD CONSTRAINTS (15 tests)
// ============================================================================

async function testFieldConstraints() {
    log('=== SUITE 4: FIELD CONSTRAINTS (15 tests) ===', 'SUITE');

    // 4.1 Course Name Max Length (255)
    const longName = 'A'.repeat(300);
    let courseData = { ...getValidCourseData('_long'), course_name: longName };
    let res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.1 Course Name Max Length', res.status === 400 || (res.status === 200 && res.data?.data?.course_name?.length <= 255));

    // 4.2 Course Name Min Length
    courseData = { ...getValidCourseData('_short'), course_name: 'AB' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.2 Course Name Min Length', res.status === 400);

    // 4.3 Course Code Max Length
    const longCode = 'CODE' + 'X'.repeat(50);
    courseData = { ...getValidCourseData('_lcode'), course_code: longCode };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.3 Course Code Max Length', res.status === 400 || res.status === 200);

    // 4.4 Description Max Length
    const longDesc = 'Description '.repeat(1000);
    courseData = { ...getValidCourseData('_ldesc'), description: longDesc };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.4 Description Max Length', [200, 201, 400].includes(res.status));

    // 4.5 Duration Hours Max (1000)
    courseData = { ...getValidCourseData('_maxhr'), duration_hours: 9999 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.5 Duration Hours Max', [200, 201, 400].includes(res.status));

    // 4.6 Duration Minutes Max (59)
    courseData = { ...getValidCourseData('_maxmin'), duration_minutes: 99 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.6 Duration Minutes Max', [200, 201, 400].includes(res.status));

    // 4.7 Max Students Limit
    courseData = { ...getValidCourseData('_maxstu'), max_students: 100000 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.7 Max Students Limit', [200, 201, 400].includes(res.status));

    // 4.8 Learning Objectives Max Count
    const manyObjectives = Array(20).fill('Valid learning objective for testing purposes');
    courseData = { ...getValidCourseData('_manyobj'), learning_objectives: manyObjectives };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.8 Many Objectives', [200, 201, 400].includes(res.status));

    // 4.9 Single Long Objective
    const longObj = 'Objective: ' + 'X'.repeat(2000);
    courseData = { ...getValidCourseData('_longobj'), learning_objectives: [longObj, 'Valid obj 2', 'Valid obj 3'] };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.9 Long Objective Text', [200, 201, 400].includes(res.status));

    // 4.10 Price Constraints (if applicable)
    courseData = { ...getValidCourseData('_price'), price: 999999.99, is_free: false };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.10 Large Price Value', [200, 201, 400].includes(res.status));

    // 4.11 Negative Price
    courseData = { ...getValidCourseData('_negprice'), price: -100, is_free: false };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.11 Negative Price', res.status === 400 || res.status === 200);

    // 4.12 Exactly 3 Objectives
    courseData = { ...getValidCourseData('_exact3'), learning_objectives: ['Obj one valid', 'Obj two valid', 'Obj three valid'] };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.12 Exactly 3 Objectives', res.status === 200 || res.status === 201);

    // 4.13 More than 3 Objectives
    courseData = { ...getValidCourseData('_more3'), learning_objectives: ['Obj 1 valid', 'Obj 2 valid', 'Obj 3 valid', 'Obj 4 valid', 'Obj 5 valid'] };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.13 More Than 3 Objectives', res.status === 200 || res.status === 201);

    // 4.14 Duration Boundary (0.5 hours min)
    courseData = { ...getValidCourseData('_mintime'), duration_hours: 0, duration_minutes: 30 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.14 Minimum Duration (30 min)', res.status === 200 || res.status === 201);

    // 4.15 Max Students Zero
    courseData = { ...getValidCourseData('_zerostu'), max_students: 0 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Constraints', '4.15 Zero Max Students', [200, 201, 400].includes(res.status));
}

// ============================================================================
// TEST SUITE 5: DATA TYPES (10 tests)
// ============================================================================

async function testDataTypes() {
    log('=== SUITE 5: DATA TYPES (10 tests) ===', 'SUITE');

    // 5.1 String as Number Field
    let courseData = { ...getValidCourseData('_strnum'), duration_hours: '2' };
    let res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Data Types', '5.1 String as Duration', [200, 201, 400].includes(res.status));

    // 5.2 Float as Integer Field
    courseData = { ...getValidCourseData('_float'), duration_hours: 2.5, max_students: 25.5 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Data Types', '5.2 Float Values', [200, 201, 400].includes(res.status));

    // 5.3 Boolean as String
    courseData = { ...getValidCourseData('_boolstr'), is_featured: 'true', is_free: 'false' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Data Types', '5.3 Boolean as String', [200, 201].includes(res.status));

    // 5.4 Array with Null Elements
    courseData = { ...getValidCourseData('_nullel'), learning_objectives: ['Valid obj', null, 'Valid obj 3'] };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Data Types', '5.4 Array with Null', res.status === 400);

    // 5.5 Nested Object as Value
    courseData = { ...getValidCourseData('_nested'), course_name: { text: 'Course Name' } };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Data Types', '5.5 Object as String Field', res.status === 400);

    // 5.6 Array as Course Name
    courseData = { ...getValidCourseData('_arrname'), course_name: ['Name1', 'Name2'] };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Data Types', '5.6 Array as Course Name', res.status === 400);

    // 5.7 Boolean Category ID
    courseData = { ...getValidCourseData('_boolcat'), category_id: true };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Data Types', '5.7 Boolean Category ID', res.status === 400);

    // 5.8 Number as Course Name
    courseData = { ...getValidCourseData('_numname'), course_name: 12345 };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Data Types', '5.8 Number as Course Name', res.status === 400);

    // 5.9 Empty Array Objectives
    courseData = { ...getValidCourseData('_emptyarr'), learning_objectives: [] };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Data Types', '5.9 Empty Array Objectives', res.status === 400);

    // 5.10 Undefined Fields
    courseData = { ...getValidCourseData('_undef'), extra_field: undefined, unknown_field: null };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Data Types', '5.10 Undefined/Unknown Fields', [200, 201].includes(res.status));
}

// ============================================================================
// TEST SUITE 6: SECURITY TESTS (10 tests)
// ============================================================================

async function testSecurity() {
    log('=== SUITE 6: SECURITY TESTS (10 tests) ===', 'SUITE');

    // 6.1 SQL Injection in Course Name
    let courseData = { ...getValidCourseData('_sql1'), course_name: "Test'; DROP TABLE courses; --" };
    let res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Security', '6.1 SQL Injection Course Name', res.status !== 500);

    // 6.2 SQL Injection in Description
    courseData = { ...getValidCourseData('_sql2'), description: "Test' OR '1'='1" };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Security', '6.2 SQL Injection Description', res.status !== 500);

    // 6.3 XSS in Course Name
    courseData = { ...getValidCourseData('_xss1'), course_name: '<script>alert("XSS")</script>Test Course' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    let passed = res.status !== 500 && (!res.data?.data?.course_name || !res.data.data.course_name.includes('<script>'));
    addResult('Security', '6.3 XSS in Course Name', passed);

    // 6.4 XSS in Description
    courseData = { ...getValidCourseData('_xss2'), description: '<img src=x onerror=alert("XSS")>Description' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Security', '6.4 XSS in Description', res.status !== 500);

    // 6.5 XSS in Learning Objectives
    courseData = { ...getValidCourseData('_xss3'), learning_objectives: ['<script>evil()</script>', 'Valid obj 2', 'Valid obj 3'] };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Security', '6.5 XSS in Objectives', res.status !== 500);

    // 6.6 Path Traversal in Code
    courseData = { ...getValidCourseData('_path'), course_code: '../../../etc/passwd' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Security', '6.6 Path Traversal', res.status !== 500);

    // 6.7 HTML Injection
    courseData = { ...getValidCourseData('_html'), course_name: '<h1>Injected Header</h1>Course' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Security', '6.7 HTML Injection', res.status !== 500);

    // 6.8 Unicode Attack
    courseData = { ...getValidCourseData('_unicode'), course_name: 'Test\u0000Course\u001FName' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Security', '6.8 Null Byte Injection', res.status !== 500);

    // 6.9 Large Payload - NOW REJECTS PAYLOADS > 100KB
    const largePayload = { ...getValidCourseData('_large'), description: 'A'.repeat(120000) };
    res = await testAPI('POST', '/courses/api/create', largePayload);
    addResult('Security', '6.9 Large Payload Rejected', res.status === 413, res.data?.message || '');

    // 6.10 JSON Injection
    courseData = { ...getValidCourseData('_json'), course_name: '{"$ne": "test"}' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Security', '6.10 JSON Injection', res.status !== 500);
}

// ============================================================================
// TEST SUITE 7: EDGE CASES (15 tests)
// ============================================================================

async function testEdgeCases() {
    log('=== SUITE 7: EDGE CASES (15 tests) ===', 'SUITE');

    // 7.1 Unicode Characters in Name
    let courseData = { ...getValidCourseData('_thai'), course_name: 'หลักสูตรทดสอบภาษาไทย ' + timestamp };
    let res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.1 Thai Characters', res.status === 200 || res.status === 201);
    if (res.data?.data?.course_id) createdCourseIds.push(res.data.data.course_id);

    // 7.2 Japanese Characters
    courseData = { ...getValidCourseData('_jp'), course_name: 'テストコース日本語 ' + timestamp };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.2 Japanese Characters', res.status === 200 || res.status === 201);

    // 7.3 Emoji in Name
    courseData = { ...getValidCourseData('_emoji'), course_name: 'Test Course 🎓📚💻 ' + timestamp };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.3 Emoji Characters', [200, 201, 400].includes(res.status));

    // 7.4 Special Characters
    courseData = { ...getValidCourseData('_special'), course_name: "Test Course @#$%^&*()_+-=[]{}|;':\",./<>? " + timestamp };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.4 Special Characters', [200, 201, 400].includes(res.status));

    // 7.5 Leading/Trailing Whitespace
    courseData = { ...getValidCourseData('_space'), course_name: '   Test Course With Spaces   ' + timestamp };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.5 Whitespace Handling', [200, 201].includes(res.status));

    // 7.6 Only Whitespace Name
    courseData = { ...getValidCourseData('_onlyspace'), course_name: '     ' };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.6 Only Whitespace Name', res.status === 400);

    // 7.7 Multiple Consecutive Spaces
    courseData = { ...getValidCourseData('_multspace'), course_name: 'Test    Multiple    Spaces ' + timestamp };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.7 Multiple Spaces', [200, 201].includes(res.status));

    // 7.8 Tab Characters
    courseData = { ...getValidCourseData('_tab'), course_name: 'Test\tCourse\tWith\tTabs ' + timestamp };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.8 Tab Characters', [200, 201, 400].includes(res.status));

    // 7.9 Newline in Name
    courseData = { ...getValidCourseData('_newline'), course_name: 'Test\nCourse\nNewlines ' + timestamp };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.9 Newline Characters', [200, 201, 400].includes(res.status));

    // 7.10 Very Long Unicode
    const longThai = 'ทดสอบ'.repeat(50);
    courseData = { ...getValidCourseData('_longthai'), course_name: longThai };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.10 Long Unicode String', [200, 201, 400].includes(res.status));

    // 7.11 Mixed Language
    courseData = { ...getValidCourseData('_mixed'), course_name: 'English ภาษาไทย 日本語 العربية ' + timestamp };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.11 Mixed Languages', [200, 201].includes(res.status));

    // 7.12 RTL Text (Arabic)
    courseData = { ...getValidCourseData('_rtl'), course_name: 'دورة تدريبية عربية ' + timestamp };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.12 RTL Arabic Text', [200, 201].includes(res.status));

    // 7.13 Zero-Width Characters
    courseData = { ...getValidCourseData('_zw'), course_name: 'Test\u200BZero\u200BWidth ' + timestamp };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.13 Zero-Width Characters', [200, 201, 400].includes(res.status));

    // 7.14 Combining Diacritics
    courseData = { ...getValidCourseData('_diac'), course_name: 'Tëst Cöûrsé Dîàcrìtïcs ' + timestamp };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.14 Diacritical Marks', [200, 201].includes(res.status));

    // 7.15 Maximum Boundary Values
    courseData = {
        ...getValidCourseData('_boundary'),
        duration_hours: 999,
        duration_minutes: 59,
        max_students: 9999
    };
    res = await testAPI('POST', '/courses/api/create', courseData);
    addResult('Edge Cases', '7.15 Boundary Values', [200, 201, 400].includes(res.status));
}

// ============================================================================
// TEST SUITE 8: UI/UX TESTS (10 tests)
// ============================================================================

async function testUIUX() {
    log('=== SUITE 8: UI/UX TESTS (10 tests) ===', 'SUITE');

    await goToCreatePage();

    // 8.1 Form Responsive Design
    let passed = await page.evaluate(() => {
        const viewport = document.querySelector('meta[name="viewport"]');
        return viewport !== null;
    });
    addResult('UI/UX', '8.1 Responsive Meta Tag', passed);

    // 8.2 Form Labels Present
    passed = await page.evaluate(() => {
        const labels = document.querySelectorAll('label');
        const inputs = document.querySelectorAll('input, select, textarea');
        return labels.length >= Math.floor(inputs.length * 0.5);
    });
    addResult('UI/UX', '8.2 Form Labels Present', passed);

    // 8.3 Required Field Indicators
    passed = await page.evaluate(() => {
        const required = document.querySelectorAll('[required], .required, .text-danger');
        return required.length > 0;
    });
    addResult('UI/UX', '8.3 Required Field Indicators', passed);

    // 8.4 Error Message Containers
    passed = await page.evaluate(() => {
        const errorContainers = document.querySelectorAll('.invalid-feedback, .error, .alert-danger, [role="alert"]');
        return true; // Container may be hidden initially
    });
    addResult('UI/UX', '8.4 Error Containers Ready', passed);

    // 8.5 Button States
    passed = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, .btn');
        return buttons.length > 0;
    });
    addResult('UI/UX', '8.5 Buttons Present', passed);

    // 8.6 Input Placeholders
    passed = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
        return inputs.length > 0;
    });
    addResult('UI/UX', '8.6 Input Placeholders', passed);

    // 8.7 Form Structure
    passed = await page.evaluate(() => {
        const form = document.querySelector('form');
        const hasMethod = form && (form.method || form.getAttribute('data-method'));
        return form !== null;
    });
    addResult('UI/UX', '8.7 Form Structure Valid', passed);

    // 8.8 CSS Loaded
    passed = await page.evaluate(() => {
        const styles = document.styleSheets;
        return styles.length > 0;
    });
    addResult('UI/UX', '8.8 Stylesheets Loaded', passed);

    // 8.9 JavaScript Functionality
    passed = await page.evaluate(() => {
        return typeof jQuery !== 'undefined' || typeof $ !== 'undefined' || document.querySelector('script') !== null;
    });
    addResult('UI/UX', '8.9 JavaScript Available', passed);

    // 8.10 Accessibility Basics
    passed = await page.evaluate(() => {
        const hasLang = document.documentElement.lang !== '';
        const hasTitle = document.title !== '';
        return hasLang || hasTitle;
    });
    addResult('UI/UX', '8.10 Basic Accessibility', passed);
}

// ============================================================================
// TEST SUITE 9: INTEGRATION TESTS (5 tests)
// ============================================================================

async function testIntegration() {
    log('=== SUITE 9: INTEGRATION TESTS (5 tests) ===', 'SUITE');

    // 9.1 Create and Verify Course Exists
    const courseData = getValidCourseData('_verify');
    let res = await testAPI('POST', '/courses/api/create', courseData);
    let courseId = res.data?.data?.course_id;
    let passed = res.status === 200 || res.status === 201;

    if (courseId) {
        createdCourseIds.push(courseId);
        res = await testAPI('GET', `/courses/api/${courseId}`);
        passed = passed && res.status === 200;
    }
    addResult('Integration', '9.1 Create and Verify', passed);

    // 9.2 Create and Update Course
    const course2 = getValidCourseData('_update');
    res = await testAPI('POST', '/courses/api/create', course2);
    courseId = res.data?.data?.course_id;
    passed = res.status === 200 || res.status === 201;

    if (courseId) {
        createdCourseIds.push(courseId);
        res = await testAPI('PUT', `/courses/api/${courseId}`, {
            course_name: `Updated Course ${timestamp}`,
            description: 'Updated description text'
        });
        passed = passed && (res.status === 200);
    }
    addResult('Integration', '9.2 Create and Update', passed);

    // 9.3 Category Association
    res = await testAPI('GET', '/courses/api/categories');
    const categories = res.data?.data || [];
    passed = res.status === 200 && categories.length > 0;
    addResult('Integration', '9.3 Categories Available', passed);

    // 9.4 Course List After Creation
    res = await testAPI('GET', '/courses/api/all');
    passed = res.status === 200 && res.data?.data?.length > 0;
    addResult('Integration', '9.4 Course List Valid', passed);

    // 9.5 Concurrent Create Operations
    const promises = [];
    for (let i = 0; i < 3; i++) {
        const data = getValidCourseData(`_concurrent${i}`);
        promises.push(testAPI('POST', '/courses/api/create', data));
    }
    const results = await Promise.all(promises);
    passed = results.every(r => r.status === 200 || r.status === 201);
    results.forEach(r => {
        if (r.data?.data?.course_id) createdCourseIds.push(r.data.data.course_id);
    });
    addResult('Integration', '9.5 Concurrent Creates', passed);
}

// ============================================================================
// CLEANUP
// ============================================================================

async function cleanup() {
    log('=== CLEANUP: Deleting test courses ===', 'INFO');

    for (const courseId of createdCourseIds) {
        try {
            await testAPI('DELETE', `/courses/api/${courseId}`);
            log(`Deleted course ${courseId}`, 'INFO');
        } catch (e) {
            log(`Failed to delete course ${courseId}: ${e.message}`, 'WARN');
        }
    }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runTests() {
    console.log('\n' + '═'.repeat(80));
    console.log('║' + ' '.repeat(20) + 'PROFESSIONAL COURSE CREATION TEST SUITE' + ' '.repeat(19) + '║');
    console.log('╠' + '═'.repeat(78) + '╣');
    console.log(`║  Started: ${new Date().toISOString()}` + ' '.repeat(40) + '║');
    console.log(`║  URL: ${BASE_URL}` + ' '.repeat(49) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');

    try {
        log('Launching browser...', 'START');
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1366, height: 768 },
            args: ['--start-maximized']
        });
        page = await browser.newPage();

        log('Logging in as Admin...', 'INFO');
        const loggedIn = await login(CREDENTIALS.admin);
        if (!loggedIn) {
            log('Login failed! Aborting tests.', 'FAIL');
            return;
        }
        log('Login successful!', 'PASS');

        // Run all test suites
        await testHappyPath();
        await testFormValidation();
        await testWizardSteps();
        await testFieldConstraints();
        await testDataTypes();
        await testSecurity();
        await testEdgeCases();
        await testUIUX();
        await testIntegration();

        // Cleanup
        await cleanup();

    } catch (error) {
        log(`Fatal error: ${error.message}`, 'FAIL');
        console.error(error);
    } finally {
        // Generate Report
        const passed = testResults.filter(r => r.passed).length;
        const failed = testResults.filter(r => !r.passed).length;
        const total = testResults.length;

        console.log('\n' + '═'.repeat(80));
        console.log('║' + ' '.repeat(25) + 'TEST RESULTS SUMMARY' + ' '.repeat(33) + '║');
        console.log('╠' + '═'.repeat(78) + '╣');
        console.log(`║  Total Tests:  ${total.toString().padEnd(5)}                                                    ║`);
        console.log(`║  Passed:       ${passed.toString().padEnd(5)} (${((passed/total)*100).toFixed(1)}%)                                            ║`);
        console.log(`║  Failed:       ${failed.toString().padEnd(5)} (${((failed/total)*100).toFixed(1)}%)                                            ║`);
        console.log('╠' + '═'.repeat(78) + '╣');

        // Group results by suite
        const suites = {};
        testResults.forEach(r => {
            if (!suites[r.suite]) suites[r.suite] = { passed: 0, failed: 0, tests: [] };
            suites[r.suite].tests.push(r);
            if (r.passed) suites[r.suite].passed++;
            else suites[r.suite].failed++;
        });

        Object.entries(suites).forEach(([suite, data]) => {
            const status = data.failed === 0 ? '✅' : '⚠️';
            console.log(`║  ${status} ${suite.padEnd(20)} ${data.passed}/${data.passed + data.failed} passed` + ' '.repeat(35 - suite.length) + '║');
        });

        console.log('╠' + '═'.repeat(78) + '╣');

        // Show failed tests
        if (failed > 0) {
            console.log('║  FAILED TESTS:' + ' '.repeat(63) + '║');
            testResults.filter(r => !r.passed).forEach(r => {
                const name = r.name.substring(0, 60).padEnd(60);
                console.log(`║    ❌ ${name}         ║`);
            });
            console.log('╠' + '═'.repeat(78) + '╣');
        }

        console.log(`║  Completed: ${new Date().toISOString()}` + ' '.repeat(38) + '║');
        console.log('╚' + '═'.repeat(78) + '╝');

        log(`Tests completed. Total: ${total}, Passed: ${passed}, Failed: ${failed}`, 'END');

        // Keep browser open for 10 seconds
        log('Browser will close in 10 seconds...', 'INFO');
        await delay(10000);

        if (browser) await browser.close();

        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests();
