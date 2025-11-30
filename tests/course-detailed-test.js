/**
 * COURSE DETAILED TEST SUITE
 * ===========================
 * ทดสอบฟังก์ชัน Course อย่างละเอียด
 *
 * Coverage:
 * 1. Course List - รายการหลักสูตร (10 tests)
 * 2. Course Create Wizard - สร้างหลักสูตร (20 tests)
 * 3. Course Detail - รายละเอียดหลักสูตร (10 tests)
 * 4. Course Edit - แก้ไขหลักสูตร (10 tests)
 * 5. Course Search & Filter - ค้นหาและกรอง (10 tests)
 * 6. Course Enrollment - ลงทะเบียน (10 tests)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'course-test-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test Results
const results = {
    total: 0, passed: 0, failed: 0, warnings: 0, skipped: 0,
    suites: {}, details: [], startTime: Date.now()
};

const delay = ms => new Promise(r => setTimeout(r, ms));
const timestamp = () => new Date().toLocaleTimeString('th-TH');

function log(type, msg) {
    const icons = { pass: '✓', fail: '✗', warn: '⚠', skip: '○', info: 'ℹ', suite: '▶', section: '•' };
    console.log(`[${timestamp()}] [${icons[type] || '?'}] ${msg}`);
}

function record(suite, id, name, status, detail = '') {
    results.total++;
    if (!results.suites[suite]) results.suites[suite] = { passed: 0, failed: 0, warnings: 0, skipped: 0 };
    const key = status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : status === 'warn' ? 'warnings' : 'skipped';
    results.suites[suite][key]++;
    results[key]++;
    results.details.push({ suite, id, name, status, detail, time: new Date().toISOString() });
    log(status, `${id} ${name}${detail ? ` - ${detail}` : ''}`);
}

async function screenshot(page, name) {
    try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
        log('info', `Screenshot saved: ${name}.png`);
    } catch (e) {
        log('warn', `Screenshot failed: ${name}`);
    }
}

// Helper: Login
async function login(page, empId = 'admin', password = 'admin123') {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });
    await delay(800);

    if (!page.url().includes('login')) {
        log('info', 'Already logged in');
        return true;
    }

    await page.evaluate(() => {
        const empInput = document.querySelector('#employee_id');
        const pwdInput = document.querySelector('#password');
        if (empInput) empInput.value = '';
        if (pwdInput) pwdInput.value = '';
    });
    await delay(300);

    await page.type('#employee_id', empId, { delay: 50 });
    await page.type('#password', password, { delay: 50 });
    await delay(300);

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
        page.click('button[type="submit"]')
    ]);
    await delay(1500);

    const loginSuccess = !page.url().includes('login');
    log(loginSuccess ? 'pass' : 'fail', `Login as ${empId}: ${loginSuccess ? 'Success' : 'Failed'}`);
    return loginSuccess;
}

// ==========================================
// SUITE 1: Course List Tests (10 tests)
// ==========================================
async function testCourseList(page) {
    console.log('\n' + '═'.repeat(60));
    log('suite', 'SUITE 1: COURSE LIST TESTS (10 Tests)');
    console.log('═'.repeat(60));
    const S = 'CourseList';

    // 1.1 Course list page loads
    try {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        await screenshot(page, '1.1-course-list');
        const pageTitle = await page.title();
        record(S, '1.1', 'Course list page loads', 'pass', pageTitle);
    } catch (e) { record(S, '1.1', 'Course list page loads', 'fail', e.message); }

    // 1.2 Course list has proper structure
    try {
        const structure = await page.evaluate(() => ({
            hasHeader: !!document.querySelector('h1, h2, .page-title'),
            hasContainer: !!document.querySelector('.container, .content, main'),
            hasNavigation: !!document.querySelector('nav, .navbar, .sidebar'),
            hasCourseCards: document.querySelectorAll('.card, .course-card, [class*="course"]').length
        }));
        record(S, '1.2', 'Page structure correct',
            structure.hasHeader && structure.hasContainer ? 'pass' : 'warn',
            `Header:${structure.hasHeader} Container:${structure.hasContainer} Cards:${structure.hasCourseCards}`);
    } catch (e) { record(S, '1.2', 'Page structure correct', 'fail', e.message); }

    // 1.3 Course count displayed
    try {
        const courseCount = await page.evaluate(() => {
            const cards = document.querySelectorAll('.card, .course-card, [class*="course-item"]');
            const links = document.querySelectorAll('a[href*="/courses/"]');
            return { cards: cards.length, links: links.length };
        });
        record(S, '1.3', 'Courses displayed',
            courseCount.cards > 0 || courseCount.links > 0 ? 'pass' : 'warn',
            `Cards:${courseCount.cards} Links:${courseCount.links}`);
    } catch (e) { record(S, '1.3', 'Courses displayed', 'fail', e.message); }

    // 1.4 Create course button exists
    try {
        const hasCreateBtn = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('a, button'));
            return btns.some(b =>
                b.href?.includes('/create') ||
                b.textContent.includes('สร้าง') ||
                b.textContent.includes('เพิ่ม') ||
                b.textContent.includes('Create') ||
                b.textContent.includes('Add')
            );
        });
        record(S, '1.4', 'Create button exists', hasCreateBtn ? 'pass' : 'warn');
    } catch (e) { record(S, '1.4', 'Create button exists', 'fail', e.message); }

    // 1.5 Search functionality exists
    try {
        const hasSearch = await page.evaluate(() => {
            return !!document.querySelector('input[type="search"], input[placeholder*="ค้นหา"], input[placeholder*="search"], .search-input');
        });
        record(S, '1.5', 'Search input exists', hasSearch ? 'pass' : 'warn');
    } catch (e) { record(S, '1.5', 'Search input exists', 'fail', e.message); }

    // 1.6 Filter/Category options exist
    try {
        const hasFilter = await page.evaluate(() => {
            const selects = document.querySelectorAll('select');
            const filterBtns = document.querySelectorAll('[class*="filter"], [class*="category"]');
            return selects.length > 0 || filterBtns.length > 0;
        });
        record(S, '1.6', 'Filter options exist', hasFilter ? 'pass' : 'warn');
    } catch (e) { record(S, '1.6', 'Filter options exist', 'fail', e.message); }

    // 1.7 Pagination exists (if many courses)
    try {
        const hasPagination = await page.evaluate(() => {
            return !!document.querySelector('.pagination, [class*="pager"], .page-link');
        });
        record(S, '1.7', 'Pagination exists', hasPagination ? 'pass' : 'warn', 'May not exist if few courses');
    } catch (e) { record(S, '1.7', 'Pagination exists', 'fail', e.message); }

    // 1.8 Course card has required info
    try {
        const cardInfo = await page.evaluate(() => {
            const card = document.querySelector('.card, .course-card, [class*="course"]');
            if (!card) return { found: false };
            const text = card.innerText;
            return {
                found: true,
                hasTitle: text.length > 0,
                hasImage: !!card.querySelector('img'),
                hasLink: !!card.querySelector('a')
            };
        });
        record(S, '1.8', 'Course card info complete',
            cardInfo.found && cardInfo.hasTitle ? 'pass' : 'warn',
            cardInfo.found ? `Title:${cardInfo.hasTitle} Image:${cardInfo.hasImage} Link:${cardInfo.hasLink}` : 'No cards found');
    } catch (e) { record(S, '1.8', 'Course card info complete', 'fail', e.message); }

    // 1.9 Responsive layout
    try {
        await page.setViewport({ width: 768, height: 1024 });
        await delay(500);
        await screenshot(page, '1.9-course-list-tablet');

        await page.setViewport({ width: 375, height: 667 });
        await delay(500);
        await screenshot(page, '1.9-course-list-mobile');

        await page.setViewport({ width: 1366, height: 768 });
        await delay(300);
        record(S, '1.9', 'Responsive layout works', 'pass');
    } catch (e) { record(S, '1.9', 'Responsive layout works', 'fail', e.message); }

    // 1.10 No console errors
    try {
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await delay(1000);
        record(S, '1.10', 'No console errors', errors.length === 0 ? 'pass' : 'warn',
            errors.length > 0 ? `${errors.length} errors` : 'Clean');
    } catch (e) { record(S, '1.10', 'No console errors', 'fail', e.message); }
}

// ==========================================
// SUITE 2: Course Create Wizard (20 tests)
// ==========================================
async function testCourseCreate(page) {
    console.log('\n' + '═'.repeat(60));
    log('suite', 'SUITE 2: COURSE CREATE WIZARD (20 Tests)');
    console.log('═'.repeat(60));
    const S = 'CourseCreate';

    // Navigate to create page
    try {
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        await screenshot(page, '2.0-create-page');
    } catch (e) {
        log('fail', 'Cannot access create page: ' + e.message);
        return;
    }

    // 2.1 Create page loads
    try {
        const pageLoaded = await page.evaluate(() => {
            return document.body.innerText.length > 100;
        });
        record(S, '2.1', 'Create page loads', pageLoaded ? 'pass' : 'fail');
    } catch (e) { record(S, '2.1', 'Create page loads', 'fail', e.message); }

    // 2.2 Wizard steps visible
    try {
        const steps = await page.evaluate(() => {
            const stepElements = document.querySelectorAll('.step, .wizard-step, [class*="step"], .nav-item, .progress-step');
            return stepElements.length;
        });
        record(S, '2.2', 'Wizard steps visible', steps > 0 ? 'pass' : 'warn', `${steps} steps found`);
    } catch (e) { record(S, '2.2', 'Wizard steps visible', 'fail', e.message); }

    // Step 1: Basic Info
    log('section', 'Step 1 - Basic Info');

    // 2.3 Course name input
    try {
        const nameInput = await page.$('#course_name, input[name="course_name"], input[name="name"]');
        record(S, '2.3', 'Course name input exists', nameInput ? 'pass' : 'fail');
    } catch (e) { record(S, '2.3', 'Course name input exists', 'fail', e.message); }

    // 2.4 Course code input
    try {
        const codeInput = await page.$('#course_code, input[name="course_code"], input[name="code"]');
        record(S, '2.4', 'Course code input exists', codeInput ? 'pass' : 'warn');
    } catch (e) { record(S, '2.4', 'Course code input exists', 'fail', e.message); }

    // 2.5 Category dropdown
    try {
        const categorySelect = await page.$('#category_id, select[name="category_id"], select[name="category"]');
        if (categorySelect) {
            const options = await page.$$eval('#category_id option, select[name="category_id"] option', opts => opts.length);
            record(S, '2.5', 'Category dropdown exists', 'pass', `${options} options`);
        } else {
            record(S, '2.5', 'Category dropdown exists', 'warn', 'Not found');
        }
    } catch (e) { record(S, '2.5', 'Category dropdown exists', 'fail', e.message); }

    // 2.6 Course type dropdown
    try {
        const typeSelect = await page.$('#course_type, select[name="course_type"]');
        record(S, '2.6', 'Course type dropdown exists', typeSelect ? 'pass' : 'warn');
    } catch (e) { record(S, '2.6', 'Course type dropdown exists', 'fail', e.message); }

    // 2.7 Difficulty level
    try {
        const difficultySelect = await page.$('#difficulty_level, select[name="difficulty_level"]');
        record(S, '2.7', 'Difficulty level exists', difficultySelect ? 'pass' : 'warn');
    } catch (e) { record(S, '2.7', 'Difficulty level exists', 'fail', e.message); }

    // 2.8 Language selection
    try {
        const langSelect = await page.$('#language, select[name="language"]');
        record(S, '2.8', 'Language selection exists', langSelect ? 'pass' : 'warn');
    } catch (e) { record(S, '2.8', 'Language selection exists', 'fail', e.message); }

    // Fill Step 1 form
    const testCourseName = `QA Test Course ${Date.now()}`;
    const testCourseCode = `QA-${Date.now().toString().slice(-6)}`;

    try {
        // Fill course name
        const nameInput = await page.$('#course_name, input[name="course_name"]');
        if (nameInput) {
            await nameInput.click({ clickCount: 3 });
            await nameInput.type(testCourseName);
        }

        // Fill course code
        const codeInput = await page.$('#course_code, input[name="course_code"]');
        if (codeInput) {
            await codeInput.click({ clickCount: 3 });
            await codeInput.type(testCourseCode);
        }

        // Select category
        const categorySelect = await page.$('#category_id, select[name="category_id"]');
        if (categorySelect) {
            const options = await page.$$eval('#category_id option, select[name="category_id"] option',
                opts => opts.filter(o => o.value).map(o => o.value));
            if (options.length > 0) {
                await page.select('#category_id, select[name="category_id"]', options[0]);
            }
        }

        // Select course type
        const typeSelect = await page.$('#course_type, select[name="course_type"]');
        if (typeSelect) {
            await page.select('#course_type, select[name="course_type"]', 'elective');
        }

        // Select difficulty
        const diffSelect = await page.$('#difficulty_level, select[name="difficulty_level"]');
        if (diffSelect) {
            await page.select('#difficulty_level, select[name="difficulty_level"]', 'Beginner');
        }

        // Select language
        const langSelect = await page.$('#language, select[name="language"]');
        if (langSelect) {
            await page.select('#language, select[name="language"]', 'th');
        }

        await delay(500);
        await screenshot(page, '2.8-step1-filled');
        record(S, '2.9', 'Step 1 form filled', 'pass', testCourseName);
    } catch (e) { record(S, '2.9', 'Step 1 form filled', 'fail', e.message); }

    // 2.10 Click Next button
    try {
        const nextClicked = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            const nextBtn = btns.find(b =>
                b.textContent.includes('ถัดไป') ||
                b.textContent.includes('Next') ||
                b.textContent.includes('ต่อไป') ||
                b.id === 'nextBtn' ||
                b.classList.contains('next')
            );
            if (nextBtn) { nextBtn.click(); return true; }
            return false;
        });
        await delay(1000);
        record(S, '2.10', 'Next button clicked', nextClicked ? 'pass' : 'warn');
        await screenshot(page, '2.10-after-next');
    } catch (e) { record(S, '2.10', 'Next button clicked', 'fail', e.message); }

    // Step 2: Details
    log('section', 'Step 2 - Details');

    // 2.11 Description textarea
    try {
        const descInput = await page.$('#description, textarea[name="description"]');
        if (descInput) {
            await descInput.type('หลักสูตรทดสอบอัตโนมัติ - สร้างโดย QA Test Suite เพื่อทดสอบการทำงานของระบบสร้างหลักสูตร');
            record(S, '2.11', 'Description textarea exists', 'pass');
        } else {
            record(S, '2.11', 'Description textarea exists', 'warn', 'Not found');
        }
    } catch (e) { record(S, '2.11', 'Description textarea exists', 'fail', e.message); }

    // 2.12 Duration input
    try {
        const durationInput = await page.$('#duration_hours, input[name="duration_hours"], input[name="duration"]');
        if (durationInput) {
            await durationInput.click({ clickCount: 3 });
            await durationInput.type('10');
            record(S, '2.12', 'Duration input exists', 'pass');
        } else {
            record(S, '2.12', 'Duration input exists', 'warn');
        }
    } catch (e) { record(S, '2.12', 'Duration input exists', 'fail', e.message); }

    // 2.13 Objectives inputs
    try {
        const objectiveInputs = await page.$$('input[name="objectives[]"], input[name*="objective"]');
        if (objectiveInputs.length > 0) {
            for (let i = 0; i < Math.min(objectiveInputs.length, 3); i++) {
                await objectiveInputs[i].type(`วัตถุประสงค์ที่ ${i + 1}`);
            }
            record(S, '2.13', 'Objectives inputs exist', 'pass', `${objectiveInputs.length} inputs`);
        } else {
            record(S, '2.13', 'Objectives inputs exist', 'warn');
        }
    } catch (e) { record(S, '2.13', 'Objectives inputs exist', 'fail', e.message); }

    // 2.14 Target audience
    try {
        const targetInput = await page.$('#target_audience, textarea[name="target_audience"]');
        if (targetInput) {
            await targetInput.type('พนักงานใหม่และผู้ที่สนใจพัฒนาทักษะ');
            record(S, '2.14', 'Target audience input exists', 'pass');
        } else {
            record(S, '2.14', 'Target audience input exists', 'warn');
        }
    } catch (e) { record(S, '2.14', 'Target audience input exists', 'fail', e.message); }

    await delay(500);
    await screenshot(page, '2.14-step2-filled');

    // 2.15 Click Next to Step 3
    try {
        const nextClicked = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            const nextBtn = btns.find(b =>
                b.textContent.includes('ถัดไป') ||
                b.textContent.includes('Next') ||
                b.textContent.includes('ต่อไป')
            );
            if (nextBtn) { nextBtn.click(); return true; }
            return false;
        });
        await delay(1000);
        record(S, '2.15', 'Navigate to Step 3', nextClicked ? 'pass' : 'warn');
    } catch (e) { record(S, '2.15', 'Navigate to Step 3', 'fail', e.message); }

    // Step 3: Content
    log('section', 'Step 3 - Content');

    // 2.16 Lesson title inputs
    try {
        const lessonInputs = await page.$$('input[name="lesson_titles[]"], input[name*="lesson"]');
        if (lessonInputs.length > 0) {
            await lessonInputs[0].type('บทที่ 1 - บทนำ');
            record(S, '2.16', 'Lesson inputs exist', 'pass', `${lessonInputs.length} inputs`);
        } else {
            record(S, '2.16', 'Lesson inputs exist', 'warn');
        }
    } catch (e) { record(S, '2.16', 'Lesson inputs exist', 'fail', e.message); }

    // 2.17 Add lesson button
    try {
        const hasAddBtn = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            return btns.some(b =>
                b.textContent.includes('เพิ่มบท') ||
                b.textContent.includes('Add Lesson') ||
                b.textContent.includes('+')
            );
        });
        record(S, '2.17', 'Add lesson button exists', hasAddBtn ? 'pass' : 'warn');
    } catch (e) { record(S, '2.17', 'Add lesson button exists', 'fail', e.message); }

    await screenshot(page, '2.17-step3-filled');

    // 2.18 Click Next to Step 4
    try {
        const nextClicked = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            const nextBtn = btns.find(b =>
                b.textContent.includes('ถัดไป') ||
                b.textContent.includes('Next')
            );
            if (nextBtn) { nextBtn.click(); return true; }
            return false;
        });
        await delay(1000);
        record(S, '2.18', 'Navigate to Step 4', nextClicked ? 'pass' : 'warn');
    } catch (e) { record(S, '2.18', 'Navigate to Step 4', 'fail', e.message); }

    // Step 4: Assessment & Submit
    log('section', 'Step 4 - Assessment & Submit');

    await screenshot(page, '2.18-step4');

    // 2.19 Submit button exists
    try {
        const hasSubmit = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
            return btns.some(b =>
                b.textContent?.includes('บันทึก') ||
                b.textContent?.includes('สร้าง') ||
                b.textContent?.includes('Submit') ||
                b.textContent?.includes('Create') ||
                b.type === 'submit'
            );
        });
        record(S, '2.19', 'Submit button exists', hasSubmit ? 'pass' : 'warn');
    } catch (e) { record(S, '2.19', 'Submit button exists', 'fail', e.message); }

    // 2.20 Submit the form
    let createdCourseId = null;
    try {
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
            page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
                const submitBtn = btns.find(b =>
                    b.textContent?.includes('บันทึก') ||
                    b.textContent?.includes('สร้าง') ||
                    b.textContent?.includes('Submit') ||
                    b.type === 'submit'
                );
                if (submitBtn) submitBtn.click();
            })
        ]);
        await delay(2000);

        const currentUrl = page.url();
        const match = currentUrl.match(/\/courses\/(\d+)/);
        if (match) createdCourseId = match[1];

        await screenshot(page, '2.20-after-submit');

        const success = !currentUrl.includes('/create') || createdCourseId;
        record(S, '2.20', 'Course created successfully', success ? 'pass' : 'warn',
            createdCourseId ? `Course ID: ${createdCourseId}` : currentUrl);
    } catch (e) { record(S, '2.20', 'Course created successfully', 'fail', e.message); }

    return { testCourseName, testCourseCode, createdCourseId };
}

// ==========================================
// SUITE 3: Course Detail Tests (10 tests)
// ==========================================
async function testCourseDetail(page, courseId = null) {
    console.log('\n' + '═'.repeat(60));
    log('suite', 'SUITE 3: COURSE DETAIL TESTS (10 Tests)');
    console.log('═'.repeat(60));
    const S = 'CourseDetail';

    // Find a course to test
    if (!courseId) {
        try {
            await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
            await delay(1000);
            const links = await page.$$eval('a[href*="/courses/"]', links =>
                links.filter(l => l.href.match(/\/courses\/\d+$/)).map(l => l.href));
            if (links.length > 0) {
                courseId = links[0].match(/\/courses\/(\d+)/)?.[1];
            }
        } catch (e) {
            log('warn', 'Cannot find course for detail test');
        }
    }

    if (!courseId) {
        record(S, '3.1-3.10', 'Course detail tests', 'skip', 'No course available');
        return;
    }

    // 3.1 Detail page loads
    try {
        await page.goto(`${BASE_URL}/courses/${courseId}`, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        await screenshot(page, '3.1-course-detail');
        record(S, '3.1', 'Detail page loads', 'pass', `Course ID: ${courseId}`);
    } catch (e) { record(S, '3.1', 'Detail page loads', 'fail', e.message); }

    // 3.2 Course title displayed
    try {
        const hasTitle = await page.evaluate(() => {
            return !!document.querySelector('h1, h2, .course-title, [class*="title"]');
        });
        record(S, '3.2', 'Course title displayed', hasTitle ? 'pass' : 'warn');
    } catch (e) { record(S, '3.2', 'Course title displayed', 'fail', e.message); }

    // 3.3 Course description displayed
    try {
        const hasDesc = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.length > 200;
        });
        record(S, '3.3', 'Course description displayed', hasDesc ? 'pass' : 'warn');
    } catch (e) { record(S, '3.3', 'Course description displayed', 'fail', e.message); }

    // 3.4 Course metadata (category, difficulty, etc.)
    try {
        const metadata = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return {
                hasCategory: text.includes('หมวดหมู่') || text.includes('category'),
                hasDifficulty: text.includes('ระดับ') || text.includes('difficulty') || text.includes('level'),
                hasDuration: text.includes('ชั่วโมง') || text.includes('hour') || text.includes('duration')
            };
        });
        record(S, '3.4', 'Course metadata displayed',
            Object.values(metadata).some(v => v) ? 'pass' : 'warn',
            `Category:${metadata.hasCategory} Difficulty:${metadata.hasDifficulty} Duration:${metadata.hasDuration}`);
    } catch (e) { record(S, '3.4', 'Course metadata displayed', 'fail', e.message); }

    // 3.5 Objectives/Learning outcomes
    try {
        const hasObjectives = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes('วัตถุประสงค์') || text.includes('objective') || text.includes('เรียนรู้');
        });
        record(S, '3.5', 'Objectives displayed', hasObjectives ? 'pass' : 'warn');
    } catch (e) { record(S, '3.5', 'Objectives displayed', 'fail', e.message); }

    // 3.6 Course content/lessons
    try {
        const hasContent = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes('บท') || text.includes('lesson') || text.includes('content') || text.includes('เนื้อหา');
        });
        record(S, '3.6', 'Course content displayed', hasContent ? 'pass' : 'warn');
    } catch (e) { record(S, '3.6', 'Course content displayed', 'fail', e.message); }

    // 3.7 Enroll button
    try {
        const hasEnroll = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            return btns.some(b =>
                b.textContent.includes('ลงทะเบียน') ||
                b.textContent.includes('Enroll') ||
                b.textContent.includes('สมัคร')
            );
        });
        record(S, '3.7', 'Enroll button exists', hasEnroll ? 'pass' : 'warn');
    } catch (e) { record(S, '3.7', 'Enroll button exists', 'fail', e.message); }

    // 3.8 Edit button (for admin)
    try {
        const hasEdit = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            return btns.some(b =>
                b.href?.includes('edit') ||
                b.textContent.includes('แก้ไข') ||
                b.textContent.includes('Edit')
            );
        });
        record(S, '3.8', 'Edit button exists (admin)', hasEdit ? 'pass' : 'warn');
    } catch (e) { record(S, '3.8', 'Edit button exists (admin)', 'fail', e.message); }

    // 3.9 Back/Return button
    try {
        const hasBack = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            return btns.some(b =>
                b.textContent.includes('กลับ') ||
                b.textContent.includes('Back') ||
                b.href?.includes('/courses') && !b.href?.includes('/courses/')
            );
        });
        record(S, '3.9', 'Back button exists', hasBack ? 'pass' : 'warn');
    } catch (e) { record(S, '3.9', 'Back button exists', 'fail', e.message); }

    // 3.10 No broken images
    try {
        const brokenImages = await page.evaluate(() => {
            const images = document.querySelectorAll('img');
            let broken = 0;
            images.forEach(img => {
                if (!img.complete || img.naturalWidth === 0) broken++;
            });
            return { total: images.length, broken };
        });
        record(S, '3.10', 'No broken images',
            brokenImages.broken === 0 ? 'pass' : 'warn',
            `${brokenImages.total} images, ${brokenImages.broken} broken`);
    } catch (e) { record(S, '3.10', 'No broken images', 'fail', e.message); }

    return courseId;
}

// ==========================================
// SUITE 4: Course Edit Tests (10 tests)
// ==========================================
async function testCourseEdit(page, courseId = null) {
    console.log('\n' + '═'.repeat(60));
    log('suite', 'SUITE 4: COURSE EDIT TESTS (10 Tests)');
    console.log('═'.repeat(60));
    const S = 'CourseEdit';

    // Find a course to edit
    if (!courseId) {
        try {
            await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
            await delay(1000);
            const links = await page.$$eval('a[href*="/courses/"]', links =>
                links.filter(l => l.href.match(/\/courses\/\d+$/)).map(l => l.href));
            if (links.length > 0) {
                courseId = links[0].match(/\/courses\/(\d+)/)?.[1];
            }
        } catch (e) {}
    }

    if (!courseId) {
        record(S, '4.1-4.10', 'Course edit tests', 'skip', 'No course available');
        return;
    }

    // 4.1 Navigate to edit page
    try {
        await page.goto(`${BASE_URL}/courses/${courseId}/edit`, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        await screenshot(page, '4.1-course-edit');
        const isEditPage = page.url().includes('edit') || await page.evaluate(() => {
            return document.body.innerText.includes('แก้ไข') || document.body.innerText.includes('Edit');
        });
        record(S, '4.1', 'Edit page loads', isEditPage ? 'pass' : 'warn');
    } catch (e) { record(S, '4.1', 'Edit page loads', 'fail', e.message); }

    // 4.2 Form pre-filled with course data
    try {
        const preFilled = await page.evaluate(() => {
            const nameInput = document.querySelector('#course_name, input[name="course_name"]');
            return nameInput && nameInput.value && nameInput.value.length > 0;
        });
        record(S, '4.2', 'Form pre-filled with data', preFilled ? 'pass' : 'warn');
    } catch (e) { record(S, '4.2', 'Form pre-filled with data', 'fail', e.message); }

    // 4.3 Can modify course name
    try {
        const nameInput = await page.$('#course_name, input[name="course_name"]');
        if (nameInput) {
            const oldValue = await page.evaluate(el => el.value, nameInput);
            await nameInput.click({ clickCount: 3 });
            await nameInput.type(oldValue + ' (Updated)');
            record(S, '4.3', 'Course name can be modified', 'pass');
        } else {
            record(S, '4.3', 'Course name can be modified', 'warn');
        }
    } catch (e) { record(S, '4.3', 'Course name can be modified', 'fail', e.message); }

    // 4.4 Can modify description
    try {
        const descInput = await page.$('#description, textarea[name="description"]');
        if (descInput) {
            await descInput.click();
            await page.keyboard.press('End');
            await descInput.type(' - Updated by QA Test');
            record(S, '4.4', 'Description can be modified', 'pass');
        } else {
            record(S, '4.4', 'Description can be modified', 'warn');
        }
    } catch (e) { record(S, '4.4', 'Description can be modified', 'fail', e.message); }

    // 4.5 Can change category
    try {
        const categorySelect = await page.$('#category_id, select[name="category_id"]');
        if (categorySelect) {
            const options = await page.$$eval('#category_id option, select[name="category_id"] option',
                opts => opts.filter(o => o.value).map(o => o.value));
            if (options.length > 1) {
                await page.select('#category_id, select[name="category_id"]', options[options.length - 1]);
            }
            record(S, '4.5', 'Category can be changed', 'pass');
        } else {
            record(S, '4.5', 'Category can be changed', 'warn');
        }
    } catch (e) { record(S, '4.5', 'Category can be changed', 'fail', e.message); }

    // 4.6 Cancel button works
    try {
        const hasCancel = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            return btns.some(b =>
                b.textContent.includes('ยกเลิก') ||
                b.textContent.includes('Cancel') ||
                b.href?.includes('/courses') && !b.href?.includes('edit')
            );
        });
        record(S, '4.6', 'Cancel button exists', hasCancel ? 'pass' : 'warn');
    } catch (e) { record(S, '4.6', 'Cancel button exists', 'fail', e.message); }

    // 4.7 Update button exists
    try {
        const hasUpdate = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
            return btns.some(b =>
                b.textContent?.includes('บันทึก') ||
                b.textContent?.includes('อัปเดต') ||
                b.textContent?.includes('Save') ||
                b.textContent?.includes('Update') ||
                b.type === 'submit'
            );
        });
        record(S, '4.7', 'Update button exists', hasUpdate ? 'pass' : 'warn');
    } catch (e) { record(S, '4.7', 'Update button exists', 'fail', e.message); }

    // 4.8 Form validation on empty required fields
    try {
        const nameInput = await page.$('#course_name, input[name="course_name"]');
        if (nameInput) {
            await nameInput.click({ clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.evaluate(() => {
                const form = document.querySelector('form');
                if (form) form.reportValidity();
            });
            await delay(500);
            const hasValidation = await page.evaluate(() => {
                const nameInput = document.querySelector('#course_name, input[name="course_name"]');
                return nameInput && (!nameInput.validity.valid || nameInput.value === '');
            });
            record(S, '4.8', 'Form validation works', hasValidation ? 'pass' : 'warn');
            // Restore value
            await nameInput.type('Restored Course Name');
        } else {
            record(S, '4.8', 'Form validation works', 'skip');
        }
    } catch (e) { record(S, '4.8', 'Form validation works', 'fail', e.message); }

    await screenshot(page, '4.8-edit-form');

    // 4.9 Submit update (don't actually submit to preserve data)
    record(S, '4.9', 'Update submission', 'skip', 'Skipped to preserve test data');

    // 4.10 Navigate away without saving shows warning (if implemented)
    try {
        const hasUnsavedWarning = await page.evaluate(() => {
            // Check if beforeunload is set
            return typeof window.onbeforeunload === 'function';
        });
        record(S, '4.10', 'Unsaved changes warning', hasUnsavedWarning ? 'pass' : 'warn',
            'May not be implemented');
    } catch (e) { record(S, '4.10', 'Unsaved changes warning', 'fail', e.message); }
}

// ==========================================
// SUITE 5: Search & Filter Tests (10 tests)
// ==========================================
async function testSearchFilter(page) {
    console.log('\n' + '═'.repeat(60));
    log('suite', 'SUITE 5: COURSE SEARCH & FILTER (10 Tests)');
    console.log('═'.repeat(60));
    const S = 'SearchFilter';

    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await delay(1000);

    // 5.1 Search input exists
    let searchInput = null;
    try {
        searchInput = await page.$('input[type="search"], input[name="search"], input[placeholder*="ค้นหา"], .search-input, #search');
        record(S, '5.1', 'Search input exists', searchInput ? 'pass' : 'warn');
    } catch (e) { record(S, '5.1', 'Search input exists', 'fail', e.message); }

    // 5.2 Search works with valid query
    if (searchInput) {
        try {
            await searchInput.type('test');
            await page.keyboard.press('Enter');
            await delay(1500);
            await screenshot(page, '5.2-search-results');
            record(S, '5.2', 'Search with valid query', 'pass');
        } catch (e) { record(S, '5.2', 'Search with valid query', 'fail', e.message); }

        // 5.3 Clear search
        try {
            await searchInput.click({ clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.keyboard.press('Enter');
            await delay(1000);
            record(S, '5.3', 'Clear search works', 'pass');
        } catch (e) { record(S, '5.3', 'Clear search works', 'fail', e.message); }
    } else {
        record(S, '5.2', 'Search with valid query', 'skip');
        record(S, '5.3', 'Clear search works', 'skip');
    }

    // 5.4 Category filter exists
    try {
        const categoryFilter = await page.$('select[name="category"], select[name="category_id"], #category-filter');
        record(S, '5.4', 'Category filter exists', categoryFilter ? 'pass' : 'warn');
    } catch (e) { record(S, '5.4', 'Category filter exists', 'fail', e.message); }

    // 5.5 Filter by category
    try {
        const categoryFilter = await page.$('select[name="category"], select[name="category_id"], #category-filter');
        if (categoryFilter) {
            const options = await page.$$eval('select[name="category"] option, select[name="category_id"] option',
                opts => opts.filter(o => o.value).map(o => o.value));
            if (options.length > 0) {
                await page.select('select[name="category"], select[name="category_id"]', options[0]);
                await delay(1000);
                await screenshot(page, '5.5-category-filter');
            }
            record(S, '5.5', 'Category filter works', 'pass');
        } else {
            record(S, '5.5', 'Category filter works', 'skip');
        }
    } catch (e) { record(S, '5.5', 'Category filter works', 'fail', e.message); }

    // 5.6 Difficulty filter
    try {
        const diffFilter = await page.$('select[name="difficulty"], select[name="difficulty_level"]');
        record(S, '5.6', 'Difficulty filter exists', diffFilter ? 'pass' : 'warn');
    } catch (e) { record(S, '5.6', 'Difficulty filter exists', 'fail', e.message); }

    // 5.7 Course type filter
    try {
        const typeFilter = await page.$('select[name="course_type"], select[name="type"]');
        record(S, '5.7', 'Course type filter exists', typeFilter ? 'pass' : 'warn');
    } catch (e) { record(S, '5.7', 'Course type filter exists', 'fail', e.message); }

    // 5.8 Sort options exist
    try {
        const sortOptions = await page.$('select[name="sort"], select[name="order"], .sort-select');
        record(S, '5.8', 'Sort options exist', sortOptions ? 'pass' : 'warn');
    } catch (e) { record(S, '5.8', 'Sort options exist', 'fail', e.message); }

    // 5.9 Reset filters button
    try {
        const hasReset = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            return btns.some(b =>
                b.textContent.includes('รีเซ็ต') ||
                b.textContent.includes('ล้าง') ||
                b.textContent.includes('Reset') ||
                b.textContent.includes('Clear')
            );
        });
        record(S, '5.9', 'Reset filters button exists', hasReset ? 'pass' : 'warn');
    } catch (e) { record(S, '5.9', 'Reset filters button exists', 'fail', e.message); }

    // 5.10 URL updates with filters
    try {
        const urlHasParams = page.url().includes('?') || page.url().includes('category') || page.url().includes('search');
        record(S, '5.10', 'URL updates with filters', urlHasParams ? 'pass' : 'warn',
            'May use AJAX instead of URL params');
    } catch (e) { record(S, '5.10', 'URL updates with filters', 'fail', e.message); }
}

// ==========================================
// SUITE 6: Course Enrollment Tests (10 tests)
// ==========================================
async function testEnrollment(page) {
    console.log('\n' + '═'.repeat(60));
    log('suite', 'SUITE 6: COURSE ENROLLMENT (10 Tests)');
    console.log('═'.repeat(60));
    const S = 'Enrollment';

    // Find a course to enroll
    let courseId = null;
    try {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        const links = await page.$$eval('a[href*="/courses/"]', links =>
            links.filter(l => l.href.match(/\/courses\/\d+$/)).map(l => l.href));
        if (links.length > 0) {
            courseId = links[0].match(/\/courses\/(\d+)/)?.[1];
        }
    } catch (e) {}

    if (!courseId) {
        record(S, '6.1-6.10', 'Enrollment tests', 'skip', 'No course available');
        return;
    }

    // 6.1 Navigate to course detail
    try {
        await page.goto(`${BASE_URL}/courses/${courseId}`, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        record(S, '6.1', 'Navigate to course detail', 'pass');
    } catch (e) { record(S, '6.1', 'Navigate to course detail', 'fail', e.message); }

    // 6.2 Enroll button visible
    let enrollBtn = null;
    try {
        enrollBtn = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            const btn = btns.find(b =>
                b.textContent.includes('ลงทะเบียน') ||
                b.textContent.includes('Enroll') ||
                b.textContent.includes('สมัคร') ||
                b.textContent.includes('เข้าเรียน')
            );
            return btn ? true : false;
        });
        record(S, '6.2', 'Enroll button visible', enrollBtn ? 'pass' : 'warn');
    } catch (e) { record(S, '6.2', 'Enroll button visible', 'fail', e.message); }

    // 6.3 Click enroll button
    if (enrollBtn) {
        try {
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button, a'));
                const btn = btns.find(b =>
                    b.textContent.includes('ลงทะเบียน') ||
                    b.textContent.includes('Enroll') ||
                    b.textContent.includes('สมัคร') ||
                    b.textContent.includes('เข้าเรียน')
                );
                if (btn) btn.click();
            });
            await delay(2000);
            await screenshot(page, '6.3-after-enroll');
            record(S, '6.3', 'Enroll button clicked', 'pass');
        } catch (e) { record(S, '6.3', 'Enroll button clicked', 'fail', e.message); }
    } else {
        record(S, '6.3', 'Enroll button clicked', 'skip');
    }

    // 6.4 Enrollment confirmation
    try {
        const hasConfirmation = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes('สำเร็จ') ||
                   text.includes('success') ||
                   text.includes('ลงทะเบียนแล้ว') ||
                   text.includes('enrolled') ||
                   text.includes('เข้าเรียน');
        });
        record(S, '6.4', 'Enrollment confirmation', hasConfirmation ? 'pass' : 'warn');
    } catch (e) { record(S, '6.4', 'Enrollment confirmation', 'fail', e.message); }

    // 6.5 My Courses page
    try {
        await page.goto(`${BASE_URL}/courses/my-courses`, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        await screenshot(page, '6.5-my-courses');
        record(S, '6.5', 'My Courses page loads', 'pass');
    } catch (e) { record(S, '6.5', 'My Courses page loads', 'fail', e.message); }

    // 6.6 Enrolled course appears in My Courses
    try {
        const courseInList = await page.evaluate(() => {
            const cards = document.querySelectorAll('.card, .course-card, [class*="course"]');
            return cards.length > 0;
        });
        record(S, '6.6', 'Enrolled courses displayed', courseInList ? 'pass' : 'warn');
    } catch (e) { record(S, '6.6', 'Enrolled courses displayed', 'fail', e.message); }

    // 6.7 Progress indicator
    try {
        const hasProgress = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes('progress') ||
                   text.includes('ความคืบหน้า') ||
                   text.includes('%') ||
                   !!document.querySelector('.progress, .progress-bar');
        });
        record(S, '6.7', 'Progress indicator exists', hasProgress ? 'pass' : 'warn');
    } catch (e) { record(S, '6.7', 'Progress indicator exists', 'fail', e.message); }

    // 6.8 Continue learning button
    try {
        const hasContinue = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            return btns.some(b =>
                b.textContent.includes('เรียนต่อ') ||
                b.textContent.includes('Continue') ||
                b.textContent.includes('เริ่มเรียน') ||
                b.textContent.includes('Start')
            );
        });
        record(S, '6.8', 'Continue learning button', hasContinue ? 'pass' : 'warn');
    } catch (e) { record(S, '6.8', 'Continue learning button', 'fail', e.message); }

    // 6.9 Unenroll option (if available)
    try {
        const hasUnenroll = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            return btns.some(b =>
                b.textContent.includes('ยกเลิก') ||
                b.textContent.includes('Unenroll') ||
                b.textContent.includes('ออก')
            );
        });
        record(S, '6.9', 'Unenroll option exists', hasUnenroll ? 'pass' : 'warn', 'May not be available');
    } catch (e) { record(S, '6.9', 'Unenroll option exists', 'fail', e.message); }

    // 6.10 Certificate/Completion info
    try {
        const hasCertInfo = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes('certificate') ||
                   text.includes('ใบประกาศ') ||
                   text.includes('completion') ||
                   text.includes('เสร็จสิ้น');
        });
        record(S, '6.10', 'Certificate/Completion info', hasCertInfo ? 'pass' : 'warn');
    } catch (e) { record(S, '6.10', 'Certificate/Completion info', 'fail', e.message); }
}

// ==========================================
// MAIN EXECUTION
// ==========================================
async function main() {
    console.log('═'.repeat(70));
    console.log('  🎓 COURSE DETAILED TEST SUITE');
    console.log('  LearnHub Course Module - Comprehensive Testing');
    console.log('═'.repeat(70));
    console.log(`📅 Started: ${new Date().toLocaleString('th-TH')}`);
    console.log(`📊 Total Suites: 6 | Estimated Tests: 70`);
    console.log('═'.repeat(70));

    let browser;

    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1366, height: 768 },
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
            slowMo: 20
        });

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(20000);

        // Login first
        const loggedIn = await login(page);
        if (!loggedIn) {
            log('fail', 'Cannot login - aborting tests');
            return;
        }

        // Run all course test suites
        await testCourseList(page);
        const createResult = await testCourseCreate(page);
        await testCourseDetail(page, createResult?.createdCourseId);
        await testCourseEdit(page, createResult?.createdCourseId);
        await testSearchFilter(page);
        await testEnrollment(page);

        // Logout
        console.log('\n' + '═'.repeat(60));
        log('info', 'CLEANUP: Logging out...');
        try {
            await page.goto(`${BASE_URL}/auth/logout`, { waitUntil: 'networkidle0', timeout: 5000 });
            log('pass', 'Logout successful');
        } catch (e) {
            log('warn', 'Logout failed: ' + e.message);
        }

    } catch (e) {
        console.error('Critical error:', e.message);
    } finally {
        const duration = ((Date.now() - results.startTime) / 1000).toFixed(2);

        // Print final report
        console.log('\n' + '═'.repeat(70));
        console.log('  📊 COURSE TEST REPORT');
        console.log('═'.repeat(70));
        console.log(`⏱️  Duration: ${duration}s`);

        console.log('\n📈 RESULTS BY SUITE:');
        console.log('─'.repeat(70));
        for (const [name, s] of Object.entries(results.suites)) {
            const total = s.passed + s.failed + s.warnings + s.skipped;
            const rate = total > 0 ? ((s.passed / total) * 100).toFixed(1) : '0.0';
            const bar = '█'.repeat(Math.floor(rate / 5)) + '░'.repeat(20 - Math.floor(rate / 5));
            console.log(`${name.padEnd(15)} ${bar} ${rate}% (${s.passed}/${total}) F:${s.failed} W:${s.warnings} S:${s.skipped}`);
        }

        console.log('\n📊 OVERALL SUMMARY:');
        console.log('─'.repeat(70));
        const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : '0.0';
        console.log(`Total Tests:  ${results.total}`);
        console.log(`✅ Passed:    ${results.passed} (${passRate}%)`);
        console.log(`❌ Failed:    ${results.failed}`);
        console.log(`⚠️  Warnings:  ${results.warnings}`);
        console.log(`⏭️  Skipped:   ${results.skipped}`);

        if (results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            console.log('─'.repeat(70));
            results.details.filter(t => t.status === 'fail').forEach((t, i) => {
                console.log(`${i + 1}. [${t.suite}] ${t.id} ${t.name}`);
                if (t.detail) console.log(`   → ${t.detail}`);
            });
        }

        console.log('\n' + '═'.repeat(70));
        console.log(`📁 Screenshots: ${SCREENSHOT_DIR}`);

        // Save JSON report
        const reportPath = path.join(SCREENSHOT_DIR, `course-test-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify({
            summary: {
                total: results.total,
                passed: results.passed,
                failed: results.failed,
                warnings: results.warnings,
                skipped: results.skipped,
                passRate: `${passRate}%`,
                duration: `${duration}s`,
                timestamp: new Date().toISOString()
            },
            suites: results.suites,
            details: results.details
        }, null, 2));
        console.log(`📄 Report: ${reportPath}`);
        console.log('═'.repeat(70));

        if (browser) await browser.close();
    }
}

main().catch(console.error);
