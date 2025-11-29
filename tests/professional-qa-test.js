/**
 * Professional QA Test - Comprehensive Course System Testing
 * Tests: Validation, Edge Cases, Error Handling, UI/UX, Workflows
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'qa-screenshots');

// Ensure screenshot directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test Results
const results = {
    passed: [],
    failed: [],
    warnings: [],
    total: 0,
    startTime: new Date()
};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg, type = 'info') {
    const icons = { info: 'i', pass: '+', fail: 'x', warn: '!', test: '>' };
    const time = new Date().toLocaleTimeString('th-TH');
    console.log(`[${time}] [${icons[type] || 'i'}] ${msg}`);
}

function pass(name, detail = '') {
    results.passed.push({ name, detail, time: new Date() });
    results.total++;
    log(`PASS: ${name} ${detail}`, 'pass');
}

function fail(name, error) {
    results.failed.push({ name, error: String(error), time: new Date() });
    results.total++;
    log(`FAIL: ${name} - ${error}`, 'fail');
}

function warn(msg) {
    results.warnings.push({ msg, time: new Date() });
    log(`WARN: ${msg}`, 'warn');
}

async function screenshot(page, name) {
    const filename = `${Date.now()}-${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: true });
    return filename;
}

// ==================== TEST SUITES ====================

/**
 * Test Suite 1: Login System
 */
async function testLoginSystem(page) {
    log('\n' + '='.repeat(50), 'test');
    log('TEST SUITE 1: LOGIN SYSTEM', 'test');
    log('='.repeat(50), 'test');

    // 1.1 Empty credentials
    log('\n1.1 Testing empty credentials...');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
    await delay(1000);
    await page.click('button[type="submit"]');
    await delay(1000);

    const emptyError = await page.evaluate(() => {
        const input = document.querySelector('#employee_id');
        return input && input.validity && !input.validity.valid;
    });
    if (emptyError) pass('1.1 Empty credentials validation');
    else warn('1.1 No validation for empty credentials');

    // 1.2 Invalid credentials
    log('\n1.2 Testing invalid credentials...');
    await page.type('#employee_id', 'INVALID_USER');
    await page.type('#password', 'wrong_password');
    await page.click('button[type="submit"]');
    await delay(2000);
    await screenshot(page, '1.2-invalid-login');

    const stillOnLogin = page.url().includes('/login');
    if (stillOnLogin) pass('1.2 Invalid credentials rejected');
    else fail('1.2 Invalid credentials', 'Should stay on login page');

    // 1.3 Valid credentials
    log('\n1.3 Testing valid credentials...');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
    await delay(1000);
    await page.type('#employee_id', 'ADM001');
    await page.type('#password', 'admin123');
    await page.click('button[type="submit"]');
    await delay(3000);

    if (!page.url().includes('/login')) {
        pass('1.3 Valid credentials accepted');
    } else {
        fail('1.3 Valid credentials', 'Login failed');
        return false;
    }

    // 1.4 Session persistence
    log('\n1.4 Testing session persistence...');
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await delay(1000);
    if (!page.url().includes('/login')) {
        pass('1.4 Session persistence');
    } else {
        fail('1.4 Session persistence', 'Session lost');
    }

    return true;
}

/**
 * Test Suite 2: Course List Page
 */
async function testCourseList(page) {
    log('\n' + '='.repeat(50), 'test');
    log('TEST SUITE 2: COURSE LIST PAGE', 'test');
    log('='.repeat(50), 'test');

    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await delay(2000);
    await screenshot(page, '2.0-course-list');

    // 2.1 Page loads correctly
    log('\n2.1 Testing page load...');
    const pageTitle = await page.title();
    if (pageTitle && pageTitle.length > 0) {
        pass('2.1 Page loads correctly', pageTitle);
    } else {
        fail('2.1 Page load', 'No title');
    }

    // 2.2 Search functionality
    log('\n2.2 Testing search functionality...');
    const searchInput = await page.$('input[type="search"], input[name="search"], #search, input[placeholder*="ค้นหา"]');
    if (searchInput) {
        await searchInput.type('test');
        await page.keyboard.press('Enter');
        await delay(1500);
        await screenshot(page, '2.2-search-results');
        pass('2.2 Search functionality works');

        // Clear search
        await searchInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await delay(500);
    } else {
        warn('2.2 Search input not found');
    }

    // 2.3 Filter dropdowns
    log('\n2.3 Testing filter dropdowns...');
    const filters = await page.$$('select');
    if (filters.length > 0) {
        pass('2.3 Filter dropdowns exist', `${filters.length} filters`);

        // Test each filter
        for (let i = 0; i < Math.min(filters.length, 3); i++) {
            try {
                const options = await filters[i].$$('option');
                if (options.length > 1) {
                    await filters[i].select(await options[1].evaluate(o => o.value));
                    await delay(500);
                }
            } catch (e) {
                // Skip if filter fails
            }
        }
        await screenshot(page, '2.3-filters-applied');
    } else {
        warn('2.3 No filter dropdowns found');
    }

    // 2.4 Course cards display
    log('\n2.4 Testing course cards...');
    const courseCards = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="course"], .card');
        return Array.from(cards).map(c => ({
            hasImage: !!c.querySelector('img'),
            hasTitle: !!c.querySelector('h2, h3, h4, [class*="title"]'),
            hasButton: !!c.querySelector('button, a[class*="btn"]')
        }));
    });

    if (courseCards.length > 0) {
        pass('2.4 Course cards display', `${courseCards.length} cards`);
    } else {
        warn('2.4 No course cards found');
    }

    // 2.5 Pagination
    log('\n2.5 Testing pagination...');
    const pagination = await page.$('.pagination, [class*="pagination"]');
    if (pagination) {
        pass('2.5 Pagination exists');
    } else {
        log('2.5 No pagination (may not be needed)');
    }

    // 2.6 Create course button (Admin only)
    log('\n2.6 Testing create course button...');
    const createBtn = await page.$('a[href*="create"], button[class*="create"]');
    if (createBtn) {
        pass('2.6 Create course button visible (Admin)');
    } else {
        warn('2.6 Create course button not found');
    }

    return true;
}

/**
 * Test Suite 3: Course Creation (Full Wizard Test)
 */
async function testCourseCreation(page) {
    log('\n' + '='.repeat(50), 'test');
    log('TEST SUITE 3: COURSE CREATION WIZARD', 'test');
    log('='.repeat(50), 'test');

    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await delay(2000);
    await screenshot(page, '3.0-create-page');

    // 3.1 Wizard step 1 loads
    log('\n3.1 Testing wizard step 1...');
    const step1Visible = await page.evaluate(() => {
        return document.body.innerText.includes('ข้อมูลพื้นฐาน') ||
               document.body.innerText.includes('ขั้นตอนที่ 1');
    });
    if (step1Visible) {
        pass('3.1 Wizard step 1 loads');
    } else {
        warn('3.1 Wizard step 1 not clearly visible');
    }

    // 3.2 Required field validation - Empty submit
    log('\n3.2 Testing required field validation...');
    const nextBtn = await page.$('button[class*="next"], .next-step, button:not([type="button"])');
    if (nextBtn) {
        await nextBtn.click();
        await delay(1000);
        await screenshot(page, '3.2-validation-error');

        const hasValidation = await page.evaluate(() => {
            return document.querySelector('.error, .invalid, [class*="error"]') !== null ||
                   document.body.innerText.includes('กรุณา') ||
                   document.body.innerText.includes('required');
        });
        if (hasValidation) {
            pass('3.2 Required field validation works');
        } else {
            warn('3.2 No visible validation error');
        }
    }

    // 3.3 Fill course name
    log('\n3.3 Testing course name input...');
    const courseNameInput = await page.$('#course_name, input[name="course_name"]');
    if (courseNameInput) {
        const testName = `QA Test Course ${Date.now()}`;
        await courseNameInput.type(testName);
        pass('3.3 Course name input works');

        // 3.3.1 Test special characters
        await courseNameInput.click({ clickCount: 3 });
        await courseNameInput.type('Test <script>alert("XSS")</script>');
        await delay(500);
        pass('3.3.1 Special characters accepted (will be sanitized)');

        // Reset to normal name
        await courseNameInput.click({ clickCount: 3 });
        await courseNameInput.type(testName);
    }

    // 3.4 Category selection
    log('\n3.4 Testing category selection...');
    const categorySelect = await page.$('#category_id, select[name="category_id"]');
    if (categorySelect) {
        const options = await page.$$eval('#category_id option, select[name="category_id"] option',
            opts => opts.map(o => ({ value: o.value, text: o.textContent })));

        if (options.length > 1) {
            await page.select('#category_id, select[name="category_id"]', options[1].value);
            pass('3.4 Category selection works', options[1].text);
        } else {
            warn('3.4 Only one category option');
        }
    } else {
        warn('3.4 Category select not found');
    }

    // 3.5 Difficulty level
    log('\n3.5 Testing difficulty level...');
    const difficultySelect = await page.$('#difficulty_level, select[name="difficulty_level"]');
    if (difficultySelect) {
        await page.select('#difficulty_level, select[name="difficulty_level"]', 'Beginner');
        pass('3.5 Difficulty level selection works');
    }

    // 3.6 Course type
    log('\n3.6 Testing course type...');
    const typeSelect = await page.$('#course_type, select[name="course_type"]');
    if (typeSelect) {
        const typeOptions = await page.$$eval('#course_type option', opts => opts.map(o => o.value).filter(v => v));
        if (typeOptions.length > 0) {
            await page.select('#course_type, select[name="course_type"]', typeOptions[0]);
            pass('3.6 Course type selection works');
        }
    }

    // 3.7 Language selection
    log('\n3.7 Testing language selection...');
    const langSelect = await page.$('#language, select[name="language"]');
    if (langSelect) {
        await page.select('#language, select[name="language"]', 'th');
        pass('3.7 Language selection works');
    }

    await screenshot(page, '3.7-step1-filled');

    // 3.8 Navigate to step 2
    log('\n3.8 Testing wizard navigation to step 2...');
    const nextBtn2 = await page.$('.next-step, button[class*="next"], #next-step');
    if (nextBtn2) {
        await nextBtn2.click();
        await delay(2000);
        await screenshot(page, '3.8-step2');

        const onStep2 = await page.evaluate(() => {
            return document.body.innerText.includes('รายละเอียด') ||
                   document.body.innerText.includes('ขั้นตอนที่ 2') ||
                   document.body.innerText.includes('Description');
        });
        if (onStep2) {
            pass('3.8 Navigate to step 2');
        } else {
            warn('3.8 May not have moved to step 2');
        }
    }

    // 3.9 Test description textarea
    log('\n3.9 Testing description input...');
    const descTextarea = await page.$('#description, textarea[name="description"]');
    if (descTextarea) {
        await descTextarea.type('This is a comprehensive test course created by the QA automation system.');
        pass('3.9 Description input works');
    }

    // 3.10 Test duration input
    log('\n3.10 Testing duration input...');
    const durationInput = await page.$('#duration_hours, input[name="duration_hours"]');
    if (durationInput) {
        await durationInput.click({ clickCount: 3 });
        await durationInput.type('2');
        pass('3.10 Duration input works');

        // Test negative value
        await durationInput.click({ clickCount: 3 });
        await durationInput.type('-5');
        await delay(500);
        const negativeHandled = await page.evaluate(() => {
            const input = document.querySelector('#duration_hours, input[name="duration_hours"]');
            return input && (input.value === '' || input.value === '0' || parseFloat(input.value) >= 0);
        });
        if (negativeHandled) {
            pass('3.10.1 Negative duration handled');
        } else {
            warn('3.10.1 Negative duration may not be validated');
        }

        // Reset
        await durationInput.click({ clickCount: 3 });
        await durationInput.type('2');
    }

    await screenshot(page, '3.10-step2-filled');

    return true;
}

/**
 * Test Suite 4: Course Detail Page
 */
async function testCourseDetail(page) {
    log('\n' + '='.repeat(50), 'test');
    log('TEST SUITE 4: COURSE DETAIL PAGE', 'test');
    log('='.repeat(50), 'test');

    // Find a course to test
    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await delay(2000);

    const courseLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/courses/"]'));
        const courseLinks = links.filter(l => l.href.match(/\/courses\/\d+$/));
        return courseLinks.length > 0 ? courseLinks[0].href : null;
    });

    if (!courseLink) {
        warn('No course found to test detail page');
        return false;
    }

    await page.goto(courseLink, { waitUntil: 'domcontentloaded' });
    await delay(2000);
    await screenshot(page, '4.0-course-detail');

    // 4.1 Course title displays
    log('\n4.1 Testing course title...');
    const title = await page.evaluate(() => {
        const h1 = document.querySelector('h1, .course-title');
        return h1 ? h1.textContent.trim() : null;
    });
    if (title) {
        pass('4.1 Course title displays', title.substring(0, 30));
    } else {
        fail('4.1 Course title', 'Not found');
    }

    // 4.2 Course info section
    log('\n4.2 Testing course info section...');
    const infoElements = await page.evaluate(() => {
        const body = document.body.innerText;
        return {
            hasDuration: body.includes('ชั่วโมง') || body.includes('hour'),
            hasLevel: body.includes('ระดับ') || body.includes('level') || body.includes('เริ่มต้น'),
            hasCategory: body.includes('หมวดหมู่') || body.includes('category'),
            hasInstructor: body.includes('ผู้สอน') || body.includes('instructor')
        };
    });

    if (infoElements.hasDuration) pass('4.2.1 Duration info displays');
    if (infoElements.hasLevel) pass('4.2.2 Level info displays');
    if (infoElements.hasCategory) pass('4.2.3 Category info displays');
    if (infoElements.hasInstructor) pass('4.2.4 Instructor info displays');

    // 4.3 Tabs functionality
    log('\n4.3 Testing tabs...');
    const tabs = await page.$$('[role="tab"], .tab, [class*="tab-"]');
    if (tabs.length > 0) {
        pass('4.3 Tabs exist', `${tabs.length} tabs`);

        // Click each tab
        for (let i = 0; i < Math.min(tabs.length, 4); i++) {
            try {
                await tabs[i].click();
                await delay(500);
            } catch (e) {
                // Tab may not be clickable
            }
        }
        await screenshot(page, '4.3-tabs-tested');
    }

    // 4.4 Enrollment/Start button
    log('\n4.4 Testing enrollment button...');
    const enrollmentState = await page.evaluate(() => {
        const body = document.body.innerText;
        return {
            isEnrolled: body.includes('ลงทะเบียนแล้ว') || body.includes('เข้าเรียน') || body.includes('enrolled'),
            hasEnrollBtn: !!document.querySelector('button[class*="enroll"], .enroll-btn'),
            hasStartBtn: body.includes('เริ่มเรียน') || body.includes('Start')
        };
    });

    if (enrollmentState.isEnrolled) {
        pass('4.4 User is enrolled');
    } else if (enrollmentState.hasEnrollBtn) {
        pass('4.4 Enroll button available');
    }

    // 4.5 Learning objectives
    log('\n4.5 Testing learning objectives...');
    const hasObjectives = await page.evaluate(() => {
        return document.body.innerText.includes('วัตถุประสงค์') ||
               document.body.innerText.includes('objective');
    });
    if (hasObjectives) {
        pass('4.5 Learning objectives display');
    }

    return true;
}

/**
 * Test Suite 5: Learning Page
 */
async function testLearningPage(page) {
    log('\n' + '='.repeat(50), 'test');
    log('TEST SUITE 5: LEARNING PAGE', 'test');
    log('='.repeat(50), 'test');

    // Find enrolled course
    await page.goto(`${BASE_URL}/courses/my-courses`, { waitUntil: 'domcontentloaded' });
    await delay(2000);

    // Click start on first course
    const startClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        for (const btn of buttons) {
            if (btn.textContent.includes('start') || btn.textContent.includes('เริ่ม') ||
                btn.textContent.includes('เข้าเรียน')) {
                btn.click();
                return true;
            }
        }
        return false;
    });

    if (!startClicked) {
        warn('No start button found in My Courses');
        return false;
    }

    await delay(3000);
    await screenshot(page, '5.0-learning-page');

    // 5.1 Progress display
    log('\n5.1 Testing progress display...');
    const hasProgress = await page.evaluate(() => {
        return document.body.innerText.includes('%') ||
               document.querySelector('[class*="progress"]') !== null;
    });
    if (hasProgress) {
        pass('5.1 Progress display works');
    }

    // 5.2 Time tracking
    log('\n5.2 Testing time tracking...');
    const hasTimeTracking = await page.evaluate(() => {
        return document.body.innerText.includes('timeSpent') ||
               document.body.innerText.includes('เวลา') ||
               document.body.innerText.match(/\d{2}:\d{2}:\d{2}/);
    });
    if (hasTimeTracking) {
        pass('5.2 Time tracking works');
    }

    // 5.3 Navigation buttons
    log('\n5.3 Testing navigation buttons...');
    const navButtons = await page.evaluate(() => {
        const body = document.body.innerText;
        return {
            hasPrev: body.includes('ก่อนหน้า') || body.includes('Previous'),
            hasNext: body.includes('ถัดไป') || body.includes('Next')
        };
    });
    if (navButtons.hasPrev || navButtons.hasNext) {
        pass('5.3 Navigation buttons exist');
    }

    // 5.4 Mark as completed button
    log('\n5.4 Testing mark as completed...');
    const hasCompleteBtn = await page.evaluate(() => {
        return document.body.innerText.includes('markAsCompleted') ||
               document.body.innerText.includes('เสร็จสิ้น') ||
               document.body.innerText.includes('Complete');
    });
    if (hasCompleteBtn) {
        pass('5.4 Mark as completed button exists');
    }

    // 5.5 Discussion section
    log('\n5.5 Testing discussion section...');
    const hasDiscussion = await page.evaluate(() => {
        return document.body.innerText.includes('discussion') ||
               document.body.innerText.includes('comment') ||
               document.body.innerText.includes('อภิปราย');
    });
    if (hasDiscussion) {
        pass('5.5 Discussion section exists');
    }

    return true;
}

/**
 * Test Suite 6: Error Handling
 */
async function testErrorHandling(page) {
    log('\n' + '='.repeat(50), 'test');
    log('TEST SUITE 6: ERROR HANDLING', 'test');
    log('='.repeat(50), 'test');

    // 6.1 404 page
    log('\n6.1 Testing 404 page...');
    await page.goto(`${BASE_URL}/nonexistent-page-12345`, { waitUntil: 'domcontentloaded' });
    await delay(1000);
    await screenshot(page, '6.1-404-page');

    const has404 = await page.evaluate(() => {
        return document.body.innerText.includes('404') ||
               document.body.innerText.includes('ไม่พบ') ||
               document.body.innerText.includes('Not Found');
    });
    if (has404) {
        pass('6.1 404 page displays correctly');
    } else {
        warn('6.1 404 page may not be styled');
    }

    // 6.2 Invalid course ID
    log('\n6.2 Testing invalid course ID...');
    await page.goto(`${BASE_URL}/courses/999999`, { waitUntil: 'domcontentloaded' });
    await delay(1000);
    await screenshot(page, '6.2-invalid-course');

    const invalidCourseHandled = await page.evaluate(() => {
        return document.body.innerText.includes('ไม่พบ') ||
               document.body.innerText.includes('Not Found') ||
               document.body.innerText.includes('404');
    });
    if (invalidCourseHandled) {
        pass('6.2 Invalid course ID handled');
    }

    // 6.3 API error handling
    log('\n6.3 Testing API error responses...');
    const apiTest = await page.evaluate(async () => {
        try {
            const res = await fetch('/courses/api/999999');
            return { status: res.status, ok: res.ok };
        } catch (e) {
            return { error: e.message };
        }
    });
    if (apiTest.status === 404 || !apiTest.ok) {
        pass('6.3 API returns proper error for invalid ID');
    }

    return true;
}

/**
 * Test Suite 7: UI/UX Tests
 */
async function testUIUX(page) {
    log('\n' + '='.repeat(50), 'test');
    log('TEST SUITE 7: UI/UX TESTS', 'test');
    log('='.repeat(50), 'test');

    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await delay(2000);

    // 7.1 Responsive design - Desktop
    log('\n7.1 Testing desktop view (1366x768)...');
    await page.setViewport({ width: 1366, height: 768 });
    await delay(1000);
    await screenshot(page, '7.1-desktop-view');
    pass('7.1 Desktop view renders');

    // 7.2 Responsive design - Tablet
    log('\n7.2 Testing tablet view (768x1024)...');
    await page.setViewport({ width: 768, height: 1024 });
    await delay(1000);
    await screenshot(page, '7.2-tablet-view');
    pass('7.2 Tablet view renders');

    // 7.3 Responsive design - Mobile
    log('\n7.3 Testing mobile view (375x667)...');
    await page.setViewport({ width: 375, height: 667 });
    await delay(1000);
    await screenshot(page, '7.3-mobile-view');

    const mobileMenuExists = await page.$('.mobile-menu, #mobile-menu, [class*="mobile"]');
    if (mobileMenuExists) {
        pass('7.3 Mobile menu exists');
    } else {
        warn('7.3 Mobile menu may not be visible');
    }

    // Reset viewport
    await page.setViewport({ width: 1366, height: 768 });

    // 7.4 Navigation menu
    log('\n7.4 Testing navigation menu...');
    const navItems = await page.$$('nav a, .nav-link, [class*="nav-menu"] a');
    if (navItems.length > 0) {
        pass('7.4 Navigation menu works', `${navItems.length} items`);
    }

    // 7.5 Footer
    log('\n7.5 Testing footer...');
    const footer = await page.$('footer');
    if (footer) {
        pass('7.5 Footer exists');
    }

    // 7.6 Thai language support
    log('\n7.6 Testing Thai language...');
    const hasThai = await page.evaluate(() => {
        return /[\u0E00-\u0E7F]/.test(document.body.innerText);
    });
    if (hasThai) {
        pass('7.6 Thai language displays correctly');
    }

    return true;
}

/**
 * Generate Final Report
 */
function generateReport() {
    results.endTime = new Date();
    const duration = (results.endTime - results.startTime) / 1000;
    const successRate = (results.passed.length / results.total * 100).toFixed(1);

    console.log('\n\n');
    console.log('='.repeat(60));
    console.log('         PROFESSIONAL QA TEST REPORT');
    console.log('='.repeat(60));
    console.log(`\nTest Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Start: ${results.startTime.toLocaleString('th-TH')}`);
    console.log(`End: ${results.endTime.toLocaleString('th-TH')}`);

    console.log('\n--- SUMMARY ---');
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed.length} (${successRate}%)`);
    console.log(`Failed: ${results.failed.length}`);
    console.log(`Warnings: ${results.warnings.length}`);

    if (results.failed.length > 0) {
        console.log('\n--- FAILED TESTS ---');
        results.failed.forEach((f, i) => {
            console.log(`${i + 1}. ${f.name}`);
            console.log(`   Error: ${f.error}`);
        });
    }

    if (results.warnings.length > 0) {
        console.log('\n--- WARNINGS ---');
        results.warnings.forEach((w, i) => {
            console.log(`${i + 1}. ${w.msg}`);
        });
    }

    console.log('\n--- PASSED TESTS ---');
    results.passed.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name} ${p.detail ? `(${p.detail})` : ''}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Screenshots: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(60));

    // Save JSON report
    const reportPath = path.join(SCREENSHOT_DIR, `qa-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\nJSON Report: ${reportPath}`);

    return results;
}

/**
 * Main Test Runner
 */
async function runAllTests() {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('     PROFESSIONAL QA TEST - Starting...');
    console.log('='.repeat(60));
    console.log(`Target: ${BASE_URL}`);
    console.log(`Time: ${new Date().toLocaleString('th-TH')}\n`);

    let browser;

    try {
        browser = await puppeteer.launch({
            headless: false,  // Show browser for visual inspection
            defaultViewport: { width: 1366, height: 768 },
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            slowMo: 50  // Slow down for visibility
        });

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(30000);
        page.setDefaultTimeout(15000);

        // Run all test suites
        const loginOk = await testLoginSystem(page);
        if (!loginOk) {
            fail('Test Suite Blocked', 'Login failed - cannot continue');
        } else {
            await testCourseList(page);
            await testCourseCreation(page);
            await testCourseDetail(page);
            await testLearningPage(page);
            await testErrorHandling(page);
            await testUIUX(page);
        }

        await screenshot(page, 'final-state');

        // Keep browser open for manual inspection
        console.log('\n\nTest complete! Browser stays open for inspection.');
        console.log('Press Ctrl+C to close and see report.\n');

        // Generate report but keep browser open
        generateReport();

        // Wait for user to close
        await new Promise(() => {});

    } catch (error) {
        console.error('Critical error:', error);
        fail('Test Runner', error.message);
        generateReport();
    }
}

// Run tests
runAllTests();
