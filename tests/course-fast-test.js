/**
 * Fast Auto Browser Test for Course Module
 * Optimized for speed with networkidle2
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const LOGIN_CREDENTIALS = { employee_id: 'ADM001', password: 'password123' };

let browser, page;
let testResults = [];
let testCourseId = null;

const log = (msg, type = 'INFO') => {
    const symbols = { INFO: '📋', PASS: '✅', FAIL: '❌', WARN: '⚠️', TEST: '🧪' };
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${symbols[type] || '📋'} ${msg}`);
};

const addResult = (name, passed, details = '') => {
    testResults.push({ name, passed, details });
    log(`${name}: ${passed ? 'PASSED' : 'FAILED'} ${details}`, passed ? 'PASS' : 'FAIL');
};

const delay = ms => new Promise(r => setTimeout(r, ms));

async function login() {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector('#employee_id', { timeout: 5000 });
    await page.$eval('#employee_id', el => el.value = '');
    await page.type('#employee_id', LOGIN_CREDENTIALS.employee_id, { delay: 30 });
    await page.$eval('#password', el => el.value = '');
    await page.type('#password', LOGIN_CREDENTIALS.password, { delay: 30 });
    await page.click('#submit-btn');
    await delay(2000);
    const url = page.url();
    return url.includes('/dashboard') || url.includes('/courses');
}

async function testAPI(method, endpoint, body = null) {
    const cookies = (await page.cookies()).map(c => `${c.name}=${c.value}`).join('; ');
    return page.evaluate(async ({ method, url, body, cookies }) => {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json', 'Cookie': cookies },
            credentials: 'include'
        };
        if (body && method !== 'GET') opts.body = JSON.stringify(body);
        const res = await fetch(url, opts);
        let data;
        try { data = await res.json(); } catch { data = await res.text(); }
        return { status: res.status, data };
    }, { method, url: `${BASE_URL}${endpoint}`, body, cookies });
}

// ==================== TEST SUITES ====================

async function testPageRendering() {
    log('=== Suite 1: Page Rendering ===', 'TEST');

    // Course List
    try {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle2', timeout: 15000 });
        const ok = await page.evaluate(() => document.body.innerText.length > 100);
        addResult('1.1 Course List Page', ok);
    } catch (e) { addResult('1.1 Course List Page', false, e.message); }

    // My Courses
    try {
        await page.goto(`${BASE_URL}/courses/my-courses`, { waitUntil: 'networkidle2', timeout: 15000 });
        const ok = await page.evaluate(() => document.body.innerText.length > 100);
        addResult('1.2 My Courses Page', ok);
    } catch (e) { addResult('1.2 My Courses Page', false, e.message); }

    // Create Course Page
    try {
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'networkidle2', timeout: 15000 });
        const ok = await page.evaluate(() => document.querySelector('form') !== null);
        addResult('1.3 Create Course Page', ok);
    } catch (e) { addResult('1.3 Create Course Page', false, e.message); }

    // Category Management
    try {
        await page.goto(`${BASE_URL}/courses/categories`, { waitUntil: 'networkidle2', timeout: 15000 });
        const ok = await page.evaluate(() => document.body.innerText.length > 100);
        addResult('1.4 Category Page', ok);
    } catch (e) { addResult('1.4 Category Page', false, e.message); }
}

async function testCourseAPIs() {
    log('=== Suite 2: Course APIs ===', 'TEST');

    // Get All Courses
    const all = await testAPI('GET', '/courses/api/all');
    addResult('2.1 GET /api/all', all.status === 200, `Records: ${all.data?.data?.length || 0}`);
    if (all.data?.data?.length > 0) testCourseId = all.data.data[0].course_id;

    // Get Course List
    const list = await testAPI('GET', '/courses/api/list');
    addResult('2.2 GET /api/list', list.status === 200);

    // Get Categories
    const cats = await testAPI('GET', '/courses/api/categories');
    addResult('2.3 GET /api/categories', cats.status === 200, `Count: ${cats.data?.data?.length || 0}`);

    // Get Instructors
    const inst = await testAPI('GET', '/courses/api/instructors');
    addResult('2.4 GET /api/instructors', inst.status === 200);

    // Get Recommended
    const rec = await testAPI('GET', '/courses/api/recommended');
    addResult('2.5 GET /api/recommended', rec.status === 200);

    // Get Popular
    const pop = await testAPI('GET', '/courses/api/popular');
    addResult('2.6 GET /api/popular', pop.status === 200);

    // My Courses API
    const my = await testAPI('GET', '/courses/api/my-courses');
    addResult('2.7 GET /api/my-courses', my.status === 200);

    // Target Positions
    const pos = await testAPI('GET', '/courses/api/target-positions');
    addResult('2.8 GET /api/target-positions', pos.status === 200);

    // Target Departments
    const dept = await testAPI('GET', '/courses/api/target-departments');
    addResult('2.9 GET /api/target-departments', dept.status === 200);
}

async function testCourseCRUD() {
    log('=== Suite 3: Course CRUD ===', 'TEST');

    // Create Course - ต้องมี category_id และ learning_objectives array ที่มีอย่างน้อย 3 ข้อ
    const newCourse = {
        course_name: `Fast Test Course ${Date.now()}`,
        course_code: `FTC${Date.now().toString().slice(-6)}`,
        description: 'Fast test course for automated testing',
        category_id: 1,  // ใช้ category_id แทน category
        course_type: 'Online',
        difficulty_level: 'Beginner',
        language: 'th',
        duration_hours: 5,
        max_students: 30,
        is_active: true,
        status: 'draft',
        learning_objectives: [
            'เข้าใจหลักการพื้นฐานของหลักสูตร',
            'สามารถประยุกต์ใช้ความรู้ที่ได้รับ',
            'พัฒนาทักษะการเรียนรู้ด้วยตนเอง'
        ]
    };

    const create = await testAPI('POST', '/courses/api/create', newCourse);
    const created = create.status === 201 || (create.status === 200 && create.data.success);
    addResult('3.1 POST /api/create', created, create.data?.message || '');

    if (created && create.data?.data?.course_id) {
        testCourseId = create.data.data.course_id;
        log(`Created course ID: ${testCourseId}`, 'INFO');

        // Get Course by ID
        const get = await testAPI('GET', `/courses/api/${testCourseId}`);
        addResult('3.2 GET /api/:id', get.status === 200);

        // Update Course
        const update = await testAPI('PUT', `/courses/api/${testCourseId}`, {
            course_name: `Updated Fast Test ${Date.now()}`,
            difficulty_level: 'Intermediate'
        });
        addResult('3.3 PUT /api/:id', update.status === 200);

        // Course Detail Page
        try {
            await page.goto(`${BASE_URL}/courses/${testCourseId}`, { waitUntil: 'networkidle2', timeout: 15000 });
            const ok = await page.evaluate(() => document.body.innerText.length > 100);
            addResult('3.4 Course Detail Page', ok);
        } catch (e) { addResult('3.4 Course Detail Page', false, e.message); }

        // Edit Page
        try {
            await page.goto(`${BASE_URL}/courses/${testCourseId}/edit`, { waitUntil: 'networkidle2', timeout: 15000 });
            const ok = await page.evaluate(() => document.querySelector('form') !== null);
            addResult('3.5 Edit Course Page', ok);
        } catch (e) { addResult('3.5 Edit Course Page', false, e.message); }
    }
}

async function testEnrollment() {
    log('=== Suite 4: Enrollment ===', 'TEST');

    if (!testCourseId) {
        addResult('4.x Enrollment Tests', false, 'No course ID');
        return;
    }

    const enroll = await testAPI('POST', `/courses/api/${testCourseId}/enroll`);
    addResult('4.1 POST /api/:id/enroll', [200, 201, 400].includes(enroll.status), enroll.data?.message || '');

    const progress = await testAPI('PUT', `/courses/api/${testCourseId}/progress`, { progress_percentage: 50 });
    addResult('4.2 PUT /api/:id/progress', [200, 404].includes(progress.status));
}

async function testCategoryManagement() {
    log('=== Suite 5: Category Management ===', 'TEST');

    // Get All Categories
    const all = await testAPI('GET', '/courses/api/categories-admin/all');
    addResult('5.1 GET /api/categories-admin/all', all.status === 200);

    // Create Category
    const newCat = {
        category_name: `Test Cat ${Date.now()}`,
        category_name_en: `Test Cat EN ${Date.now()}`,
        description: 'Fast test',
        category_icon: 'fas fa-test',
        category_color: '#3498db',
        display_order: 99
    };
    const create = await testAPI('POST', '/courses/api/categories-admin', newCat);
    const created = create.status === 201 || create.status === 200;
    addResult('5.2 POST /api/categories-admin', created);

    if (created && create.data?.data?.category_id) {
        const catId = create.data.data.category_id;

        // Get by ID
        const get = await testAPI('GET', `/courses/api/categories-admin/${catId}`);
        addResult('5.3 GET /api/categories-admin/:id', get.status === 200);

        // Update
        const update = await testAPI('PUT', `/courses/api/categories-admin/${catId}`, {
            category_name: `Updated Cat ${Date.now()}`
        });
        addResult('5.4 PUT /api/categories-admin/:id', update.status === 200);

        // Delete
        const del = await testAPI('DELETE', `/courses/api/categories-admin/${catId}`);
        addResult('5.5 DELETE /api/categories-admin/:id', del.status === 200);
    }
}

async function testFilters() {
    log('=== Suite 6: Filters & Search ===', 'TEST');

    const byCategory = await testAPI('GET', '/courses/api/all?category_id=1');
    addResult('6.1 Filter by Category', byCategory.status === 200);

    const byDifficulty = await testAPI('GET', '/courses/api/all?difficulty_level=Beginner');
    addResult('6.2 Filter by Difficulty', byDifficulty.status === 200);

    const byType = await testAPI('GET', '/courses/api/all?course_type=Online');
    addResult('6.3 Filter by Type', byType.status === 200);

    const search = await testAPI('GET', '/courses/api/all?search=test');
    addResult('6.4 Search', search.status === 200);

    const paged = await testAPI('GET', '/courses/api/all?page=1&limit=5');
    addResult('6.5 Pagination', paged.status === 200);
}

async function testErrorHandling() {
    log('=== Suite 7: Error Handling ===', 'TEST');

    const notFound = await testAPI('GET', '/courses/api/999999');
    addResult('7.1 GET Non-existent Course', notFound.status === 404);

    const updateNotFound = await testAPI('PUT', '/courses/api/999999', { course_name: 'X' });
    addResult('7.2 PUT Non-existent Course', updateNotFound.status === 404);

    const deleteNotFound = await testAPI('DELETE', '/courses/api/999999');
    addResult('7.3 DELETE Non-existent Course', deleteNotFound.status === 404);
}

async function testDeleteCourse() {
    log('=== Suite 8: Cleanup ===', 'TEST');

    if (testCourseId) {
        const del = await testAPI('DELETE', `/courses/api/${testCourseId}`);
        addResult('8.1 DELETE Test Course', [200, 403].includes(del.status), del.data?.message || '');
    } else {
        addResult('8.1 DELETE Test Course', true, 'Skipped - no test course');
    }
}

function generateReport() {
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const rate = ((passed / total) * 100).toFixed(1);

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('              COURSE MODULE TEST REPORT                         ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📊 Total: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed} | 📈 Rate: ${rate}%`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.filter(r => !r.passed).forEach(r => {
            console.log(`  ❌ ${r.name} - ${r.details}`);
        });
    }

    console.log('\n📋 ALL RESULTS:');
    testResults.forEach(r => console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`));

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════════');

    return { total, passed, failed, rate };
}

async function runTests() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('         FAST COURSE MODULE BROWSER TEST                       ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log(`URL: ${BASE_URL}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1400, height: 900 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        page.setDefaultTimeout(15000);

        log('Logging in...', 'INFO');
        const loggedIn = await login();
        if (!loggedIn) log('Login may have failed', 'WARN');

        await testPageRendering();
        await delay(500);
        await testCourseAPIs();
        await delay(500);
        await testCourseCRUD();
        await delay(500);
        await testEnrollment();
        await delay(500);
        await testCategoryManagement();
        await delay(500);
        await testFilters();
        await delay(500);
        await testErrorHandling();
        await delay(500);
        await testDeleteCourse();

        generateReport();

        log('Tests completed. Closing in 5s...', 'INFO');
        await delay(5000);

    } catch (e) {
        log(`Fatal: ${e.message}`, 'FAIL');
        console.error(e);
    } finally {
        if (browser) await browser.close();
        process.exit(testResults.filter(r => !r.passed).length > 0 ? 1 : 0);
    }
}

runTests();
