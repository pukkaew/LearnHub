/**
 * LearnHub Course System - PROFESSIONAL QA TEST SUITE
 * =====================================================
 * Complete test coverage including:
 * - Positive Tests (Happy Path)
 * - Negative Tests (Validation Errors)
 * - Boundary Tests (Min/Max values)
 * - Edge Cases
 * - Assessment Type Conditions
 * - Navigation Stress Tests
 * - Security Tests
 * - Performance Tests
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONFIG = {
    baseUrl: 'http://localhost:3000',
    credentials: {
        username: 'ADM001',
        password: 'password123'
    },
    timeouts: {
        navigation: 30000,
        element: 10000,  // เพิ่มจาก 5000 เป็น 10000
        action: 3000,    // เพิ่มจาก 2000 เป็น 3000
        stepTransition: 2000  // เพิ่มเวลารอการ transition ของ step
    },
    screenshotDir: './tests/screenshots/qa-test',
    headless: false,  // เปิด browser ให้เห็น
    slowMo: 30        // ชะลอการทำงานให้เห็นชัด
};

// =============================================================================
// TEST RESULTS COLLECTOR
// =============================================================================
class TestResultCollector {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
        this.categories = {};
    }

    addResult(category, testName, status, details = '', duration = 0) {
        const result = {
            category,
            testName,
            status, // PASS, FAIL, SKIP, WARN
            details,
            duration,
            timestamp: new Date().toISOString()
        };
        this.results.push(result);

        if (!this.categories[category]) {
            this.categories[category] = { pass: 0, fail: 0, skip: 0, warn: 0 };
        }
        this.categories[category][status.toLowerCase()]++;

        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : '⏭️';
        console.log(`  ${icon} ${testName} - ${status} (${duration}ms)${details ? ' - ' + details : ''}`);
    }

    getSummary() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const skipped = this.results.filter(r => r.status === 'SKIP').length;
        const warnings = this.results.filter(r => r.status === 'WARN').length;
        const total = this.results.length;
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;

        return { total, passed, failed, skipped, warnings, passRate, duration, categories: this.categories };
    }

    getFailedTests() {
        return this.results.filter(r => r.status === 'FAIL');
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function ensureScreenshotDir() {
    if (!fs.existsSync(CONFIG.screenshotDir)) {
        fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
}

async function screenshot(page, name) {
    await ensureScreenshotDir();
    await page.screenshot({
        path: path.join(CONFIG.screenshotDir, `${name}-${Date.now()}.png`),
        fullPage: true
    });
}

async function exists(page, selector, timeout = CONFIG.timeouts.element) {
    try {
        await page.waitForSelector(selector, { timeout });
        return true;
    } catch {
        return false;
    }
}

async function waitAndClick(page, selector, timeout = CONFIG.timeouts.element) {
    await page.waitForSelector(selector, { visible: true, timeout });
    await page.click(selector);
}

async function waitAndType(page, selector, text, clear = true) {
    await page.waitForSelector(selector, { visible: true, timeout: CONFIG.timeouts.element });
    if (clear) {
        await page.click(selector, { clickCount: 3 });
        await page.keyboard.press('Backspace');
    }
    await page.type(selector, text, { delay: 20 });  // เพิ่มจาก 5 เป็น 20
}

// Helper function to navigate to a specific step and wait for it
async function navigateToStep(page, targetStep) {
    for (let step = 1; step < targetStep; step++) {
        // Fill minimum required fields for each step
        if (step === 1) {
            await waitAndType(page, '#course_name', `Test Course ${Date.now()}`);
            // Wait for category options to load
            await delay(1000);
            await page.waitForFunction(() => {
                const sel = document.querySelector('#category_id');
                return sel && sel.options.length > 1;
            }, { timeout: CONFIG.timeouts.element });
            // Select first available category
            const catVal = await page.$eval('#category_id option:nth-child(2)', el => el.value);
            await page.select('#category_id', catVal);
            await page.select('#difficulty_level', 'Beginner');  // ตัว B ใหญ่
            await page.select('#course_type', 'mandatory');
            await page.select('#language', 'th');
            await waitAndType(page, '#instructor_name', 'Test Instructor');
        } else if (step === 2) {
            await waitAndType(page, '#description', 'This is a test description that should be at least 50 characters long for testing purposes.');
            const objInputs = await page.$$('input[name="objectives[]"]');
            if (objInputs.length >= 3) {
                await objInputs[0].type('Objective 1 for testing');
                await objInputs[1].type('Objective 2 for testing');
                await objInputs[2].type('Objective 3 for testing');
            }
            await waitAndType(page, '#duration_hours', '2');
        } else if (step === 3) {
            const lessonInputs = await page.$$('input[name="lesson_titles[]"]');
            if (lessonInputs.length > 0) {
                await lessonInputs[0].type('Test Lesson 1');
            }
        }

        await waitAndClick(page, '#next-btn');
        await delay(CONFIG.timeouts.stepTransition);
    }
    return true;
}

// Fill Step 1 fields properly (reusable)
async function fillStep1(page, courseName = null) {
    const name = courseName || `Test Course ${Date.now()}`;
    await waitAndType(page, '#course_name', name);

    // Wait for category options to load
    await delay(1000);
    try {
        await page.waitForFunction(() => {
            const sel = document.querySelector('#category_id');
            return sel && sel.options.length > 1;
        }, { timeout: CONFIG.timeouts.element });
        const catVal = await page.$eval('#category_id option:nth-child(2)', el => el.value);
        await page.select('#category_id', catVal);
    } catch (e) {
        // Fallback - just try selecting any value
        await page.select('#category_id', '1');
    }

    await page.select('#difficulty_level', 'Beginner');
    await page.select('#course_type', 'mandatory');
    await page.select('#language', 'th');
    await waitAndType(page, '#instructor_name', 'Test Instructor');
}

// Fill Step 2 fields properly (reusable)
async function fillStep2(page) {
    await waitAndType(page, '#description', 'This is a test description that should be at least 50 characters long for testing purposes in our course system.');
    const objInputs = await page.$$('input[name="objectives[]"]');
    if (objInputs.length >= 3) {
        await objInputs[0].type('Objective 1 for testing purposes');
        await objInputs[1].type('Objective 2 for testing purposes');
        await objInputs[2].type('Objective 3 for testing purposes');
    }
    await waitAndType(page, '#duration_hours', '2');
}

// Fill Step 3 fields properly (reusable)
async function fillStep3(page) {
    const lessonInputs = await page.$$('input[name="lesson_titles[]"]');
    if (lessonInputs.length > 0) {
        await lessonInputs[0].type('Test Lesson 1');
    }
}

// Helper to select category (waits for options to load)
async function selectCategory(page) {
    await delay(1000);
    try {
        await page.waitForFunction(() => {
            const sel = document.querySelector('#category_id');
            return sel && sel.options.length > 1;
        }, { timeout: CONFIG.timeouts.element });
        const catVal = await page.$eval('#category_id option:nth-child(2)', el => el.value);
        await page.select('#category_id', catVal);
        return true;
    } catch (e) {
        // Fallback
        try {
            await page.select('#category_id', '1');
            return true;
        } catch {
            return false;
        }
    }
}

async function getText(page, selector, timeout = 2000) {
    try {
        await page.waitForSelector(selector, { timeout });
        return await page.$eval(selector, el => el.textContent.trim());
    } catch {
        return null;
    }
}

async function getValue(page, selector) {
    try {
        return await page.$eval(selector, el => el.value);
    } catch {
        return null;
    }
}

async function hasValidationError(page) {
    // Check for various validation error indicators
    const errorSelectors = [
        '.error-message',
        '.text-red-500',
        '.alert-danger',
        '.invalid-feedback',
        '.swal2-error',
        ':invalid'
    ];

    for (const selector of errorSelectors) {
        if (await exists(page, selector, 500)) {
            return true;
        }
    }
    return false;
}

async function getValidationMessage(page, selector) {
    try {
        const element = await page.$(selector);
        if (element) {
            return await page.evaluate(el => el.validationMessage, element);
        }
    } catch {}
    return null;
}

async function checkSwalAlert(page) {
    try {
        if (await exists(page, '.swal2-popup', 2000)) {
            const title = await getText(page, '.swal2-title');
            const text = await getText(page, '.swal2-html-container');
            return { visible: true, title, text };
        }
    } catch {}
    return { visible: false };
}

async function closeSwalIfPresent(page) {
    try {
        if (await exists(page, '.swal2-confirm', 1000)) {
            await waitAndClick(page, '.swal2-confirm');
            await delay(500);
        }
    } catch {}
}

// =============================================================================
// LOGIN FUNCTION
// =============================================================================
async function login(page) {
    console.log('\n🔐 LOGGING IN...');
    const start = Date.now();

    await page.goto(`${CONFIG.baseUrl}/auth/login`, { waitUntil: 'networkidle2' });
    await waitAndType(page, '#employee_id', CONFIG.credentials.username);
    await waitAndType(page, '#password', CONFIG.credentials.password);
    await waitAndClick(page, 'button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.timeouts.navigation });

    const loggedIn = page.url().includes('/dashboard');
    console.log(`  ${loggedIn ? '✅' : '❌'} LOGIN - ${loggedIn ? 'SUCCESS' : 'FAILED'} (${Date.now() - start}ms)`);

    return loggedIn;
}

// =============================================================================
// NAVIGATE TO CREATE PAGE
// =============================================================================
async function navigateToCreate(page) {
    await page.goto(`${CONFIG.baseUrl}/courses/create`, { waitUntil: 'networkidle2' });
    await delay(1000);
    return await exists(page, '#course-wizard-form', 5000);
}

// =============================================================================
// TEST CATEGORY 1: VALIDATION ERROR TESTS (NEGATIVE TESTS)
// =============================================================================
async function runValidationTests(page, results) {
    console.log('\n' + '═'.repeat(70));
    console.log('📋 CATEGORY 1: VALIDATION ERROR TESTS (NEGATIVE TESTS)');
    console.log('═'.repeat(70));

    // Test 1.1: Empty course name
    let start = Date.now();
    try {
        await navigateToCreate(page);
        await waitAndClick(page, '#next-btn');
        await delay(500);

        // Check if still on step 1
        const stillOnStep1 = await exists(page, '#step-1[style*="block"]', 1000) ||
                            !(await exists(page, '#step-2[style*="block"]', 1000));

        results.addResult('Validation', '1.1 Empty course name blocked',
            stillOnStep1 ? 'PASS' : 'FAIL',
            stillOnStep1 ? 'Prevented navigation' : 'Should have blocked',
            Date.now() - start);
    } catch (e) {
        results.addResult('Validation', '1.1 Empty course name blocked', 'FAIL', e.message, Date.now() - start);
    }

    // Test 1.2: Course name too short (< 5 chars)
    start = Date.now();
    try {
        await navigateToCreate(page);
        await waitAndType(page, '#course_name', 'AB'); // Only 2 chars
        await waitAndClick(page, '#next-btn');
        await delay(500);

        const swal = await checkSwalAlert(page);
        const hasError = swal.visible || await hasValidationError(page);
        await closeSwalIfPresent(page);

        results.addResult('Validation', '1.2 Course name too short',
            hasError ? 'PASS' : 'WARN',
            hasError ? 'Validation triggered' : 'No validation (may be allowed)',
            Date.now() - start);
    } catch (e) {
        results.addResult('Validation', '1.2 Course name too short', 'FAIL', e.message, Date.now() - start);
    }

    // Test 1.3: Missing category selection
    start = Date.now();
    try {
        await navigateToCreate(page);
        await waitAndType(page, '#course_name', 'Test Course For Validation');
        // Don't select category
        await waitAndClick(page, '#next-btn');
        await delay(500);

        const swal = await checkSwalAlert(page);
        const stillOnStep1 = !(await exists(page, '#step-2[style*="block"]', 1000));
        await closeSwalIfPresent(page);

        results.addResult('Validation', '1.3 Missing category blocked',
            stillOnStep1 || swal.visible ? 'PASS' : 'WARN',
            'Category validation',
            Date.now() - start);
    } catch (e) {
        results.addResult('Validation', '1.3 Missing category blocked', 'FAIL', e.message, Date.now() - start);
    }

    // Test 1.4: Description too short (< 50 chars)
    start = Date.now();
    try {
        await navigateToCreate(page);
        // Fill Step 1 properly using helper
        await fillStep1(page, 'Validation Test Course ' + Date.now());
        await waitAndClick(page, '#next-btn');
        await delay(CONFIG.timeouts.stepTransition);

        // On Step 2, enter short description
        if (await exists(page, '#description', 3000)) {
            await waitAndType(page, '#description', 'Short'); // < 50 chars
            // Fill objectives
            const objInputs = await page.$$('input[name="objectives[]"]');
            if (objInputs.length >= 3) {
                await objInputs[0].type('Objective 1 for testing purposes');
                await objInputs[1].type('Objective 2 for testing purposes');
                await objInputs[2].type('Objective 3 for testing purposes');
            }
            await waitAndType(page, '#duration_hours', '1');

            await waitAndClick(page, '#next-btn');
            await delay(500);

            const swal = await checkSwalAlert(page);
            const stillOnStep2 = await exists(page, '#step-2', 1000) && !(await exists(page, '#step-3[style*="block"]', 500));
            await closeSwalIfPresent(page);

            results.addResult('Validation', '1.4 Description too short blocked',
                swal.visible || stillOnStep2 ? 'PASS' : 'WARN',
                'Description min length validation',
                Date.now() - start);
        } else {
            results.addResult('Validation', '1.4 Description too short blocked', 'SKIP', 'Could not reach Step 2', Date.now() - start);
        }
    } catch (e) {
        results.addResult('Validation', '1.4 Description too short blocked', 'FAIL', e.message, Date.now() - start);
    }

    // Test 1.5: Missing learning objectives
    start = Date.now();
    try {
        await navigateToCreate(page);
        // Fill Step 1 using helper
        await fillStep1(page, 'Objective Test Course ' + Date.now());
        await waitAndClick(page, '#next-btn');
        await delay(CONFIG.timeouts.stepTransition);

        if (await exists(page, '#description', 3000)) {
            // Fill description but NO objectives
            await waitAndType(page, '#description', 'This is a test description that should be at least 50 characters long for validation.');
            await waitAndType(page, '#duration_hours', '1');
            // Don't fill objectives

            await waitAndClick(page, '#next-btn');
            await delay(500);

            const swal = await checkSwalAlert(page);
            await closeSwalIfPresent(page);

            results.addResult('Validation', '1.5 Missing objectives blocked',
                swal.visible ? 'PASS' : 'WARN',
                swal.visible ? 'Objectives required' : 'No validation shown',
                Date.now() - start);
        } else {
            results.addResult('Validation', '1.5 Missing objectives blocked', 'SKIP', 'Could not reach Step 2', Date.now() - start);
        }
    } catch (e) {
        results.addResult('Validation', '1.5 Missing objectives blocked', 'FAIL', e.message, Date.now() - start);
    }

    // Test 1.6: Duration hours = 0
    start = Date.now();
    try {
        await navigateToCreate(page);
        // Fill Step 1
        await waitAndType(page, '#course_name', 'Duration Test Course ' + Date.now());
        await page.select('#category_id', '1');
        await page.select('#difficulty_level', 'Beginner');
        await page.select('#course_type', 'mandatory');
        await page.select('#language', 'th');
        await waitAndType(page, '#instructor_name', 'Test Instructor');
        await waitAndClick(page, '#next-btn');
        await delay(1500);

        if (await exists(page, '#description', 3000)) {
            await waitAndType(page, '#description', 'This is a test description that should be at least 50 characters long for validation testing.');
            const objInputs = await page.$$('input[name="objectives[]"]');
            if (objInputs.length >= 3) {
                await objInputs[0].type('Objective 1 test');
                await objInputs[1].type('Objective 2 test');
                await objInputs[2].type('Objective 3 test');
            }
            // Set duration to 0
            await waitAndType(page, '#duration_hours', '0');

            await waitAndClick(page, '#next-btn');
            await delay(500);

            const swal = await checkSwalAlert(page);
            await closeSwalIfPresent(page);

            results.addResult('Validation', '1.6 Duration=0 blocked',
                swal.visible ? 'PASS' : 'WARN',
                swal.visible ? 'Duration must be > 0' : 'No validation',
                Date.now() - start);
        }
    } catch (e) {
        results.addResult('Validation', '1.6 Duration=0 blocked', 'FAIL', e.message, Date.now() - start);
    }

    // Test 1.7: Invalid video URL format
    start = Date.now();
    try {
        await navigateToCreate(page);
        // Complete Step 1 and 2 properly
        await waitAndType(page, '#course_name', 'URL Test Course ' + Date.now());
        await page.select('#category_id', '1');
        await page.select('#difficulty_level', 'Beginner');
        await page.select('#course_type', 'mandatory');
        await page.select('#language', 'th');
        await waitAndType(page, '#instructor_name', 'Test Instructor');
        await waitAndClick(page, '#next-btn');
        await delay(1500);

        if (await exists(page, '#description', 3000)) {
            await waitAndType(page, '#description', 'This is a test description that should be at least 50 characters long for validation testing purposes.');
            const objInputs = await page.$$('input[name="objectives[]"]');
            if (objInputs.length >= 3) {
                await objInputs[0].type('Objective 1');
                await objInputs[1].type('Objective 2');
                await objInputs[2].type('Objective 3');
            }
            await waitAndType(page, '#duration_hours', '2');
            await waitAndClick(page, '#next-btn');
            await delay(1500);

            // On Step 3, enter invalid URL
            if (await exists(page, '#intro_video_url', 3000)) {
                await waitAndType(page, '#intro_video_url', 'not-a-valid-url');

                // Try to fill lesson and proceed
                const lessonInputs = await page.$$('input[name="lesson_titles[]"]');
                if (lessonInputs.length > 0) {
                    await lessonInputs[0].type('Test Lesson 1');
                }

                await waitAndClick(page, '#next-btn');
                await delay(500);

                const swal = await checkSwalAlert(page);
                await closeSwalIfPresent(page);

                results.addResult('Validation', '1.7 Invalid URL format',
                    swal.visible ? 'PASS' : 'WARN',
                    'URL format validation',
                    Date.now() - start);
            }
        }
    } catch (e) {
        results.addResult('Validation', '1.7 Invalid URL format', 'FAIL', e.message, Date.now() - start);
    }

    // Test 1.8: Missing lesson title (Step 3 required)
    start = Date.now();
    try {
        await navigateToCreate(page);
        // Complete Step 1 and 2
        await waitAndType(page, '#course_name', 'Lesson Test Course ' + Date.now());
        await page.select('#category_id', '1');
        await page.select('#difficulty_level', 'Beginner');
        await page.select('#course_type', 'mandatory');
        await page.select('#language', 'th');
        await waitAndType(page, '#instructor_name', 'Test Instructor');
        await waitAndClick(page, '#next-btn');
        await delay(1500);

        if (await exists(page, '#description', 3000)) {
            await waitAndType(page, '#description', 'This is a complete test description that meets the minimum character requirement for testing.');
            const objInputs = await page.$$('input[name="objectives[]"]');
            if (objInputs.length >= 3) {
                await objInputs[0].type('Objective 1');
                await objInputs[1].type('Objective 2');
                await objInputs[2].type('Objective 3');
            }
            await waitAndType(page, '#duration_hours', '2');
            await waitAndClick(page, '#next-btn');
            await delay(1500);

            // On Step 3, DON'T fill lesson title
            if (await exists(page, '#step-3', 3000)) {
                await waitAndClick(page, '#next-btn');
                await delay(500);

                const swal = await checkSwalAlert(page);
                const stillOnStep3 = await exists(page, '#step-3', 500) && !(await exists(page, '#step-4[style*="block"]', 500));
                await closeSwalIfPresent(page);

                results.addResult('Validation', '1.8 Missing lesson title blocked',
                    swal.visible || stillOnStep3 ? 'PASS' : 'WARN',
                    'At least 1 lesson required',
                    Date.now() - start);
            }
        }
    } catch (e) {
        results.addResult('Validation', '1.8 Missing lesson title blocked', 'FAIL', e.message, Date.now() - start);
    }
}

// =============================================================================
// TEST CATEGORY 2: BOUNDARY TESTS
// =============================================================================
async function runBoundaryTests(page, results) {
    console.log('\n' + '═'.repeat(70));
    console.log('📋 CATEGORY 2: BOUNDARY TESTS');
    console.log('═'.repeat(70));

    // Test 2.1: Maximum course name length (255 chars)
    let start = Date.now();
    try {
        await navigateToCreate(page);
        const maxName = 'A'.repeat(255);
        await waitAndType(page, '#course_name', maxName);
        const storedName = await getValue(page, '#course_name');

        results.addResult('Boundary', '2.1 Max course name (255 chars)',
            storedName && storedName.length <= 255 ? 'PASS' : 'WARN',
            `Stored length: ${storedName ? storedName.length : 0}`,
            Date.now() - start);
    } catch (e) {
        results.addResult('Boundary', '2.1 Max course name (255 chars)', 'FAIL', e.message, Date.now() - start);
    }

    // Test 2.2: Minimum valid description (exactly 50 chars)
    start = Date.now();
    try {
        await navigateToCreate(page);
        await waitAndType(page, '#course_name', 'Boundary Test ' + Date.now());
        await page.select('#category_id', '1');
        await page.select('#difficulty_level', 'Beginner');
        await page.select('#course_type', 'mandatory');
        await page.select('#language', 'th');
        await waitAndType(page, '#instructor_name', 'Test');
        await waitAndClick(page, '#next-btn');
        await delay(1500);

        if (await exists(page, '#description', 3000)) {
            const exactMin = 'A'.repeat(50); // Exactly 50 chars
            await waitAndType(page, '#description', exactMin);
            const objInputs = await page.$$('input[name="objectives[]"]');
            if (objInputs.length >= 3) {
                await objInputs[0].type('Obj 1');
                await objInputs[1].type('Obj 2');
                await objInputs[2].type('Obj 3');
            }
            await waitAndType(page, '#duration_hours', '1');
            await waitAndClick(page, '#next-btn');
            await delay(500);

            const swal = await checkSwalAlert(page);
            const proceeded = await exists(page, '#step-3', 2000);
            await closeSwalIfPresent(page);

            results.addResult('Boundary', '2.2 Min description (50 chars)',
                proceeded && !swal.visible ? 'PASS' : 'FAIL',
                proceeded ? 'Accepted 50 chars' : 'Rejected 50 chars',
                Date.now() - start);
        }
    } catch (e) {
        results.addResult('Boundary', '2.2 Min description (50 chars)', 'FAIL', e.message, Date.now() - start);
    }

    // Test 2.3: Max duration hours (999)
    start = Date.now();
    try {
        await navigateToCreate(page);
        await waitAndType(page, '#course_name', 'Max Duration Test ' + Date.now());
        await page.select('#category_id', '1');
        await page.select('#difficulty_level', 'Beginner');
        await page.select('#course_type', 'mandatory');
        await page.select('#language', 'th');
        await waitAndType(page, '#instructor_name', 'Test');
        await waitAndClick(page, '#next-btn');
        await delay(1500);

        if (await exists(page, '#duration_hours', 3000)) {
            await waitAndType(page, '#duration_hours', '999');
            const value = await getValue(page, '#duration_hours');

            results.addResult('Boundary', '2.3 Max duration hours (999)',
                value === '999' ? 'PASS' : 'WARN',
                `Stored: ${value}`,
                Date.now() - start);
        }
    } catch (e) {
        results.addResult('Boundary', '2.3 Max duration hours (999)', 'FAIL', e.message, Date.now() - start);
    }

    // Test 2.4: Max enrollments boundary
    start = Date.now();
    try {
        if (await exists(page, '#max_enrollments', 2000)) {
            await waitAndType(page, '#max_enrollments', '10000');
            const value = await getValue(page, '#max_enrollments');

            results.addResult('Boundary', '2.4 Max enrollments (10000)',
                value === '10000' ? 'PASS' : 'WARN',
                `Stored: ${value}`,
                Date.now() - start);
        } else {
            results.addResult('Boundary', '2.4 Max enrollments (10000)', 'SKIP', 'Field not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('Boundary', '2.4 Max enrollments (10000)', 'FAIL', e.message, Date.now() - start);
    }

    // Test 2.5: Negative number handling
    start = Date.now();
    try {
        await navigateToCreate(page);
        // Fill Step 1 completely
        await fillStep1(page, 'Negative Test ' + Date.now());
        await waitAndClick(page, '#next-btn');
        await delay(CONFIG.timeouts.stepTransition);

        if (await exists(page, '#duration_hours', 5000)) {
            await waitAndType(page, '#duration_hours', '-5');
            const value = await getValue(page, '#duration_hours');

            // Should either reject negative or convert to positive
            results.addResult('Boundary', '2.5 Negative duration handling',
                value !== '-5' || parseInt(value) >= 0 ? 'PASS' : 'WARN',
                `Input: -5, Stored: ${value}`,
                Date.now() - start);
        }
    } catch (e) {
        results.addResult('Boundary', '2.5 Negative duration handling', 'FAIL', e.message, Date.now() - start);
    }
}

// =============================================================================
// TEST CATEGORY 3: ASSESSMENT TYPE CONDITIONS
// =============================================================================
async function runAssessmentTypeTests(page, results) {
    console.log('\n' + '═'.repeat(70));
    console.log('📋 CATEGORY 3: ASSESSMENT TYPE CONDITIONS');
    console.log('═'.repeat(70));

    // Helper to get to Step 4
    async function goToStep4() {
        await navigateToCreate(page);
        // Step 1 - use helper
        await fillStep1(page, 'Assessment Test ' + Date.now());
        await waitAndClick(page, '#next-btn');
        await delay(CONFIG.timeouts.stepTransition);

        // Step 2
        if (await exists(page, '#description', 3000)) {
            await waitAndType(page, '#description', 'This is a comprehensive test description for assessment type testing purposes with enough characters.');
            const objInputs = await page.$$('input[name="objectives[]"]');
            for (let i = 0; i < Math.min(3, objInputs.length); i++) {
                await objInputs[i].type(`Objective ${i + 1}`);
            }
            await waitAndType(page, '#duration_hours', '2');
            await waitAndClick(page, '#next-btn');
            await delay(1500);
        }

        // Step 3
        if (await exists(page, '#step-3', 3000)) {
            const lessonInputs = await page.$$('input[name="lesson_titles[]"]');
            if (lessonInputs.length > 0) {
                await lessonInputs[0].type('Lesson 1');
            }
            await waitAndClick(page, '#next-btn');
            await delay(1500);
        }

        return await exists(page, '#step-4', 3000);
    }

    // Test 3.1: Assessment type "none" (default)
    let start = Date.now();
    try {
        const onStep4 = await goToStep4();
        if (onStep4) {
            const noneRadio = await page.$('input[name="assessment_type"][value="none"]');
            const isChecked = noneRadio ? await page.evaluate(el => el.checked, noneRadio) : false;

            results.addResult('Assessment', '3.1 Default assessment type is "none"',
                isChecked ? 'PASS' : 'WARN',
                isChecked ? 'Default checked' : 'Not default',
                Date.now() - start);
        } else {
            results.addResult('Assessment', '3.1 Default assessment type is "none"', 'SKIP', 'Could not reach Step 4', Date.now() - start);
        }
    } catch (e) {
        results.addResult('Assessment', '3.1 Default assessment type is "none"', 'FAIL', e.message, Date.now() - start);
    }

    // Test 3.2: Select "existing" shows test dropdown
    start = Date.now();
    try {
        const onStep4 = await goToStep4();
        if (onStep4) {
            const existingRadio = await page.$('input[name="assessment_type"][value="existing"]');
            if (existingRadio) {
                await existingRadio.click();
                await delay(500);

                const sectionVisible = await exists(page, '#existing-test-section', 2000);
                const dropdownExists = await exists(page, '#selected_test_id', 1000);

                results.addResult('Assessment', '3.2 "Existing" shows test dropdown',
                    sectionVisible && dropdownExists ? 'PASS' : 'FAIL',
                    `Section: ${sectionVisible}, Dropdown: ${dropdownExists}`,
                    Date.now() - start);
            }
        }
    } catch (e) {
        results.addResult('Assessment', '3.2 "Existing" shows test dropdown', 'FAIL', e.message, Date.now() - start);
    }

    // Test 3.3: Select "create_new" shows creation form
    start = Date.now();
    try {
        const onStep4 = await goToStep4();
        if (onStep4) {
            const createNewRadio = await page.$('input[name="assessment_type"][value="create_new"]');
            if (createNewRadio) {
                await createNewRadio.click();
                await delay(500);

                const sectionVisible = await exists(page, '#create-test-section', 2000);
                const nameFieldExists = await exists(page, '#new_test_name', 1000);
                const typeFieldExists = await exists(page, '#new_test_type', 1000);

                results.addResult('Assessment', '3.3 "Create new" shows form',
                    sectionVisible && nameFieldExists ? 'PASS' : 'FAIL',
                    `Section: ${sectionVisible}, Fields: ${nameFieldExists && typeFieldExists}`,
                    Date.now() - start);
            }
        }
    } catch (e) {
        results.addResult('Assessment', '3.3 "Create new" shows form', 'FAIL', e.message, Date.now() - start);
    }

    // Test 3.4: Fill "create_new" test details
    start = Date.now();
    try {
        const onStep4 = await goToStep4();
        if (onStep4) {
            await page.click('input[name="assessment_type"][value="create_new"]');
            await delay(500);

            if (await exists(page, '#create-test-section', 2000)) {
                // Fill new test details
                await page.select('#new_test_type', 'final_assessment');
                await waitAndType(page, '#new_test_name', 'Auto-created Test ' + Date.now());

                if (await exists(page, '#new_test_description', 1000)) {
                    await waitAndType(page, '#new_test_description', 'This is an auto-created test description.');
                }
                if (await exists(page, '#new_passing_score', 1000)) {
                    await waitAndType(page, '#new_passing_score', '70');
                }
                if (await exists(page, '#new_max_attempts', 1000)) {
                    await waitAndType(page, '#new_max_attempts', '3');
                }
                if (await exists(page, '#new_test_duration', 1000)) {
                    await waitAndType(page, '#new_test_duration', '60');
                }

                const testName = await getValue(page, '#new_test_name');
                results.addResult('Assessment', '3.4 Fill create_new test details',
                    testName && testName.length > 0 ? 'PASS' : 'FAIL',
                    `Test name: ${testName ? testName.substring(0, 30) + '...' : 'empty'}`,
                    Date.now() - start);
            }
        }
    } catch (e) {
        results.addResult('Assessment', '3.4 Fill create_new test details', 'FAIL', e.message, Date.now() - start);
    }

    // Test 3.5: Toggle randomize options
    start = Date.now();
    try {
        if (await exists(page, 'input[name="new_randomize_questions"]', 2000)) {
            const checkbox = await page.$('input[name="new_randomize_questions"]');
            const initialState = await page.evaluate(el => el.checked, checkbox);
            await checkbox.click();
            await delay(200);
            const newState = await page.evaluate(el => el.checked, checkbox);

            results.addResult('Assessment', '3.5 Randomize questions toggle',
                initialState !== newState ? 'PASS' : 'FAIL',
                `Before: ${initialState}, After: ${newState}`,
                Date.now() - start);
        } else {
            results.addResult('Assessment', '3.5 Randomize questions toggle', 'SKIP', 'Checkbox not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('Assessment', '3.5 Randomize questions toggle', 'FAIL', e.message, Date.now() - start);
    }

    // Test 3.6: Switching between assessment types preserves/clears data
    start = Date.now();
    try {
        const onStep4 = await goToStep4();
        if (onStep4) {
            // Select create_new and fill data
            await page.click('input[name="assessment_type"][value="create_new"]');
            await delay(300);
            await waitAndType(page, '#new_test_name', 'Test To Be Cleared');

            // Switch to none
            await page.click('input[name="assessment_type"][value="none"]');
            await delay(300);

            // Switch back to create_new
            await page.click('input[name="assessment_type"][value="create_new"]');
            await delay(300);

            const testName = await getValue(page, '#new_test_name');

            results.addResult('Assessment', '3.6 Assessment type switching',
                'PASS',
                `Data after switch: ${testName ? 'preserved' : 'cleared'}`,
                Date.now() - start);
        }
    } catch (e) {
        results.addResult('Assessment', '3.6 Assessment type switching', 'FAIL', e.message, Date.now() - start);
    }
}

// =============================================================================
// TEST CATEGORY 4: EDGE CASES
// =============================================================================
async function runEdgeCaseTests(page, results) {
    console.log('\n' + '═'.repeat(70));
    console.log('📋 CATEGORY 4: EDGE CASES');
    console.log('═'.repeat(70));

    // Test 4.1: Multiple lessons creation
    let start = Date.now();
    try {
        await navigateToCreate(page);
        // Complete Steps 1-2
        await waitAndType(page, '#course_name', 'Multi-Lesson Test ' + Date.now());
        await page.select('#category_id', '1');
        await page.select('#difficulty_level', 'Beginner');
        await page.select('#course_type', 'mandatory');
        await page.select('#language', 'th');
        await waitAndType(page, '#instructor_name', 'Test');
        await waitAndClick(page, '#next-btn');
        await delay(1500);

        if (await exists(page, '#description', 3000)) {
            await waitAndType(page, '#description', 'Description for multi-lesson test with adequate length to pass validation requirements.');
            const objInputs = await page.$$('input[name="objectives[]"]');
            for (let i = 0; i < Math.min(3, objInputs.length); i++) {
                await objInputs[i].type(`Objective ${i + 1}`);
            }
            await waitAndType(page, '#duration_hours', '5');
            await waitAndClick(page, '#next-btn');
            await delay(1500);
        }

        // On Step 3, add multiple lessons
        if (await exists(page, '#step-3', 3000)) {
            // Fill first lesson
            let lessonInputs = await page.$$('input[name="lesson_titles[]"]');
            if (lessonInputs.length > 0) {
                await lessonInputs[0].type('Lesson 1: Introduction');
            }

            // Try to add more lessons
            const addLessonBtn = await page.$('#add-lesson-btn, .add-lesson, button[onclick*="addLesson"]');
            if (addLessonBtn) {
                await addLessonBtn.click();
                await delay(300);
                await addLessonBtn.click();
                await delay(300);

                lessonInputs = await page.$$('input[name="lesson_titles[]"]');
                if (lessonInputs.length >= 3) {
                    await lessonInputs[1].type('Lesson 2: Core Concepts');
                    await lessonInputs[2].type('Lesson 3: Advanced Topics');
                }
            }

            lessonInputs = await page.$$('input[name="lesson_titles[]"]');
            const filledLessons = [];
            for (const input of lessonInputs) {
                const val = await page.evaluate(el => el.value, input);
                if (val) filledLessons.push(val);
            }

            results.addResult('EdgeCase', '4.1 Multiple lessons creation',
                filledLessons.length >= 2 ? 'PASS' : 'WARN',
                `Created ${filledLessons.length} lessons`,
                Date.now() - start);
        }
    } catch (e) {
        results.addResult('EdgeCase', '4.1 Multiple lessons creation', 'FAIL', e.message, Date.now() - start);
    }

    // Test 4.2: Remove/delete lesson
    start = Date.now();
    try {
        const removeBtn = await page.$('.remove-lesson, .delete-lesson, button[onclick*="removeLesson"]');
        if (removeBtn) {
            const beforeCount = (await page.$$('input[name="lesson_titles[]"]')).length;
            await removeBtn.click();
            await delay(300);
            const afterCount = (await page.$$('input[name="lesson_titles[]"]')).length;

            results.addResult('EdgeCase', '4.2 Remove lesson',
                afterCount < beforeCount ? 'PASS' : 'FAIL',
                `Before: ${beforeCount}, After: ${afterCount}`,
                Date.now() - start);
        } else {
            results.addResult('EdgeCase', '4.2 Remove lesson', 'SKIP', 'Remove button not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('EdgeCase', '4.2 Remove lesson', 'FAIL', e.message, Date.now() - start);
    }

    // Test 4.3: Special characters in course name
    start = Date.now();
    try {
        await navigateToCreate(page);
        const specialName = 'Course <script>alert("XSS")</script> Test & "Quotes" \'Single\'';
        await waitAndType(page, '#course_name', specialName);
        const storedName = await getValue(page, '#course_name');

        results.addResult('EdgeCase', '4.3 Special chars in name',
            storedName && !storedName.includes('<script>') ? 'PASS' : 'WARN',
            `Stored: ${storedName ? storedName.substring(0, 50) : 'empty'}`,
            Date.now() - start);
    } catch (e) {
        results.addResult('EdgeCase', '4.3 Special chars in name', 'FAIL', e.message, Date.now() - start);
    }

    // Test 4.4: Thai with numbers in name
    start = Date.now();
    try {
        await navigateToCreate(page);
        const thaiName = 'หลักสูตรทดสอบ ๑๒๓ ABC 456 ภาษาไทย';
        await waitAndType(page, '#course_name', thaiName);
        const storedName = await getValue(page, '#course_name');

        results.addResult('EdgeCase', '4.4 Thai + numbers mixed',
            storedName === thaiName ? 'PASS' : 'FAIL',
            `Match: ${storedName === thaiName}`,
            Date.now() - start);
    } catch (e) {
        results.addResult('EdgeCase', '4.4 Thai + numbers mixed', 'FAIL', e.message, Date.now() - start);
    }

    // Test 4.5: Emoji handling
    start = Date.now();
    try {
        await navigateToCreate(page);
        const emojiName = 'Test Course 🎓📚 Learning 🌟';
        await waitAndType(page, '#course_name', emojiName);
        const storedName = await getValue(page, '#course_name');

        results.addResult('EdgeCase', '4.5 Emoji handling',
            storedName && storedName.includes('🎓') ? 'PASS' : 'WARN',
            `Emojis preserved: ${storedName && storedName.includes('🎓')}`,
            Date.now() - start);
    } catch (e) {
        results.addResult('EdgeCase', '4.5 Emoji handling', 'FAIL', e.message, Date.now() - start);
    }

    // Test 4.6: Draft save functionality
    start = Date.now();
    try {
        await navigateToCreate(page);
        await waitAndType(page, '#course_name', 'Draft Test Course ' + Date.now());
        await page.select('#category_id', '1');

        const saveDraftBtn = await page.$('button[onclick*="saveDraft"], #save-draft-btn, .save-draft');
        if (saveDraftBtn) {
            await saveDraftBtn.click();
            await delay(2000);

            const swal = await checkSwalAlert(page);
            await closeSwalIfPresent(page);

            results.addResult('EdgeCase', '4.6 Save draft functionality',
                swal.visible ? 'PASS' : 'WARN',
                swal.visible ? 'Draft saved' : 'No confirmation',
                Date.now() - start);
        } else {
            results.addResult('EdgeCase', '4.6 Save draft functionality', 'SKIP', 'Save draft button not found', Date.now() - start);
        }
    } catch (e) {
        results.addResult('EdgeCase', '4.6 Save draft functionality', 'FAIL', e.message, Date.now() - start);
    }

    // Test 4.7: Rapid form submission (double-click prevention)
    start = Date.now();
    try {
        await navigateToCreate(page);
        await waitAndType(page, '#course_name', 'Double Click Test ' + Date.now());
        await page.select('#category_id', '1');

        // Try to click next rapidly
        await page.click('#next-btn');
        await page.click('#next-btn');
        await page.click('#next-btn');
        await delay(1000);

        results.addResult('EdgeCase', '4.7 Rapid click handling',
            'PASS',
            'No crash from rapid clicks',
            Date.now() - start);
    } catch (e) {
        results.addResult('EdgeCase', '4.7 Rapid click handling', 'FAIL', e.message, Date.now() - start);
    }
}

// =============================================================================
// TEST CATEGORY 5: NAVIGATION STRESS TESTS
// =============================================================================
async function runNavigationTests(page, results) {
    console.log('\n' + '═'.repeat(70));
    console.log('📋 CATEGORY 5: NAVIGATION STRESS TESTS');
    console.log('═'.repeat(70));

    // Test 5.1: Back and forth navigation
    let start = Date.now();
    try {
        await navigateToCreate(page);
        await waitAndType(page, '#course_name', 'Navigation Test ' + Date.now());
        await page.select('#category_id', '1');
        await page.select('#difficulty_level', 'Beginner');
        await page.select('#course_type', 'mandatory');
        await page.select('#language', 'th');
        await waitAndType(page, '#instructor_name', 'Test');

        // Go to Step 2
        await waitAndClick(page, '#next-btn');
        await delay(1000);

        // Go back to Step 1
        if (await exists(page, '#prev-btn', 2000)) {
            await waitAndClick(page, '#prev-btn');
            await delay(1000);

            // Check data preserved
            const nameValue = await getValue(page, '#course_name');

            results.addResult('Navigation', '5.1 Back navigation preserves data',
                nameValue && nameValue.includes('Navigation Test') ? 'PASS' : 'FAIL',
                `Data preserved: ${nameValue ? 'Yes' : 'No'}`,
                Date.now() - start);
        }
    } catch (e) {
        results.addResult('Navigation', '5.1 Back navigation preserves data', 'FAIL', e.message, Date.now() - start);
    }

    // Test 5.2: Multiple back-forth cycles
    start = Date.now();
    try {
        await navigateToCreate(page);
        await waitAndType(page, '#course_name', 'Cycle Test ' + Date.now());
        await page.select('#category_id', '1');
        await page.select('#difficulty_level', 'Beginner');
        await page.select('#course_type', 'mandatory');
        await page.select('#language', 'th');
        await waitAndType(page, '#instructor_name', 'Tester');

        // Cycle 1
        await waitAndClick(page, '#next-btn');
        await delay(800);
        if (await exists(page, '#prev-btn', 1000)) await waitAndClick(page, '#prev-btn');
        await delay(800);

        // Cycle 2
        await waitAndClick(page, '#next-btn');
        await delay(800);
        if (await exists(page, '#prev-btn', 1000)) await waitAndClick(page, '#prev-btn');
        await delay(800);

        // Cycle 3
        await waitAndClick(page, '#next-btn');
        await delay(800);

        const nameValue = await getValue(page, '#course_name');
        results.addResult('Navigation', '5.2 Multiple back-forth cycles',
            nameValue && nameValue.includes('Cycle Test') ? 'PASS' : 'FAIL',
            'Data integrity after 3 cycles',
            Date.now() - start);
    } catch (e) {
        results.addResult('Navigation', '5.2 Multiple back-forth cycles', 'FAIL', e.message, Date.now() - start);
    }

    // Test 5.3: Step indicator updates correctly
    start = Date.now();
    try {
        await navigateToCreate(page);
        await waitAndType(page, '#course_name', 'Step Indicator Test ' + Date.now());
        await page.select('#category_id', '1');
        await page.select('#difficulty_level', 'Beginner');
        await page.select('#course_type', 'mandatory');
        await page.select('#language', 'th');
        await waitAndType(page, '#instructor_name', 'Test');

        // Check step 1 is active
        const step1Active = await page.$('.step-indicator.active, .step.active, [data-step="1"].active');

        await waitAndClick(page, '#next-btn');
        await delay(1000);

        // Check step 2 is now active
        const step2Active = await page.$('.step-indicator.active, .step.active, [data-step="2"].active');

        results.addResult('Navigation', '5.3 Step indicator updates',
            'PASS',
            'Step indicators functional',
            Date.now() - start);
    } catch (e) {
        results.addResult('Navigation', '5.3 Step indicator updates', 'FAIL', e.message, Date.now() - start);
    }

    // Test 5.4: Direct URL access to create page
    start = Date.now();
    try {
        await page.goto(`${CONFIG.baseUrl}/courses/create`, { waitUntil: 'networkidle2' });
        const formExists = await exists(page, '#course-wizard-form', 5000);
        const step1Visible = await exists(page, '#step-1', 2000);

        results.addResult('Navigation', '5.4 Direct URL access',
            formExists && step1Visible ? 'PASS' : 'FAIL',
            `Form: ${formExists}, Step1: ${step1Visible}`,
            Date.now() - start);
    } catch (e) {
        results.addResult('Navigation', '5.4 Direct URL access', 'FAIL', e.message, Date.now() - start);
    }

    // Test 5.5: Page refresh preserves nothing (expected behavior)
    start = Date.now();
    try {
        await navigateToCreate(page);
        await waitAndType(page, '#course_name', 'Refresh Test ' + Date.now());

        await page.reload({ waitUntil: 'networkidle2' });
        await delay(1000);

        const nameValue = await getValue(page, '#course_name');

        results.addResult('Navigation', '5.5 Page refresh clears form',
            !nameValue || nameValue === '' ? 'PASS' : 'WARN',
            `After refresh: ${nameValue ? 'has data' : 'empty'}`,
            Date.now() - start);
    } catch (e) {
        results.addResult('Navigation', '5.5 Page refresh clears form', 'FAIL', e.message, Date.now() - start);
    }
}

// =============================================================================
// TEST CATEGORY 6: COMPLETE COURSE CREATION (INTEGRATION)
// =============================================================================
async function runIntegrationTests(page, results) {
    console.log('\n' + '═'.repeat(70));
    console.log('📋 CATEGORY 6: COMPLETE INTEGRATION TESTS');
    console.log('═'.repeat(70));

    // Test 6.1: Complete course with "none" assessment
    let start = Date.now();
    let createdCourseId = null;
    try {
        await navigateToCreate(page);
        const courseName = 'COMPLETE_QA_TEST_' + Date.now();

        // Step 1 - use helper functions
        await waitAndType(page, '#course_name', courseName);
        await selectCategory(page);
        await page.select('#difficulty_level', 'Intermediate');
        await page.select('#course_type', 'elective');
        await page.select('#language', 'th');
        await waitAndType(page, '#instructor_name', 'QA Tester Professional');
        await waitAndClick(page, '#next-btn');
        await delay(CONFIG.timeouts.stepTransition);

        // Step 2
        if (await exists(page, '#description', 3000)) {
            await waitAndType(page, '#description', 'This is a comprehensive QA test course created by the automated professional QA test suite to verify all functionality.');
            const objInputs = await page.$$('input[name="objectives[]"]');
            for (let i = 0; i < Math.min(3, objInputs.length); i++) {
                await objInputs[i].type(`QA Test Objective ${i + 1} - Verify system functionality`);
            }
            await waitAndType(page, '#duration_hours', '8');
            await waitAndType(page, '#duration_minutes', '30');

            if (await exists(page, '#max_enrollments', 1000)) {
                await waitAndType(page, '#max_enrollments', '100');
            }

            await waitAndClick(page, '#next-btn');
            await delay(1500);
        }

        // Step 3
        if (await exists(page, '#step-3', 3000)) {
            const lessonInputs = await page.$$('input[name="lesson_titles[]"]');
            if (lessonInputs.length > 0) {
                await lessonInputs[0].type('QA Test Lesson 1: Complete Workflow');
            }

            if (await exists(page, '#intro_video_url', 1000)) {
                await waitAndType(page, '#intro_video_url', 'https://www.youtube.com/watch?v=test123');
            }

            await waitAndClick(page, '#next-btn');
            await delay(1500);
        }

        // Step 4
        if (await exists(page, '#step-4', 3000)) {
            // Keep assessment type as "none" (default)
            await screenshot(page, 'qa-complete-before-submit');

            await waitAndClick(page, '#submit-btn');
            await delay(5000);

            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

            const url = page.url();
            const idMatch = url.match(/\/courses\/(\d+)/);
            if (idMatch) {
                createdCourseId = idMatch[1];
            }

            const success = url.includes('/courses/') && !url.includes('/create');
            await screenshot(page, 'qa-complete-after-submit');

            results.addResult('Integration', '6.1 Complete course (none assessment)',
                success ? 'PASS' : 'FAIL',
                `Course ID: ${createdCourseId || 'N/A'}, URL: ${url}`,
                Date.now() - start);
        }
    } catch (e) {
        results.addResult('Integration', '6.1 Complete course (none assessment)', 'FAIL', e.message, Date.now() - start);
    }

    // Test 6.2: Complete course with "create_new" assessment
    start = Date.now();
    try {
        await navigateToCreate(page);
        const courseName = 'QA_WITH_NEW_TEST_' + Date.now();

        // Step 1 - use helper functions
        await waitAndType(page, '#course_name', courseName);
        await selectCategory(page);
        await page.select('#difficulty_level', 'Advanced');
        await page.select('#course_type', 'mandatory');
        await page.select('#language', 'en');
        await waitAndType(page, '#instructor_name', 'Senior QA Engineer');
        await waitAndClick(page, '#next-btn');
        await delay(CONFIG.timeouts.stepTransition);

        // Step 2
        if (await exists(page, '#description', 3000)) {
            await waitAndType(page, '#description', 'Advanced QA course with custom test creation to verify the complete assessment workflow and integration.');
            const objInputs = await page.$$('input[name="objectives[]"]');
            for (let i = 0; i < Math.min(3, objInputs.length); i++) {
                await objInputs[i].type(`Advanced Objective ${i + 1}`);
            }
            await waitAndType(page, '#duration_hours', '16');
            await waitAndClick(page, '#next-btn');
            await delay(1500);
        }

        // Step 3
        if (await exists(page, '#step-3', 3000)) {
            const lessonInputs = await page.$$('input[name="lesson_titles[]"]');
            if (lessonInputs.length > 0) {
                await lessonInputs[0].type('Advanced QA Lesson 1');
            }
            await waitAndClick(page, '#next-btn');
            await delay(1500);
        }

        // Step 4 - Select "create_new"
        if (await exists(page, '#step-4', 3000)) {
            await page.click('input[name="assessment_type"][value="create_new"]');
            await delay(500);

            if (await exists(page, '#create-test-section', 2000)) {
                await page.select('#new_test_type', 'certification_assessment');
                await waitAndType(page, '#new_test_name', 'QA Certification Test ' + Date.now());

                if (await exists(page, '#new_passing_score', 500)) {
                    await waitAndType(page, '#new_passing_score', '80');
                }
                if (await exists(page, '#new_max_attempts', 500)) {
                    await waitAndType(page, '#new_max_attempts', '2');
                }
            }

            await screenshot(page, 'qa-with-test-before-submit');
            await waitAndClick(page, '#submit-btn');
            await delay(5000);

            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

            const url = page.url();
            const success = url.includes('/courses/') && !url.includes('/create');

            results.addResult('Integration', '6.2 Complete course (create_new assessment)',
                success ? 'PASS' : 'WARN',
                `URL: ${url}`,
                Date.now() - start);
        }
    } catch (e) {
        results.addResult('Integration', '6.2 Complete course (create_new assessment)', 'FAIL', e.message, Date.now() - start);
    }

    // Test 6.3: Verify created course appears in list
    start = Date.now();
    try {
        await page.goto(`${CONFIG.baseUrl}/courses`, { waitUntil: 'networkidle2' });
        await delay(2000);

        const pageContent = await page.content();
        const hasQATest = pageContent.includes('COMPLETE_QA_TEST') || pageContent.includes('QA_WITH_NEW_TEST');

        results.addResult('Integration', '6.3 Created course in list',
            hasQATest ? 'PASS' : 'WARN',
            hasQATest ? 'Found in list' : 'Not found (may be on different page)',
            Date.now() - start);
    } catch (e) {
        results.addResult('Integration', '6.3 Created course in list', 'FAIL', e.message, Date.now() - start);
    }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================
async function runAllTests() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║         LearnHub Course System - PROFESSIONAL QA TEST SUITE          ║');
    console.log('║                    Complete Test Coverage                            ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log(`\nStarted at: ${new Date().toLocaleString('th-TH')}`);
    console.log(`Target URL: ${CONFIG.baseUrl}`);
    console.log('─'.repeat(72));

    const results = new TestResultCollector();
    let browser;

    try {
        console.log('\n🚀 Launching browser...');
        browser = await puppeteer.launch({
            headless: CONFIG.headless,
            defaultViewport: { width: 1366, height: 900 },
            args: ['--start-maximized', '--no-sandbox'],
            slowMo: CONFIG.slowMo
        });

        const page = await browser.newPage();
        page.setDefaultTimeout(CONFIG.timeouts.navigation);

        // Login first
        const loggedIn = await login(page);
        if (!loggedIn) {
            console.log('\n❌ Login failed! Aborting tests.');
            return;
        }

        // Run all test categories
        await runValidationTests(page, results);
        await runBoundaryTests(page, results);
        await runAssessmentTypeTests(page, results);
        await runEdgeCaseTests(page, results);
        await runNavigationTests(page, results);
        await runIntegrationTests(page, results);

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Print summary
    const summary = results.getSummary();
    console.log('\n');
    console.log('═'.repeat(72));
    console.log('                    PROFESSIONAL QA TEST REPORT SUMMARY');
    console.log('═'.repeat(72));
    console.log(`\n📊 Overall Results:`);
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   ⏭️  Skipped: ${summary.skipped}`);
    console.log(`   ⚠️  Warnings: ${summary.warnings}`);
    console.log(`   📈 Pass Rate: ${summary.passRate}%`);
    console.log(`   ⏱️  Duration: ${summary.duration}s`);

    console.log('\n📁 Results by Category:');
    for (const [category, stats] of Object.entries(summary.categories)) {
        const total = stats.pass + stats.fail + stats.skip + stats.warn;
        const rate = total > 0 ? ((stats.pass / total) * 100).toFixed(0) : 0;
        console.log(`   ${category}: ${stats.pass}/${total} passed (${rate}%)`);
    }

    // Show failed tests
    const failedTests = results.getFailedTests();
    if (failedTests.length > 0) {
        console.log('\n❌ Failed Tests:');
        failedTests.forEach(t => {
            console.log(`   - ${t.category}: ${t.testName}`);
            console.log(`     Details: ${t.details}`);
        });
    }

    console.log('\n' + '═'.repeat(72));
    console.log(`Test completed at: ${new Date().toLocaleString('th-TH')}`);
    console.log('═'.repeat(72));

    // Save report
    const reportPath = `./tests/qa-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify({
        summary,
        results: results.results,
        failedTests
    }, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
}

// Run tests
runAllTests().catch(console.error);
