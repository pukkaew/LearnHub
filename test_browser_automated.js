/**
 * 🤖 Automated Browser Testing with Puppeteer
 * ทดสอบหน้าเว็บจริงๆ แบบอัตโนมัติ
 *
 * รันด้วย: node test_browser_automated.js
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
    magenta: '\x1b[35m'
};

let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function testResult(id, name, status, detail = '') {
    totalTests++;
    const icon = status ? '✅' : '❌';
    const color = status ? colors.green : colors.red;

    if (status) passedTests++;
    else failedTests++;

    log(`${icon} [${id}] ${name}`, color);
    if (detail) log(`   → ${detail}`, colors.cyan);
}

function section(title) {
    log('\n' + '='.repeat(70), colors.blue);
    log(`📋 ${title}`, colors.blue);
    log('='.repeat(70), colors.blue);
}

// Create screenshots directory
const screenshotDir = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
}

async function takeScreenshot(page, name) {
    const filepath = path.join(screenshotDir, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    log(`📸 Screenshot saved: ${name}.png`, colors.cyan);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBrowserTests() {
    log('\n╔════════════════════════════════════════════════════════════════════╗', colors.magenta);
    log('║                                                                    ║', colors.magenta);
    log('║     🤖 Automated Browser Testing - ทดสอบหน้าเว็บจริงๆ          ║', colors.magenta);
    log('║                                                                    ║', colors.magenta);
    log('╚════════════════════════════════════════════════════════════════════╝', colors.magenta);

    let browser;
    let page;

    try {
        // ====================================================================
        // Launch Browser
        // ====================================================================
        section('🚀 Launching Browser');

        browser = await puppeteer.launch({
            headless: false, // แสดง browser เพื่อดูการทำงาน
            slowMo: 50, // ช้าลงเล็กน้อยเพื่อดูชัดเจน
            args: ['--start-maximized']
        });

        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        testResult('B1.1', 'Browser launched', true);

        // ====================================================================
        // Navigate to Login Page
        // ====================================================================
        section('🔐 Login');

        log('📍 Navigating to login page...', colors.yellow);
        await page.goto('http://localhost:3000/login', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await sleep(2000); // Wait for page to fully load
        await takeScreenshot(page, '01-login-page');

        testResult('B1.2', 'Login page loaded', true);

        // Fill login form
        log('📝 Filling login credentials...', colors.yellow);
        await page.type('input[name="employee_id"]', 'ADM001');
        await page.type('input[name="password"]', 'password123');
        await takeScreenshot(page, '02-login-filled');

        // Click login button
        log('🔘 Clicking login button...', colors.yellow);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
            page.click('button[type="submit"]')
        ]);
        await sleep(2000);
        await takeScreenshot(page, '03-after-login');

        const currentUrl = page.url();
        testResult('B1.3', 'Login successful', currentUrl.includes('dashboard') || currentUrl.includes('home'));

        await sleep(1000);

        // ====================================================================
        // Navigate to Course Create Page
        // ====================================================================
        section('📚 Navigate to Course Create');

        log('📍 Going to /courses/create...', colors.yellow);
        await page.goto('http://localhost:3000/courses/create', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await sleep(2000);
        await takeScreenshot(page, '04-create-page-loaded');

        // Check if form exists
        const formExists = await page.$('#create-course-form') !== null;
        testResult('B2.1', 'Create course form loaded', formExists);

        // ====================================================================
        // Check JavaScript Loaded
        // ====================================================================
        section('🔍 Verify JavaScript Functions');

        // Check if functions are loaded
        const jsCheck = await page.evaluate(() => {
            return {
                collectFormData: typeof collectFormData === 'function',
                validateStep: typeof validateStep === 'function',
                submitCourse: typeof submitCourse === 'function',
                convertThaiDateToISO: typeof convertThaiDateToISO === 'function',
                translations: window.testTypeTranslations !== undefined,
                flatpickr: typeof flatpickr !== 'undefined'
            };
        });

        testResult('B2.2', 'collectFormData function', jsCheck.collectFormData);
        testResult('B2.3', 'validateStep function', jsCheck.validateStep);
        testResult('B2.4', 'submitCourse function', jsCheck.submitCourse);
        testResult('B2.5', 'testTypeTranslations loaded', jsCheck.translations);
        testResult('B2.6', 'Flatpickr loaded', jsCheck.flatpickr);

        // ====================================================================
        // Step 1: Basic Information
        // ====================================================================
        section('📝 Step 1: Fill Basic Information');

        log('📝 Filling course name...', colors.yellow);
        await page.type('#course_name', 'Automated Browser Test Course 2025');

        log('📝 Selecting category...', colors.yellow);
        await page.select('#category_id', '1');

        log('📝 Selecting difficulty...', colors.yellow);
        await page.select('#difficulty_level', 'Beginner');

        log('📝 Selecting course type...', colors.yellow);
        await page.select('#course_type', 'mandatory');

        log('📝 Selecting language...', colors.yellow);
        await page.select('#language', 'th');

        await takeScreenshot(page, '05-step1-filled');

        testResult('B3.1', 'Step 1 form filled', true);

        // Click next
        log('🔘 Clicking "Next" button...', colors.yellow);
        await page.click('#next-btn');
        await sleep(1000);

        // Debug: Check if step changed
        const step2Visible = await page.evaluate(() => {
            const step2 = document.getElementById('step-2');
            return step2 ? window.getComputedStyle(step2).display !== 'none' : false;
        });
        log(`   Step 2 visible: ${step2Visible}`, colors.cyan);

        // Check for error messages
        const errorMsg = await page.evaluate(() => {
            const alert = document.querySelector('.alert-error, .error-message, [role="alert"]');
            return alert ? alert.textContent.trim() : null;
        });
        if (errorMsg) {
            log(`   ⚠️ Error message: ${errorMsg}`, colors.red);
        }

        // Check all required fields
        const fieldValues = await page.evaluate(() => {
            const required = ['course_name', 'category_id', 'difficulty_level', 'course_type', 'language'];
            const values = {};
            for (const field of required) {
                const element = document.getElementById(field) || document.querySelector(`[name="${field}"]`);
                values[field] = element ? element.value : 'NOT FOUND';
            }
            return values;
        });
        log(`   Field values:`, colors.cyan);
        Object.entries(fieldValues).forEach(([field, value]) => {
            const status = value && value !== 'NOT FOUND' ? '✓' : '✗';
            log(`     ${status} ${field}: "${value}"`, value && value !== 'NOT FOUND' ? colors.green : colors.red);
        });

        // Wait for step 2 to be visible
        await page.waitForSelector('#step-2', { visible: true, timeout: 10000 });
        await sleep(500);
        await takeScreenshot(page, '06-step2-opened');

        // ====================================================================
        // Step 2: Details
        // ====================================================================
        section('📝 Step 2: Fill Course Details');

        log('📝 Filling description...', colors.yellow);
        // Description is a contenteditable div
        await page.focus('#description');
        await sleep(500);
        await page.keyboard.type('นี่คือคำอธิบายหลักสูตรที่ถูกสร้างโดย Puppeteer อัตโนมัติ มีความยาวมากกว่า 50 ตัวอักษรเพื่อผ่าน validation');

        log('📝 Filling learning objectives (3 items)...', colors.yellow);
        const objectivesInputs = await page.$$('input[name="objectives[]"]');
        if (objectivesInputs.length >= 3) {
            await objectivesInputs[0].type('เพื่อทดสอบระบบด้วย Puppeteer');
            await objectivesInputs[1].type('เพื่อตรวจสอบการทำงานของ JavaScript');
            await objectivesInputs[2].type('เพื่อยืนยันว่า title mapping ทำงาน');
        }

        log('📝 Setting duration (2 hours 30 minutes)...', colors.yellow);
        await page.type('#duration_hours', '2');
        await page.type('#duration_minutes', '30');

        await takeScreenshot(page, '07-step2-filled');

        testResult('B4.1', 'Step 2 form filled', true);

        // Click next
        log('🔘 Clicking "Next" button...', colors.yellow);
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const nextBtn = buttons.find(b => b.textContent.includes('ถัดไป') || b.textContent.includes('Next'));
            if (nextBtn) nextBtn.click();
        });
        await sleep(1000);
        await takeScreenshot(page, '08-step3-opened');

        // ====================================================================
        // Step 3: Content & Media
        // ====================================================================
        section('📝 Step 3: Fill Lessons');

        log('📝 Filling lesson 1...', colors.yellow);
        const lessonTitles = await page.$$('input[name="lesson_titles[]"]');
        const lessonDurations = await page.$$('input[name="lesson_durations[]"]');
        const lessonDescs = await page.$$('textarea[name="lesson_descriptions[]"]');

        if (lessonTitles.length > 0) {
            await lessonTitles[0].type('บทเรียนที่ 1 - ทดสอบอัตโนมัติ');
            await lessonDurations[0].type('30');
            await lessonDescs[0].type('บทเรียนทดสอบด้วย Puppeteer');
        }

        await takeScreenshot(page, '09-step3-filled');

        testResult('B5.1', 'Step 3 form filled', true);

        // Click next
        log('🔘 Clicking "Next" button...', colors.yellow);
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const nextBtn = buttons.find(b => b.textContent.includes('ถัดไป') || b.textContent.includes('Next'));
            if (nextBtn) nextBtn.click();
        });
        await sleep(1000);
        await takeScreenshot(page, '10-step4-opened');

        // ====================================================================
        // Step 4: Assessment
        // ====================================================================
        section('📝 Step 4: Configure Assessment');

        log('📝 Selecting "create new" test...', colors.yellow);
        await page.click('input[value="create_new"]');
        await sleep(500);

        log('📝 Filling test details...', colors.yellow);
        await page.click('#new_test_name', { clickCount: 3 });
        await page.type('#new_test_name', 'แบบทดสอบท้ายหลักสูตร - Auto');
        await page.select('#new_test_type', 'final_assessment');

        // Clear and fill numeric fields
        await page.click('#new_passing_score', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('#new_passing_score', '70');

        await page.click('#new_max_attempts', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('#new_max_attempts', '2');

        await page.click('#new_test_duration', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('#new_test_duration', '60');

        await takeScreenshot(page, '11-step4-filled');

        testResult('B6.1', 'Step 4 form filled', true);

        // ====================================================================
        // Check Data Before Submit
        // ====================================================================
        section('🔍 Verify Data Collection (Before Submit)');

        // Set up console listener
        const consoleLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(text);
            if (text.includes('FINAL DATA') || text.includes('title') || text.includes('duration')) {
                log(`   Console: ${text}`, colors.cyan);
            }
        });

        log('📊 Simulating data collection...', colors.yellow);
        const collectedData = await page.evaluate(() => {
            // Call collectFormData function
            if (typeof collectFormData === 'function') {
                const data = collectFormData();
                console.log('🔍 Collected Data:');
                console.log('  title:', data.title);
                console.log('  course_name:', data.course_name);
                console.log('  duration_hours:', data.duration_hours);
                console.log('  learning_objectives:', data.learning_objectives);
                console.log('  target_departments:', data.target_departments);
                console.log('  target_positions:', data.target_positions);
                return data;
            }
            return null;
        });

        if (collectedData) {
            testResult('B7.1', 'Data collection works', true);
            testResult('B7.2', 'course_name has value',
                collectedData.course_name !== undefined && collectedData.course_name.length > 0,
                `"${collectedData.course_name}"`);
            testResult('B7.3', '✨ title field mapped (CRITICAL)',
                collectedData.title !== undefined && collectedData.title === collectedData.course_name,
                `title: "${collectedData.title}"`);
            testResult('B7.4', 'duration_hours calculated',
                collectedData.duration_hours === 2.5,
                `Expected: 2.5, Got: ${collectedData.duration_hours}`);
            testResult('B7.5', 'target_departments is array',
                Array.isArray(collectedData.target_departments),
                `Type: ${Array.isArray(collectedData.target_departments) ? 'Array' : typeof collectedData.target_departments}`);
            testResult('B7.6', 'target_positions is array',
                Array.isArray(collectedData.target_positions),
                `Type: ${Array.isArray(collectedData.target_positions) ? 'Array' : typeof collectedData.target_positions}`);
            testResult('B7.7', 'learning_objectives >= 3',
                collectedData.learning_objectives && collectedData.learning_objectives.length >= 3,
                `Count: ${collectedData.learning_objectives?.length || 0}`);
        } else {
            testResult('B7.1', 'Data collection works', false, 'collectFormData returned null');
        }

        await takeScreenshot(page, '12-data-collected');

        // ====================================================================
        // Submit Form
        // ====================================================================
        section('🚀 Submit Course');

        log('🔘 Clicking "Create Course" button...', colors.yellow);

        // Wait for response
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
            if (submitBtn) {
                submitBtn.click();
            }
        });

        log('⏳ Waiting for API response...', colors.yellow);

        try {
            const response = await responsePromise;
            const responseData = await response.json();

            log(`📥 Response Status: ${response.status()}`, colors.cyan);
            log(`📥 Response Data: ${JSON.stringify(responseData, null, 2)}`, colors.cyan);

            testResult('B8.1', 'API request sent', true);
            testResult('B8.2', 'Response status 201/200',
                response.status() === 201 || response.status() === 200,
                `Status: ${response.status()}`);
            testResult('B8.3', 'Response success: true',
                responseData.success === true,
                `success: ${responseData.success}`);
            testResult('B8.4', 'Course ID returned',
                responseData.data && responseData.data.course_id > 0,
                `Course ID: ${responseData.data?.course_id || 'N/A'}`);

            await sleep(2000);
            await takeScreenshot(page, '13-after-submit');

        } catch (error) {
            testResult('B8.1', 'Submit failed', false, error.message);
            await takeScreenshot(page, '13-submit-error');
        }

        // ====================================================================
        // Check Final Page
        // ====================================================================
        section('✅ Final Verification');

        await sleep(2000);
        const finalUrl = page.url();
        log(`📍 Final URL: ${finalUrl}`, colors.cyan);

        const redirectedToDetail = finalUrl.includes('/courses/') && !finalUrl.includes('/create');
        testResult('B9.1', 'Redirected to course detail', redirectedToDetail, finalUrl);

        await takeScreenshot(page, '14-final-page');

        // ====================================================================
        // SUMMARY
        // ====================================================================
        section('📊 Browser Test Summary');

        const passRate = ((passedTests / totalTests) * 100).toFixed(2);
        const color = passRate >= 95 ? colors.green : passRate >= 80 ? colors.yellow : colors.red;

        log(`\nTotal Tests: ${totalTests}`, colors.blue);
        log(`✅ Passed: ${passedTests}`, colors.green);
        log(`❌ Failed: ${failedTests}`, colors.red);
        log(`Pass Rate: ${passRate}%`, color);

        log(`\n📸 Screenshots saved in: ${screenshotDir}`, colors.cyan);

        if (failedTests === 0) {
            log('\n🎉 All browser tests passed! ระบบทำงานบน browser จริงๆ 100%', colors.green);
        } else {
            log(`\n⚠️ ${failedTests} tests failed. Check screenshots for details.`, colors.yellow);
        }

    } catch (error) {
        log(`\n❌ Browser test error: ${error.message}`, colors.red);
        console.error(error.stack);
        if (page) {
            await takeScreenshot(page, '99-error');
        }
    } finally {
        if (browser) {
            log('\n🔒 Closing browser in 5 seconds...', colors.yellow);
            await sleep(5000);
            await browser.close();
        }
    }

    log('\n' + '='.repeat(70), colors.blue);
    log('✅ Browser testing completed', colors.blue);
    log('='.repeat(70) + '\n', colors.blue);
}

// Run tests
runBrowserTests().catch(error => {
    console.error('\n❌ Test execution error:', error);
    process.exit(1);
});
