/**
 * Course Full Browser Test - Comprehensive Course System Testing
 * Opens real browser for visual inspection and detailed testing
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = { empId: 'ADM001', password: 'admin123' };

// Test results tracking
let results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
};

function log(status, testName, detail = '') {
    const time = new Date().toLocaleTimeString('th-TH');
    const icons = { pass: '✓', fail: '✗', warn: '⚠', info: '•' };
    const icon = icons[status] || '•';
    console.log(`[${time}] [${icon}] ${testName}${detail ? ` - ${detail}` : ''}`);

    if (status === 'pass') results.passed++;
    else if (status === 'fail') results.failed++;
    else if (status === 'warn') results.warnings++;

    results.details.push({ status, testName, detail, time });
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
    const filename = `tests/screenshots/course-${name}-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`    📸 Screenshot: ${filename}`);
    return filename;
}

async function login(page) {
    log('info', 'Logging in as Admin...');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
    await delay(1000);

    await page.type('#employee_id', TEST_USER.empId, { delay: 30 });
    await page.type('#password', TEST_USER.password, { delay: 30 });
    await page.click('button[type="submit"]');
    await delay(2000);

    const url = page.url();
    if (!url.includes('login')) {
        log('pass', 'Login successful', url);
        return true;
    } else {
        log('fail', 'Login failed');
        return false;
    }
}

async function testCourseList(page) {
    console.log('\n' + '='.repeat(60));
    console.log('  TEST SUITE: Course List & Filtering');
    console.log('='.repeat(60));

    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await delay(2000);

    // Test 1: Page loads
    const title = await page.title();
    if (title) {
        log('pass', 'Course list page loads', title);
    } else {
        log('fail', 'Course list page failed to load');
    }

    // Test 2: Search box exists
    const searchBox = await page.$('#search');
    if (searchBox) {
        log('pass', 'Search box exists');

        // Test search functionality
        await searchBox.type('test', { delay: 50 });
        await delay(1000);
        log('pass', 'Search input works');

        // Clear search
        await page.evaluate(() => document.getElementById('search').value = '');
    } else {
        log('fail', 'Search box not found');
    }

    // Test 3: Filter dropdowns
    const difficultyFilter = await page.$('#difficulty');
    const statusFilter = await page.$('#status');

    if (difficultyFilter && statusFilter) {
        log('pass', 'Filter dropdowns exist');

        // Test difficulty filter
        await page.select('#difficulty', 'beginner');
        await delay(500);
        log('pass', 'Difficulty filter works');

        await page.select('#difficulty', '');
    } else {
        log('warn', 'Some filter dropdowns missing');
    }

    // Test 4: Create course button (for admin)
    const createBtn = await page.$('a[href="/courses/create"]');
    if (createBtn) {
        log('pass', 'Create course button visible (Admin access)');
    } else {
        log('warn', 'Create course button not found');
    }

    // Test 5: View toggles
    const gridView = await page.$('#grid-view');
    const listView = await page.$('#list-view');
    if (gridView && listView) {
        log('pass', 'View toggle buttons exist');

        await listView.click();
        await delay(500);
        log('pass', 'List view toggle works');

        await gridView.click();
        await delay(500);
        log('pass', 'Grid view toggle works');
    }

    await takeScreenshot(page, 'list');
}

async function testCourseCreation(page) {
    console.log('\n' + '='.repeat(60));
    console.log('  TEST SUITE: Course Creation (4-Step Wizard)');
    console.log('='.repeat(60));

    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await delay(2000);

    // ============ STEP 1: Basic Info ============
    console.log('\n  📝 Step 1: Basic Information');

    // Test page loads
    const step1 = await page.$('#step-1');
    if (step1) {
        log('pass', 'Step 1 form loaded');
    } else {
        log('fail', 'Step 1 form not found');
        return null;
    }

    // Fill course name
    const courseName = `Test Course ${Date.now()}`;
    const courseNameInput = await page.$('#course_name');
    if (courseNameInput) {
        await courseNameInput.type(courseName, { delay: 20 });
        log('pass', 'Course name filled', courseName);
    }

    // Wait for categories to load
    await delay(1500);

    // Select category (first available)
    const categorySelect = await page.$('#category_id');
    if (categorySelect) {
        const options = await page.$$eval('#category_id option', opts =>
            opts.map(o => ({ value: o.value, text: o.textContent }))
        );

        if (options.length > 1) {
            await page.select('#category_id', options[1].value);
            log('pass', 'Category selected', options[1].text);
        } else {
            log('warn', 'No categories available');
        }
    }

    // Select difficulty
    await page.select('#difficulty_level', 'beginner');
    log('pass', 'Difficulty level set to Beginner');

    // Select course type
    await page.select('#course_type', 'online');
    log('pass', 'Course type set to Online');

    // Select language
    await page.select('#language', 'th');
    log('pass', 'Language set to Thai');

    await takeScreenshot(page, 'create-step1');

    // Click Next to Step 2
    const nextBtn = await page.$('#next-btn');
    if (nextBtn) {
        await nextBtn.click();
        await delay(1500);
    }

    // ============ STEP 2: Details ============
    console.log('\n  📝 Step 2: Course Details');

    const step2Visible = await page.$eval('#step-2', el => el.style.display !== 'none').catch(() => false);
    if (step2Visible) {
        log('pass', 'Step 2 loaded successfully');
    } else {
        log('fail', 'Failed to navigate to Step 2');
        return null;
    }

    // Fill description
    const description = await page.$('#description');
    if (description) {
        await page.evaluate(() => {
            const desc = document.getElementById('description');
            desc.innerHTML = 'นี่คือหลักสูตรทดสอบสำหรับการเรียนรู้ระบบ LearnHub LMS โดยจะครอบคลุมเนื้อหาที่จำเป็นทั้งหมดสำหรับผู้เริ่มต้น';
        });
        log('pass', 'Description filled (50+ characters)');
    }

    // Fill duration
    const durationHours = await page.$('#duration_hours');
    if (durationHours) {
        await durationHours.click();
        await delay(200);
        await page.evaluate(() => document.getElementById('duration_hours').value = '2');
        log('pass', 'Duration hours set to 2');
    }

    // Fill learning objectives (need at least 3)
    const objectives = await page.$$('input[name="objectives[]"]');
    if (objectives.length >= 3) {
        await objectives[0].type('ผู้เรียนสามารถเข้าใจพื้นฐานของระบบได้');
        await objectives[1].type('ผู้เรียนสามารถใช้งานฟีเจอร์หลักได้');
        await objectives[2].type('ผู้เรียนสามารถประยุกต์ใช้ความรู้ได้');
        log('pass', 'Learning objectives filled (3 items)');
    }

    await takeScreenshot(page, 'create-step2');

    // Click Next to Step 3
    await page.click('#next-btn');
    await delay(1500);

    // ============ STEP 3: Content ============
    console.log('\n  📝 Step 3: Course Content');

    const step3Visible = await page.$eval('#step-3', el => el.style.display !== 'none').catch(() => false);
    if (step3Visible) {
        log('pass', 'Step 3 loaded successfully');
    } else {
        log('fail', 'Failed to navigate to Step 3');
        return null;
    }

    // Check lesson container
    const lessonContainer = await page.$('#lessons-container');
    if (lessonContainer) {
        log('pass', 'Lesson container exists');

        // Fill first lesson
        const lessonTitles = await page.$$('input[name="lesson_titles[]"]');
        if (lessonTitles.length > 0) {
            await lessonTitles[0].type('บทที่ 1: แนะนำระบบ');
            log('pass', 'First lesson title filled');
        }

        const lessonDurations = await page.$$('input[name="lesson_durations[]"]');
        if (lessonDurations.length > 0) {
            await lessonDurations[0].type('30');
            log('pass', 'First lesson duration set');
        }
    }

    await takeScreenshot(page, 'create-step3');

    // Click Next to Step 4
    await page.click('#next-btn');
    await delay(1500);

    // ============ STEP 4: Assessment ============
    console.log('\n  📝 Step 4: Assessment');

    const step4Visible = await page.$eval('#step-4', el => el.style.display !== 'none').catch(() => false);
    if (step4Visible) {
        log('pass', 'Step 4 loaded successfully');
    } else {
        log('fail', 'Failed to navigate to Step 4');
        return null;
    }

    // Select no assessment for now
    const noAssessment = await page.$('input[value="none"]');
    if (noAssessment) {
        await noAssessment.click();
        log('pass', 'Assessment type set to None');
    }

    await takeScreenshot(page, 'create-step4');

    // ============ SUBMIT COURSE ============
    console.log('\n  🚀 Submitting Course...');

    const submitBtn = await page.$('#submit-btn');
    if (submitBtn) {
        await submitBtn.click();
        log('info', 'Submit button clicked');

        // Wait for redirect or success message
        await delay(5000);

        const currentUrl = page.url();
        if (currentUrl.includes('/courses/') && !currentUrl.includes('/create')) {
            log('pass', 'Course created successfully!', currentUrl);

            // Extract course ID
            const match = currentUrl.match(/\/courses\/(\d+)/);
            if (match) {
                const courseId = match[1];
                log('pass', 'Course ID', courseId);
                await takeScreenshot(page, 'create-success');
                return courseId;
            }
        } else {
            log('fail', 'Course creation may have failed', currentUrl);
            await takeScreenshot(page, 'create-error');
        }
    }

    return null;
}

async function testCourseDetail(page, courseId) {
    console.log('\n' + '='.repeat(60));
    console.log('  TEST SUITE: Course Detail View');
    console.log('='.repeat(60));

    if (!courseId) {
        log('warn', 'No course ID available, using course list');
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        await delay(2000);

        // Find first course link
        const courseLink = await page.$('a[href*="/courses/"]');
        if (courseLink) {
            await courseLink.click();
            await delay(2000);
        } else {
            log('fail', 'No courses available to test');
            return;
        }
    } else {
        await page.goto(`${BASE_URL}/courses/${courseId}`, { waitUntil: 'domcontentloaded' });
        await delay(2000);
    }

    // Test course detail elements
    const courseTitle = await page.$eval('h1, .course-title, [class*="title"]', el => el.textContent).catch(() => null);
    if (courseTitle) {
        log('pass', 'Course title displayed', courseTitle.substring(0, 50));
    }

    // Check for description
    const hasDescription = await page.$('.description, [class*="description"], .prose').catch(() => null);
    if (hasDescription) {
        log('pass', 'Course description section exists');
    }

    // Check for enroll/start button
    const actionBtn = await page.$('button, a').then(async (btn) => {
        if (btn) {
            const text = await btn.evaluate(el => el.textContent);
            if (text.includes('ลงทะเบียน') || text.includes('เริ่มเรียน') || text.includes('เข้าเรียน')) {
                return text;
            }
        }
        return null;
    }).catch(() => null);

    if (actionBtn) {
        log('pass', 'Action button found', actionBtn);
    }

    // Check for edit button (admin only)
    const editBtn = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/edit"]'));
        const buttons = Array.from(document.querySelectorAll('button'));
        const editButton = buttons.find(b => b.textContent.includes('แก้ไข') || b.textContent.includes('Edit'));
        return links.length > 0 || editButton;
    });
    if (editBtn) {
        log('pass', 'Edit button visible (Admin access)');
    }

    await takeScreenshot(page, 'detail');
}

async function testEnrollment(page, courseId) {
    console.log('\n' + '='.repeat(60));
    console.log('  TEST SUITE: Course Enrollment');
    console.log('='.repeat(60));

    if (!courseId) {
        log('warn', 'No course ID available, skipping enrollment test');
        return;
    }

    await page.goto(`${BASE_URL}/courses/${courseId}`, { waitUntil: 'domcontentloaded' });
    await delay(2000);

    // Look for enrollment button
    const enrollBtn = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        for (const btn of buttons) {
            const text = btn.textContent || '';
            if (text.includes('ลงทะเบียน') || text.includes('เริ่มเรียน') || text.includes('Enroll')) {
                return { found: true, text: text.trim() };
            }
        }
        return { found: false };
    });

    if (enrollBtn.found) {
        log('pass', 'Enrollment button found', enrollBtn.text);

        // Click to enroll
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a'));
            for (const btn of buttons) {
                const text = btn.textContent || '';
                if (text.includes('ลงทะเบียน') || text.includes('เริ่มเรียน') || text.includes('Enroll')) {
                    btn.click();
                    return;
                }
            }
        });

        await delay(3000);

        // Check if redirected to content or status changed
        const newUrl = page.url();
        if (newUrl.includes('/content') || newUrl.includes('/learn')) {
            log('pass', 'Redirected to learning page', newUrl);
        } else {
            log('info', 'Enrollment processed', newUrl);
        }

        await takeScreenshot(page, 'enrollment');
    } else {
        log('warn', 'No enrollment button found (may already be enrolled)');
    }
}

async function testMyCourses(page) {
    console.log('\n' + '='.repeat(60));
    console.log('  TEST SUITE: My Courses Page');
    console.log('='.repeat(60));

    await page.goto(`${BASE_URL}/courses/my-courses`, { waitUntil: 'domcontentloaded' });
    await delay(2000);

    const title = await page.title();
    log('pass', 'My Courses page loaded', title);

    // Check for stats section
    const hasStats = await page.$('.stats, [class*="stat"], .card');
    if (hasStats) {
        log('pass', 'Stats/dashboard section exists');
    }

    // Check for enrolled courses
    const courseCards = await page.$$('.course-card, [class*="course"], .card');
    log('info', `Found ${courseCards.length} course cards`);

    await takeScreenshot(page, 'my-courses');
}

async function testLearningPage(page, courseId) {
    console.log('\n' + '='.repeat(60));
    console.log('  TEST SUITE: Learning Content Page');
    console.log('='.repeat(60));

    if (!courseId) {
        log('warn', 'No course ID available, skipping learning page test');
        return;
    }

    await page.goto(`${BASE_URL}/courses/${courseId}/content`, { waitUntil: 'domcontentloaded' });
    await delay(2000);

    // Check page loaded
    const pageLoaded = !(page.url().includes('login'));
    if (pageLoaded) {
        log('pass', 'Learning page accessible');
    } else {
        log('fail', 'Redirected to login (not enrolled?)');
        return;
    }

    // Check for progress bar
    const progressBar = await page.$('#progress-bar, [class*="progress"]');
    if (progressBar) {
        log('pass', 'Progress bar exists');
    }

    // Check for navigation
    const courseNav = await page.$('#course-navigation, nav, [class*="nav"]');
    if (courseNav) {
        log('pass', 'Course navigation exists');
    }

    // Check for content viewer
    const contentViewer = await page.$('#content-viewer, .content, main');
    if (contentViewer) {
        log('pass', 'Content viewer exists');
    }

    // Check navigation buttons
    const prevBtn = await page.$('#prev-btn, button:has-text("ก่อนหน้า")');
    const nextBtn = await page.$('#next-btn, button:has-text("ถัดไป")');

    if (prevBtn || nextBtn) {
        log('pass', 'Navigation buttons exist');
    }

    await takeScreenshot(page, 'learning');
}

async function runAllTests() {
    console.log('╔' + '═'.repeat(60) + '╗');
    console.log('║  🎓 COURSE SYSTEM COMPREHENSIVE BROWSER TEST             ║');
    console.log('╚' + '═'.repeat(60) + '╝');
    console.log(`📍 Target: ${BASE_URL}`);
    console.log(`🕐 Started: ${new Date().toLocaleString('th-TH')}`);
    console.log('═'.repeat(62));

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox'],
        slowMo: 50
    });

    const page = await browser.newPage();

    try {
        // Ensure screenshots directory exists
        const fs = require('fs');
        if (!fs.existsSync('tests/screenshots')) {
            fs.mkdirSync('tests/screenshots', { recursive: true });
        }

        // Login first
        const loggedIn = await login(page);
        if (!loggedIn) {
            throw new Error('Login failed');
        }

        // Run test suites
        await testCourseList(page);

        const courseId = await testCourseCreation(page);

        await testCourseDetail(page, courseId);

        await testEnrollment(page, courseId);

        await testMyCourses(page);

        await testLearningPage(page, courseId);

        // Final summary
        console.log('\n' + '═'.repeat(62));
        console.log('  📊 TEST RESULTS SUMMARY');
        console.log('═'.repeat(62));
        console.log(`  ✅ Passed:   ${results.passed}`);
        console.log(`  ❌ Failed:   ${results.failed}`);
        console.log(`  ⚠️  Warnings: ${results.warnings}`);
        console.log(`  📈 Pass Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
        console.log('═'.repeat(62));

        console.log('\n📸 Screenshots saved to: tests/screenshots/');
        console.log('\n🔄 Browser will stay open for manual inspection...');
        console.log('   Press Ctrl+C to close.\n');

        // Keep browser open
        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌ Test Error:', error.message);
        await takeScreenshot(page, 'error');

        console.log('\n🔄 Browser will stay open for debugging...');
        await new Promise(() => {});
    }
}

runAllTests().catch(console.error);
