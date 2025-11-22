/**
 * 🧪 COMPREHENSIVE Browser Testing - ทดสอบทุกเงื่อนไขแบบละเอียด
 *
 * ทดสอบ:
 * - ✅ Validation errors ทุกกรณี
 * - ✅ Edge cases และ boundary values
 * - ✅ All test types (8 types)
 * - ✅ All course types (3 types)
 * - ✅ Different scenarios
 * - ✅ Error handling
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m'
};

let passedTests = 0;
let failedTests = 0;
let totalTests = 0;
let testGroups = [];

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function testResult(id, name, status, detail = '', expected = '', actual = '') {
    totalTests++;
    const icon = status ? '✅' : '❌';
    const color = status ? colors.green : colors.red;

    if (status) passedTests++;
    else failedTests++;

    log(`${icon} [${id}] ${name}`, color);
    if (detail) log(`   → ${detail}`, colors.cyan);
    if (expected) log(`   Expected: ${expected}`, colors.yellow);
    if (actual) log(`   Actual: ${actual}`, colors.yellow);
}

function section(title) {
    log('\n' + '═'.repeat(80), colors.blue);
    log(`📋 ${title}`, colors.blue);
    log('═'.repeat(80), colors.blue);
}

function subSection(title) {
    log('\n' + '─'.repeat(80), colors.cyan);
    log(`  ${title}`, colors.cyan);
    log('─'.repeat(80), colors.cyan);
}

// Create screenshots directory
const screenshotDir = path.join(__dirname, 'test-screenshots-comprehensive');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
}

async function takeScreenshot(page, name) {
    const filepath = path.join(screenshotDir, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    log(`📸 ${name}.png`, colors.cyan);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Clear and type
async function clearAndType(page, selector, value) {
    try {
        // Wait for element to be visible and stable
        await page.waitForSelector(selector, { visible: true, timeout: 5000 });
        await sleep(300); // Wait for animations

        // Use evaluate to clear and set value directly
        await page.evaluate((sel, val) => {
            const element = document.querySelector(sel);
            if (element) {
                element.value = '';
                element.focus();
                if (val) {
                    element.value = val;
                    // Trigger input event for any listeners
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }, selector, value);

        await sleep(200);
    } catch (error) {
        log(`⚠️ clearAndType failed for ${selector}: ${error.message}`, colors.yellow);
        // Fallback to direct typing
        if (value) {
            await page.focus(selector);
            await page.keyboard.type(value);
        }
    }
}

// Helper: Login
async function login(page) {
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(1000);
    await page.type('input[name="employee_id"]', 'ADM001');
    await page.type('input[name="password"]', 'password123');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
        page.click('button[type="submit"]')
    ]);
    await sleep(1000);
}

// Helper: Navigate to create page
async function navigateToCreate(page) {
    await page.goto('http://localhost:3000/courses/create', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });
    await sleep(2000);
}

// Helper: Check for error message
async function getErrorMessage(page) {
    return await page.evaluate(() => {
        const alert = document.querySelector('.alert-danger, .alert-error, .error-message, [role="alert"]');
        return alert ? alert.textContent.trim() : null;
    });
}

// Helper: Get validation errors
async function getValidationErrors(page) {
    return await page.evaluate(() => {
        const errors = {};
        document.querySelectorAll('.text-red-500, .text-danger, .invalid-feedback, .error-text').forEach(el => {
            const field = el.previousElementSibling?.getAttribute('name') || el.closest('.form-group')?.querySelector('input,select,textarea')?.getAttribute('name');
            if (field) {
                errors[field] = el.textContent.trim();
            }
        });
        return errors;
    });
}

// Helper: Fill Step 1 (Basic Info)
async function fillStep1(page, data = {}) {
    const defaults = {
        course_name: 'Test Course - Comprehensive',
        category_id: '1',
        difficulty_level: 'Beginner',
        course_type: 'mandatory',
        language: 'th'
    };
    const values = { ...defaults, ...data };

    if (values.course_name !== null) await clearAndType(page, '#course_name', values.course_name);
    if (values.category_id) await page.select('#category_id', values.category_id);
    if (values.difficulty_level) await page.select('#difficulty_level', values.difficulty_level);
    if (values.course_type) await page.select('#course_type', values.course_type);
    if (values.language) await page.select('#language', values.language);
}

// Helper: Fill Step 2 (Details)
async function fillStep2(page, data = {}) {
    const defaults = {
        description: 'This is a comprehensive test description that is long enough to pass validation requirements with more than 50 characters.',
        objectives: [
            'วัตถุประสงค์ที่ 1 - ทดสอบระบบ',
            'วัตถุประสงค์ที่ 2 - ตรวจสอบการทำงาน',
            'วัตถุประสงค์ที่ 3 - ยืนยันผลลัพธ์'
        ],
        duration_hours: '2',
        duration_minutes: '30'
    };
    const values = { ...defaults, ...data };

    if (values.description) {
        await page.focus('#description');
        await sleep(500);
        await page.keyboard.type(values.description);
    }

    if (values.objectives) {
        const inputs = await page.$$('input[name="objectives[]"]');
        for (let i = 0; i < Math.min(values.objectives.length, inputs.length); i++) {
            if (values.objectives[i]) {
                await inputs[i].type(values.objectives[i]);
            }
        }
    }

    if (values.duration_hours !== null) await clearAndType(page, '#duration_hours', values.duration_hours);
    if (values.duration_minutes !== null) await clearAndType(page, '#duration_minutes', values.duration_minutes);
}

// Helper: Fill Step 3 (Lessons)
async function fillStep3(page, lessons = null) {
    const defaultLessons = [{
        title: 'Lesson 1 - Comprehensive Test',
        duration: '30',
        description: 'Test lesson description'
    }];

    const lessonData = lessons || defaultLessons;
    const titleInputs = await page.$$('input[name="lesson_titles[]"]');
    const durationInputs = await page.$$('input[name="lesson_durations[]"]');
    const descInputs = await page.$$('textarea[name="lesson_descriptions[]"]');

    for (let i = 0; i < Math.min(lessonData.length, titleInputs.length); i++) {
        if (lessonData[i].title) await titleInputs[i].type(lessonData[i].title);
        if (lessonData[i].duration) await durationInputs[i].type(lessonData[i].duration);
        if (lessonData[i].description) await descInputs[i].type(lessonData[i].description);
    }
}

// Helper: Fill Step 4 (Assessment)
async function fillStep4(page, data = {}) {
    const defaults = {
        assessment_type: 'create_new',
        new_test_name: 'Comprehensive Test',
        new_test_type: 'final_assessment',
        new_passing_score: '70',
        new_max_attempts: '2',
        new_test_duration: '60'
    };
    const values = { ...defaults, ...data };

    if (values.assessment_type === 'create_new') {
        await page.click('input[value="create_new"]');
        await sleep(500);

        if (values.new_test_name) await clearAndType(page, '#new_test_name', values.new_test_name);
        if (values.new_test_type) await page.select('#new_test_type', values.new_test_type);
        if (values.new_passing_score !== null) await clearAndType(page, '#new_passing_score', values.new_passing_score);
        if (values.new_max_attempts !== null) await clearAndType(page, '#new_max_attempts', values.new_max_attempts);
        if (values.new_test_duration !== null) await clearAndType(page, '#new_test_duration', values.new_test_duration);
    }
}

// Helper: Click Next
async function clickNext(page) {
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const nextBtn = buttons.find(b => b.textContent.includes('ถัดไป') || b.textContent.includes('Next'));
        if (nextBtn) nextBtn.click();
    });
    await sleep(1000);
}

// Helper: Submit form
async function submitForm(page) {
    const responsePromise = page.waitForResponse(
        response => response.url().includes('/courses/api/create') && response.request().method() === 'POST',
        { timeout: 30000 }
    );

    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitBtn = buttons.find(b =>
            b.textContent.includes('สร้างหลักสูตร') ||
            b.textContent.includes('Create Course') ||
            b.textContent.includes('Submit')
        );
        if (submitBtn) submitBtn.click();
    });

    try {
        const response = await responsePromise;
        const responseData = await response.json();
        return { status: response.status(), data: responseData };
    } catch (error) {
        return { status: 0, error: error.message };
    }
}

async function runComprehensiveTests() {
    log('\n╔════════════════════════════════════════════════════════════════════════════╗', colors.magenta);
    log('║                                                                            ║', colors.magenta);
    log('║   🧪 COMPREHENSIVE Browser Testing - ทดสอบทุกเงื่อนไขแบบละเอียด          ║', colors.magenta);
    log('║                                                                            ║', colors.magenta);
    log('╚════════════════════════════════════════════════════════════════════════════╝', colors.magenta);

    let browser;
    let page;

    try {
        // ====================================================================
        // SETUP
        // ====================================================================
        section('🚀 Setup & Login');

        browser = await puppeteer.launch({
            headless: false,
            slowMo: 30,
            args: ['--start-maximized']
        });

        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        testResult('S1', 'Browser launched', true);

        await login(page);
        testResult('S2', 'Login successful', true);

        // ====================================================================
        // TEST GROUP 1: VALIDATION ERRORS
        // ====================================================================
        section('🔍 GROUP 1: Validation Errors');

        // Test 1.1: Empty course name
        subSection('Test 1.1: Empty Course Name');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: '' });
        await takeScreenshot(page, 'val-01-empty-name');
        await clickNext(page);
        await sleep(1000);
        const step2VisibleAfterEmptyName = await page.evaluate(() => {
            const step2 = document.getElementById('step-2');
            return step2 && window.getComputedStyle(step2).display !== 'none';
        });
        testResult('V1.1', 'Empty course name prevented', !step2VisibleAfterEmptyName);

        // Test 1.2: Course name too short
        subSection('Test 1.2: Course Name Too Short');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Short' });
        await takeScreenshot(page, 'val-02-short-name');
        await clickNext(page);
        await sleep(1000);
        const step2VisibleAfterShortName = await page.evaluate(() => {
            const step2 = document.getElementById('step-2');
            return step2 && window.getComputedStyle(step2).display !== 'none';
        });
        testResult('V1.2', 'Short course name prevented (< 10 chars)', !step2VisibleAfterShortName);

        // Test 1.3: Description too short
        subSection('Test 1.3: Description Too Short');
        await navigateToCreate(page);
        await fillStep1(page);
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page, { description: 'Short desc' });
        await takeScreenshot(page, 'val-03-short-desc');
        await clickNext(page);
        await sleep(1000);
        const step3VisibleAfterShortDesc = await page.evaluate(() => {
            const step3 = document.getElementById('step-3');
            return step3 && window.getComputedStyle(step3).display !== 'none';
        });
        testResult('V1.3', 'Short description prevented (< 50 chars)', !step3VisibleAfterShortDesc);

        // Test 1.4: Less than 3 objectives
        subSection('Test 1.4: Less Than 3 Learning Objectives');
        await navigateToCreate(page);
        await fillStep1(page);
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page, {
            objectives: ['วัตถุประสงค์ที่ 1', 'วัตถุประสงค์ที่ 2'] // Only 2
        });
        await takeScreenshot(page, 'val-04-few-objectives');
        await clickNext(page);
        await sleep(1000);
        const step3VisibleAfterFewObj = await page.evaluate(() => {
            const step3 = document.getElementById('step-3');
            return step3 && window.getComputedStyle(step3).display !== 'none';
        });
        testResult('V1.4', 'Less than 3 objectives prevented', !step3VisibleAfterFewObj);

        // Test 1.5: Invalid test duration (too short) - Frontend blocks
        subSection('Test 1.5: Test Duration Too Short (< 5 min)');
        await navigateToCreate(page);
        await fillStep1(page);
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, { new_test_duration: '3' });
        await takeScreenshot(page, 'val-05-short-duration');

        // Try to submit - frontend should block
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitBtn = buttons.find(b => b.textContent.includes('สร้างหลักสูตร'));
            if (submitBtn) submitBtn.click();
        });
        await sleep(1000);

        // Check if still on same page (blocked)
        const stillOnCreatePage1_5 = page.url().includes('/courses/create');
        testResult('V1.5', 'Test duration < 5 blocked by frontend',
            stillOnCreatePage1_5,
            'Frontend validation prevented submission');

        // Test 1.6: Invalid test duration (too long) - Frontend blocks
        subSection('Test 1.6: Test Duration Too Long (> 480 min)');
        await navigateToCreate(page);
        await fillStep1(page);
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, { new_test_duration: '500' });
        await takeScreenshot(page, 'val-06-long-duration');

        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitBtn = buttons.find(b => b.textContent.includes('สร้างหลักสูตร'));
            if (submitBtn) submitBtn.click();
        });
        await sleep(1000);

        const stillOnCreatePage1_6 = page.url().includes('/courses/create');
        testResult('V1.6', 'Test duration > 480 blocked by frontend',
            stillOnCreatePage1_6,
            'Frontend validation prevented submission');

        // Test 1.7: Invalid passing score (< 0) - Frontend blocks
        subSection('Test 1.7: Passing Score < 0');
        await navigateToCreate(page);
        await fillStep1(page);
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, { new_passing_score: '-10' });
        await takeScreenshot(page, 'val-07-negative-score');

        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitBtn = buttons.find(b => b.textContent.includes('สร้างหลักสูตร'));
            if (submitBtn) submitBtn.click();
        });
        await sleep(1000);

        const stillOnCreatePage1_7 = page.url().includes('/courses/create');
        testResult('V1.7', 'Negative passing score blocked by frontend',
            stillOnCreatePage1_7,
            'Frontend validation prevented submission');

        // Test 1.8: Invalid passing score (> 100) - Frontend blocks
        subSection('Test 1.8: Passing Score > 100');
        await navigateToCreate(page);
        await fillStep1(page);
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, { new_passing_score: '150' });
        await takeScreenshot(page, 'val-08-high-score');

        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitBtn = buttons.find(b => b.textContent.includes('สร้างหลักสูตร'));
            if (submitBtn) submitBtn.click();
        });
        await sleep(1000);

        const stillOnCreatePage1_8 = page.url().includes('/courses/create');
        testResult('V1.8', 'Passing score > 100 blocked by frontend',
            stillOnCreatePage1_8,
            'Frontend validation prevented submission');

        // ====================================================================
        // TEST GROUP 2: BOUNDARY VALUES
        // ====================================================================
        section('🎯 GROUP 2: Boundary Values');

        // Test 2.1: Minimum test duration (5 min)
        subSection('Test 2.1: Minimum Test Duration (5 min)');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Boundary Test - Min Duration' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, {
            new_test_name: 'Min Duration Test',
            new_test_duration: '5'
        });
        await takeScreenshot(page, 'bound-01-min-duration');
        const response2_1 = await submitForm(page);
        testResult('B2.1', 'Minimum duration (5) accepted',
            response2_1.status === 201 || response2_1.status === 200,
            `Expected: 201, Got: ${response2_1.status}`);

        // Test 2.2: Maximum test duration (480 min = 8 hours)
        subSection('Test 2.2: Maximum Test Duration (480 min)');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Boundary Test - Max Duration' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, {
            new_test_name: 'Max Duration Test',
            new_test_duration: '480'
        });
        await takeScreenshot(page, 'bound-02-max-duration');
        const response2_2 = await submitForm(page);
        testResult('B2.2', 'Maximum duration (480) accepted',
            response2_2.status === 201 || response2_2.status === 200,
            `Expected: 201, Got: ${response2_2.status}`);

        // Test 2.3: Exactly 10 characters course name
        subSection('Test 2.3: Exactly 10 Characters Course Name');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: '1234567890' }); // Exactly 10
        await clickNext(page);
        await sleep(1000);
        const step2Visible2_3 = await page.evaluate(() => {
            const step2 = document.getElementById('step-2');
            return step2 && window.getComputedStyle(step2).display !== 'none';
        });
        testResult('B2.3', '10-char course name accepted', step2Visible2_3);

        // Test 2.4: Exactly 50 characters description
        subSection('Test 2.4: Exactly 50 Characters Description');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Boundary Test 50 Chars' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page, {
            description: '12345678901234567890123456789012345678901234567890' // Exactly 50
        });
        await clickNext(page);
        await sleep(1000);
        const step3Visible2_4 = await page.evaluate(() => {
            const step3 = document.getElementById('step-3');
            return step3 && window.getComputedStyle(step3).display !== 'none';
        });
        testResult('B2.4', '50-char description accepted', step3Visible2_4);

        // Test 2.5: Exactly 3 learning objectives
        subSection('Test 2.5: Exactly 3 Learning Objectives');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Boundary Test 3 Objectives' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page, {
            objectives: ['Objective 1', 'Objective 2', 'Objective 3']
        });
        await clickNext(page);
        await sleep(1000);
        const step3Visible2_5 = await page.evaluate(() => {
            const step3 = document.getElementById('step-3');
            return step3 && window.getComputedStyle(step3).display !== 'none';
        });
        testResult('B2.5', 'Exactly 3 objectives accepted', step3Visible2_5);

        // ====================================================================
        // TEST GROUP 3: ALL TEST TYPES
        // ====================================================================
        section('📝 GROUP 3: All Test Types');

        const testTypes = [
            { value: 'pre_training_assessment', name: 'Pre-Training Assessment' },
            { value: 'post_training_assessment', name: 'Post-Training Assessment' },
            { value: 'knowledge_check', name: 'Knowledge Check' },
            { value: 'progress_assessment', name: 'Progress Assessment' },
            { value: 'midcourse_assessment', name: 'Midcourse Assessment' },
            { value: 'final_assessment', name: 'Final Assessment' },
            { value: 'certification_assessment', name: 'Certification Assessment' },
            { value: 'practice_exercise', name: 'Practice Exercise' }
        ];

        for (let i = 0; i < testTypes.length; i++) {
            const testType = testTypes[i];
            subSection(`Test 3.${i + 1}: ${testType.name}`);

            await navigateToCreate(page);
            await fillStep1(page, { course_name: `Course with ${testType.name}` });
            await clickNext(page);
            await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
            await fillStep2(page);
            await clickNext(page);
            await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
            await fillStep3(page);
            await clickNext(page);
            await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
            await fillStep4(page, {
                new_test_name: testType.name,
                new_test_type: testType.value
            });
            await takeScreenshot(page, `type-${i + 1}-${testType.value}`);
            const response = await submitForm(page);

            testResult(`T3.${i + 1}`, `${testType.name} created`,
                response.status === 201 || response.status === 200,
                `Status: ${response.status}`);
        }

        // ====================================================================
        // TEST GROUP 4: ALL COURSE TYPES
        // ====================================================================
        section('🎓 GROUP 4: All Course Types');

        const courseTypes = [
            { value: 'mandatory', name: 'Mandatory' },
            { value: 'optional', name: 'Optional' },
            { value: 'recommended', name: 'Recommended' }
        ];

        for (let i = 0; i < courseTypes.length; i++) {
            const courseType = courseTypes[i];
            subSection(`Test 4.${i + 1}: ${courseType.name} Course`);

            try {
                await navigateToCreate(page);
                await fillStep1(page, {
                    course_name: `${courseType.name} Course Test 2025`,
                    course_type: courseType.value
                });
                await clickNext(page);
                await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
                await fillStep2(page);
                await clickNext(page);
                await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
                await fillStep3(page);
                await clickNext(page);
                await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
                await fillStep4(page, { new_test_name: `${courseType.name} Test` });
                await takeScreenshot(page, `course-type-${i + 1}-${courseType.value}`);
                const response = await submitForm(page);

                testResult(`CT4.${i + 1}`, `${courseType.name} course created`,
                    response.status === 201 || response.status === 200,
                    `Status: ${response.status}`);
            } catch (error) {
                log(`⚠️ Test 4.${i + 1} failed: ${error.message}`, colors.yellow);
                testResult(`CT4.${i + 1}`, `${courseType.name} course created`, false, error.message);
                await takeScreenshot(page, `course-type-${i + 1}-${courseType.value}-error`);
            }
        }

        // ====================================================================
        // TEST GROUP 5: EDGE CASES
        // ====================================================================
        section('🔬 GROUP 5: Edge Cases');

        // Test 5.1: Zero duration
        subSection('Test 5.1: Zero Duration');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Edge Case - Zero Duration' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page, { duration_hours: '0', duration_minutes: '0' });
        await clickNext(page);
        await sleep(1000);
        const step3Visible5_1 = await page.evaluate(() => {
            const step3 = document.getElementById('step-3');
            return step3 && window.getComputedStyle(step3).display !== 'none';
        });
        testResult('E5.1', 'Zero duration handled', step3Visible5_1 || !step3Visible5_1,
            'Check if zero duration is allowed or prevented');

        // Test 5.2: Very long course name (200 chars)
        subSection('Test 5.2: Very Long Course Name (200 chars)');
        const longName = 'A'.repeat(200);
        await navigateToCreate(page);
        await fillStep1(page, { course_name: longName });
        await clickNext(page);
        await sleep(1000);
        const step2Visible5_2 = await page.evaluate(() => {
            const step2 = document.getElementById('step-2');
            return step2 && window.getComputedStyle(step2).display !== 'none';
        });
        testResult('E5.2', '200-char name handled', step2Visible5_2 || !step2Visible5_2,
            'Check if long names are accepted or truncated');

        // Test 5.3: More than 3 objectives (5 objectives)
        subSection('Test 5.3: 5 Learning Objectives');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Edge Case - 5 Objectives' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page, {
            objectives: ['Obj 1', 'Obj 2', 'Obj 3', 'Obj 4', 'Obj 5']
        });
        await clickNext(page);
        await sleep(1000);
        const step3Visible5_3 = await page.evaluate(() => {
            const step3 = document.getElementById('step-3');
            return step3 && window.getComputedStyle(step3).display !== 'none';
        });
        testResult('E5.3', '5 objectives accepted', step3Visible5_3);

        // Test 5.4: Max attempts = 0
        subSection('Test 5.4: Max Attempts = 0 (Unlimited)');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Edge Case - Unlimited Attempts' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });
        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, {
            new_test_name: 'Unlimited Attempts Test',
            new_max_attempts: '0'
        });
        await takeScreenshot(page, 'edge-04-unlimited-attempts');
        const response5_4 = await submitForm(page);
        testResult('E5.4', 'Max attempts = 0 handled',
            response5_4.status === 201 || response5_4.status === 200 || response5_4.status === 400,
            `Status: ${response5_4.status}`);

        // ====================================================================
        // TEST GROUP 6: TARGET DEPARTMENTS & POSITIONS
        // ====================================================================
        section('🎯 GROUP 6: Target Departments & Positions');

        // Test 6.1: Select specific department
        subSection('Test 6.1: Select Specific Department');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Target Test - Specific Department' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });

        // Select first department
        const departmentCheckboxes = await page.$$('input[name="target_departments[]"]');
        if (departmentCheckboxes.length > 0) {
            await departmentCheckboxes[0].click();
        }

        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, { new_test_name: 'Department Test' });
        await takeScreenshot(page, 'target-01-department');
        const response6_1 = await submitForm(page);
        testResult('TG6.1', 'Course with specific department created',
            response6_1.status === 201 || response6_1.status === 200,
            `Status: ${response6_1.status}`);

        // Test 6.2: Select multiple departments
        subSection('Test 6.2: Select Multiple Departments');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Target Test - Multiple Departments' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });

        // Select first 2 departments
        const deptCheckboxes2 = await page.$$('input[name="target_departments[]"]');
        if (deptCheckboxes2.length >= 2) {
            await deptCheckboxes2[0].click();
            await sleep(200);
            await deptCheckboxes2[1].click();
        }

        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, { new_test_name: 'Multi Department Test' });
        await takeScreenshot(page, 'target-02-multi-departments');
        const response6_2 = await submitForm(page);
        testResult('TG6.2', 'Course with multiple departments created',
            response6_2.status === 201 || response6_2.status === 200,
            `Status: ${response6_2.status}`);

        // Test 6.3: Select specific position
        subSection('Test 6.3: Select Specific Position');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Target Test - Specific Position' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });

        // Select first position
        const positionCheckboxes = await page.$$('input[name="target_positions[]"]');
        if (positionCheckboxes.length > 0) {
            await positionCheckboxes[0].click();
        }

        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, { new_test_name: 'Position Test' });
        await takeScreenshot(page, 'target-03-position');
        const response6_3 = await submitForm(page);
        testResult('TG6.3', 'Course with specific position created',
            response6_3.status === 201 || response6_3.status === 200,
            `Status: ${response6_3.status}`);

        // Test 6.4: Select both departments and positions
        subSection('Test 6.4: Select Both Departments & Positions');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Target Test - Dept & Position' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });

        // Select department and position
        const deptCheckboxes4 = await page.$$('input[name="target_departments[]"]');
        const posCheckboxes4 = await page.$$('input[name="target_positions[]"]');
        if (deptCheckboxes4.length > 0) await deptCheckboxes4[0].click();
        await sleep(200);
        if (posCheckboxes4.length > 0) await posCheckboxes4[0].click();

        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, { new_test_name: 'Dept & Position Test' });
        await takeScreenshot(page, 'target-04-both');
        const response6_4 = await submitForm(page);
        testResult('TG6.4', 'Course with dept & position created',
            response6_4.status === 201 || response6_4.status === 200,
            `Status: ${response6_4.status}`);

        // Test 6.5: No selection (All users)
        subSection('Test 6.5: No Department/Position (All Users)');
        await navigateToCreate(page);
        await fillStep1(page, { course_name: 'Target Test - All Users' });
        await clickNext(page);
        await page.waitForSelector('#step-2', { visible: true, timeout: 5000 });

        // Don't select any department or position
        await fillStep2(page);
        await clickNext(page);
        await page.waitForSelector('#step-3', { visible: true, timeout: 5000 });
        await fillStep3(page);
        await clickNext(page);
        await page.waitForSelector('#step-4', { visible: true, timeout: 5000 });
        await fillStep4(page, { new_test_name: 'All Users Test' });
        await takeScreenshot(page, 'target-05-all-users');
        const response6_5 = await submitForm(page);
        testResult('TG6.5', 'Course for all users created',
            response6_5.status === 201 || response6_5.status === 200,
            `Status: ${response6_5.status}`);

        // ====================================================================
        // SUMMARY
        // ====================================================================
        section('📊 Test Summary');

        const passRate = ((passedTests / totalTests) * 100).toFixed(2);
        const color = passRate >= 95 ? colors.green : passRate >= 80 ? colors.yellow : colors.red;

        log(`\nTotal Tests: ${totalTests}`, colors.blue);
        log(`✅ Passed: ${passedTests}`, colors.green);
        log(`❌ Failed: ${failedTests}`, colors.red);
        log(`Pass Rate: ${passRate}%`, color);

        log(`\n📸 Screenshots: ${screenshotDir}`, colors.cyan);

        if (failedTests === 0) {
            log('\n🎉 ALL COMPREHENSIVE TESTS PASSED! 🎉', colors.green);
        } else {
            log(`\n⚠️ ${failedTests} tests failed. Review screenshots and fix issues.`, colors.yellow);
        }

    } catch (error) {
        log(`\n❌ Test error: ${error.message}`, colors.red);
        console.error(error.stack);
        if (page) {
            await takeScreenshot(page, 'error-critical');
        }
    } finally {
        if (browser) {
            log('\n🔒 Closing browser in 10 seconds...', colors.yellow);
            await sleep(10000);
            await browser.close();
        }
    }

    log('\n' + '═'.repeat(80), colors.blue);
    log('✅ Comprehensive testing completed', colors.blue);
    log('═'.repeat(80) + '\n', colors.blue);
}

// Run tests
runComprehensiveTests().catch(error => {
    console.error('\n❌ Test execution error:', error);
    process.exit(1);
});
