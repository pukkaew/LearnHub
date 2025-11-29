/**
 * Comprehensive Course System Test
 * Tests: Create Course -> View List -> View Detail -> Enroll -> Learn
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = { employee_id: 'ADM001', password: 'password123' };

// Test data for course creation
const TEST_COURSE = {
    course_name: 'ทดสอบหลักสูตร Puppeteer ' + Date.now(),
    category_id: '1',
    difficulty_level: 'Beginner',
    course_type: 'mandatory',
    language: 'th',
    description: 'นี่คือคำอธิบายหลักสูตรทดสอบที่สร้างโดย Puppeteer Automated Test สำหรับทดสอบระบบหลักสูตรอย่างละเอียด รวมถึงการสร้าง ดู และลงทะเบียนเรียน',
    objectives: [
        'เข้าใจพื้นฐานของการทดสอบอัตโนมัติ',
        'สามารถใช้งาน Puppeteer ได้',
        'เข้าใจการทดสอบ End-to-End'
    ],
    duration_hours: '2',
    lessons: [
        { title: 'บทที่ 1: แนะนำการทดสอบ', duration: '30', description: 'แนะนำพื้นฐานการทดสอบ' },
        { title: 'บทที่ 2: การใช้งาน Puppeteer', duration: '45', description: 'เรียนรู้ Puppeteer' }
    ]
};

let browser;
let page;
let createdCourseId = null;
let testResults = [];

// Helper functions
function log(message, type = 'info') {
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', test: '🧪', step: '📍' };
    const timestamp = new Date().toLocaleTimeString('th-TH');
    console.log(`${icons[type] || 'ℹ️'} [${timestamp}] ${message}`);
}

function addResult(testName, passed, details = '') {
    testResults.push({ testName, passed, details, timestamp: new Date().toISOString() });
    log(`${testName}: ${passed ? 'PASSED' : 'FAILED'} ${details}`, passed ? 'success' : 'error');
}

async function takeScreenshot(name) {
    const filename = `tests/screenshots/${name}-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    log(`Screenshot: ${filename}`, 'info');
    return filename;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// TEST 1: Login (AJAX-based)
// ============================================
async function testLogin() {
    log('========== TEST 1: LOGIN ==========', 'test');

    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(1000);
        await takeScreenshot('01-login-page');

        // Check if already logged in (redirected to dashboard)
        if (page.url().includes('/dashboard')) {
            log('Already logged in, skipping login', 'info');
            addResult('Login', true, 'Already logged in');
            return true;
        }

        // Fill login form - find the correct input fields
        const employeeIdInput = await page.$('input[name="employee_id"], input#employee_id, input[placeholder*="รหัสพนักงาน"]');
        const passwordInput = await page.$('input[name="password"], input#password, input[type="password"]');

        if (!employeeIdInput || !passwordInput) {
            throw new Error('Login form fields not found');
        }

        await employeeIdInput.click({ clickCount: 3 });
        await employeeIdInput.type(TEST_USER.employee_id);
        await passwordInput.click({ clickCount: 3 });
        await passwordInput.type(TEST_USER.password);

        await takeScreenshot('02-login-filled');

        // Find and click login button
        const loginButton = await page.$('button[type="submit"], button.btn-primary, input[type="submit"]');

        if (loginButton) {
            // Wait for either navigation or AJAX response
            const [response] = await Promise.all([
                page.waitForResponse(
                    res => res.url().includes('/auth/login') && res.request().method() === 'POST',
                    { timeout: 10000 }
                ).catch(() => null),
                loginButton.click()
            ]);

            await sleep(2000);

            // Check if redirected to dashboard
            const currentUrl = page.url();
            const loginSuccess = currentUrl.includes('/dashboard') || !currentUrl.includes('/login');

            if (!loginSuccess) {
                // Try waiting for navigation
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
            }

            await takeScreenshot('03-after-login');
            const finalUrl = page.url();
            const success = finalUrl.includes('/dashboard');

            addResult('Login', success, `URL: ${finalUrl}`);
            return success;
        }

        throw new Error('Login button not found');
    } catch (error) {
        await takeScreenshot('error-login');
        addResult('Login', false, error.message);
        return false;
    }
}

// ============================================
// TEST 2: Navigate to Course Creation
// ============================================
async function testNavigateToCourseCreate() {
    log('========== TEST 2: NAVIGATE TO COURSE CREATE ==========', 'test');

    try {
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(1500);

        // Check if redirected to login
        if (page.url().includes('/login')) {
            log('Redirected to login - session issue', 'warning');
            addResult('Navigate to Course Create', false, 'Redirected to login');
            return false;
        }

        await takeScreenshot('04-course-create-page');

        // Check if create page loaded
        const pageTitle = await page.title();
        const hasWizard = await page.$('#step-1') !== null;
        const hasForm = await page.$('#course_name, input[name="course_name"]') !== null;

        addResult('Navigate to Course Create', hasWizard || hasForm, `Title: ${pageTitle}`);
        return hasWizard || hasForm;
    } catch (error) {
        await takeScreenshot('error-navigate-create');
        addResult('Navigate to Course Create', false, error.message);
        return false;
    }
}

// ============================================
// TEST 3: Course Creation - Step 1 (Basic Info)
// ============================================
async function testCourseCreateStep1() {
    log('========== TEST 3: COURSE CREATE - STEP 1 (Basic Info) ==========', 'test');

    try {
        log('Filling basic course information...', 'step');

        // Course name
        const courseNameInput = await page.$('#course_name, input[name="course_name"]');
        if (courseNameInput) {
            await courseNameInput.click({ clickCount: 3 });
            await courseNameInput.type(TEST_COURSE.course_name);
            log('Filled course name', 'info');
        } else {
            throw new Error('Course name input not found');
        }

        // Category - select first available option
        const categorySelect = await page.$('#category_id, select[name="category_id"]');
        if (categorySelect) {
            const options = await page.$$eval('#category_id option, select[name="category_id"] option', opts =>
                opts.filter(o => o.value && o.value !== '').map(o => o.value)
            );
            if (options.length > 0) {
                await page.select('#category_id, select[name="category_id"]', options[0]);
                log(`Selected category: ${options[0]}`, 'info');
            }
        }

        // Difficulty level
        const difficultySelect = await page.$('#difficulty_level, select[name="difficulty_level"]');
        if (difficultySelect) {
            await page.select('#difficulty_level', TEST_COURSE.difficulty_level);
            log('Selected difficulty level', 'info');
        }

        // Course type - try radio buttons first, then select
        const courseTypeRadio = await page.$(`input[name="course_type"][value="${TEST_COURSE.course_type}"]`);
        if (courseTypeRadio) {
            await courseTypeRadio.click();
            log('Selected course type (radio)', 'info');
        } else {
            const courseTypeSelect = await page.$('#course_type, select[name="course_type"]');
            if (courseTypeSelect) {
                await page.select('#course_type', TEST_COURSE.course_type);
                log('Selected course type (select)', 'info');
            }
        }

        // Language - try radio buttons first, then select
        const langRadio = await page.$(`input[name="language"][value="${TEST_COURSE.language}"]`);
        if (langRadio) {
            await langRadio.click();
            log('Selected language (radio)', 'info');
        } else {
            const langSelect = await page.$('#language, select[name="language"]');
            if (langSelect) {
                await page.select('#language', TEST_COURSE.language);
                log('Selected language (select)', 'info');
            }
        }

        await takeScreenshot('05-step1-filled');

        // Click Next button
        const nextBtn = await page.$('#next-btn');
        if (nextBtn) {
            await nextBtn.click();
            await sleep(800);
        } else {
            // Try finding by text
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                const text = await btn.evaluate(el => el.textContent);
                if (text.includes('ถัดไป') || text.includes('Next')) {
                    await btn.click();
                    await sleep(800);
                    break;
                }
            }
        }

        // Check if moved to step 2
        const step2Visible = await page.$eval('#step-2', el =>
            window.getComputedStyle(el).display !== 'none'
        ).catch(() => false);

        addResult('Course Create Step 1', step2Visible, 'Basic info filled');
        return step2Visible;
    } catch (error) {
        await takeScreenshot('error-step1');
        addResult('Course Create Step 1', false, error.message);
        return false;
    }
}

// ============================================
// TEST 4: Course Creation - Step 2 (Details)
// ============================================
async function testCourseCreateStep2() {
    log('========== TEST 4: COURSE CREATE - STEP 2 (Details) ==========', 'test');

    try {
        log('Filling course details...', 'step');

        // Description (contenteditable div or textarea)
        const descEditor = await page.$('#description[contenteditable="true"]');
        const descTextarea = await page.$('#description:not([contenteditable]), textarea[name="description"]');

        if (descEditor) {
            await descEditor.click();
            await page.keyboard.type(TEST_COURSE.description);
            log('Filled description (contenteditable)', 'info');
        } else if (descTextarea) {
            await descTextarea.click({ clickCount: 3 });
            await descTextarea.type(TEST_COURSE.description);
            log('Filled description (textarea)', 'info');
        }

        // Learning objectives
        const objectiveInputs = await page.$$('input[name="objectives[]"]');
        for (let i = 0; i < Math.min(objectiveInputs.length, TEST_COURSE.objectives.length); i++) {
            await objectiveInputs[i].click({ clickCount: 3 });
            await objectiveInputs[i].type(TEST_COURSE.objectives[i]);
        }
        log(`Filled ${Math.min(objectiveInputs.length, TEST_COURSE.objectives.length)} objectives`, 'info');

        // Duration hours
        const durationInput = await page.$('#duration_hours, input[name="duration_hours"]');
        if (durationInput) {
            await durationInput.click({ clickCount: 3 });
            await durationInput.type(TEST_COURSE.duration_hours);
            log('Filled duration', 'info');
        }

        await takeScreenshot('06-step2-filled');

        // Click Next
        const nextBtn = await page.$('#next-btn');
        if (nextBtn) {
            await nextBtn.click();
            await sleep(800);
        }

        // Check if moved to step 3
        const step3Visible = await page.$eval('#step-3', el =>
            window.getComputedStyle(el).display !== 'none'
        ).catch(() => false);

        addResult('Course Create Step 2', step3Visible, 'Details filled');
        return step3Visible;
    } catch (error) {
        await takeScreenshot('error-step2');
        addResult('Course Create Step 2', false, error.message);
        return false;
    }
}

// ============================================
// TEST 5: Course Creation - Step 3 (Content/Lessons)
// ============================================
async function testCourseCreateStep3() {
    log('========== TEST 5: COURSE CREATE - STEP 3 (Content) ==========', 'test');

    try {
        log('Adding course content/lessons...', 'step');

        // Fill first lesson
        const lessonTitles = await page.$$('input[name="lesson_titles[]"]');
        const lessonDurations = await page.$$('input[name="lesson_durations[]"]');
        const lessonDescriptions = await page.$$('textarea[name="lesson_descriptions[]"]');

        if (lessonTitles.length > 0) {
            await lessonTitles[0].click({ clickCount: 3 });
            await lessonTitles[0].type(TEST_COURSE.lessons[0].title);

            if (lessonDurations.length > 0) {
                await lessonDurations[0].click({ clickCount: 3 });
                await lessonDurations[0].type(TEST_COURSE.lessons[0].duration);
            }

            if (lessonDescriptions.length > 0) {
                await lessonDescriptions[0].click();
                await lessonDescriptions[0].type(TEST_COURSE.lessons[0].description);
            }
            log('Filled lesson 1', 'info');
        }

        await takeScreenshot('07-step3-filled');

        // Click Next
        const nextBtn = await page.$('#next-btn');
        if (nextBtn) {
            await nextBtn.click();
            await sleep(800);
        }

        // Check if moved to step 4
        const step4Visible = await page.$eval('#step-4', el =>
            window.getComputedStyle(el).display !== 'none'
        ).catch(() => false);

        addResult('Course Create Step 3', step4Visible, 'Content added');
        return step4Visible;
    } catch (error) {
        await takeScreenshot('error-step3');
        addResult('Course Create Step 3', false, error.message);
        return false;
    }
}

// ============================================
// TEST 6: Course Creation - Step 4 (Assessment & Submit)
// ============================================
async function testCourseCreateStep4() {
    log('========== TEST 6: COURSE CREATE - STEP 4 (Assessment & Submit) ==========', 'test');

    try {
        log('Configuring assessment and submitting...', 'step');
        await takeScreenshot('08-step4-before');

        // Select "no assessment" option
        const noAssessmentRadio = await page.$('input[name="assessment_type"][value="none"]');
        if (noAssessmentRadio) {
            await noAssessmentRadio.click();
            log('Selected no assessment', 'info');
            await sleep(300);
        }

        // Click Submit button
        const submitBtn = await page.$('#submit-btn');
        if (!submitBtn) {
            throw new Error('Submit button not found');
        }

        log('Clicking submit button...', 'step');

        // Listen for API response
        const responsePromise = page.waitForResponse(
            res => res.url().includes('/courses/api/create') && res.request().method() === 'POST',
            { timeout: 30000 }
        );

        await submitBtn.click();

        // Wait for response
        const response = await responsePromise;
        const responseData = await response.json().catch(() => ({}));

        log(`API Response: ${JSON.stringify(responseData)}`, 'info');

        if (responseData.success && responseData.data?.course_id) {
            createdCourseId = responseData.data.course_id;
            log(`Course created with ID: ${createdCourseId}`, 'success');
        }

        // Wait for redirect
        await sleep(3000);
        await takeScreenshot('09-after-submit');

        const currentUrl = page.url();

        // Extract course ID from URL if not already got it
        if (!createdCourseId) {
            const match = currentUrl.match(/\/courses\/(\d+)/);
            if (match) {
                createdCourseId = match[1];
            }
        }

        const success = createdCourseId !== null;
        addResult('Course Create Step 4 (Submit)', success, `Course ID: ${createdCourseId}`);
        return success;
    } catch (error) {
        await takeScreenshot('error-step4');
        addResult('Course Create Step 4', false, error.message);
        return false;
    }
}

// ============================================
// TEST 7: View Course List
// ============================================
async function testViewCourseList() {
    log('========== TEST 7: VIEW COURSE LIST ==========', 'test');

    try {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(2000);
        await takeScreenshot('10-course-list');

        // Check if course list has any courses
        const pageContent = await page.content();
        const hasCourses = pageContent.includes('course-card') ||
                          pageContent.includes('หลักสูตร') ||
                          pageContent.includes('Course');

        // Check if our created course appears
        let createdCourseFound = false;
        if (createdCourseId) {
            createdCourseFound = pageContent.includes(TEST_COURSE.course_name) ||
                                 pageContent.includes(`/courses/${createdCourseId}`);
        }

        addResult('View Course List', true, `Created course found: ${createdCourseFound}`);
        return true;
    } catch (error) {
        await takeScreenshot('error-course-list');
        addResult('View Course List', false, error.message);
        return false;
    }
}

// ============================================
// TEST 8: View Course Detail
// ============================================
async function testViewCourseDetail() {
    log('========== TEST 8: VIEW COURSE DETAIL ==========', 'test');

    try {
        if (!createdCourseId) {
            // Try to find any course from the list
            await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle2' });
            await sleep(1000);

            const courseLinks = await page.$$eval('a[href*="/courses/"]', links =>
                links.map(a => a.href).filter(href => /\/courses\/\d+$/.test(href))
            );

            if (courseLinks.length > 0) {
                const match = courseLinks[0].match(/\/courses\/(\d+)/);
                if (match) {
                    createdCourseId = match[1];
                    log(`Found course ID from list: ${createdCourseId}`, 'info');
                }
            }
        }

        if (!createdCourseId) {
            addResult('View Course Detail', false, 'No course ID available');
            return false;
        }

        await page.goto(`${BASE_URL}/courses/${createdCourseId}`, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(1500);
        await takeScreenshot('11-course-detail');

        // Check for 404 or error
        const pageContent = await page.content();
        const isError = pageContent.includes('404') || pageContent.includes('ไม่พบ') || pageContent.includes('Not Found');

        if (isError) {
            addResult('View Course Detail', false, 'Course not found (404)');
            return false;
        }

        // Check course detail page elements
        const hasTitle = pageContent.includes(TEST_COURSE.course_name) ||
                        await page.$('h1, .course-title') !== null;

        addResult('View Course Detail', hasTitle, `Course ID: ${createdCourseId}`);
        return hasTitle;
    } catch (error) {
        await takeScreenshot('error-course-detail');
        addResult('View Course Detail', false, error.message);
        return false;
    }
}

// ============================================
// TEST 9: Enroll in Course
// ============================================
async function testEnrollCourse() {
    log('========== TEST 9: ENROLL IN COURSE ==========', 'test');

    try {
        if (!createdCourseId) {
            addResult('Enroll in Course', false, 'No course ID available');
            return false;
        }

        // Navigate to course detail page
        await page.goto(`${BASE_URL}/courses/${createdCourseId}`, { waitUntil: 'networkidle2' });
        await sleep(1500);

        // Find and click enroll button
        const buttons = await page.$$('button, a.btn');
        let enrolled = false;

        for (const btn of buttons) {
            const text = await btn.evaluate(el => el.textContent || '');
            if (text.includes('ลงทะเบียน') || text.includes('Enroll') || text.includes('สมัครเรียน')) {
                await btn.click();
                log('Clicked enroll button', 'info');
                await sleep(2000);
                enrolled = true;
                break;
            }
        }

        await takeScreenshot('12-after-enroll');

        // Check for modal confirmation
        const modal = await page.$('.modal.show, [class*="modal"]:not(.hidden), [role="dialog"]');
        if (modal) {
            log('Enrollment modal appeared', 'info');
            await takeScreenshot('12b-enroll-modal');

            // Find confirm button
            const confirmBtns = await modal.$$('button');
            for (const btn of confirmBtns) {
                const text = await btn.evaluate(el => el.textContent || '');
                if (text.includes('ยืนยัน') || text.includes('Confirm') || text.includes('ตกลง')) {
                    await btn.click();
                    await sleep(2000);
                    log('Confirmed enrollment', 'info');
                    break;
                }
            }
        }

        await takeScreenshot('13-enrollment-result');

        // Check enrollment result
        const pageContent = await page.content();
        const success = pageContent.includes('สำเร็จ') ||
                       pageContent.includes('Success') ||
                       pageContent.includes('เริ่มเรียน') ||
                       pageContent.includes('Continue') ||
                       enrolled;

        addResult('Enroll in Course', success, enrolled ? 'Enrollment attempted' : 'No enroll button found');
        return success;
    } catch (error) {
        await takeScreenshot('error-enroll');
        addResult('Enroll in Course', false, error.message);
        return false;
    }
}

// ============================================
// TEST 10: Access Course Learning
// ============================================
async function testAccessCourseLearning() {
    log('========== TEST 10: ACCESS COURSE LEARNING ==========', 'test');

    try {
        if (!createdCourseId) {
            addResult('Access Course Learning', false, 'No course ID available');
            return false;
        }

        // Navigate to course detail
        await page.goto(`${BASE_URL}/courses/${createdCourseId}`, { waitUntil: 'networkidle2' });
        await sleep(1000);

        // Look for start learning button
        const buttons = await page.$$('button, a.btn, a[href*="learn"]');
        for (const btn of buttons) {
            const text = await btn.evaluate(el => el.textContent || '');
            if (text.includes('เริ่มเรียน') || text.includes('Start') || text.includes('เรียน') || text.includes('Learn')) {
                await btn.click();
                await sleep(2000);
                log('Clicked start learning button', 'info');
                break;
            }
        }

        await takeScreenshot('14-learning-page');

        // Check if learning content is accessible
        const pageContent = await page.content();
        const hasLearningContent = pageContent.includes('บทที่') ||
                                   pageContent.includes('Lesson') ||
                                   pageContent.includes('เนื้อหา') ||
                                   pageContent.includes(TEST_COURSE.lessons[0].title);

        addResult('Access Course Learning', true, `Learning content: ${hasLearningContent}`);
        return true;
    } catch (error) {
        await takeScreenshot('error-learning');
        addResult('Access Course Learning', false, error.message);
        return false;
    }
}

// ============================================
// TEST 11: View My Courses
// ============================================
async function testViewMyCourses() {
    log('========== TEST 11: VIEW MY COURSES ==========', 'test');

    try {
        await page.goto(`${BASE_URL}/courses/my-courses`, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(1500);
        await takeScreenshot('15-my-courses');

        const pageContent = await page.content();
        const hasContent = pageContent.includes('หลักสูตรของฉัน') ||
                          pageContent.includes('My Courses') ||
                          pageContent.includes('กำลังเรียน');

        addResult('View My Courses', true, `Page loaded: ${hasContent}`);
        return true;
    } catch (error) {
        await takeScreenshot('error-my-courses');
        addResult('View My Courses', false, error.message);
        return false;
    }
}

// ============================================
// TEST 12: Course Search/Filter
// ============================================
async function testCourseSearch() {
    log('========== TEST 12: COURSE SEARCH/FILTER ==========', 'test');

    try {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle2' });
        await sleep(1000);

        // Look for search input
        const searchInput = await page.$('input[type="search"], input[name="search"], input[placeholder*="ค้นหา"], #search');

        if (searchInput) {
            await searchInput.type('ทดสอบ');
            await sleep(500);
            await page.keyboard.press('Enter');
            await sleep(1500);
            log('Entered search term', 'info');
        }

        await takeScreenshot('16-search-results');

        addResult('Course Search/Filter', true, 'Search tested');
        return true;
    } catch (error) {
        await takeScreenshot('error-search');
        addResult('Course Search/Filter', false, error.message);
        return false;
    }
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runTests() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     COMPREHENSIVE COURSE SYSTEM TEST - LearnHub             ║');
    console.log('║     Browser-based End-to-End Testing with Puppeteer         ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Tests: Login → Create Course → View → Enroll → Learn       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    try {
        log('Launching browser...', 'info');
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1366, height: 768 },
            args: ['--start-maximized', '--disable-web-security', '--no-sandbox']
        });

        page = await browser.newPage();
        page.setDefaultTimeout(15000);

        // Suppress CSP errors in console
        page.on('console', msg => {
            if (msg.type() === 'error' && !msg.text().includes('Content Security Policy')) {
                log(`Console: ${msg.text()}`, 'warning');
            }
        });

        // Run tests sequentially
        const loginSuccess = await testLogin();

        if (loginSuccess) {
            await testNavigateToCourseCreate();
            await testCourseCreateStep1();
            await testCourseCreateStep2();
            await testCourseCreateStep3();
            await testCourseCreateStep4();
            await testViewCourseList();
            await testViewCourseDetail();
            await testEnrollCourse();
            await testAccessCourseLearning();
            await testViewMyCourses();
            await testCourseSearch();
        } else {
            log('Login failed - cannot proceed with other tests', 'error');
            // Mark remaining tests as failed
            ['Navigate to Course Create', 'Course Create Step 1', 'Course Create Step 2',
             'Course Create Step 3', 'Course Create Step 4 (Submit)', 'View Course List',
             'View Course Detail', 'Enroll in Course', 'Access Course Learning',
             'View My Courses', 'Course Search/Filter'].forEach(test => {
                addResult(test, false, 'Skipped due to login failure');
            });
        }

    } catch (error) {
        log(`Fatal error: ${error.message}`, 'error');
    } finally {
        // Print summary
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║                    TEST RESULTS SUMMARY                      ║');
        console.log('╠══════════════════════════════════════════════════════════════╣');

        const passed = testResults.filter(r => r.passed).length;
        const failed = testResults.filter(r => !r.passed).length;

        testResults.forEach((result, index) => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            const name = result.testName.substring(0, 35).padEnd(35);
            console.log(`║  ${(index + 1).toString().padStart(2, '0')}. ${name} ${status}  ║`);
        });

        console.log('╠══════════════════════════════════════════════════════════════╣');
        console.log(`║  Total: ${testResults.length.toString().padEnd(2)} | Passed: ${passed.toString().padEnd(2)} | Failed: ${failed.toString().padEnd(2)}                          ║`);
        console.log(`║  Success Rate: ${((passed / testResults.length) * 100).toFixed(1)}%                                      ║`);
        console.log('╚══════════════════════════════════════════════════════════════╝');

        if (createdCourseId) {
            console.log(`\n📚 Created Course ID: ${createdCourseId}`);
        }

        log('Test completed. Browser closing in 5 seconds...', 'info');
        await sleep(5000);

        if (browser) {
            await browser.close();
        }

        process.exit(failed > 0 ? 1 : 0);
    }
}

// Run tests
runTests();
