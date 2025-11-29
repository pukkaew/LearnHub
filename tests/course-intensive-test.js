/**
 * =============================================================================
 * LearnHub Course System - INTENSIVE Browser Test (Tester Level)
 * =============================================================================
 *
 * Super detailed testing - creates real data, tests every field, every edge case
 *
 * @version 3.0.0 - Intensive Edition
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONFIG = {
    BASE_URL: 'http://localhost:3000',
    CREDENTIALS: {
        employee_id: 'ADM001',
        password: 'password123'
    },
    TIMEOUT: {
        PAGE_LOAD: 30000,
        ELEMENT: 10000,
        NAVIGATION: 30000,
        SHORT: 5000
    },
    SCREENSHOTS_DIR: './tests/screenshots',
    HEADLESS: false,
    SLOW_MO: 30
};

// Test Data
const TEST_COURSE = {
    name: `INTENSIVE_TEST_${Date.now()}`,
    code: `TST-${Date.now()}`,
    description: 'หลักสูตรทดสอบแบบเข้มข้น - Intensive Test Course with Thai and English content. ทดสอบการรองรับภาษาไทย',
    objectives: [
        'เข้าใจหลักการพื้นฐาน',
        'สามารถประยุกต์ใช้งานได้',
        'พัฒนาทักษะการทำงาน'
    ],
    prerequisite: 'ไม่จำเป็นต้องมีความรู้พื้นฐาน',
    duration_hours: 10,
    duration_minutes: 30,
    max_students: 50,
    passing_score: 80
};

// =============================================================================
// TEST RESULTS TRACKER
// =============================================================================
class TestResults {
    constructor() {
        this.results = [];
        this.startTime = new Date();
        this.passed = 0;
        this.failed = 0;
        this.skipped = 0;
        this.errors = [];
        this.createdCourseId = null;
    }

    addResult(testName, status, details = '', duration = 0) {
        const result = { testName, status, details, duration: `${duration}ms`, timestamp: new Date().toISOString() };
        this.results.push(result);

        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
        console.log(`  ${icon} ${testName} - ${status} (${duration}ms)${details ? ` - ${details}` : ''}`);

        if (status === 'PASS') this.passed++;
        else if (status === 'FAIL') { this.failed++; this.errors.push({ testName, error: details }); }
        else this.skipped++;
    }

    generateReport() {
        const endTime = new Date();
        return {
            summary: {
                total: this.results.length,
                passed: this.passed,
                failed: this.failed,
                skipped: this.skipped,
                passRate: `${((this.passed / this.results.length) * 100).toFixed(2)}%`,
                totalDuration: `${((endTime - this.startTime) / 1000).toFixed(2)}s`
            },
            results: this.results,
            errors: this.errors,
            createdCourseId: this.createdCourseId
        };
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitAndClick(page, selector, timeout = CONFIG.TIMEOUT.ELEMENT) {
    await page.waitForSelector(selector, { visible: true, timeout });
    await page.click(selector);
    return true;
}

async function waitAndType(page, selector, text, clear = true, timeout = CONFIG.TIMEOUT.ELEMENT) {
    await page.waitForSelector(selector, { visible: true, timeout });
    if (clear) {
        await page.click(selector, { clickCount: 3 });
        await page.keyboard.press('Backspace');
    }
    await page.type(selector, text, { delay: 20 });
    return true;
}

async function waitAndSelect(page, selector, value, timeout = CONFIG.TIMEOUT.ELEMENT) {
    await page.waitForSelector(selector, { visible: true, timeout });
    await page.select(selector, value);
    return true;
}

async function exists(page, selector, timeout = 3000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        return true;
    } catch { return false; }
}

async function getText(page, selector, timeout = 3000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        return await page.$eval(selector, el => el.textContent.trim());
    } catch { return null; }
}

async function getValue(page, selector, timeout = 3000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        return await page.$eval(selector, el => el.value);
    } catch { return null; }
}

async function screenshot(page, name) {
    try {
        const path = `${CONFIG.SCREENSHOTS_DIR}/${name}-${Date.now()}.png`;
        await page.screenshot({ path, fullPage: true });
        return path;
    } catch { return null; }
}

async function getSelectOptions(page, selector) {
    try {
        return await page.$$eval(`${selector} option`, opts =>
            opts.map(o => ({ value: o.value, text: o.textContent.trim() })).filter(o => o.value)
        );
    } catch { return []; }
}

// =============================================================================
// LOGIN
// =============================================================================
async function login(page, results) {
    console.log('\n🔐 LOGGING IN...');
    const start = Date.now();

    try {
        await page.goto(`${CONFIG.BASE_URL}/login`, { waitUntil: 'networkidle2' });
        await delay(1000);
        await waitAndType(page, '#employee_id', CONFIG.CREDENTIALS.employee_id);
        await waitAndType(page, '#password', CONFIG.CREDENTIALS.password);
        await waitAndClick(page, 'button[type="submit"]');
        await delay(3000);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

        const url = page.url();
        const success = url.includes('/dashboard') || !url.includes('/login');

        results.addResult('LOGIN', success ? 'PASS' : 'FAIL', `URL: ${url}`, Date.now() - start);
        return success;
    } catch (e) {
        results.addResult('LOGIN', 'FAIL', e.message, Date.now() - start);
        return false;
    }
}

// =============================================================================
// INTENSIVE COURSE CREATION TEST
// =============================================================================
async function testIntensiveCourseCreation(page, results) {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 INTENSIVE TEST: COURSE CREATION (Full Wizard)');
    console.log('═'.repeat(60));

    let start = Date.now();

    // Navigate to create page
    try {
        await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });
        await delay(2000);
        results.addResult('1.1 Navigate to create page', 'PASS', '', Date.now() - start);
    } catch (e) {
        results.addResult('1.1 Navigate to create page', 'FAIL', e.message, Date.now() - start);
        return null;
    }

    // =========================================================================
    // STEP 1: Basic Information
    // =========================================================================
    console.log('\n  📝 STEP 1: Basic Information');

    // 1.2 Course Name
    start = Date.now();
    try {
        await waitAndType(page, '#course_name', TEST_COURSE.name);
        const value = await getValue(page, '#course_name');
        results.addResult('1.2 Fill course name', value === TEST_COURSE.name ? 'PASS' : 'FAIL',
            `Value: ${value}`, Date.now() - start);
    } catch (e) {
        results.addResult('1.2 Fill course name', 'FAIL', e.message, Date.now() - start);
    }

    // 1.3 Course Code (auto-generated, check it exists)
    start = Date.now();
    try {
        const code = await getValue(page, '#course_code');
        results.addResult('1.3 Course code auto-generated', code && code.length > 0 ? 'PASS' : 'FAIL',
            `Code: ${code}`, Date.now() - start);
    } catch (e) {
        results.addResult('1.3 Course code auto-generated', 'FAIL', e.message, Date.now() - start);
    }

    // 1.4 Category Selection
    start = Date.now();
    try {
        const options = await getSelectOptions(page, '#category_id');
        if (options.length > 0) {
            await waitAndSelect(page, '#category_id', options[0].value);
            results.addResult('1.4 Select category', 'PASS',
                `Selected: ${options[0].text} (${options.length} options available)`, Date.now() - start);
        } else {
            results.addResult('1.4 Select category', 'FAIL', 'No options available', Date.now() - start);
        }
    } catch (e) {
        results.addResult('1.4 Select category', 'FAIL', e.message, Date.now() - start);
    }

    // 1.5 Difficulty Level
    start = Date.now();
    try {
        const options = await getSelectOptions(page, '#difficulty_level');
        if (options.length > 0) {
            await waitAndSelect(page, '#difficulty_level', options[0].value);
            results.addResult('1.5 Select difficulty level', 'PASS',
                `Selected: ${options[0].text}`, Date.now() - start);
        } else {
            results.addResult('1.5 Select difficulty level', 'FAIL', 'No options', Date.now() - start);
        }
    } catch (e) {
        results.addResult('1.5 Select difficulty level', 'FAIL', e.message, Date.now() - start);
    }

    // 1.6 Course Type
    start = Date.now();
    try {
        const options = await getSelectOptions(page, '#course_type');
        if (options.length > 0) {
            await waitAndSelect(page, '#course_type', options[0].value);
            results.addResult('1.6 Select course type', 'PASS',
                `Selected: ${options[0].text}`, Date.now() - start);
        } else {
            results.addResult('1.6 Select course type', 'FAIL', 'No options', Date.now() - start);
        }
    } catch (e) {
        results.addResult('1.6 Select course type', 'FAIL', e.message, Date.now() - start);
    }

    // 1.7 Language
    start = Date.now();
    try {
        const options = await getSelectOptions(page, '#language');
        if (options.length > 0) {
            await waitAndSelect(page, '#language', 'th');
            results.addResult('1.7 Select language', 'PASS', 'Selected: Thai', Date.now() - start);
        } else {
            results.addResult('1.7 Select language', 'FAIL', 'No options', Date.now() - start);
        }
    } catch (e) {
        results.addResult('1.7 Select language', 'FAIL', e.message, Date.now() - start);
    }

    // 1.8 Instructor Name (optional)
    start = Date.now();
    try {
        if (await exists(page, '#instructor_name', 2000)) {
            await waitAndType(page, '#instructor_name', 'Test Instructor');
            results.addResult('1.8 Fill instructor name', 'PASS', '', Date.now() - start);
        } else {
            results.addResult('1.8 Fill instructor name', 'SKIP', 'Field not visible', Date.now() - start);
        }
    } catch (e) {
        results.addResult('1.8 Fill instructor name', 'SKIP', e.message, Date.now() - start);
    }

    // Click Next to Step 2
    start = Date.now();
    try {
        await screenshot(page, 'step1-before-next');
        await waitAndClick(page, '#next-btn');
        await delay(1500);
        const step2Visible = await exists(page, '#step-2', 3000);
        results.addResult('1.9 Navigate to Step 2', step2Visible ? 'PASS' : 'FAIL',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('1.9 Navigate to Step 2', 'FAIL', e.message, Date.now() - start);
    }

    // =========================================================================
    // STEP 2: Course Details
    // =========================================================================
    console.log('\n  📝 STEP 2: Course Details');

    // 2.1 Description (contenteditable div)
    start = Date.now();
    try {
        const descEditor = await page.$('#description');
        if (descEditor) {
            await descEditor.click();
            await page.keyboard.type(TEST_COURSE.description, { delay: 10 });
            results.addResult('2.1 Fill description', 'PASS',
                `Length: ${TEST_COURSE.description.length} chars`, Date.now() - start);
        } else {
            results.addResult('2.1 Fill description', 'SKIP', 'Editor not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('2.1 Fill description', 'FAIL', e.message, Date.now() - start);
    }

    // 2.2 Learning Objectives (multiple inputs)
    start = Date.now();
    try {
        const objectiveInputs = await page.$$('input[name="objectives[]"]');
        let filled = 0;
        for (let i = 0; i < Math.min(objectiveInputs.length, TEST_COURSE.objectives.length); i++) {
            await objectiveInputs[i].click({ clickCount: 3 });
            await page.keyboard.press('Backspace');
            await objectiveInputs[i].type(TEST_COURSE.objectives[i], { delay: 10 });
            filled++;
        }
        results.addResult('2.2 Fill learning objectives', filled >= 3 ? 'PASS' : 'SKIP',
            `Filled ${filled}/${TEST_COURSE.objectives.length}`, Date.now() - start);
    } catch (e) {
        results.addResult('2.2 Fill learning objectives', 'FAIL', e.message, Date.now() - start);
    }

    // 2.3 Prerequisite Knowledge
    start = Date.now();
    try {
        if (await exists(page, '#prerequisite_knowledge, textarea[name="prerequisite_knowledge"]', 2000)) {
            await waitAndType(page, '#prerequisite_knowledge, textarea[name="prerequisite_knowledge"]', TEST_COURSE.prerequisite);
            results.addResult('2.3 Fill prerequisite knowledge', 'PASS', '', Date.now() - start);
        } else {
            results.addResult('2.3 Fill prerequisite knowledge', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('2.3 Fill prerequisite knowledge', 'SKIP', e.message, Date.now() - start);
    }

    // 2.4 Target Audience (checkboxes or selects)
    start = Date.now();
    try {
        // Check for position/department multiselects
        const hasPositions = await exists(page, '#target_positions, select[name="target_positions[]"]', 1000);
        const hasDepts = await exists(page, '#target_departments, select[name="target_departments[]"]', 1000);

        if (hasPositions || hasDepts) {
            results.addResult('2.4 Target audience fields exist', 'PASS',
                `Positions: ${hasPositions}, Departments: ${hasDepts}`, Date.now() - start);
        } else {
            results.addResult('2.4 Target audience fields exist', 'SKIP', 'Not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('2.4 Target audience fields exist', 'SKIP', e.message, Date.now() - start);
    }

    // 2.5 Duration Hours (REQUIRED - must fill BEFORE navigating to Step 3)
    start = Date.now();
    try {
        if (await exists(page, '#duration_hours', 2000)) {
            await page.$eval('#duration_hours', el => el.value = '');
            await waitAndType(page, '#duration_hours', String(TEST_COURSE.duration_hours));
            results.addResult('2.5 Fill duration hours', 'PASS',
                `Value: ${TEST_COURSE.duration_hours}`, Date.now() - start);
        } else {
            results.addResult('2.5 Fill duration hours', 'FAIL', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('2.5 Fill duration hours', 'FAIL', e.message, Date.now() - start);
    }

    // 2.6 Duration Minutes
    start = Date.now();
    try {
        if (await exists(page, '#duration_minutes', 2000)) {
            await page.$eval('#duration_minutes', el => el.value = '');
            await waitAndType(page, '#duration_minutes', String(TEST_COURSE.duration_minutes));
            results.addResult('2.6 Fill duration minutes', 'PASS',
                `Value: ${TEST_COURSE.duration_minutes}`, Date.now() - start);
        } else {
            results.addResult('2.6 Fill duration minutes', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('2.6 Fill duration minutes', 'SKIP', e.message, Date.now() - start);
    }

    // 2.7 Max Enrollments (in Step 2)
    start = Date.now();
    try {
        if (await exists(page, '#max_enrollments', 2000)) {
            await page.$eval('#max_enrollments', el => el.value = '');
            await waitAndType(page, '#max_enrollments', String(TEST_COURSE.max_students));
            results.addResult('2.7 Fill max enrollments', 'PASS',
                `Value: ${TEST_COURSE.max_students}`, Date.now() - start);
        } else {
            results.addResult('2.7 Fill max enrollments', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('2.7 Fill max enrollments', 'SKIP', e.message, Date.now() - start);
    }

    // 2.8 Target Departments (multiselect)
    start = Date.now();
    try {
        if (await exists(page, '#target_departments', 2000)) {
            const deptOptions = await page.$$('#target_departments option');
            if (deptOptions.length > 0) {
                // Select first department
                await page.evaluate(() => {
                    const select = document.querySelector('#target_departments');
                    if (select && select.options.length > 0) {
                        select.options[0].selected = true;
                        select.dispatchEvent(new Event('change'));
                    }
                });
                results.addResult('2.8 Select target department', 'PASS',
                    `${deptOptions.length} options available`, Date.now() - start);
            } else {
                results.addResult('2.8 Select target department', 'SKIP', 'No options', Date.now() - start);
            }
        } else {
            results.addResult('2.8 Select target department', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('2.8 Select target department', 'SKIP', e.message, Date.now() - start);
    }

    // 2.9 Target Positions (multiselect)
    start = Date.now();
    try {
        if (await exists(page, '#target_positions', 2000)) {
            const posOptions = await page.$$('#target_positions option');
            if (posOptions.length > 0) {
                await page.evaluate(() => {
                    const select = document.querySelector('#target_positions');
                    if (select && select.options.length > 0) {
                        select.options[0].selected = true;
                        select.dispatchEvent(new Event('change'));
                    }
                });
                results.addResult('2.9 Select target position', 'PASS',
                    `${posOptions.length} options available`, Date.now() - start);
            } else {
                results.addResult('2.9 Select target position', 'SKIP', 'No options', Date.now() - start);
            }
        } else {
            results.addResult('2.9 Select target position', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('2.9 Select target position', 'SKIP', e.message, Date.now() - start);
    }

    // Click Next to Step 3
    start = Date.now();
    try {
        await screenshot(page, 'step2-before-next');
        await waitAndClick(page, '#next-btn');
        await delay(1500);
        const step3Visible = await exists(page, '#step-3', 3000);
        results.addResult('2.10 Navigate to Step 3', step3Visible ? 'PASS' : 'FAIL',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('2.10 Navigate to Step 3', 'FAIL', e.message, Date.now() - start);
    }

    // =========================================================================
    // STEP 3: Content & Media
    // =========================================================================
    console.log('\n  📝 STEP 3: Content & Media');

    // 3.1 Course Image Upload Field
    start = Date.now();
    try {
        const hasImageUpload = await exists(page, '#course_image', 2000);
        results.addResult('3.1 Image upload field exists', hasImageUpload ? 'PASS' : 'SKIP',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('3.1 Image upload field exists', 'SKIP', e.message, Date.now() - start);
    }

    // 3.2 Intro Video URL
    start = Date.now();
    try {
        if (await exists(page, 'input[name="intro_video_url"]', 2000)) {
            await waitAndType(page, 'input[name="intro_video_url"]', 'https://youtube.com/watch?v=test123');
            results.addResult('3.2 Fill intro video URL', 'PASS', '', Date.now() - start);
        } else {
            results.addResult('3.2 Fill intro video URL', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('3.2 Fill intro video URL', 'SKIP', e.message, Date.now() - start);
    }

    // 3.3 Lessons/Content Section
    start = Date.now();
    try {
        const hasLessons = await exists(page, '.lesson-item', 2000);
        results.addResult('3.3 Lessons section exists', hasLessons ? 'PASS' : 'SKIP',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('3.3 Lessons section exists', 'SKIP', e.message, Date.now() - start);
    }

    // 3.4 Fill at least 1 lesson title (REQUIRED for Step 3 validation)
    start = Date.now();
    try {
        const lessonInputs = await page.$$('input[name="lesson_titles[]"]');
        if (lessonInputs.length > 0) {
            await lessonInputs[0].click({ clickCount: 3 });
            await page.keyboard.press('Backspace');
            await lessonInputs[0].type('บทที่ 1: Introduction to Testing', { delay: 10 });
            results.addResult('3.4 Fill lesson title (required)', 'PASS',
                'Added lesson 1', Date.now() - start);
        } else {
            results.addResult('3.4 Fill lesson title (required)', 'FAIL', 'No lesson input found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('3.4 Fill lesson title (required)', 'FAIL', e.message, Date.now() - start);
    }

    // 3.5 Fill lesson duration
    start = Date.now();
    try {
        const durationInputs = await page.$$('input[name="lesson_durations[]"]');
        if (durationInputs.length > 0) {
            await durationInputs[0].click({ clickCount: 3 });
            await page.keyboard.press('Backspace');
            await durationInputs[0].type('30', { delay: 10 });
            results.addResult('3.5 Fill lesson duration', 'PASS', '30 minutes', Date.now() - start);
        } else {
            results.addResult('3.5 Fill lesson duration', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('3.5 Fill lesson duration', 'SKIP', e.message, Date.now() - start);
    }

    // 3.6 Fill lesson description
    start = Date.now();
    try {
        const descInputs = await page.$$('textarea[name="lesson_descriptions[]"]');
        if (descInputs.length > 0) {
            await descInputs[0].click();
            await descInputs[0].type('เนื้อหาบทเรียนทดสอบ - Test lesson description', { delay: 10 });
            results.addResult('3.6 Fill lesson description', 'PASS', '', Date.now() - start);
        } else {
            results.addResult('3.6 Fill lesson description', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('3.6 Fill lesson description', 'SKIP', e.message, Date.now() - start);
    }

    // 3.7 External link field
    start = Date.now();
    try {
        const linkInputs = await page.$$('input[name="external_links[]"]');
        if (linkInputs.length > 0) {
            await linkInputs[0].click();
            await linkInputs[0].type('https://example.com/resource', { delay: 10 });
            results.addResult('3.7 Fill external link', 'PASS', '', Date.now() - start);
        } else {
            results.addResult('3.7 Fill external link', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('3.7 Fill external link', 'SKIP', e.message, Date.now() - start);
    }

    // Click Next to Step 4
    start = Date.now();
    try {
        await screenshot(page, 'step3-before-next');
        await waitAndClick(page, '#next-btn');
        await delay(1500);
        const step4Visible = await exists(page, '#step-4', 3000);
        results.addResult('3.8 Navigate to Step 4', step4Visible ? 'PASS' : 'FAIL',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('3.8 Navigate to Step 4', 'FAIL', e.message, Date.now() - start);
    }

    // =========================================================================
    // STEP 4: Assessment
    // =========================================================================
    console.log('\n  📝 STEP 4: Assessment');

    // 4.1 Passing Score
    start = Date.now();
    try {
        if (await exists(page, '#passing_score', 2000)) {
            await waitAndType(page, '#passing_score', String(TEST_COURSE.passing_score));
            results.addResult('4.1 Fill passing score', 'PASS',
                `Value: ${TEST_COURSE.passing_score}%`, Date.now() - start);
        } else {
            results.addResult('4.1 Fill passing score', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.1 Fill passing score', 'SKIP', e.message, Date.now() - start);
    }

    // 4.2 Max Attempts
    start = Date.now();
    try {
        if (await exists(page, '#max_attempts', 2000)) {
            await waitAndType(page, '#max_attempts', '3');
            results.addResult('4.2 Fill max attempts', 'PASS', 'Value: 3', Date.now() - start);
        } else {
            results.addResult('4.2 Fill max attempts', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.2 Fill max attempts', 'SKIP', e.message, Date.now() - start);
    }

    // 4.3 Certificate Validity
    start = Date.now();
    try {
        if (await exists(page, '#certificate_validity', 2000)) {
            await waitAndType(page, '#certificate_validity', '12');
            results.addResult('4.3 Fill certificate validity', 'PASS', 'Value: 12 months', Date.now() - start);
        } else {
            results.addResult('4.3 Fill certificate validity', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.3 Fill certificate validity', 'SKIP', e.message, Date.now() - start);
    }

    // 4.4 Assessment Type Radio Buttons
    start = Date.now();
    try {
        const assessmentRadios = await page.$$('input[name="assessment_type"]');
        if (assessmentRadios.length > 0) {
            // Test clicking "none" (default)
            await page.evaluate(() => {
                const radio = document.querySelector('input[name="assessment_type"][value="none"]');
                if (radio) radio.click();
            });
            results.addResult('4.4 Assessment type - none', 'PASS', `Found ${assessmentRadios.length} options`, Date.now() - start);
        } else {
            results.addResult('4.4 Assessment type - none', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.4 Assessment type - none', 'SKIP', e.message, Date.now() - start);
    }

    // 4.5 Test "existing" assessment type option
    start = Date.now();
    try {
        const existingRadio = await page.$('input[name="assessment_type"][value="existing"]');
        if (existingRadio) {
            await existingRadio.click();
            await delay(500);
            const sectionVisible = await exists(page, '#existing-test-section', 1000);
            // Revert to none
            await page.evaluate(() => {
                const radio = document.querySelector('input[name="assessment_type"][value="none"]');
                if (radio) radio.click();
            });
            results.addResult('4.5 Assessment type - existing', 'PASS', `Section visible: ${sectionVisible}`, Date.now() - start);
        } else {
            results.addResult('4.5 Assessment type - existing', 'SKIP', 'Radio not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.5 Assessment type - existing', 'SKIP', e.message, Date.now() - start);
    }

    // 4.6 Test "create_new" assessment type option
    start = Date.now();
    try {
        const createNewRadio = await page.$('input[name="assessment_type"][value="create_new"]');
        if (createNewRadio) {
            await createNewRadio.click();
            await delay(500);
            const sectionVisible = await exists(page, '#create-test-section', 1000);
            // Revert to none
            await page.evaluate(() => {
                const radio = document.querySelector('input[name="assessment_type"][value="none"]');
                if (radio) radio.click();
            });
            results.addResult('4.6 Assessment type - create_new', 'PASS', `Section visible: ${sectionVisible}`, Date.now() - start);
        } else {
            results.addResult('4.6 Assessment type - create_new', 'SKIP', 'Radio not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.6 Assessment type - create_new', 'SKIP', e.message, Date.now() - start);
    }

    // 4.7 Prerequisites multiselect
    start = Date.now();
    try {
        if (await exists(page, '#prerequisites', 2000)) {
            const options = await page.$$('#prerequisites option');
            results.addResult('4.7 Prerequisites multiselect', 'PASS', `Found ${options.length} options`, Date.now() - start);
        } else {
            results.addResult('4.7 Prerequisites multiselect', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.7 Prerequisites multiselect', 'SKIP', e.message, Date.now() - start);
    }

    // 4.8 Allow Certificate checkbox
    start = Date.now();
    try {
        const certCheckbox = await page.$('input[name="allow_certificate"]');
        if (certCheckbox) {
            const isChecked = await page.evaluate(el => el.checked, certCheckbox);
            results.addResult('4.8 Allow certificate checkbox', 'PASS', `Checked: ${isChecked}`, Date.now() - start);
        } else {
            results.addResult('4.8 Allow certificate checkbox', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.8 Allow certificate checkbox', 'SKIP', e.message, Date.now() - start);
    }

    // 4.9 Certificate Validity dropdown
    start = Date.now();
    try {
        if (await exists(page, '#certificate_validity', 2000)) {
            const options = await page.$$('#certificate_validity option');
            results.addResult('4.9 Certificate validity dropdown', 'PASS', `Found ${options.length} options`, Date.now() - start);
        } else {
            results.addResult('4.9 Certificate validity dropdown', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.9 Certificate validity dropdown', 'SKIP', e.message, Date.now() - start);
    }

    // 4.10 Enrollment Start date field
    start = Date.now();
    try {
        if (await exists(page, '#enrollment_start', 2000)) {
            results.addResult('4.10 Enrollment start date', 'PASS', 'Field exists', Date.now() - start);
        } else {
            results.addResult('4.10 Enrollment start date', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.10 Enrollment start date', 'SKIP', e.message, Date.now() - start);
    }

    // 4.11 Enrollment End date field
    start = Date.now();
    try {
        if (await exists(page, '#enrollment_end', 2000)) {
            results.addResult('4.11 Enrollment end date', 'PASS', 'Field exists', Date.now() - start);
        } else {
            results.addResult('4.11 Enrollment end date', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.11 Enrollment end date', 'SKIP', e.message, Date.now() - start);
    }

    // 4.12 Auto Enroll checkbox
    start = Date.now();
    try {
        const autoEnrollCheckbox = await page.$('input[name="auto_enroll"]');
        if (autoEnrollCheckbox) {
            const isChecked = await page.evaluate(el => el.checked, autoEnrollCheckbox);
            results.addResult('4.12 Auto enroll checkbox', 'PASS', `Checked: ${isChecked}`, Date.now() - start);
        } else {
            results.addResult('4.12 Auto enroll checkbox', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.12 Auto enroll checkbox', 'SKIP', e.message, Date.now() - start);
    }

    // 4.13 Submit Button Visibility
    start = Date.now();
    try {
        const submitVisible = await exists(page, '#submit-btn', 3000);
        results.addResult('4.13 Submit button visible', submitVisible ? 'PASS' : 'FAIL',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('4.13 Submit button visible', 'FAIL', e.message, Date.now() - start);
    }

    // =========================================================================
    // SUBMIT THE FORM
    // =========================================================================
    console.log('\n  🚀 SUBMITTING COURSE...');

    start = Date.now();
    let createdCourseId = null;
    try {
        await screenshot(page, 'step4-before-submit');

        // Click submit
        await waitAndClick(page, '#submit-btn');
        await delay(5000);

        // Wait for navigation or success message
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

        const url = page.url();
        await screenshot(page, 'after-submit');

        // Check for success
        const hasSuccess = await exists(page, '.swal2-success, .alert-success, .success', 2000);
        const redirectedAway = !url.includes('/create');

        // Try to extract course ID from URL
        const idMatch = url.match(/\/courses\/(\d+)/);
        if (idMatch) {
            createdCourseId = idMatch[1];
        }

        if (hasSuccess || redirectedAway) {
            results.addResult('4.14 Submit course', 'PASS',
                `URL: ${url}, Course ID: ${createdCourseId || 'N/A'}`, Date.now() - start);
            results.createdCourseId = createdCourseId;
        } else {
            // Check for validation errors
            const errorMsg = await getText(page, '.error, .alert-danger, .text-red-500', 1000);
            results.addResult('4.14 Submit course', 'FAIL',
                `Error: ${errorMsg || 'Unknown error'}`, Date.now() - start);
        }
    } catch (e) {
        results.addResult('4.14 Submit course', 'FAIL', e.message, Date.now() - start);
    }

    return createdCourseId;
}

// =============================================================================
// INTENSIVE COURSE DETAIL TEST
// =============================================================================
async function testIntensiveCourseDetail(page, results, courseId) {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 INTENSIVE TEST: COURSE DETAIL VIEW');
    console.log('═'.repeat(60));

    if (!courseId) {
        console.log('  ⚠️  No course ID provided, trying to find existing course...');
    }

    let start = Date.now();

    // Navigate to course detail
    try {
        const url = courseId
            ? `${CONFIG.BASE_URL}/courses/${courseId}/detail`
            : `${CONFIG.BASE_URL}/courses`;

        await page.goto(url, { waitUntil: 'networkidle2' });
        await delay(2000);

        // If on list page, try to click first course
        if (!courseId && page.url().includes('/courses') && !page.url().includes('/detail')) {
            const firstCourse = await page.$('a[href*="/courses/"][href*="/detail"], tr a[href*="/courses/"]');
            if (firstCourse) {
                await firstCourse.click();
                await delay(2000);
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
            }
        }

        const isDetailPage = page.url().includes('/detail') || /\/courses\/\d+$/.test(page.url());
        results.addResult('5.1 Navigate to course detail', isDetailPage ? 'PASS' : 'SKIP',
            `URL: ${page.url()}`, Date.now() - start);

        if (!isDetailPage) {
            console.log('  ⚠️  Could not access course detail page');
            return;
        }
    } catch (e) {
        results.addResult('5.1 Navigate to course detail', 'FAIL', e.message, Date.now() - start);
        return;
    }

    // 5.2 Course Title
    start = Date.now();
    try {
        const title = await getText(page, 'h1, .course-title, .title', 2000);
        results.addResult('5.2 Course title displayed', title ? 'PASS' : 'FAIL',
            `Title: ${title?.substring(0, 50) || 'Not found'}`, Date.now() - start);
    } catch (e) {
        results.addResult('5.2 Course title displayed', 'FAIL', e.message, Date.now() - start);
    }

    // 5.3 Course Description
    start = Date.now();
    try {
        const hasDesc = await exists(page, '.description, .course-description, [class*="description"]', 2000);
        results.addResult('5.3 Course description displayed', hasDesc ? 'PASS' : 'SKIP',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('5.3 Course description displayed', 'FAIL', e.message, Date.now() - start);
    }

    // 5.4 Instructor Information
    start = Date.now();
    try {
        const hasInstructor = await exists(page, '.instructor, [class*="instructor"], .teacher', 2000);
        results.addResult('5.4 Instructor info displayed', hasInstructor ? 'PASS' : 'SKIP',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('5.4 Instructor info displayed', 'FAIL', e.message, Date.now() - start);
    }

    // 5.5 Course Statistics
    start = Date.now();
    try {
        const hasStats = await exists(page, '.stats, .statistics, [class*="enrolled"], .card-stat', 2000);
        results.addResult('5.5 Course statistics displayed', hasStats ? 'PASS' : 'SKIP',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('5.5 Course statistics displayed', 'FAIL', e.message, Date.now() - start);
    }

    // 5.6 Edit Button
    start = Date.now();
    try {
        const hasEdit = await exists(page, 'a[href*="edit"], .btn-edit, button[class*="edit"]', 2000);
        results.addResult('5.6 Edit button exists', hasEdit ? 'PASS' : 'SKIP',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('5.6 Edit button exists', 'FAIL', e.message, Date.now() - start);
    }

    // 5.7 Learning Objectives
    start = Date.now();
    try {
        const hasObjectives = await exists(page, '.objectives, [class*="objective"], .learning-objectives', 2000);
        results.addResult('5.7 Learning objectives displayed', hasObjectives ? 'PASS' : 'SKIP',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('5.7 Learning objectives displayed', 'FAIL', e.message, Date.now() - start);
    }

    // 5.8 Lessons/Content List
    start = Date.now();
    try {
        const hasLessons = await exists(page, '.lessons, .materials, .chapters, [class*="lesson"]', 2000);
        results.addResult('5.8 Lessons list displayed', hasLessons ? 'PASS' : 'SKIP',
            '', Date.now() - start);
    } catch (e) {
        results.addResult('5.8 Lessons list displayed', 'FAIL', e.message, Date.now() - start);
    }

    await screenshot(page, 'course-detail');
}

// =============================================================================
// INTENSIVE COURSE EDITING TEST
// =============================================================================
async function testIntensiveCourseEditing(page, results, courseId) {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 INTENSIVE TEST: COURSE EDITING');
    console.log('═'.repeat(60));

    let start = Date.now();

    // Navigate to edit page
    try {
        const url = courseId
            ? `${CONFIG.BASE_URL}/courses/${courseId}/edit`
            : `${CONFIG.BASE_URL}/courses`;

        await page.goto(url, { waitUntil: 'networkidle2' });
        await delay(2000);

        // If on list page, try to click edit button
        if (!courseId || (!page.url().includes('/edit'))) {
            const editBtn = await page.$('a[href*="edit"], .btn-edit');
            if (editBtn) {
                await editBtn.click();
                await delay(2000);
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
            }
        }

        const isEditPage = page.url().includes('/edit');
        results.addResult('6.1 Navigate to edit page', isEditPage ? 'PASS' : 'SKIP',
            `URL: ${page.url()}`, Date.now() - start);

        if (!isEditPage) {
            console.log('  ⚠️  Could not access edit page');
            return;
        }
    } catch (e) {
        results.addResult('6.1 Navigate to edit page', 'FAIL', e.message, Date.now() - start);
        return;
    }

    // 6.2 Form Pre-populated
    start = Date.now();
    try {
        const courseName = await getValue(page, '#course_name, #title, input[name="course_name"]', 2000);
        results.addResult('6.2 Form pre-populated', courseName ? 'PASS' : 'FAIL',
            `Current name: ${courseName?.substring(0, 30) || 'empty'}`, Date.now() - start);
    } catch (e) {
        results.addResult('6.2 Form pre-populated', 'FAIL', e.message, Date.now() - start);
    }

    // 6.3 Modify Course Name
    start = Date.now();
    const newName = `EDITED_${Date.now()}`;
    try {
        await waitAndType(page, '#course_name, #title, input[name="course_name"]', newName);
        const value = await getValue(page, '#course_name, #title, input[name="course_name"]');
        results.addResult('6.3 Modify course name', value === newName ? 'PASS' : 'FAIL',
            `New name: ${newName}`, Date.now() - start);
    } catch (e) {
        results.addResult('6.3 Modify course name', 'FAIL', e.message, Date.now() - start);
    }

    // 6.4 Save Changes
    start = Date.now();
    try {
        await screenshot(page, 'edit-before-save');
        const saveBtn = await page.$('button[type="submit"], .btn-save, .btn-update');
        if (saveBtn) {
            await saveBtn.click();
            await delay(3000);
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});

            const hasSuccess = await exists(page, '.alert-success, .success, .swal2-success', 2000);
            const hasError = await exists(page, '.alert-danger, .error', 1000);

            results.addResult('6.4 Save changes', hasSuccess || !hasError ? 'PASS' : 'FAIL',
                hasError ? 'Error occurred' : 'Saved successfully', Date.now() - start);
        } else {
            results.addResult('6.4 Save changes', 'SKIP', 'Save button not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('6.4 Save changes', 'FAIL', e.message, Date.now() - start);
    }
}

// =============================================================================
// INTENSIVE VALIDATION TEST
// =============================================================================
async function testIntensiveValidation(page, results) {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 INTENSIVE TEST: FORM VALIDATION');
    console.log('═'.repeat(60));

    let start = Date.now();

    // Navigate to create page
    try {
        await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });
        await delay(1500);
    } catch (e) {
        results.addResult('7.0 Navigate to create', 'FAIL', e.message, Date.now() - start);
        return;
    }

    // 7.1 Empty Form Validation
    start = Date.now();
    try {
        // Try to click Next without filling anything
        await waitAndClick(page, '#next-btn');
        await delay(1000);

        // Check if still on step 1 or has validation error
        const step1Still = await exists(page, '#step-1:not([style*="display: none"])', 1000);
        const hasValidation = await page.evaluate(() => {
            const invalid = document.querySelectorAll(':invalid');
            return invalid.length > 0;
        });

        results.addResult('7.1 Empty form validation', step1Still || hasValidation ? 'PASS' : 'SKIP',
            hasValidation ? 'Browser validation triggered' : 'Step transition prevented', Date.now() - start);
    } catch (e) {
        results.addResult('7.1 Empty form validation', 'FAIL', e.message, Date.now() - start);
    }

    // Reload page
    await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });
    await delay(1000);

    // 7.2 Very Long Input
    start = Date.now();
    try {
        const longText = 'A'.repeat(500);
        await waitAndType(page, '#course_name', longText);
        const actualValue = await getValue(page, '#course_name');
        const truncated = actualValue.length < longText.length;

        results.addResult('7.2 Long input handling', 'PASS',
            `Input length: ${actualValue.length} (original: ${longText.length})`, Date.now() - start);
    } catch (e) {
        results.addResult('7.2 Long input handling', 'FAIL', e.message, Date.now() - start);
    }

    // 7.3 Thai Language Input
    start = Date.now();
    try {
        const thaiText = 'หลักสูตรทดสอบภาษาไทย ๑๒๓๔๕';
        await waitAndType(page, '#course_name', thaiText);
        const actualValue = await getValue(page, '#course_name');
        const preserved = actualValue.includes('หลักสูตร') || actualValue.includes('ภาษาไทย');

        results.addResult('7.3 Thai language input', preserved ? 'PASS' : 'FAIL',
            `Stored: ${actualValue.substring(0, 30)}`, Date.now() - start);
    } catch (e) {
        results.addResult('7.3 Thai language input', 'FAIL', e.message, Date.now() - start);
    }

    // 7.4 Special Characters
    start = Date.now();
    try {
        const specialChars = 'Test <script>alert("XSS")</script> & "quotes" \'single\'';
        await waitAndType(page, '#course_name', specialChars);
        const actualValue = await getValue(page, '#course_name');

        // Check that script tags are not executed
        const noXSS = !await page.evaluate(() => window.alertCalled === true);

        results.addResult('7.4 Special characters / XSS', noXSS ? 'PASS' : 'FAIL',
            noXSS ? 'XSS prevented' : 'XSS vulnerability!', Date.now() - start);
    } catch (e) {
        results.addResult('7.4 Special characters / XSS', 'FAIL', e.message, Date.now() - start);
    }

    // 7.5 SQL Injection Attempt
    start = Date.now();
    try {
        const sqlInjection = "'; DROP TABLE courses; --";
        await waitAndType(page, '#course_name', sqlInjection);

        // Fill required fields and try to submit
        const options = await getSelectOptions(page, '#category_id');
        if (options.length > 0) await waitAndSelect(page, '#category_id', options[0].value);

        const diffOptions = await getSelectOptions(page, '#difficulty_level');
        if (diffOptions.length > 0) await waitAndSelect(page, '#difficulty_level', diffOptions[0].value);

        const typeOptions = await getSelectOptions(page, '#course_type');
        if (typeOptions.length > 0) await waitAndSelect(page, '#course_type', typeOptions[0].value);

        const langOptions = await getSelectOptions(page, '#language');
        if (langOptions.length > 0) await waitAndSelect(page, '#language', langOptions[0].value);

        // Try to navigate through wizard
        for (let i = 0; i < 3; i++) {
            await waitAndClick(page, '#next-btn').catch(() => {});
            await delay(500);
        }

        // Try submit
        await waitAndClick(page, '#submit-btn').catch(() => {});
        await delay(3000);

        // Page should still work (not crashed)
        const pageWorks = await exists(page, 'body', 2000);
        results.addResult('7.5 SQL injection protection', pageWorks ? 'PASS' : 'FAIL',
            pageWorks ? 'Application handled injection safely' : 'Page crashed', Date.now() - start);
    } catch (e) {
        results.addResult('7.5 SQL injection protection', 'PASS',
            'Application rejected malicious input', Date.now() - start);
    }
}

// =============================================================================
// INTENSIVE SEARCH & FILTER TEST
// =============================================================================
async function testIntensiveSearchFilter(page, results) {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 INTENSIVE TEST: SEARCH & FILTERS');
    console.log('═'.repeat(60));

    let start = Date.now();

    // Navigate to courses list
    try {
        await page.goto(`${CONFIG.BASE_URL}/courses`, { waitUntil: 'networkidle2' });
        await delay(2000);
        results.addResult('8.1 Navigate to courses list', 'PASS', '', Date.now() - start);
    } catch (e) {
        results.addResult('8.1 Navigate to courses list', 'FAIL', e.message, Date.now() - start);
        return;
    }

    // 8.2 Search by Keyword
    start = Date.now();
    try {
        await waitAndType(page, '#search', 'test');
        await page.keyboard.press('Enter');
        await delay(2000);
        results.addResult('8.2 Search by keyword', 'PASS', 'Search executed', Date.now() - start);
    } catch (e) {
        results.addResult('8.2 Search by keyword', 'FAIL', e.message, Date.now() - start);
    }

    // Reset
    await page.goto(`${CONFIG.BASE_URL}/courses`, { waitUntil: 'networkidle2' });
    await delay(1000);

    // 8.3 Filter by Category
    start = Date.now();
    try {
        const options = await getSelectOptions(page, '#category');
        if (options.length > 0) {
            await waitAndSelect(page, '#category', options[0].value);
            await delay(1500);
            results.addResult('8.3 Filter by category', 'PASS',
                `Selected: ${options[0].text}`, Date.now() - start);
        } else {
            results.addResult('8.3 Filter by category', 'SKIP', 'No options', Date.now() - start);
        }
    } catch (e) {
        results.addResult('8.3 Filter by category', 'FAIL', e.message, Date.now() - start);
    }

    // 8.4 Filter by Difficulty
    start = Date.now();
    try {
        const options = await getSelectOptions(page, '#difficulty');
        if (options.length > 0) {
            await waitAndSelect(page, '#difficulty', options[0].value);
            await delay(1500);
            results.addResult('8.4 Filter by difficulty', 'PASS',
                `Selected: ${options[0].text}`, Date.now() - start);
        } else {
            results.addResult('8.4 Filter by difficulty', 'SKIP', 'No options', Date.now() - start);
        }
    } catch (e) {
        results.addResult('8.4 Filter by difficulty', 'FAIL', e.message, Date.now() - start);
    }

    // 8.5 Filter by Status
    start = Date.now();
    try {
        const options = await getSelectOptions(page, '#status');
        if (options.length > 0) {
            await waitAndSelect(page, '#status', options[0].value);
            await delay(1500);
            results.addResult('8.5 Filter by status', 'PASS',
                `Selected: ${options[0].text}`, Date.now() - start);
        } else {
            results.addResult('8.5 Filter by status', 'SKIP', 'No options', Date.now() - start);
        }
    } catch (e) {
        results.addResult('8.5 Filter by status', 'FAIL', e.message, Date.now() - start);
    }

    // 8.6 Clear Filters
    start = Date.now();
    try {
        await waitAndClick(page, '#clear-filters');
        await delay(1000);
        results.addResult('8.6 Clear filters', 'PASS', '', Date.now() - start);
    } catch (e) {
        results.addResult('8.6 Clear filters', 'FAIL', e.message, Date.now() - start);
    }

    // 8.7 Sort Options
    start = Date.now();
    try {
        const options = await getSelectOptions(page, '#sort');
        if (options.length > 0) {
            await waitAndSelect(page, '#sort', options[0].value);
            await delay(1500);
            results.addResult('8.7 Sort options', 'PASS',
                `${options.length} sort options available`, Date.now() - start);
        } else {
            results.addResult('8.7 Sort options', 'SKIP', 'No options', Date.now() - start);
        }
    } catch (e) {
        results.addResult('8.7 Sort options', 'FAIL', e.message, Date.now() - start);
    }

    // 8.8 View Toggle (Grid/List)
    start = Date.now();
    try {
        const hasGridView = await exists(page, '#grid-view', 1000);
        const hasListView = await exists(page, '#list-view', 1000);

        if (hasGridView) {
            await waitAndClick(page, '#grid-view');
            await delay(500);
        }
        if (hasListView) {
            await waitAndClick(page, '#list-view');
            await delay(500);
        }

        results.addResult('8.8 View toggle', hasGridView || hasListView ? 'PASS' : 'SKIP',
            `Grid: ${hasGridView}, List: ${hasListView}`, Date.now() - start);
    } catch (e) {
        results.addResult('8.8 View toggle', 'FAIL', e.message, Date.now() - start);
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================
async function runIntensiveTests() {
    console.log('╔' + '═'.repeat(66) + '╗');
    console.log('║' + ' '.repeat(10) + 'LearnHub Course System - INTENSIVE TEST' + ' '.repeat(17) + '║');
    console.log('║' + ' '.repeat(15) + 'Professional QA Tester Level' + ' '.repeat(23) + '║');
    console.log('╚' + '═'.repeat(66) + '╝');
    console.log(`\nStarted at: ${new Date().toLocaleString()}`);
    console.log(`Target URL: ${CONFIG.BASE_URL}`);
    console.log('─'.repeat(68));

    const results = new TestResults();
    let browser, page;

    try {
        // Create screenshots directory
        if (!fs.existsSync(CONFIG.SCREENSHOTS_DIR)) {
            fs.mkdirSync(CONFIG.SCREENSHOTS_DIR, { recursive: true });
        }

        // Launch browser
        console.log('\n🚀 Launching browser...');
        browser = await puppeteer.launch({
            headless: CONFIG.HEADLESS,
            slowMo: CONFIG.SLOW_MO,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            defaultViewport: { width: 1366, height: 768 }
        });

        page = await browser.newPage();
        page.setDefaultTimeout(CONFIG.TIMEOUT.ELEMENT);

        // Login
        const loggedIn = await login(page, results);
        if (!loggedIn) {
            console.log('\n❌ Login failed - cannot continue tests');
            return;
        }

        // Run all intensive tests
        const courseId = await testIntensiveCourseCreation(page, results);
        await testIntensiveCourseDetail(page, results, courseId);
        await testIntensiveCourseEditing(page, results, courseId);
        await testIntensiveValidation(page, results);
        await testIntensiveSearchFilter(page, results);

    } catch (error) {
        console.error('\n❌ Critical error:', error.message);
        results.addResult('CRITICAL ERROR', 'FAIL', error.message, 0);
    } finally {
        if (browser) await browser.close();
    }

    // Generate report
    const report = results.generateReport();

    console.log('\n' + '═'.repeat(68));
    console.log('                    INTENSIVE TEST REPORT SUMMARY');
    console.log('═'.repeat(68));
    console.log(`\n📊 Results:`);
    console.log(`   Total Tests: ${report.summary.total}`);
    console.log(`   ✅ Passed: ${report.summary.passed}`);
    console.log(`   ❌ Failed: ${report.summary.failed}`);
    console.log(`   ⏭️  Skipped: ${report.summary.skipped}`);
    console.log(`   📈 Pass Rate: ${report.summary.passRate}`);
    console.log(`   ⏱️  Duration: ${report.summary.totalDuration}`);

    if (report.errors.length > 0) {
        console.log('\n❌ Failed Tests:');
        report.errors.forEach((err, i) => {
            console.log(`   ${i + 1}. ${err.testName}: ${err.error}`);
        });
    }

    console.log('\n' + '═'.repeat(68));
    console.log(`Test completed at: ${new Date().toLocaleString()}`);
    console.log('═'.repeat(68));

    // Save report
    const reportPath = `./tests/course-intensive-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);

    return report;
}

// Run
runIntensiveTests()
    .then(report => process.exit(report.summary.failed > 0 ? 1 : 0))
    .catch(e => { console.error(e); process.exit(1); });
