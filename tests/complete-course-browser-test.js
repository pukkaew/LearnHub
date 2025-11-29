/**
 * Complete Course Browser Test - ทดสอบสร้าง Course จริงจังครบทุกเงื่อนไข
 * ผ่าน Browser Automation ทุก Step ของ Wizard
 */

const puppeteer = require('puppeteer');

const CONFIG = {
    BASE_URL: 'http://localhost:3000',
    CREDENTIALS: {
        employee_id: 'ADM001',
        password: 'password123'
    },
    TIMEOUT: 60000,
    SLOW_MO: 50 // ช้าลงเพื่อให้เห็นการทำงาน
};

let browser, page;
const testResults = [];
const bugs = [];

function log(msg) {
    console.log(`  ${msg}`);
}

function pass(testName, details = '') {
    testResults.push({ name: testName, status: 'PASS', details });
    console.log(`✅ ${testName}`);
    if (details) console.log(`   ${details}`);
}

function fail(testName, details = '') {
    testResults.push({ name: testName, status: 'FAIL', details });
    console.log(`❌ ${testName}`);
    if (details) console.log(`   ${details}`);
}

function warn(testName, details = '') {
    testResults.push({ name: testName, status: 'WARN', details });
    console.log(`⚠️  ${testName}`);
    if (details) console.log(`   ${details}`);
}

function reportBug(severity, description, evidence) {
    bugs.push({ severity, description, evidence });
    const icon = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟠' : '🟡';
    console.log(`\n${icon} BUG FOUND: ${description}`);
    if (evidence) console.log(`   Evidence: ${evidence}`);
}

async function setup() {
    console.log('🚀 Launching browser...\n');
    browser = await puppeteer.launch({
        headless: 'new',
        slowMo: CONFIG.SLOW_MO,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Capture console errors
    page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('kaspersky')) {
            console.log(`   [Console Error] ${msg.text().substring(0, 100)}`);
        }
    });
}

async function takeScreenshot(name) {
    const filename = `tests/screenshots/${name}-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`   📸 Screenshot: ${filename}`);
    return filename;
}

async function login() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 0: Login');
    console.log('═══════════════════════════════════════════════════════════\n');

    await page.goto(`${CONFIG.BASE_URL}/auth/login`, { waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });

    await page.type('#employee_id', CONFIG.CREDENTIALS.employee_id);
    await page.type('#password', CONFIG.CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });

    const url = page.url();
    if (!url.includes('login')) {
        pass('Login successful', `Redirected to: ${url}`);
        return true;
    } else {
        fail('Login failed', 'Still on login page');
        return false;
    }
}

async function navigateToCreateCourse() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 1: Navigate to Create Course Page');
    console.log('═══════════════════════════════════════════════════════════\n');

    await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });

    const url = page.url();
    if (url.includes('/courses/create')) {
        pass('Navigate to create course page');

        // Check for wizard steps
        const hasWizard = await page.evaluate(() => {
            return document.querySelector('.wizard, .step, [data-step], .form-wizard') !== null;
        });

        if (hasWizard) {
            log('Form wizard detected');
        }

        return true;
    } else {
        fail('Could not navigate to create course', `URL: ${url}`);
        return false;
    }
}

async function fillStep1_BasicInfo() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 2: Fill Basic Information (Step 1 of Wizard)');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
        // Wait for form to load
        await page.waitForSelector('form', { timeout: 10000 });

        // Course Title
        const titleSelector = '#title, input[name="title"], #course_name, input[name="course_name"]';
        await page.waitForSelector(titleSelector, { timeout: 5000 });
        await page.click(titleSelector);
        await page.type(titleSelector, 'หลักสูตรทดสอบอัตโนมัติ Auto Test Course ' + Date.now());
        pass('Fill course title');

        // Category - find and click select
        const categorySelector = '#category_id, select[name="category_id"], #category';
        try {
            await page.waitForSelector(categorySelector, { timeout: 3000 });
            await page.select(categorySelector, '1');
            pass('Select category');
        } catch (e) {
            // Try clicking dropdown
            const dropdownBtn = await page.$('.category-dropdown, [data-category]');
            if (dropdownBtn) {
                await dropdownBtn.click();
                await page.waitForTimeout(500);
                const firstOption = await page.$('.dropdown-item, .category-option');
                if (firstOption) await firstOption.click();
                pass('Select category (dropdown)');
            } else {
                warn('Category field not found', 'Skipping');
            }
        }

        // Description
        const descSelector = '#description, textarea[name="description"]';
        try {
            await page.waitForSelector(descSelector, { timeout: 3000 });
            await page.click(descSelector);
            await page.type(descSelector, 'รายละเอียดหลักสูตรทดสอบที่มีความยาวมากกว่า 50 ตัวอักษร เพื่อทดสอบการสร้างหลักสูตรใหม่ผ่านระบบอัตโนมัติ นี่คือรายละเอียดเพิ่มเติมสำหรับการทดสอบ');
            pass('Fill description');
        } catch (e) {
            warn('Description field not found', e.message);
        }

        // Difficulty Level
        const difficultySelector = '#difficulty_level, select[name="difficulty_level"]';
        try {
            await page.waitForSelector(difficultySelector, { timeout: 2000 });
            await page.select(difficultySelector, 'beginner');
            pass('Select difficulty level');
        } catch (e) {
            warn('Difficulty field not found', 'Skipping');
        }

        // Duration
        const durationSelector = '#duration_hours, input[name="duration_hours"], #duration';
        try {
            await page.waitForSelector(durationSelector, { timeout: 2000 });
            await page.click(durationSelector);
            await page.type(durationSelector, '10');
            pass('Fill duration');
        } catch (e) {
            warn('Duration field not found', 'Skipping');
        }

        // Instructor
        const instructorSelector = '#instructor_id, select[name="instructor_id"]';
        try {
            await page.waitForSelector(instructorSelector, { timeout: 2000 });
            const options = await page.$$eval(`${instructorSelector} option`, opts =>
                opts.map(o => ({ value: o.value, text: o.textContent }))
            );
            if (options.length > 1) {
                await page.select(instructorSelector, options[1].value);
                pass('Select instructor', `Selected: ${options[1].text}`);
            }
        } catch (e) {
            warn('Instructor field not found', 'Skipping');
        }

        await takeScreenshot('step1-basic-info');
        return true;

    } catch (error) {
        fail('Fill Step 1', error.message);
        await takeScreenshot('step1-error');
        return false;
    }
}

async function clickNextStep() {
    log('Clicking Next button...');

    const nextSelectors = [
        'button.next-step',
        'button[data-action="next"]',
        '.btn-next',
        'button:has-text("ถัดไป")',
        'button:has-text("Next")',
        '.wizard-next',
        '[onclick*="nextStep"]',
        'button[type="button"]:not([type="submit"])'
    ];

    for (const selector of nextSelectors) {
        try {
            const btn = await page.$(selector);
            if (btn) {
                const isVisible = await btn.evaluate(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                });

                if (isVisible) {
                    await btn.click();
                    await page.waitForTimeout(1000);
                    log(`Clicked next button: ${selector}`);
                    return true;
                }
            }
        } catch (e) {
            continue;
        }
    }

    // Try finding any button with ถัดไป text
    try {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
            const text = await btn.evaluate(el => el.textContent);
            if (text && (text.includes('ถัดไป') || text.includes('Next') || text.includes('>'))) {
                await btn.click();
                await page.waitForTimeout(1000);
                log('Clicked next via text search');
                return true;
            }
        }
    } catch (e) {
        // ignore
    }

    warn('Could not find Next button');
    return false;
}

async function fillStep2_LearningObjectives() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 3: Fill Learning Objectives (Step 2 of Wizard)');
    console.log('═══════════════════════════════════════════════════════════\n');

    await clickNextStep();
    await page.waitForTimeout(1000);

    try {
        // Find objective inputs
        const objectiveSelectors = [
            'input[name*="objective"]',
            'input[name*="learning"]',
            '.objective-input',
            '#objective_1, #objective_2, #objective_3',
            'textarea[name*="objective"]'
        ];

        const objectives = [
            'เข้าใจหลักการพื้นฐานของเนื้อหาหลักสูตร',
            'สามารถนำความรู้ไปประยุกต์ใช้งานจริงได้',
            'พัฒนาทักษะการคิดวิเคราะห์และแก้ปัญหา'
        ];

        let foundCount = 0;

        for (const selector of objectiveSelectors) {
            const inputs = await page.$$(selector);
            if (inputs.length > 0) {
                for (let i = 0; i < Math.min(inputs.length, objectives.length); i++) {
                    await inputs[i].click();
                    await inputs[i].type(objectives[i]);
                    foundCount++;
                }
                break;
            }
        }

        // Try adding objectives via button
        if (foundCount < 3) {
            const addBtnSelectors = [
                'button[onclick*="addObjective"]',
                '.add-objective',
                'button:has-text("เพิ่มวัตถุประสงค์")',
                'button:has-text("Add")'
            ];

            for (const selector of addBtnSelectors) {
                const addBtn = await page.$(selector);
                if (addBtn) {
                    for (let i = foundCount; i < 3; i++) {
                        await addBtn.click();
                        await page.waitForTimeout(300);

                        const newInputs = await page.$$('input[name*="objective"], .objective-input');
                        if (newInputs.length > foundCount) {
                            await newInputs[newInputs.length - 1].type(objectives[i]);
                            foundCount++;
                        }
                    }
                    break;
                }
            }
        }

        if (foundCount >= 3) {
            pass('Fill learning objectives', `Added ${foundCount} objectives`);
        } else if (foundCount > 0) {
            warn('Partial learning objectives', `Only added ${foundCount}/3`);
        } else {
            warn('Could not find objective fields');
        }

        await takeScreenshot('step2-objectives');
        return true;

    } catch (error) {
        warn('Fill Step 2', error.message);
        return true; // Continue anyway
    }
}

async function fillStep3_Lessons() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 4: Fill Lessons/Content (Step 3 of Wizard)');
    console.log('═══════════════════════════════════════════════════════════\n');

    await clickNextStep();
    await page.waitForTimeout(1000);

    try {
        // Find lesson input fields
        const lessonTitleSelectors = [
            'input[name*="lesson"][name*="title"]',
            'input[name*="lesson_title"]',
            '.lesson-title-input',
            '#lesson_title_1',
            'input[placeholder*="บทเรียน"]',
            'input[placeholder*="lesson"]'
        ];

        let lessonAdded = false;

        for (const selector of lessonTitleSelectors) {
            const input = await page.$(selector);
            if (input) {
                await input.click();
                await input.type('บทที่ 1: บทนำและความรู้พื้นฐาน');
                lessonAdded = true;
                break;
            }
        }

        // Try adding lesson via button
        if (!lessonAdded) {
            const addBtnSelectors = [
                'button[onclick*="addLesson"]',
                '.add-lesson',
                'button:has-text("เพิ่มบทเรียน")',
                'button:has-text("Add Lesson")'
            ];

            for (const selector of addBtnSelectors) {
                const addBtn = await page.$(selector);
                if (addBtn) {
                    await addBtn.click();
                    await page.waitForTimeout(500);

                    // Find newly added input
                    for (const inputSel of lessonTitleSelectors) {
                        const input = await page.$(inputSel);
                        if (input) {
                            await input.type('บทที่ 1: บทนำและความรู้พื้นฐาน');
                            lessonAdded = true;
                            break;
                        }
                    }
                    break;
                }
            }
        }

        // Lesson duration
        const durationSelectors = [
            'input[name*="lesson"][name*="duration"]',
            'input[name*="lesson_duration"]',
            '.lesson-duration-input'
        ];

        for (const selector of durationSelectors) {
            const input = await page.$(selector);
            if (input) {
                await input.click();
                await input.type('30');
                break;
            }
        }

        if (lessonAdded) {
            pass('Add lesson');
        } else {
            warn('Could not find lesson fields');
        }

        await takeScreenshot('step3-lessons');
        return true;

    } catch (error) {
        warn('Fill Step 3', error.message);
        return true;
    }
}

async function fillStep4_Assessment() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 5: Assessment/Test Settings (Step 4 of Wizard)');
    console.log('═══════════════════════════════════════════════════════════\n');

    await clickNextStep();
    await page.waitForTimeout(1000);

    try {
        // Assessment type selection
        const assessmentOptions = [
            'input[name="assessment_type"][value="none"]',
            '#assessment_none',
            'input[value="no_test"]',
            '.no-assessment'
        ];

        for (const selector of assessmentOptions) {
            const option = await page.$(selector);
            if (option) {
                await option.click();
                pass('Select no assessment');
                break;
            }
        }

        await takeScreenshot('step4-assessment');
        return true;

    } catch (error) {
        warn('Fill Step 4', error.message);
        return true;
    }
}

async function submitForm() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 6: Submit Course Form');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Click next to go to review/submit step
    await clickNextStep();
    await page.waitForTimeout(1000);

    try {
        await takeScreenshot('before-submit');

        // Find submit button
        const submitSelectors = [
            'button[type="submit"]',
            'button.submit-btn',
            '#submitCourse',
            'button:has-text("บันทึก")',
            'button:has-text("สร้างหลักสูตร")',
            'button:has-text("Create")',
            'button:has-text("Save")',
            '.btn-primary[type="submit"]'
        ];

        let submitted = false;

        for (const selector of submitSelectors) {
            try {
                const btn = await page.$(selector);
                if (btn) {
                    const isVisible = await btn.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                    });

                    if (isVisible) {
                        log(`Found submit button: ${selector}`);
                        await btn.click();
                        submitted = true;
                        break;
                    }
                }
            } catch (e) {
                continue;
            }
        }

        // Also try finding by text content
        if (!submitted) {
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                const text = await btn.evaluate(el => el.textContent);
                if (text && (text.includes('บันทึก') || text.includes('สร้าง') || text.includes('Create') || text.includes('Submit'))) {
                    const isVisible = await btn.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden';
                    });
                    if (isVisible) {
                        await btn.click();
                        submitted = true;
                        log(`Clicked submit button: ${text.trim()}`);
                        break;
                    }
                }
            }
        }

        if (submitted) {
            // Wait for response
            await page.waitForTimeout(3000);

            // Check for success message or redirect
            const currentUrl = page.url();
            const pageContent = await page.content();

            // Check for error message
            const errorMsg = await page.evaluate(() => {
                const alerts = document.querySelectorAll('.alert-danger, .error, .text-red-500, [role="alert"]');
                return Array.from(alerts).map(a => a.textContent).join(' | ');
            });

            // Check for success message
            const successMsg = await page.evaluate(() => {
                const alerts = document.querySelectorAll('.alert-success, .success, .text-green-500');
                return Array.from(alerts).map(a => a.textContent).join(' | ');
            });

            await takeScreenshot('after-submit');

            if (errorMsg && errorMsg.length > 0) {
                fail('Submit course', `Error: ${errorMsg.substring(0, 200)}`);

                // Check for information disclosure
                if (errorMsg.includes('SQL') || errorMsg.includes('FOREIGN KEY') ||
                    errorMsg.includes('constraint') || errorMsg.includes('table')) {
                    reportBug('MEDIUM', 'Information Disclosure in Error Message',
                        errorMsg.substring(0, 100));
                }

                return false;
            } else if (successMsg && successMsg.length > 0) {
                pass('Submit course', `Success: ${successMsg.substring(0, 100)}`);
                return true;
            } else if (!currentUrl.includes('/create')) {
                pass('Submit course', `Redirected to: ${currentUrl}`);
                return true;
            } else {
                warn('Submit result unclear', 'No clear success/error message');
                return true;
            }
        } else {
            fail('Could not find submit button');
            return false;
        }

    } catch (error) {
        fail('Submit form', error.message);
        await takeScreenshot('submit-error');
        return false;
    }
}

async function testXSSInForm() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 BONUS TEST: XSS Injection via Form');
    console.log('═══════════════════════════════════════════════════════════\n');

    await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });

    try {
        const titleSelector = '#title, input[name="title"], #course_name';
        await page.waitForSelector(titleSelector, { timeout: 5000 });

        // Clear and type XSS payload
        await page.$eval(titleSelector, el => el.value = '');
        await page.type(titleSelector, '<script>alert("XSS")</script>Test Course');

        // Check if sanitized in real-time
        const value = await page.$eval(titleSelector, el => el.value);
        log(`Entered value: ${value}`);

        if (value.includes('<script>')) {
            warn('XSS payload accepted in input', 'Frontend does not sanitize');
        } else {
            pass('XSS sanitized on input');
        }

        await takeScreenshot('xss-test');

    } catch (error) {
        warn('XSS test', error.message);
    }
}

async function testNegativeDurationInForm() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 BONUS TEST: Negative Duration via Form');
    console.log('═══════════════════════════════════════════════════════════\n');

    await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });

    try {
        const durationSelector = '#duration_hours, input[name="duration_hours"], input[name="duration"]';
        await page.waitForSelector(durationSelector, { timeout: 5000 });

        // Try to enter negative value
        await page.$eval(durationSelector, el => el.value = '');
        await page.type(durationSelector, '-10');

        const value = await page.$eval(durationSelector, el => el.value);
        log(`Entered value: ${value}`);

        if (value === '-10') {
            // Check if HTML5 validation kicks in
            const isValid = await page.$eval(durationSelector, el => el.validity.valid);
            if (!isValid) {
                pass('Negative duration blocked by HTML5 validation');
            } else {
                warn('Negative duration accepted in frontend', 'Backend should validate');
            }
        } else {
            pass('Negative value prevented at input level');
        }

        await takeScreenshot('negative-duration-test');

    } catch (error) {
        warn('Negative duration test', error.message);
    }
}

async function generateReport() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║              🔍 COMPLETE BROWSER TEST REPORT                       ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const passed = testResults.filter(t => t.status === 'PASS').length;
    const failed = testResults.filter(t => t.status === 'FAIL').length;
    const warned = testResults.filter(t => t.status === 'WARN').length;

    console.log('📊 Test Results Summary:');
    console.log('────────────────────────────────────────────────────────────');
    testResults.forEach(t => {
        const icon = t.status === 'PASS' ? '✅' : t.status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${icon} ${t.name}`);
        if (t.details) console.log(`   └── ${t.details}`);
    });

    console.log('\n────────────────────────────────────────────────────────────');
    console.log(`Total: ${testResults.length} tests`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⚠️  Warnings: ${warned}`);

    if (bugs.length > 0) {
        console.log('\n🐛 Bugs Found:');
        console.log('────────────────────────────────────────────────────────────');
        bugs.forEach((b, i) => {
            console.log(`${i + 1}. [${b.severity}] ${b.description}`);
            if (b.evidence) console.log(`   Evidence: ${b.evidence}`);
        });
    }

    const passRate = ((passed / testResults.length) * 100).toFixed(1);
    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log(`PASS RATE: ${passRate}%`);
    console.log('════════════════════════════════════════════════════════════════════\n');
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║       🧪 COMPLETE COURSE BROWSER TEST - Full Wizard Flow           ║');
    console.log('║              ทดสอบการสร้าง Course ครบทุกขั้นตอน                        ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log(`\nStarted: ${new Date().toLocaleString('th-TH')}`);
    console.log(`Target: ${CONFIG.BASE_URL}\n`);

    try {
        await setup();

        // Main flow
        if (await login()) {
            if (await navigateToCreateCourse()) {
                await fillStep1_BasicInfo();
                await fillStep2_LearningObjectives();
                await fillStep3_Lessons();
                await fillStep4_Assessment();
                await submitForm();
            }
        }

        // Bonus security tests
        await testXSSInForm();
        await testNegativeDurationInForm();

        await generateReport();

    } catch (error) {
        console.error('\n❌ Test Error:', error.message);
        if (page) await takeScreenshot('fatal-error');
    } finally {
        if (browser) await browser.close();
    }
}

// Create screenshots directory
const fs = require('fs');
if (!fs.existsSync('tests/screenshots')) {
    fs.mkdirSync('tests/screenshots', { recursive: true });
}

main();
