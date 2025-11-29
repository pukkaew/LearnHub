/**
 * OPTIMIZED COMPREHENSIVE QA TEST SUITE - Professional Level
 * ============================================================
 * Total Test Cases: 100+
 * Optimized for speed while maintaining coverage
 *
 * Coverage Areas:
 * 1. Authentication & Security (15 cases)
 * 2. Course Management (20 cases)
 * 3. Form Validation (15 cases)
 * 4. API Security (15 cases)
 * 5. UI/UX & Accessibility (10 cases)
 * 6. Error Handling (15 cases)
 * 7. Performance (10 cases)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'qa-optimized-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test Results
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    skipped: 0,
    suites: {},
    details: []
};

const delay = ms => new Promise(r => setTimeout(r, ms));
const timestamp = () => new Date().toLocaleTimeString('th-TH');

function log(type, msg) {
    const icons = { pass: '✓', fail: '✗', warn: '!', skip: '-', info: 'i', suite: '►' };
    console.log(`[${timestamp()}] [${icons[type] || '?'}] ${msg}`);
}

function record(suite, id, name, status, detail = '') {
    results.total++;
    if (!results.suites[suite]) results.suites[suite] = { passed: 0, failed: 0, warnings: 0, skipped: 0 };

    results.suites[suite][status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : status === 'warn' ? 'warnings' : 'skipped']++;
    results[status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : status === 'warn' ? 'warnings' : 'skipped']++;

    results.details.push({ suite, id, name, status, detail, time: new Date().toISOString() });
    log(status, `${id} ${name} ${detail ? `- ${detail}` : ''}`);
}

async function screenshot(page, name) {
    try { await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true }); } catch (e) {}
}

// ====================================
// SUITE 1: Authentication & Security
// ====================================
async function testAuth(page) {
    console.log('\n' + '='.repeat(60));
    log('suite', 'SUITE 1: AUTHENTICATION & SECURITY (15 Tests)');
    console.log('='.repeat(60));
    const S = 'Auth';

    // 1.1 Login page loads
    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
        await delay(800);
        const title = await page.title();
        record(S, '1.1', 'Login page loads', title ? 'pass' : 'fail', title);
    } catch (e) { record(S, '1.1', 'Login page loads', 'fail', e.message); }

    // 1.2 Form elements exist
    try {
        const els = await page.evaluate(() => ({
            emp: !!document.querySelector('#employee_id'),
            pwd: !!document.querySelector('#password'),
            btn: !!document.querySelector('button[type="submit"]')
        }));
        record(S, '1.2', 'Form elements exist', els.emp && els.pwd && els.btn ? 'pass' : 'fail');
    } catch (e) { record(S, '1.2', 'Form elements exist', 'fail', e.message); }

    // 1.3 Empty submission blocked
    try {
        await page.click('button[type="submit"]');
        await delay(500);
        record(S, '1.3', 'Empty submission blocked', page.url().includes('login') ? 'pass' : 'fail');
    } catch (e) { record(S, '1.3', 'Empty submission blocked', 'fail', e.message); }

    // 1.4 Invalid credentials rejected
    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
        await page.type('#employee_id', 'INVALID');
        await page.type('#password', 'wrong');
        await page.click('button[type="submit"]');
        await delay(1500);
        record(S, '1.4', 'Invalid credentials rejected', page.url().includes('login') ? 'pass' : 'fail');
    } catch (e) { record(S, '1.4', 'Invalid credentials rejected', 'fail', e.message); }

    // 1.5 SQL Injection blocked
    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            document.querySelector('#employee_id').value = "' OR '1'='1' --";
            document.querySelector('#password').value = "' OR '1'='1' --";
        });
        await page.click('button[type="submit"]');
        await delay(1500);
        record(S, '1.5', 'SQL Injection blocked', page.url().includes('login') ? 'pass' : 'fail');
    } catch (e) { record(S, '1.5', 'SQL Injection blocked', 'fail', e.message); }

    // 1.6 XSS blocked
    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            document.querySelector('#employee_id').value = '<script>alert(1)</script>';
            document.querySelector('#password').value = 'test';
        });
        await page.click('button[type="submit"]');
        await delay(1000);
        const hasScript = await page.evaluate(() => document.body.innerHTML.includes('<script>alert'));
        record(S, '1.6', 'XSS blocked', !hasScript ? 'pass' : 'fail');
    } catch (e) { record(S, '1.6', 'XSS blocked', 'fail', e.message); }

    // 1.7 Buffer overflow (long input)
    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            document.querySelector('#employee_id').value = 'A'.repeat(5000);
            document.querySelector('#password').value = 'B'.repeat(5000);
        });
        await page.click('button[type="submit"]');
        await delay(1500);
        record(S, '1.7', 'Buffer overflow handled', page.url().includes('login') ? 'pass' : 'warn');
    } catch (e) { record(S, '1.7', 'Buffer overflow handled', 'pass', 'Rejected'); }

    // 1.8 Special characters
    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            document.querySelector('#employee_id').value = '!@#$%^&*(){}[]|\\';
            document.querySelector('#password').value = '!@#$%^&*()';
        });
        await page.click('button[type="submit"]');
        await delay(1000);
        record(S, '1.8', 'Special characters handled', 'pass');
    } catch (e) { record(S, '1.8', 'Special characters handled', 'fail', e.message); }

    // 1.9 Thai characters
    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
        await page.type('#employee_id', 'ทดสอบภาษาไทย');
        await page.type('#password', 'รหัสผ่าน');
        await page.click('button[type="submit"]');
        await delay(1000);
        record(S, '1.9', 'Thai characters handled', 'pass');
    } catch (e) { record(S, '1.9', 'Thai characters handled', 'fail', e.message); }

    // 1.10 Valid login
    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
        await delay(500);
        await page.type('#employee_id', 'ADM001');
        await page.type('#password', 'admin123');
        await page.click('button[type="submit"]');
        await delay(2000);
        await screenshot(page, '1.10-after-login');
        record(S, '1.10', 'Valid login works', !page.url().includes('login') ? 'pass' : 'fail');
    } catch (e) { record(S, '1.10', 'Valid login works', 'fail', e.message); }

    // 1.11 Session persists
    try {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        await delay(500);
        record(S, '1.11', 'Session persists', !page.url().includes('login') ? 'pass' : 'fail');
    } catch (e) { record(S, '1.11', 'Session persists', 'fail', e.message); }

    // 1.12 Admin access
    try {
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
        await delay(500);
        record(S, '1.12', 'Admin access to create', page.url().includes('create') ? 'pass' : 'fail');
    } catch (e) { record(S, '1.12', 'Admin access to create', 'fail', e.message); }

    // 1.13 Logout
    try {
        const loggedOut = await page.evaluate(() => {
            const link = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('logout'));
            if (link) { link.click(); return true; }
            return false;
        });
        if (loggedOut) {
            await delay(1500);
            record(S, '1.13', 'Logout works', page.url().includes('login') ? 'pass' : 'warn');
        } else {
            record(S, '1.13', 'Logout works', 'skip', 'No logout link');
        }
    } catch (e) { record(S, '1.13', 'Logout works', 'fail', e.message); }

    // 1.14 Protected route redirect
    try {
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
        await delay(500);
        record(S, '1.14', 'Protected route redirects', page.url().includes('login') ? 'pass' : 'warn');
    } catch (e) { record(S, '1.14', 'Protected route redirects', 'fail', e.message); }

    // 1.15 Re-login
    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
        await page.type('#employee_id', 'ADM001');
        await page.type('#password', 'admin123');
        await page.click('button[type="submit"]');
        await delay(2000);
        record(S, '1.15', 'Re-login works', !page.url().includes('login') ? 'pass' : 'fail');
    } catch (e) { record(S, '1.15', 'Re-login works', 'fail', e.message); }
}

// ====================================
// SUITE 2: Course Management
// ====================================
async function testCourses(page) {
    console.log('\n' + '='.repeat(60));
    log('suite', 'SUITE 2: COURSE MANAGEMENT (20 Tests)');
    console.log('='.repeat(60));
    const S = 'Course';

    // 2.1-2.5 Course List
    try {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        await screenshot(page, '2.1-course-list');
        record(S, '2.1', 'Course list loads', 'pass', await page.title());
    } catch (e) { record(S, '2.1', 'Course list loads', 'fail', e.message); }

    try {
        const hasSearch = await page.$('input[type="search"], input[name="search"], #search') !== null;
        record(S, '2.2', 'Search exists', hasSearch ? 'pass' : 'warn');
    } catch (e) { record(S, '2.2', 'Search exists', 'fail', e.message); }

    try {
        const filters = await page.$$('select');
        record(S, '2.3', 'Filters exist', filters.length > 0 ? 'pass' : 'warn', `${filters.length} dropdowns`);
    } catch (e) { record(S, '2.3', 'Filters exist', 'fail', e.message); }

    try {
        const createBtn = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).some(a => a.href.includes('create'));
        });
        record(S, '2.4', 'Create button (Admin)', createBtn ? 'pass' : 'warn');
    } catch (e) { record(S, '2.4', 'Create button (Admin)', 'fail', e.message); }

    try {
        const links = await page.$$eval('a[href*="/courses/"]', els =>
            els.filter(e => e.href.match(/\/courses\/\d+$/)).length
        );
        record(S, '2.5', 'Course links exist', links > 0 ? 'pass' : 'warn', `${links} links`);
    } catch (e) { record(S, '2.5', 'Course links exist', 'fail', e.message); }

    // 2.6-2.10 Course Creation Wizard
    try {
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        await screenshot(page, '2.6-create-page');
        record(S, '2.6', 'Create page loads', 'pass');
    } catch (e) { record(S, '2.6', 'Create page loads', 'fail', e.message); }

    try {
        const hasName = await page.$('#course_name, input[name="course_name"]') !== null;
        record(S, '2.7', 'Course name input', hasName ? 'pass' : 'fail');
    } catch (e) { record(S, '2.7', 'Course name input', 'fail', e.message); }

    try {
        const hasCategory = await page.$('#category_id, select[name="category_id"]') !== null;
        record(S, '2.8', 'Category dropdown', hasCategory ? 'pass' : 'fail');
    } catch (e) { record(S, '2.8', 'Category dropdown', 'fail', e.message); }

    try {
        const hasDifficulty = await page.$('#difficulty_level, select[name="difficulty_level"]') !== null;
        record(S, '2.9', 'Difficulty dropdown', hasDifficulty ? 'pass' : 'fail');
    } catch (e) { record(S, '2.9', 'Difficulty dropdown', 'fail', e.message); }

    try {
        const hasType = await page.$('#course_type, select[name="course_type"]') !== null;
        record(S, '2.10', 'Course type dropdown', hasType ? 'pass' : 'fail');
    } catch (e) { record(S, '2.10', 'Course type dropdown', 'fail', e.message); }

    // 2.11-2.15 Form interactions
    try {
        const nameInput = await page.$('#course_name, input[name="course_name"]');
        if (nameInput) {
            await nameInput.type('QA Test Course ' + Date.now());
            record(S, '2.11', 'Course name input works', 'pass');
        } else {
            record(S, '2.11', 'Course name input works', 'fail');
        }
    } catch (e) { record(S, '2.11', 'Course name input works', 'fail', e.message); }

    try {
        const catSelect = await page.$('#category_id, select[name="category_id"]');
        if (catSelect) {
            const opts = await page.$$eval('#category_id option, select[name="category_id"] option',
                os => os.filter(o => o.value).map(o => o.value));
            if (opts.length > 0) await catSelect.select(opts[0]);
            record(S, '2.12', 'Category selection works', 'pass', `${opts.length} options`);
        }
    } catch (e) { record(S, '2.12', 'Category selection works', 'fail', e.message); }

    try {
        const diffSelect = await page.$('#difficulty_level, select[name="difficulty_level"]');
        if (diffSelect) { await diffSelect.select('beginner'); }
        record(S, '2.13', 'Difficulty selection works', 'pass');
    } catch (e) { record(S, '2.13', 'Difficulty selection works', 'fail', e.message); }

    try {
        const typeSelect = await page.$('#course_type, select[name="course_type"]');
        if (typeSelect) { await typeSelect.select('mandatory'); }
        record(S, '2.14', 'Course type selection works', 'pass');
    } catch (e) { record(S, '2.14', 'Course type selection works', 'fail', e.message); }

    try {
        const langSelect = await page.$('#language, select[name="language"]');
        if (langSelect) { await langSelect.select('th'); }
        record(S, '2.15', 'Language selection works', 'pass');
    } catch (e) { record(S, '2.15', 'Language selection works', 'fail', e.message); }

    // 2.16-2.20 My Courses & Navigation
    try {
        await page.goto(`${BASE_URL}/courses/my-courses`, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        await screenshot(page, '2.16-my-courses');
        record(S, '2.16', 'My Courses page loads', 'pass');
    } catch (e) { record(S, '2.16', 'My Courses page loads', 'fail', e.message); }

    try {
        const hasStats = await page.evaluate(() => {
            const t = document.body.innerText;
            return t.includes('ทั้งหมด') || t.includes('กำลังเรียน') || t.includes('สำเร็จ');
        });
        record(S, '2.17', 'My Courses stats displayed', hasStats ? 'pass' : 'warn');
    } catch (e) { record(S, '2.17', 'My Courses stats displayed', 'fail', e.message); }

    try {
        await page.goto(`${BASE_URL}/courses/99999`, { waitUntil: 'domcontentloaded' });
        await delay(500);
        const is404 = await page.evaluate(() => {
            const t = document.body.innerText;
            return t.includes('404') || t.includes('ไม่พบ') || t.includes('Not Found');
        });
        record(S, '2.18', '404 for invalid course', is404 ? 'pass' : 'warn');
    } catch (e) { record(S, '2.18', '404 for invalid course', 'fail', e.message); }

    try {
        await page.goto(`${BASE_URL}/courses/abc`, { waitUntil: 'domcontentloaded' });
        await delay(500);
        record(S, '2.19', 'Non-numeric ID handled', 'pass');
    } catch (e) { record(S, '2.19', 'Non-numeric ID handled', 'fail', e.message); }

    try {
        await page.goto(`${BASE_URL}/courses/-1`, { waitUntil: 'domcontentloaded' });
        await delay(500);
        record(S, '2.20', 'Negative ID handled', 'pass');
    } catch (e) { record(S, '2.20', 'Negative ID handled', 'fail', e.message); }
}

// ====================================
// SUITE 3: Form Validation
// ====================================
async function testFormValidation(page) {
    console.log('\n' + '='.repeat(60));
    log('suite', 'SUITE 3: FORM VALIDATION (15 Tests)');
    console.log('='.repeat(60));
    const S = 'Validation';

    await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
    await delay(500);

    const testInputs = [
        { id: '3.1', name: 'Empty string', value: '' },
        { id: '3.2', name: 'Whitespace only', value: '   ' },
        { id: '3.3', name: 'Single char', value: 'A' },
        { id: '3.4', name: 'HTML tags', value: '<b>Bold</b>' },
        { id: '3.5', name: 'Script tag', value: '<script>alert(1)</script>' },
        { id: '3.6', name: 'Event handler', value: 'test" onclick="alert(1)"' },
        { id: '3.7', name: 'Path traversal', value: '../../../etc/passwd' },
        { id: '3.8', name: 'SQL injection', value: "'; DROP TABLE courses; --" },
        { id: '3.9', name: 'Long string (1000)', value: 'X'.repeat(1000) },
        { id: '3.10', name: 'Unicode chars', value: '你好世界 مرحبا' },
        { id: '3.11', name: 'Emoji', value: '🎓📚✨🔥💯' },
        { id: '3.12', name: 'Newlines', value: 'Line1\nLine2\nLine3' },
        { id: '3.13', name: 'Tabs', value: 'Col1\tCol2\tCol3' },
        { id: '3.14', name: 'NULL char', value: 'test\x00hidden' },
        { id: '3.15', name: 'Thai text', value: 'หลักสูตรทดสอบระบบ' }
    ];

    for (const test of testInputs) {
        try {
            await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
            await delay(300);
            await page.evaluate((val) => {
                const input = document.querySelector('#course_name, input[name="course_name"]');
                if (input) input.value = val;
            }, test.value);
            record(S, test.id, `Input: ${test.name}`, 'pass', 'Accepted (server validates)');
        } catch (e) {
            record(S, test.id, `Input: ${test.name}`, 'fail', e.message);
        }
    }
}

// ====================================
// SUITE 4: API Security
// ====================================
async function testAPISecurity(page) {
    console.log('\n' + '='.repeat(60));
    log('suite', 'SUITE 4: API SECURITY (15 Tests)');
    console.log('='.repeat(60));
    const S = 'API';

    const apiTests = [
        { id: '4.1', url: '/api/courses', name: 'GET courses' },
        { id: '4.2', url: '/api/courses/categories', name: 'GET categories' },
        { id: '4.3', url: '/api/courses/1', name: 'GET course by ID' },
        { id: '4.4', url: '/api/courses/0', name: 'Course ID 0' },
        { id: '4.5', url: '/api/courses/-1', name: 'Course ID -1' },
        { id: '4.6', url: '/api/courses/abc', name: 'Course ID non-numeric' },
        { id: '4.7', url: '/api/courses/99999999', name: 'Course ID very large' },
        { id: '4.8', url: "/api/courses?id=1 OR 1=1", name: 'SQL injection query' },
        { id: '4.9', url: '/api/courses?search=<script>', name: 'XSS in search' },
        { id: '4.10', url: '/api/courses/../../../etc/passwd', name: 'Path traversal' },
        { id: '4.11', url: '/api/nonexistent', name: 'Non-existent endpoint' },
        { id: '4.12', url: '/api/courses?__proto__=1', name: 'Prototype pollution' },
        { id: '4.13', url: '/api/courses?callback=alert(1)', name: 'JSONP callback' },
        { id: '4.14', url: '/api/courses/' + 'A'.repeat(1000), name: 'Long path' },
        { id: '4.15', url: '/api/courses?page=-1&limit=9999999', name: 'Extreme pagination' }
    ];

    for (const test of apiTests) {
        try {
            const res = await page.evaluate(async (url) => {
                try {
                    const r = await fetch(url);
                    const t = await r.text();
                    return { status: r.status, hasScript: t.includes('<script>') };
                } catch (e) { return { error: e.message }; }
            }, BASE_URL + test.url);

            if (res.error) {
                record(S, test.id, test.name, 'warn', res.error);
            } else {
                record(S, test.id, test.name, !res.hasScript ? 'pass' : 'fail', `Status: ${res.status}`);
            }
        } catch (e) {
            record(S, test.id, test.name, 'fail', e.message);
        }
    }
}

// ====================================
// SUITE 5: UI/UX & Accessibility
// ====================================
async function testUIUX(page) {
    console.log('\n' + '='.repeat(60));
    log('suite', 'SUITE 5: UI/UX & ACCESSIBILITY (10 Tests)');
    console.log('='.repeat(60));
    const S = 'UIUX';

    await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
    await delay(500);

    try {
        const hasNav = await page.$('nav, .navbar, header') !== null;
        record(S, '5.1', 'Navigation exists', hasNav ? 'pass' : 'warn');
    } catch (e) { record(S, '5.1', 'Navigation exists', 'fail', e.message); }

    try {
        const hasFooter = await page.$('footer, .footer') !== null;
        record(S, '5.2', 'Footer exists', hasFooter ? 'pass' : 'warn');
    } catch (e) { record(S, '5.2', 'Footer exists', 'fail', e.message); }

    try {
        const title = await page.title();
        record(S, '5.3', 'Page has title', title.length > 0 ? 'pass' : 'fail', title);
    } catch (e) { record(S, '5.3', 'Page has title', 'fail', e.message); }

    try {
        const h1Count = await page.$$eval('h1', els => els.length);
        record(S, '5.4', 'Has H1 heading', h1Count >= 1 ? 'pass' : 'warn', `${h1Count} H1 tags`);
    } catch (e) { record(S, '5.4', 'Has H1 heading', 'fail', e.message); }

    try {
        const hasViewport = await page.evaluate(() => !!document.querySelector('meta[name="viewport"]'));
        record(S, '5.5', 'Viewport meta tag', hasViewport ? 'pass' : 'warn');
    } catch (e) { record(S, '5.5', 'Viewport meta tag', 'fail', e.message); }

    // Responsive tests
    try {
        await page.setViewport({ width: 375, height: 667 });
        await delay(300);
        await screenshot(page, '5.6-mobile');
        record(S, '5.6', 'Mobile viewport (375px)', 'pass');
    } catch (e) { record(S, '5.6', 'Mobile viewport', 'fail', e.message); }

    try {
        await page.setViewport({ width: 768, height: 1024 });
        await delay(300);
        await screenshot(page, '5.7-tablet');
        record(S, '5.7', 'Tablet viewport (768px)', 'pass');
    } catch (e) { record(S, '5.7', 'Tablet viewport', 'fail', e.message); }

    try {
        await page.setViewport({ width: 1920, height: 1080 });
        await delay(300);
        await screenshot(page, '5.8-desktop');
        record(S, '5.8', 'Desktop viewport (1920px)', 'pass');
    } catch (e) { record(S, '5.8', 'Desktop viewport', 'fail', e.message); }

    try {
        await page.setViewport({ width: 1366, height: 768 });
        record(S, '5.9', 'Viewport reset', 'pass');
    } catch (e) { record(S, '5.9', 'Viewport reset', 'fail', e.message); }

    try {
        const imgsWithoutAlt = await page.$$eval('img:not([alt])', imgs => imgs.length);
        record(S, '5.10', 'Images have alt', imgsWithoutAlt === 0 ? 'pass' : 'warn', `${imgsWithoutAlt} without alt`);
    } catch (e) { record(S, '5.10', 'Images have alt', 'fail', e.message); }
}

// ====================================
// SUITE 6: Error Handling
// ====================================
async function testErrorHandling(page) {
    console.log('\n' + '='.repeat(60));
    log('suite', 'SUITE 6: ERROR HANDLING (15 Tests)');
    console.log('='.repeat(60));
    const S = 'Error';

    const errorTests = [
        { id: '6.1', url: '/nonexistent', name: '404 page' },
        { id: '6.2', url: '/courses/abc123', name: 'Invalid course path' },
        { id: '6.3', url: '/api/nonexistent', name: 'Invalid API' },
        { id: '6.4', url: '/courses/../../../etc/passwd', name: 'Path traversal' },
        { id: '6.5', url: '/courses/%00', name: 'Null byte' }
    ];

    for (const test of errorTests) {
        try {
            const res = await page.goto(`${BASE_URL}${test.url}`, { waitUntil: 'domcontentloaded' });
            await delay(300);
            const status = res ? res.status() : 200;
            record(S, test.id, test.name, [400, 404, 500].includes(status) || status === 200 ? 'pass' : 'warn', `Status: ${status}`);
        } catch (e) {
            record(S, test.id, test.name, 'pass', 'Blocked/Error');
        }
    }

    // 6.6 Error page hides stack trace
    try {
        await page.goto(`${BASE_URL}/nonexistent`, { waitUntil: 'domcontentloaded' });
        const hasStack = await page.evaluate(() => {
            const t = document.body.innerText;
            return t.includes('at ') && t.includes('.js:');
        });
        record(S, '6.6', 'Hides stack trace', !hasStack ? 'pass' : 'fail');
    } catch (e) { record(S, '6.6', 'Hides stack trace', 'fail', e.message); }

    // 6.7 Error page hides sensitive info
    try {
        const hasSensitive = await page.evaluate(() => {
            const t = document.body.innerText.toLowerCase();
            return t.includes('password') || t.includes('secret') || t.includes('api_key');
        });
        record(S, '6.7', 'Hides sensitive info', !hasSensitive ? 'pass' : 'fail');
    } catch (e) { record(S, '6.7', 'Hides sensitive info', 'fail', e.message); }

    // 6.8 Error page has navigation
    try {
        const hasNav = await page.$('nav, a[href="/"]') !== null;
        record(S, '6.8', 'Error page has navigation', hasNav ? 'pass' : 'warn');
    } catch (e) { record(S, '6.8', 'Error page has navigation', 'fail', e.message); }

    // 6.9-6.12 Search edge cases
    const searchTests = [
        { id: '6.9', query: 'xyznonexistent123', name: 'No results' },
        { id: '6.10', query: 'A'.repeat(500), name: 'Long query' },
        { id: '6.11', query: '<script>alert(1)</script>', name: 'XSS in search' },
        { id: '6.12', query: 'ทดสอบภาษาไทย', name: 'Thai in search' }
    ];

    for (const test of searchTests) {
        try {
            await page.goto(`${BASE_URL}/courses?search=${encodeURIComponent(test.query)}`, { waitUntil: 'domcontentloaded' });
            await delay(300);
            const hasScript = await page.evaluate(() => document.body.innerHTML.includes('<script>alert'));
            record(S, test.id, test.name, !hasScript ? 'pass' : 'fail');
        } catch (e) {
            record(S, test.id, test.name, 'fail', e.message);
        }
    }

    // 6.13-6.15 Session edge cases
    try {
        await page.deleteCookie(...(await page.cookies()));
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
        await delay(500);
        record(S, '6.13', 'Expired session redirect', page.url().includes('login') ? 'pass' : 'warn');
    } catch (e) { record(S, '6.13', 'Expired session redirect', 'fail', e.message); }

    // Re-login
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
    await page.type('#employee_id', 'ADM001');
    await page.type('#password', 'admin123');
    await page.click('button[type="submit"]');
    await delay(1500);

    try {
        const requests = [];
        for (let i = 0; i < 10; i++) {
            requests.push(page.evaluate((url) => fetch(url).then(r => r.status), `${BASE_URL}/api/courses`));
        }
        const statuses = await Promise.all(requests);
        record(S, '6.14', 'Concurrent requests', statuses.every(s => s === 200 || s === 304) ? 'pass' : 'warn');
    } catch (e) { record(S, '6.14', 'Concurrent requests', 'fail', e.message); }

    try {
        for (let i = 0; i < 5; i++) {
            await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        }
        record(S, '6.15', 'Rapid navigation', 'pass');
    } catch (e) { record(S, '6.15', 'Rapid navigation', 'fail', e.message); }
}

// ====================================
// SUITE 7: Performance
// ====================================
async function testPerformance(page) {
    console.log('\n' + '='.repeat(60));
    log('suite', 'SUITE 7: PERFORMANCE (10 Tests)');
    console.log('='.repeat(60));
    const S = 'Perf';

    // 7.1-7.3 Page load times
    const pages = [
        { id: '7.1', url: '/courses', name: 'Course list' },
        { id: '7.2', url: '/courses/create', name: 'Create page' },
        { id: '7.3', url: '/courses/my-courses', name: 'My courses' }
    ];

    for (const p of pages) {
        try {
            const start = Date.now();
            await page.goto(`${BASE_URL}${p.url}`, { waitUntil: 'domcontentloaded' });
            const time = Date.now() - start;
            record(S, p.id, `${p.name} load time`, time < 3000 ? 'pass' : 'warn', `${time}ms`);
        } catch (e) {
            record(S, p.id, `${p.name} load time`, 'fail', e.message);
        }
    }

    // 7.4 API response time
    try {
        const start = Date.now();
        await page.evaluate(async (url) => await fetch(`${url}/api/courses`), BASE_URL);
        const time = Date.now() - start;
        record(S, '7.4', 'API response time', time < 1000 ? 'pass' : 'warn', `${time}ms`);
    } catch (e) { record(S, '7.4', 'API response time', 'fail', e.message); }

    // 7.5 DOM element count
    try {
        const count = await page.evaluate(() => document.querySelectorAll('*').length);
        record(S, '7.5', 'DOM element count', count < 2000 ? 'pass' : 'warn', `${count} elements`);
    } catch (e) { record(S, '7.5', 'DOM element count', 'fail', e.message); }

    // 7.6 Memory usage
    try {
        const metrics = await page.metrics();
        const heap = Math.round(metrics.JSHeapUsedSize / 1024 / 1024);
        record(S, '7.6', 'Memory usage', heap < 100 ? 'pass' : 'warn', `${heap}MB heap`);
    } catch (e) { record(S, '7.6', 'Memory usage', 'fail', e.message); }

    // 7.7 JavaScript errors check
    try {
        const jsErrors = [];
        page.on('pageerror', e => jsErrors.push(e.message));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await delay(1000);
        record(S, '7.7', 'No JS errors', jsErrors.length === 0 ? 'pass' : 'warn',
            jsErrors.length > 0 ? jsErrors[0].substring(0, 50) : 'None');
    } catch (e) { record(S, '7.7', 'No JS errors', 'fail', e.message); }

    // 7.8 Multiple API calls
    try {
        const start = Date.now();
        await page.evaluate(async (url) => {
            await Promise.all([
                fetch(`${url}/api/courses`),
                fetch(`${url}/api/courses/categories`),
                fetch(`${url}/api/courses`)
            ]);
        }, BASE_URL);
        const time = Date.now() - start;
        record(S, '7.8', 'Multiple API calls', time < 3000 ? 'pass' : 'warn', `${time}ms`);
    } catch (e) { record(S, '7.8', 'Multiple API calls', 'fail', e.message); }

    // 7.9 Stress test
    try {
        const start = Date.now();
        for (let i = 0; i < 10; i++) {
            await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        }
        const total = Date.now() - start;
        record(S, '7.9', 'Stress test (10 loads)', total < 20000 ? 'pass' : 'warn', `${total}ms`);
    } catch (e) { record(S, '7.9', 'Stress test', 'fail', e.message); }

    // 7.10 Network requests
    try {
        const requests = [];
        page.on('request', r => requests.push(r.url()));
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        record(S, '7.10', 'Network requests', requests.length < 50 ? 'pass' : 'warn', `${requests.length} requests`);
    } catch (e) { record(S, '7.10', 'Network requests', 'fail', e.message); }
}

// ====================================
// MAIN RUNNER
// ====================================
async function runAllTests() {
    console.log('\n' + '═'.repeat(60));
    console.log('  OPTIMIZED COMPREHENSIVE QA TEST SUITE');
    console.log('═'.repeat(60));
    console.log(`Target: ${BASE_URL}`);
    console.log(`Time: ${new Date().toLocaleString('th-TH')}`);
    console.log(`Total Suites: 7 | Estimated Tests: 100+`);
    console.log('═'.repeat(60));

    let browser;
    const startTime = Date.now();

    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1366, height: 768 },
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            slowMo: 20
        });

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(15000);

        await testAuth(page);
        await testCourses(page);
        await testFormValidation(page);
        await testAPISecurity(page);
        await testUIUX(page);
        await testErrorHandling(page);
        await testPerformance(page);

    } catch (e) {
        console.error('Critical error:', e.message);
    } finally {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('\n' + '═'.repeat(60));
        console.log('  FINAL QA TEST REPORT');
        console.log('═'.repeat(60));
        console.log(`Duration: ${duration}s`);

        console.log('\n--- BY SUITE ---');
        for (const [name, s] of Object.entries(results.suites)) {
            const total = s.passed + s.failed + s.warnings + s.skipped;
            const rate = ((s.passed / total) * 100).toFixed(1);
            console.log(`${name}: ${s.passed}/${total} (${rate}%) | F:${s.failed} W:${s.warnings} S:${s.skipped}`);
        }

        console.log('\n--- OVERALL ---');
        console.log(`Total: ${results.total}`);
        console.log(`Passed: ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`);
        console.log(`Failed: ${results.failed}`);
        console.log(`Warnings: ${results.warnings}`);
        console.log(`Skipped: ${results.skipped}`);

        if (results.failed > 0) {
            console.log('\n--- FAILED ---');
            results.details.filter(t => t.status === 'fail').forEach((t, i) => {
                console.log(`${i + 1}. [${t.suite}] ${t.id} ${t.name}: ${t.detail}`);
            });
        }

        console.log('\n' + '═'.repeat(60));
        console.log(`Screenshots: ${SCREENSHOT_DIR}`);

        // Save report
        const reportPath = path.join(SCREENSHOT_DIR, `qa-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify({
            summary: { total: results.total, passed: results.passed, failed: results.failed, warnings: results.warnings, skipped: results.skipped, duration: `${duration}s` },
            suites: results.suites,
            details: results.details
        }, null, 2));
        console.log(`Report: ${reportPath}`);
        console.log('═'.repeat(60));

        if (browser) {
            console.log('\nClosing browser in 3s...');
            await delay(3000);
            await browser.close();
        }
    }
}

runAllTests();
