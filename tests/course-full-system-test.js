/**
 * Course Full System Test - Comprehensive Browser Testing
 * Tests: Course Creation, Enrollment, Learning, Progress Tracking
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test results storage
const testResults = {
    passed: [],
    failed: [],
    warnings: [],
    startTime: new Date(),
    endTime: null
};

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    const icons = { info: 'i', success: '+', error: 'x', warning: '!' };
    console.log(`[${timestamp}] [${icons[type] || 'i'}] ${message}`);
}

function pass(testName, details = '') {
    testResults.passed.push({ name: testName, details, time: new Date() });
    log(`PASS: ${testName} ${details}`, 'success');
}

function fail(testName, error) {
    testResults.failed.push({ name: testName, error: error.toString(), time: new Date() });
    log(`FAIL: ${testName} - ${error}`, 'error');
}

function warn(message) {
    testResults.warnings.push({ message, time: new Date() });
    log(`WARNING: ${message}`, 'warning');
}

async function screenshot(page, name) {
    const filename = `${Date.now()}-${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: true });
    log(`Screenshot saved: ${filename}`);
    return filename;
}

async function waitAndClick(page, selector, timeout = 10000) {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector);
}

async function waitAndType(page, selector, text, timeout = 10000) {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector, { clickCount: 3 }); // Select all
    await page.type(selector, text);
}

// Helper to wait (replacement for deprecated waitForTimeout)
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(page, employeeId = 'ADM001', password = 'admin123') {
    log(`Logging in as ${employeeId}...`);
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for page to fully load
    await delay(2000);
    await screenshot(page, 'login-page-loaded');

    // Use employee_id field (not username)
    await waitAndType(page, '#employee_id', employeeId);
    await waitAndType(page, '#password', password);
    await screenshot(page, 'login-form');

    // Click submit and wait for navigation
    await page.click('button[type="submit"]');
    await delay(3000);

    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/courses')) {
        pass('Login', `as ${employeeId}`);
        return true;
    } else {
        fail('Login', `Unexpected redirect to ${currentUrl}`);
        return false;
    }
}

// ==================== TEST SUITES ====================

/**
 * Test Suite 1: Course List and Navigation
 */
async function testCourseListAndNavigation(page) {
    log('\n========== TEST SUITE 1: Course List & Navigation ==========\n');

    try {
        // 1.1 Navigate to courses page
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(2000); // Wait for dynamic content
        await screenshot(page, '1.1-courses-list');

        // Check if courses list loads
        const coursesExist = await page.evaluate(() => {
            const cards = document.querySelectorAll('.course-card, [class*="course"], .card');
            return cards.length > 0;
        });

        if (coursesExist) {
            pass('1.1 Courses List Load', 'Course cards found');
        } else {
            warn('1.1 No course cards visible on page');
        }

        // 1.2 Test pagination if exists
        const hasPagination = await page.$('.pagination, [class*="pagination"]');
        if (hasPagination) {
            pass('1.2 Pagination', 'Pagination controls found');
        } else {
            log('1.2 No pagination controls (may not be needed)');
        }

        // 1.3 Test search/filter if exists
        const searchInput = await page.$('input[type="search"], input[name="search"], #search');
        if (searchInput) {
            await searchInput.type('test');
            await page.keyboard.press('Enter');
            await delay(1000);
            await screenshot(page, '1.3-search-results');
            pass('1.3 Search Functionality', 'Search input works');
        }

        // 1.4 Test category filter if exists
        const categoryFilter = await page.$('select[name="category"], #category-filter, .category-filter');
        if (categoryFilter) {
            pass('1.4 Category Filter', 'Filter found');
        }

    } catch (error) {
        fail('Course List Navigation', error);
        await screenshot(page, 'error-course-list');
    }
}

/**
 * Test Suite 2: Course Creation (Admin)
 */
async function testCourseCreation(page) {
    log('\n========== TEST SUITE 2: Course Creation ==========\n');

    const testCourseName = `Test Course ${Date.now()}`;
    let createdCourseId = null;

    try {
        // 2.1 Navigate to create course page
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await screenshot(page, '2.1-create-course-page');

        const createPageLoaded = await page.evaluate(() => {
            return document.body.innerText.includes('สร้างหลักสูตร') ||
                   document.body.innerText.includes('Create Course') ||
                   document.querySelector('form');
        });

        if (createPageLoaded) {
            pass('2.1 Create Course Page Load');
        } else {
            fail('2.1 Create Course Page Load', 'Page may not have loaded correctly');
            return null;
        }

        // 2.2 Fill in course name
        const courseNameInput = await page.$('#course_name, input[name="course_name"], #courseName');
        if (courseNameInput) {
            await courseNameInput.click({ clickCount: 3 });
            await courseNameInput.type(testCourseName);
            pass('2.2 Course Name Input');
        }

        // 2.3 Fill in description
        const descInput = await page.$('#description, textarea[name="description"]');
        if (descInput) {
            await descInput.click();
            await descInput.type('This is a comprehensive test course created by automated testing.');
            pass('2.3 Description Input');
        }

        // 2.4 Select category if available
        const categorySelect = await page.$('#category_id, select[name="category_id"]');
        if (categorySelect) {
            const options = await page.$$eval('#category_id option, select[name="category_id"] option', opts =>
                opts.map(o => ({ value: o.value, text: o.textContent }))
            );
            if (options.length > 1) {
                await page.select('#category_id, select[name="category_id"]', options[1].value);
                pass('2.4 Category Selection', options[1].text);
            }
        }

        // 2.5 Set difficulty level if available
        const difficultySelect = await page.$('#difficulty_level, select[name="difficulty_level"]');
        if (difficultySelect) {
            await page.select('#difficulty_level, select[name="difficulty_level"]', 'Beginner');
            pass('2.5 Difficulty Selection');
        }

        // 2.6 Set duration
        const durationInput = await page.$('#duration_hours, input[name="duration_hours"]');
        if (durationInput) {
            await durationInput.click({ clickCount: 3 });
            await durationInput.type('2');
            pass('2.6 Duration Input');
        }

        await screenshot(page, '2.6-form-filled');

        // 2.7 Check for wizard steps
        const wizardSteps = await page.$$('.wizard-step, .step, [class*="wizard"]');
        if (wizardSteps.length > 0) {
            log(`Found ${wizardSteps.length} wizard steps`);

            // Try to proceed through wizard
            const nextBtn = await page.$('.next-step, #next-step, button:has-text("ถัดไป"), button:has-text("Next")');
            if (nextBtn) {
                await nextBtn.click();
                await delay(1000);
                await screenshot(page, '2.7-wizard-step2');
                pass('2.7 Wizard Step Navigation');
            }
        }

        // 2.8 Submit course creation
        // Look for submit/create button
        const submitBtn = await page.$('button[type="submit"], #submitCourse, .submit-course, button:has-text("สร้าง"), button:has-text("Create")');

        if (submitBtn) {
            // Set up response listener for API
            const responsePromise = page.waitForResponse(
                response => response.url().includes('/courses/api/create') && response.request().method() === 'POST',
                { timeout: 30000 }
            ).catch(() => null);

            await submitBtn.click();
            await delay(2000);

            const response = await responsePromise;
            if (response) {
                const responseData = await response.json().catch(() => null);
                if (responseData && responseData.success) {
                    createdCourseId = responseData.data?.course_id;
                    pass('2.8 Course Creation API', `Course ID: ${createdCourseId}`);
                } else {
                    fail('2.8 Course Creation API', responseData?.message || 'Unknown error');
                }
            }

            await screenshot(page, '2.8-after-submit');
        }

        // 2.9 Verify redirect to course detail or list
        await delay(3000);
        const currentUrl = page.url();
        if (currentUrl.includes('/courses/') && !currentUrl.includes('/create')) {
            pass('2.9 Redirect After Creation', currentUrl);

            // Extract course ID from URL if not already set
            if (!createdCourseId) {
                const match = currentUrl.match(/\/courses\/(\d+)/);
                if (match) {
                    createdCourseId = parseInt(match[1]);
                }
            }
        }

        await screenshot(page, '2.9-final-state');

    } catch (error) {
        fail('Course Creation', error);
        await screenshot(page, 'error-course-creation');
    }

    return createdCourseId;
}

/**
 * Test Suite 3: Course Detail View
 */
async function testCourseDetail(page, courseId) {
    log('\n========== TEST SUITE 3: Course Detail View ==========\n');

    if (!courseId) {
        // Try to get first course from list
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const firstCourseLink = await page.$('a[href*="/courses/"]');
        if (firstCourseLink) {
            const href = await firstCourseLink.evaluate(el => el.href);
            const match = href.match(/\/courses\/(\d+)/);
            if (match) courseId = match[1];
        }
    }

    if (!courseId) {
        warn('No course ID available for detail testing');
        return;
    }

    try {
        // 3.1 Navigate to course detail
        await page.goto(`${BASE_URL}/courses/${courseId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await screenshot(page, '3.1-course-detail');

        const detailPageLoaded = await page.evaluate(() => {
            return document.querySelector('.course-detail, .course-info, [class*="course"]') !== null;
        });

        if (detailPageLoaded) {
            pass('3.1 Course Detail Page Load');
        } else {
            // Check for 404
            const is404 = await page.evaluate(() => {
                return document.body.innerText.includes('ไม่พบ') ||
                       document.body.innerText.includes('Not Found') ||
                       document.body.innerText.includes('404');
            });
            if (is404) {
                fail('3.1 Course Detail Page Load', `Course ${courseId} not found`);
                return;
            }
        }

        // 3.2 Check for course title
        const courseTitle = await page.evaluate(() => {
            const titleEl = document.querySelector('h1, .course-title, [class*="title"]');
            return titleEl ? titleEl.textContent.trim() : null;
        });
        if (courseTitle) {
            pass('3.2 Course Title Display', courseTitle.substring(0, 50));
        }

        // 3.3 Check for course description
        const hasDescription = await page.evaluate(() => {
            return document.querySelector('.description, .course-description, [class*="description"]') !== null ||
                   document.body.innerText.length > 100;
        });
        if (hasDescription) {
            pass('3.3 Course Description Display');
        }

        // 3.4 Check for enrollment button
        const enrollBtn = await page.$('button[class*="enroll"], .enroll-btn, #enrollBtn, a[href*="enroll"]');
        if (enrollBtn) {
            pass('3.4 Enrollment Button Found');
        } else {
            // May already be enrolled
            const alreadyEnrolled = await page.evaluate(() => {
                return document.body.innerText.includes('ลงทะเบียนแล้ว') ||
                       document.body.innerText.includes('Already Enrolled') ||
                       document.body.innerText.includes('เริ่มเรียน');
            });
            if (alreadyEnrolled) {
                log('3.4 User already enrolled in this course');
            }
        }

        // 3.5 Check for course materials/lessons list
        const hasMaterials = await page.evaluate(() => {
            return document.querySelector('.lessons, .materials, .course-content, [class*="lesson"]') !== null;
        });
        if (hasMaterials) {
            pass('3.5 Course Materials/Lessons Display');
        }

        // 3.6 Check course metadata
        const metadata = await page.evaluate(() => {
            const results = {};
            // Check for duration
            if (document.body.innerText.match(/\d+\s*(ชั่วโมง|hours?|นาที|minutes?)/i)) {
                results.duration = true;
            }
            // Check for instructor
            if (document.body.innerText.match(/ผู้สอน|instructor|วิทยากร/i)) {
                results.instructor = true;
            }
            // Check for category
            if (document.body.innerText.match(/หมวดหมู่|category/i)) {
                results.category = true;
            }
            return results;
        });

        if (metadata.duration) pass('3.6a Duration Display');
        if (metadata.instructor) pass('3.6b Instructor Display');
        if (metadata.category) pass('3.6c Category Display');

    } catch (error) {
        fail('Course Detail', error);
        await screenshot(page, 'error-course-detail');
    }
}

/**
 * Test Suite 4: Course Enrollment
 */
async function testCourseEnrollment(page, courseId) {
    log('\n========== TEST SUITE 4: Course Enrollment ==========\n');

    if (!courseId) {
        warn('No course ID for enrollment testing');
        return false;
    }

    try {
        // 4.1 Navigate to course
        await page.goto(`${BASE_URL}/courses/${courseId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // 4.2 Check enrollment status
        const enrollmentStatus = await page.evaluate(() => {
            const text = document.body.innerText;
            if (text.includes('ลงทะเบียนแล้ว') || text.includes('Already Enrolled')) {
                return 'enrolled';
            }
            if (text.includes('ลงทะเบียน') || text.includes('Enroll')) {
                return 'not_enrolled';
            }
            return 'unknown';
        });

        log(`4.2 Current enrollment status: ${enrollmentStatus}`);

        if (enrollmentStatus === 'enrolled') {
            pass('4.2 Already Enrolled');
            return true;
        }

        // 4.3 Find and click enroll button
        const enrollBtn = await page.$('button[class*="enroll"], .enroll-btn, #enrollBtn, button:has-text("ลงทะเบียน")');

        if (!enrollBtn) {
            warn('4.3 No enrollment button found');
            return false;
        }

        // Set up API listener
        const responsePromise = page.waitForResponse(
            response => response.url().includes('/enroll') && response.request().method() === 'POST',
            { timeout: 15000 }
        ).catch(() => null);

        await enrollBtn.click();
        await delay(2000);

        const response = await responsePromise;
        if (response) {
            const data = await response.json().catch(() => ({}));
            if (data.success) {
                pass('4.3 Enrollment API Success');
            } else {
                fail('4.3 Enrollment API', data.message || 'Failed');
            }
        }

        await screenshot(page, '4.3-after-enrollment');

        // 4.4 Verify enrollment success
        await delay(1000);
        const enrolledNow = await page.evaluate(() => {
            return document.body.innerText.includes('ลงทะเบียนสำเร็จ') ||
                   document.body.innerText.includes('Successfully') ||
                   document.body.innerText.includes('เริ่มเรียน') ||
                   document.body.innerText.includes('Start Learning');
        });

        if (enrolledNow) {
            pass('4.4 Enrollment Verification');
            return true;
        }

    } catch (error) {
        fail('Course Enrollment', error);
        await screenshot(page, 'error-enrollment');
    }

    return false;
}

/**
 * Test Suite 5: Learning Experience
 */
async function testLearningExperience(page, courseId) {
    log('\n========== TEST SUITE 5: Learning Experience ==========\n');

    if (!courseId) {
        warn('No course ID for learning testing');
        return;
    }

    try {
        // 5.1 Navigate to course learning page
        await page.goto(`${BASE_URL}/courses/${courseId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Look for "Start Learning" or "Continue" button
        const startBtn = await page.$('a[href*="learn"], button:has-text("เริ่มเรียน"), button:has-text("Start"), .start-learning');

        if (startBtn) {
            await startBtn.click();
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
            await delay(2000);
            await screenshot(page, '5.1-learning-page');
            pass('5.1 Learning Page Access');
        }

        // 5.2 Check for lesson content
        const hasLessonContent = await page.evaluate(() => {
            return document.querySelector('video, .lesson-content, .material-content, iframe, .content-area') !== null;
        });

        if (hasLessonContent) {
            pass('5.2 Lesson Content Display');
        }

        // 5.3 Check for navigation between lessons
        const hasNavigation = await page.evaluate(() => {
            return document.querySelector('.lesson-nav, .next-lesson, .prev-lesson, [class*="navigation"]') !== null ||
                   document.querySelectorAll('a[href*="lesson"]').length > 1;
        });

        if (hasNavigation) {
            pass('5.3 Lesson Navigation');
        }

        // 5.4 Check for progress indicator
        const hasProgress = await page.evaluate(() => {
            return document.querySelector('.progress, .progress-bar, [class*="progress"]') !== null ||
                   document.body.innerText.match(/\d+\s*%/);
        });

        if (hasProgress) {
            pass('5.4 Progress Indicator');
        }

        // 5.5 Check for completion button
        const completeBtn = await page.$('button:has-text("เสร็จสิ้น"), button:has-text("Complete"), .mark-complete');
        if (completeBtn) {
            pass('5.5 Completion Button Found');
        }

    } catch (error) {
        fail('Learning Experience', error);
        await screenshot(page, 'error-learning');
    }
}

/**
 * Test Suite 6: My Courses / Enrolled Courses
 */
async function testMyCourses(page) {
    log('\n========== TEST SUITE 6: My Courses ==========\n');

    try {
        // 6.1 Navigate to my courses
        const myCoursesUrls = ['/courses/my-courses', '/my-courses', '/courses?enrolled=true'];
        let found = false;

        for (const url of myCoursesUrls) {
            await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            const is404 = await page.evaluate(() => {
                return document.body.innerText.includes('404') || document.body.innerText.includes('ไม่พบ');
            });
            if (!is404) {
                found = true;
                break;
            }
        }

        if (found) {
            await screenshot(page, '6.1-my-courses');
            pass('6.1 My Courses Page Access');
        }

        // 6.2 Check for enrolled courses list
        const enrolledCourses = await page.evaluate(() => {
            const cards = document.querySelectorAll('.course-card, [class*="course"], .enrolled-course');
            return cards.length;
        });

        log(`6.2 Found ${enrolledCourses} enrolled courses`);
        if (enrolledCourses > 0) {
            pass('6.2 Enrolled Courses Display', `${enrolledCourses} courses`);
        }

        // 6.3 Check for progress display
        const hasProgressInfo = await page.evaluate(() => {
            return document.body.innerText.match(/\d+\s*%/) !== null ||
                   document.querySelector('[class*="progress"]') !== null;
        });

        if (hasProgressInfo) {
            pass('6.3 Progress Information Display');
        }

    } catch (error) {
        fail('My Courses', error);
        await screenshot(page, 'error-my-courses');
    }
}

/**
 * Test Suite 7: API Validation Tests
 */
async function testAPIValidation(page) {
    log('\n========== TEST SUITE 7: API Validation ==========\n');

    try {
        // 7.1 Test invalid course ID
        const response1 = await page.evaluate(async () => {
            const res = await fetch('/courses/api/999999');
            return { status: res.status, ok: res.ok };
        });

        if (response1.status === 404 || !response1.ok) {
            pass('7.1 Invalid Course ID Returns Error');
        }

        // 7.2 Test course creation with missing fields
        const response2 = await page.evaluate(async () => {
            const res = await fetch('/courses/api/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            return { status: res.status, ok: res.ok };
        });

        if (response2.status === 400 || !response2.ok) {
            pass('7.2 Empty Course Data Returns Error');
        }

        // 7.3 Test enrollment to non-existent course
        const response3 = await page.evaluate(async () => {
            const res = await fetch('/courses/999999/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            return { status: res.status, ok: res.ok };
        });

        if (response3.status === 404 || !response3.ok) {
            pass('7.3 Enroll Non-existent Course Returns Error');
        }

    } catch (error) {
        fail('API Validation', error);
    }
}

/**
 * Generate Test Report
 */
function generateReport() {
    testResults.endTime = new Date();
    const duration = (testResults.endTime - testResults.startTime) / 1000;

    console.log('\n');
    console.log('='.repeat(60));
    console.log('              COURSE SYSTEM TEST REPORT');
    console.log('='.repeat(60));
    console.log(`\nTest Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Start Time: ${testResults.startTime.toLocaleString('th-TH')}`);
    console.log(`End Time: ${testResults.endTime.toLocaleString('th-TH')}`);

    console.log('\n--- SUMMARY ---');
    console.log(`Total Passed: ${testResults.passed.length}`);
    console.log(`Total Failed: ${testResults.failed.length}`);
    console.log(`Warnings: ${testResults.warnings.length}`);

    const successRate = testResults.passed.length / (testResults.passed.length + testResults.failed.length) * 100;
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);

    if (testResults.failed.length > 0) {
        console.log('\n--- FAILED TESTS ---');
        testResults.failed.forEach((f, i) => {
            console.log(`${i + 1}. ${f.name}`);
            console.log(`   Error: ${f.error}`);
        });
    }

    if (testResults.warnings.length > 0) {
        console.log('\n--- WARNINGS ---');
        testResults.warnings.forEach((w, i) => {
            console.log(`${i + 1}. ${w.message}`);
        });
    }

    console.log('\n--- PASSED TESTS ---');
    testResults.passed.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name} ${p.details ? `(${p.details})` : ''}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(60));

    // Save report to file
    const reportPath = path.join(SCREENSHOT_DIR, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\nFull report saved to: ${reportPath}`);

    return testResults;
}

/**
 * Main Test Runner
 */
async function runTests() {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('     COURSE FULL SYSTEM TEST - Starting...');
    console.log('='.repeat(60));
    console.log(`\nTarget: ${BASE_URL}`);
    console.log(`Time: ${new Date().toLocaleString('th-TH')}\n`);

    let browser;

    try {
        browser = await puppeteer.launch({
            headless: true,  // Set to false for visual debugging
            defaultViewport: { width: 1366, height: 768 },
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
            timeout: 60000
        });

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(30000);

        // Set up console logging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                log(`Browser Console Error: ${msg.text()}`, 'warning');
            }
        });

        // Login first
        const loggedIn = await login(page);
        if (!loggedIn) {
            throw new Error('Failed to login - cannot proceed with tests');
        }

        // Run test suites
        await testCourseListAndNavigation(page);

        const createdCourseId = await testCourseCreation(page);

        // Use created course or find existing one
        let testCourseId = createdCourseId;
        if (!testCourseId) {
            await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            const firstLink = await page.$('a[href*="/courses/"]');
            if (firstLink) {
                const href = await firstLink.evaluate(el => el.href);
                const match = href.match(/\/courses\/(\d+)/);
                if (match) testCourseId = match[1];
            }
        }

        await testCourseDetail(page, testCourseId);
        await testCourseEnrollment(page, testCourseId);
        await testLearningExperience(page, testCourseId);
        await testMyCourses(page);
        await testAPIValidation(page);

        // Final screenshot
        await screenshot(page, 'final-state');

    } catch (error) {
        console.error('Critical test error:', error);
        fail('Test Runner', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    return generateReport();
}

// Run tests
runTests().then(results => {
    process.exit(results.failed.length > 0 ? 1 : 0);
}).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});
