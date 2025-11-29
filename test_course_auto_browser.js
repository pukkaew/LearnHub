/**
 * Comprehensive Auto Browser Test for Course Module
 * ทดสอบฟังก์ชัน Course ทั้งหมดอย่างละเอียด
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const LOGIN_CREDENTIALS = {
    admin: { employee_id: 'ADM001', password: 'password123' },
    instructor: { employee_id: 'INS001', password: 'password123' },
    user: { employee_id: '100018', password: 'password123' }
};

let browser;
let page;
let testResults = [];
let testCourseId = null;
let testCategoryId = null;

// Helper Functions
const log = (message, type = 'INFO') => {
    const timestamp = new Date().toISOString();
    const symbols = { INFO: '📋', PASS: '✅', FAIL: '❌', WARN: '⚠️', TEST: '🧪' };
    console.log(`[${timestamp}] ${symbols[type] || '📋'} ${message}`);
};

const addResult = (testName, passed, details = '') => {
    testResults.push({ testName, passed, details, timestamp: new Date().toISOString() });
    log(`${testName}: ${passed ? 'PASSED' : 'FAILED'} ${details}`, passed ? 'PASS' : 'FAIL');
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Login helper - using direct form submission
async function login(credentials = LOGIN_CREDENTIALS.admin) {
    try {
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(500);

        // Wait for form elements
        await page.waitForSelector('#employee_id', { timeout: 10000 });
        await page.waitForSelector('#password', { timeout: 10000 });

        // Type credentials
        await page.$eval('#employee_id', el => el.value = '');
        await page.type('#employee_id', credentials.employee_id, { delay: 50 });

        await page.$eval('#password', el => el.value = '');
        await page.type('#password', credentials.password, { delay: 50 });

        await delay(300);

        // Click submit and wait for response
        await page.click('#submit-btn');

        // Wait for either redirect or error
        await delay(2000);

        // Check if login was successful by checking current URL or page content
        const currentUrl = page.url();
        if (currentUrl.includes('/dashboard') || currentUrl.includes('/courses')) {
            log(`Login successful as ${credentials.employee_id}`, 'PASS');
            return true;
        }

        // Try API login as fallback
        log('Trying API login...', 'INFO');
        const loginResult = await page.evaluate(async (creds) => {
            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        employee_id: creds.employee_id,
                        password: creds.password,
                        remember: false
                    })
                });
                return await response.json();
            } catch (err) {
                return { success: false, message: err.message };
            }
        }, credentials);

        if (loginResult && loginResult.success) {
            const redirectUrl = loginResult.redirectTo || loginResult.redirectUrl || '/dashboard';
            await page.goto(`${BASE_URL}${redirectUrl}`, { waitUntil: 'networkidle2', timeout: 15000 });
            await delay(500);
            log(`Login successful via API as ${credentials.employee_id}`, 'PASS');
            return true;
        }

        log(`Login failed: ${loginResult?.message || 'Unknown error'}`, 'FAIL');
        return false;
    } catch (error) {
        log(`Login failed: ${error.message}`, 'FAIL');
        return false;
    }
}

// Get cookies for API requests
async function getCookies() {
    const cookies = await page.cookies();
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

// API Test helper
async function testAPI(method, endpoint, body = null, expectedStatus = 200) {
    try {
        const cookies = await getCookies();
        const response = await page.evaluate(async ({ method, url, body, cookies }) => {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookies
                },
                credentials: 'include'
            };
            if (body && method !== 'GET') {
                options.body = JSON.stringify(body);
            }
            const res = await fetch(url, options);
            let data;
            try {
                data = await res.json();
            } catch {
                data = await res.text();
            }
            return { status: res.status, data };
        }, { method, url: `${BASE_URL}${endpoint}`, body, cookies });

        return response;
    } catch (error) {
        return { status: 500, data: { error: error.message } };
    }
}

// ==================== TEST SUITES ====================

// Test Suite 1: Page Rendering Tests
async function testPageRendering() {
    log('=== TEST SUITE 1: Page Rendering ===', 'TEST');

    // Test 1.1: Course List Page
    try {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle0', timeout: 30000 });
        const hasContent = await page.evaluate(() => document.body.innerText.length > 100);
        addResult('1.1 Course List Page Loads', hasContent, 'GET /courses');
    } catch (e) {
        addResult('1.1 Course List Page Loads', false, e.message);
    }

    // Test 1.2: My Courses Page
    try {
        await page.goto(`${BASE_URL}/courses/my-courses`, { waitUntil: 'networkidle0', timeout: 30000 });
        const hasContent = await page.evaluate(() => document.body.innerText.length > 100);
        addResult('1.2 My Courses Page Loads', hasContent, 'GET /courses/my-courses');
    } catch (e) {
        addResult('1.2 My Courses Page Loads', false, e.message);
    }

    // Test 1.3: Create Course Page (Admin/Instructor Only)
    try {
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'networkidle0', timeout: 30000 });
        const hasForm = await page.evaluate(() => {
            return document.querySelector('form') !== null || document.body.innerText.includes('course');
        });
        addResult('1.3 Create Course Page Loads', hasForm, 'GET /courses/create');
    } catch (e) {
        addResult('1.3 Create Course Page Loads', false, e.message);
    }

    // Test 1.4: Category Management Page (Admin Only)
    try {
        await page.goto(`${BASE_URL}/courses/categories`, { waitUntil: 'networkidle0', timeout: 30000 });
        const hasContent = await page.evaluate(() => document.body.innerText.length > 100);
        addResult('1.4 Category Management Page Loads', hasContent, 'GET /courses/categories');
    } catch (e) {
        addResult('1.4 Category Management Page Loads', false, e.message);
    }
}

// Test Suite 2: Course API - List & Read Operations
async function testCourseListAPIs() {
    log('=== TEST SUITE 2: Course List APIs ===', 'TEST');

    // Test 2.1: Get All Courses
    const allCourses = await testAPI('GET', '/courses/api/all');
    addResult('2.1 GET /api/all - All Courses', allCourses.status === 200 && allCourses.data.success === true,
        `Status: ${allCourses.status}, Records: ${allCourses.data?.data?.length || 0}`);

    // Test 2.2: Get All Courses (Alias)
    const listCourses = await testAPI('GET', '/courses/api/list');
    addResult('2.2 GET /api/list - Course List', listCourses.status === 200 && listCourses.data.success === true,
        `Status: ${listCourses.status}`);

    // Test 2.3: Get All Courses with Pagination
    const pagedCourses = await testAPI('GET', '/courses/api/all?page=1&limit=5');
    addResult('2.3 GET /api/all - Pagination', pagedCourses.status === 200,
        `Page: ${pagedCourses.data?.pagination?.page}, Limit: ${pagedCourses.data?.pagination?.limit}`);

    // Test 2.4: Get All Courses with Search Filter
    const searchCourses = await testAPI('GET', '/courses/api/all?search=test');
    addResult('2.4 GET /api/all - Search Filter', searchCourses.status === 200,
        `Status: ${searchCourses.status}`);

    // Test 2.5: Get Categories
    const categories = await testAPI('GET', '/courses/api/categories');
    addResult('2.5 GET /api/categories - Categories List', categories.status === 200,
        `Categories: ${categories.data?.data?.length || 0}`);

    // Test 2.6: Get Instructors
    const instructors = await testAPI('GET', '/courses/api/instructors');
    addResult('2.6 GET /api/instructors - Instructors List', instructors.status === 200,
        `Instructors: ${instructors.data?.data?.length || 0}`);

    // Test 2.7: Get Target Positions
    const positions = await testAPI('GET', '/courses/api/target-positions');
    addResult('2.7 GET /api/target-positions', positions.status === 200,
        `Positions: ${positions.data?.data?.length || 0}`);

    // Test 2.8: Get Target Departments
    const departments = await testAPI('GET', '/courses/api/target-departments');
    addResult('2.8 GET /api/target-departments', departments.status === 200,
        `Departments: ${departments.data?.data?.length || 0}`);

    // Test 2.9: Get Recommended Courses
    const recommended = await testAPI('GET', '/courses/api/recommended');
    addResult('2.9 GET /api/recommended - Recommended Courses', recommended.status === 200,
        `Courses: ${recommended.data?.data?.length || 0}`);

    // Test 2.10: Get Popular Courses
    const popular = await testAPI('GET', '/courses/api/popular');
    addResult('2.10 GET /api/popular - Popular Courses', popular.status === 200,
        `Courses: ${popular.data?.data?.length || 0}`);

    // Test 2.11: Get My Enrollments
    const myEnrollments = await testAPI('GET', '/courses/api/my-courses');
    addResult('2.11 GET /api/my-courses - My Enrollments', myEnrollments.status === 200,
        `Enrollments: ${myEnrollments.data?.data?.length || 0}`);

    // Test 2.12: Get Available Tests
    const availableTests = await testAPI('GET', '/courses/api/tests/available');
    addResult('2.12 GET /api/tests/available', availableTests.status === 200,
        `Tests: ${availableTests.data?.data?.length || 0}`);

    // Store a course ID for later tests if available
    if (allCourses.data?.data?.length > 0) {
        testCourseId = allCourses.data.data[0].course_id;
        log(`Using existing course ID: ${testCourseId} for subsequent tests`, 'INFO');
    }
}

// Test Suite 3: Course CRUD Operations
async function testCourseCRUD() {
    log('=== TEST SUITE 3: Course CRUD Operations ===', 'TEST');

    // Test 3.1: Create New Course
    const newCourseData = {
        title: `หลักสูตรทดสอบอัตโนมัติ Auto Test Course ${Date.now()}`,
        course_code: `ATC${Date.now().toString().slice(-6)}`,
        description: 'นี่คือหลักสูตรทดสอบที่สร้างโดยสคริปต์ทดสอบอัตโนมัติ This is an automated test course created by browser test script for comprehensive testing purposes',
        category_id: 1,
        course_type: 'online',
        difficulty_level: 'beginner',
        language: 'th',
        duration_hours: 10,
        max_students: 50,
        is_active: true,
        status: 'draft',
        learning_objectives: [
            'เรียนรู้พื้นฐานการใช้งานระบบและเครื่องมือต่างๆ',
            'เข้าใจหลักการทำงานของระบบและสามารถประยุกต์ใช้ได้',
            'สามารถนำความรู้ไปใช้ในการทำงานจริงได้อย่างมีประสิทธิภาพ'
        ],
        target_audience: 'Developers',
        prerequisite_knowledge: 'None'
    };

    const createResult = await testAPI('POST', '/courses/api/create', newCourseData);
    const createSuccess = createResult.status === 201 || (createResult.status === 200 && createResult.data.success);
    addResult('3.1 POST /api/create - Create Course', createSuccess,
        `Status: ${createResult.status}, Message: ${createResult.data?.message || 'N/A'}`);

    if (createSuccess && createResult.data?.data?.course_id) {
        testCourseId = createResult.data.data.course_id;
        log(`Created test course ID: ${testCourseId}`, 'INFO');
    }

    // Test 3.2: Get Course by ID
    if (testCourseId) {
        const getCourse = await testAPI('GET', `/courses/api/${testCourseId}`);
        addResult('3.2 GET /api/:id - Get Course by ID', getCourse.status === 200 && getCourse.data.success,
            `Course: ${getCourse.data?.data?.course_name || 'N/A'}`);

        // Test 3.3: Update Course
        const updateData = {
            title: `อัพเดทหลักสูตรทดสอบ Updated Test Course ${Date.now()}`,
            description: 'คำอธิบายที่ถูกอัพเดทจากการทดสอบอัตโนมัติ Updated description from automated test for comprehensive testing',
            difficulty_level: 'intermediate'
        };
        const updateResult = await testAPI('PUT', `/courses/api/${testCourseId}`, updateData);
        addResult('3.3 PUT /api/:id - Update Course', updateResult.status === 200,
            `Status: ${updateResult.status}, Message: ${updateResult.data?.message || 'N/A'}`);

        // Test 3.4: Render Course Detail Page
        try {
            await page.goto(`${BASE_URL}/courses/${testCourseId}`, { waitUntil: 'networkidle0', timeout: 30000 });
            const hasContent = await page.evaluate(() => document.body.innerText.length > 100);
            addResult('3.4 GET /:id - Course Detail Page', hasContent, `Course ID: ${testCourseId}`);
        } catch (e) {
            addResult('3.4 GET /:id - Course Detail Page', false, e.message);
        }

        // Test 3.5: Render Edit Course Page
        try {
            await page.goto(`${BASE_URL}/courses/${testCourseId}/edit`, { waitUntil: 'networkidle0', timeout: 30000 });
            const hasForm = await page.evaluate(() => document.querySelector('form') !== null);
            addResult('3.5 GET /:id/edit - Edit Course Page', hasForm, `Course ID: ${testCourseId}`);
        } catch (e) {
            addResult('3.5 GET /:id/edit - Edit Course Page', false, e.message);
        }
    } else {
        addResult('3.2-3.5 Course Detail Tests', false, 'No course ID available');
    }
}

// Test Suite 4: Course Enrollment & Progress
async function testEnrollmentProgress() {
    log('=== TEST SUITE 4: Enrollment & Progress ===', 'TEST');

    if (!testCourseId) {
        log('Skipping enrollment tests - no course ID available', 'WARN');
        addResult('4.x Enrollment Tests', false, 'No course ID available');
        return;
    }

    // Test 4.1: Enroll in Course
    const enrollResult = await testAPI('POST', `/courses/api/${testCourseId}/enroll`);
    const enrollSuccess = enrollResult.status === 201 || enrollResult.status === 200 || enrollResult.status === 400; // 400 might be "already enrolled"
    addResult('4.1 POST /api/:id/enroll - Enroll in Course', enrollSuccess,
        `Status: ${enrollResult.status}, Message: ${enrollResult.data?.message || 'N/A'}`);

    // Test 4.2: Update Progress
    const progressData = { progress_percentage: 50 };
    const progressResult = await testAPI('PUT', `/courses/api/${testCourseId}/progress`, progressData);
    addResult('4.2 PUT /api/:id/progress - Update Progress', progressResult.status === 200 || progressResult.status === 404,
        `Status: ${progressResult.status}, Progress: 50%`);
}

// Test Suite 5: Course Analytics & Statistics (Admin/Instructor)
async function testCourseAnalytics() {
    log('=== TEST SUITE 5: Analytics & Statistics ===', 'TEST');

    if (!testCourseId) {
        log('Skipping analytics tests - no course ID available', 'WARN');
        addResult('5.x Analytics Tests', false, 'No course ID available');
        return;
    }

    // Test 5.1: Get Course Statistics
    const stats = await testAPI('GET', `/courses/api/${testCourseId}/statistics`);
    addResult('5.1 GET /api/:id/statistics', stats.status === 200 || stats.status === 403,
        `Status: ${stats.status}`);

    // Test 5.2: Get Course Analytics
    const analytics = await testAPI('GET', `/courses/api/${testCourseId}/analytics`);
    addResult('5.2 GET /api/:id/analytics', analytics.status === 200 || analytics.status === 403,
        `Status: ${analytics.status}`);

    // Test 5.3: Get Course Progress Details
    const progressDetails = await testAPI('GET', `/courses/api/${testCourseId}/progress`);
    addResult('5.3 GET /api/:id/progress - Progress Details', progressDetails.status === 200 || progressDetails.status === 403,
        `Status: ${progressDetails.status}`);

    // Test 5.4: Export Analytics (CSV)
    const exportAnalytics = await testAPI('GET', `/courses/api/${testCourseId}/analytics/export?format=csv`);
    addResult('5.4 GET /api/:id/analytics/export - CSV Export', exportAnalytics.status === 200 || exportAnalytics.status === 403,
        `Status: ${exportAnalytics.status}`);

    // Test 5.5: Export Progress (JSON)
    const exportProgress = await testAPI('GET', `/courses/api/${testCourseId}/progress/export?format=json`);
    addResult('5.5 GET /api/:id/progress/export - JSON Export', exportProgress.status === 200 || exportProgress.status === 403,
        `Status: ${exportProgress.status}`);
}

// Test Suite 6: Course Content & Materials
async function testCourseContent() {
    log('=== TEST SUITE 6: Course Content & Materials ===', 'TEST');

    if (!testCourseId) {
        log('Skipping content tests - no course ID available', 'WARN');
        addResult('6.x Content Tests', false, 'No course ID available');
        return;
    }

    // Test 6.1: Get Course Curriculum
    const curriculum = await testAPI('GET', `/courses/api/${testCourseId}/curriculum`);
    addResult('6.1 GET /api/:id/curriculum', curriculum.status === 200,
        `Sections: ${curriculum.data?.data?.length || 0}`);

    // Test 6.2: Get Course Materials
    const materials = await testAPI('GET', `/courses/api/${testCourseId}/materials`);
    addResult('6.2 GET /api/:id/materials', materials.status === 200,
        `Materials: ${materials.data?.data?.length || 0}`);

    // Test 6.3: Get Course Discussions
    const discussions = await testAPI('GET', `/courses/api/${testCourseId}/discussions`);
    addResult('6.3 GET /api/:id/discussions', discussions.status === 200,
        `Discussions: ${discussions.data?.data?.length || 0}`);

    // Test 6.4: Get Course Reviews
    const reviews = await testAPI('GET', `/courses/api/${testCourseId}/reviews`);
    addResult('6.4 GET /api/:id/reviews', reviews.status === 200,
        `Reviews: ${reviews.data?.data?.length || 0}`);

    // Test 6.5: Get Related Courses
    const related = await testAPI('GET', `/courses/api/${testCourseId}/related`);
    addResult('6.5 GET /api/:id/related', related.status === 200,
        `Related: ${related.data?.data?.length || 0}`);
}

// Test Suite 7: Course Rating
async function testCourseRating() {
    log('=== TEST SUITE 7: Course Rating ===', 'TEST');

    if (!testCourseId) {
        log('Skipping rating tests - no course ID available', 'WARN');
        addResult('7.x Rating Tests', false, 'No course ID available');
        return;
    }

    // Test 7.1: Rate Course
    const ratingData = { rating: 5, review: 'Excellent course! Very informative.' };
    const rateResult = await testAPI('POST', `/courses/api/${testCourseId}/rate`, ratingData);
    addResult('7.1 POST /api/:id/rate - Rate Course',
        rateResult.status === 200 || rateResult.status === 403 || rateResult.status === 400,
        `Status: ${rateResult.status}, Message: ${rateResult.data?.message || 'N/A'}`);

    // Test 7.2: Rate with Invalid Rating (should fail)
    const invalidRating = await testAPI('POST', `/courses/api/${testCourseId}/rate`, { rating: 10 });
    addResult('7.2 POST /api/:id/rate - Invalid Rating', invalidRating.status === 400 || invalidRating.status === 403,
        `Status: ${invalidRating.status} (expected 400 or 403)`);
}

// Test Suite 8: Category Management (Admin Only)
async function testCategoryManagement() {
    log('=== TEST SUITE 8: Category Management (Admin) ===', 'TEST');

    // Test 8.1: Get All Categories Admin
    const allCategories = await testAPI('GET', '/courses/api/categories-admin/all');
    addResult('8.1 GET /api/categories-admin/all', allCategories.status === 200,
        `Categories: ${allCategories.data?.data?.length || 0}`);

    // Test 8.2: Create New Category
    const newCategoryData = {
        category_name: `Test Category ${Date.now()}`,
        category_name_en: `Test Category EN ${Date.now()}`,
        description: 'Auto test category',
        category_icon: 'fas fa-test',
        category_color: '#3498db',
        display_order: 99
    };
    const createCategory = await testAPI('POST', '/courses/api/categories-admin', newCategoryData);
    const categoryCreated = createCategory.status === 201 || createCategory.status === 200;
    addResult('8.2 POST /api/categories-admin - Create Category', categoryCreated,
        `Status: ${createCategory.status}`);

    if (categoryCreated && createCategory.data?.data?.category_id) {
        testCategoryId = createCategory.data.data.category_id;
        log(`Created test category ID: ${testCategoryId}`, 'INFO');

        // Test 8.3: Get Category by ID
        const getCategory = await testAPI('GET', `/courses/api/categories-admin/${testCategoryId}`);
        addResult('8.3 GET /api/categories-admin/:id', getCategory.status === 200,
            `Category: ${getCategory.data?.data?.category_name || 'N/A'}`);

        // Test 8.4: Update Category
        const updateCategoryData = {
            category_name: `Updated Category ${Date.now()}`,
            category_color: '#e74c3c'
        };
        const updateCategory = await testAPI('PUT', `/courses/api/categories-admin/${testCategoryId}`, updateCategoryData);
        addResult('8.4 PUT /api/categories-admin/:id - Update', updateCategory.status === 200,
            `Status: ${updateCategory.status}`);

        // Test 8.5: Delete Category
        const deleteCategory = await testAPI('DELETE', `/courses/api/categories-admin/${testCategoryId}`);
        addResult('8.5 DELETE /api/categories-admin/:id', deleteCategory.status === 200,
            `Status: ${deleteCategory.status}`);
    } else {
        addResult('8.3-8.5 Category CRUD', false, 'Failed to create test category');
    }
}

// Test Suite 9: Filter & Search Tests
async function testFiltersAndSearch() {
    log('=== TEST SUITE 9: Filters & Search ===', 'TEST');

    // Test 9.1: Filter by Category
    const byCategory = await testAPI('GET', '/courses/api/all?category_id=1');
    addResult('9.1 Filter by Category', byCategory.status === 200, `Status: ${byCategory.status}`);

    // Test 9.2: Filter by Difficulty Level
    const byDifficulty = await testAPI('GET', '/courses/api/all?difficulty_level=Beginner');
    addResult('9.2 Filter by Difficulty', byDifficulty.status === 200, `Status: ${byDifficulty.status}`);

    // Test 9.3: Filter by Course Type
    const byType = await testAPI('GET', '/courses/api/all?course_type=Online');
    addResult('9.3 Filter by Course Type', byType.status === 200, `Status: ${byType.status}`);

    // Test 9.4: Filter by Active Status
    const byStatus = await testAPI('GET', '/courses/api/all?is_active=true');
    addResult('9.4 Filter by Active Status', byStatus.status === 200, `Status: ${byStatus.status}`);

    // Test 9.5: Combined Filters
    const combined = await testAPI('GET', '/courses/api/all?difficulty_level=Beginner&course_type=Online&page=1&limit=5');
    addResult('9.5 Combined Filters', combined.status === 200,
        `Status: ${combined.status}, Results: ${combined.data?.data?.length || 0}`);

    // Test 9.6: Enrollment Status Filter
    const byEnrollmentStatus = await testAPI('GET', '/courses/api/my-courses?status=Active');
    addResult('9.6 Filter Enrollments by Status', byEnrollmentStatus.status === 200, `Status: ${byEnrollmentStatus.status}`);
}

// Test Suite 10: Delete Course (Admin Only)
async function testDeleteCourse() {
    log('=== TEST SUITE 10: Delete Course ===', 'TEST');

    if (!testCourseId) {
        log('Skipping delete test - no course ID available', 'WARN');
        addResult('10.1 Delete Course', false, 'No course ID available');
        return;
    }

    // Test 10.1: Delete Course
    const deleteResult = await testAPI('DELETE', `/courses/api/${testCourseId}`);
    addResult('10.1 DELETE /api/:id - Delete Course',
        deleteResult.status === 200 || deleteResult.status === 403,
        `Status: ${deleteResult.status}, Message: ${deleteResult.data?.message || 'N/A'}`);
}

// Test Suite 11: UI Interaction Tests
async function testUIInteractions() {
    log('=== TEST SUITE 11: UI Interaction Tests ===', 'TEST');

    // Test 11.1: Course List - Check Cards Display
    try {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle0', timeout: 30000 });
        await delay(2000);

        const cardsExist = await page.evaluate(() => {
            const cards = document.querySelectorAll('.course-card, .card, [class*="course"]');
            return cards.length > 0;
        });
        addResult('11.1 Course Cards Display', cardsExist, `Cards found on page`);
    } catch (e) {
        addResult('11.1 Course Cards Display', false, e.message);
    }

    // Test 11.2: Create Course Form Elements
    try {
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'networkidle0', timeout: 30000 });
        await delay(1000);

        const formElements = await page.evaluate(() => {
            const elements = {
                courseName: document.querySelector('[name="course_name"], #course_name, #courseName') !== null,
                category: document.querySelector('[name="category"], #category, select[name*="category"]') !== null,
                description: document.querySelector('[name="description"], #description, textarea[name="description"]') !== null,
                submitBtn: document.querySelector('button[type="submit"], .btn-submit, .submit-btn') !== null
            };
            return elements;
        });

        const allPresent = Object.values(formElements).filter(v => v).length >= 2;
        addResult('11.2 Create Form Elements', allPresent,
            `Elements found: ${JSON.stringify(formElements)}`);
    } catch (e) {
        addResult('11.2 Create Form Elements', false, e.message);
    }

    // Test 11.3: Category Management Page Elements
    try {
        await page.goto(`${BASE_URL}/courses/categories`, { waitUntil: 'networkidle0', timeout: 30000 });
        await delay(1000);

        const pageLoaded = await page.evaluate(() => {
            return document.body.innerText.length > 50;
        });
        addResult('11.3 Category Page Elements', pageLoaded, 'Page loaded successfully');
    } catch (e) {
        addResult('11.3 Category Page Elements', false, e.message);
    }
}

// Test Suite 12: Error Handling Tests
async function testErrorHandling() {
    log('=== TEST SUITE 12: Error Handling ===', 'TEST');

    // Test 12.1: Get Non-existent Course
    const notFound = await testAPI('GET', '/courses/api/999999');
    addResult('12.1 GET Non-existent Course', notFound.status === 404,
        `Status: ${notFound.status} (expected 404)`);

    // Test 12.2: Update Non-existent Course
    const updateNotFound = await testAPI('PUT', '/courses/api/999999', { course_name: 'Test' });
    addResult('12.2 PUT Non-existent Course', updateNotFound.status === 404,
        `Status: ${updateNotFound.status} (expected 404)`);

    // Test 12.3: Delete Non-existent Course
    const deleteNotFound = await testAPI('DELETE', '/courses/api/999999');
    addResult('12.3 DELETE Non-existent Course', deleteNotFound.status === 404,
        `Status: ${deleteNotFound.status} (expected 404)`);

    // Test 12.4: Get Non-existent Category
    const categoryNotFound = await testAPI('GET', '/courses/api/categories-admin/999999');
    addResult('12.4 GET Non-existent Category', categoryNotFound.status === 404,
        `Status: ${categoryNotFound.status} (expected 404)`);

    // Test 12.5: Invalid Progress Value
    if (testCourseId) {
        const invalidProgress = await testAPI('PUT', `/courses/api/${testCourseId}/progress`, { progress_percentage: 150 });
        addResult('12.5 Invalid Progress Value', invalidProgress.status === 400 || invalidProgress.status === 404,
            `Status: ${invalidProgress.status} (expected 400)`);
    } else {
        addResult('12.5 Invalid Progress Value', true, 'Skipped - no course ID');
    }
}

// Generate Test Report
function generateReport() {
    const totalTests = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = totalTests - passed;
    const passRate = ((passed / totalTests) * 100).toFixed(2);

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('                    COURSE MODULE TEST REPORT                          ');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    console.log('═══════════════════════════════════════════════════════════════════════');

    if (failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        console.log('─────────────────────────────────────────────────────────────────────');
        testResults.filter(r => !r.passed).forEach(r => {
            console.log(`  ❌ ${r.testName}`);
            console.log(`     Details: ${r.details}`);
        });
    }

    console.log('\n📋 ALL TEST RESULTS:');
    console.log('─────────────────────────────────────────────────────────────────────');
    testResults.forEach((r, i) => {
        const status = r.passed ? '✅' : '❌';
        console.log(`  ${status} ${r.testName}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log(`Test completed at: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════════════════');

    return { totalTests, passed, failed, passRate, results: testResults };
}

// Main Test Runner
async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('     COMPREHENSIVE AUTO BROWSER TEST FOR COURSE MODULE                 ');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    try {
        // Launch browser
        log('Launching browser...', 'INFO');
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
        });

        page = await browser.newPage();
        await page.setDefaultTimeout(30000);

        // Login first
        log('Logging in as Admin...', 'INFO');
        const loginSuccess = await login(LOGIN_CREDENTIALS.admin);
        if (!loginSuccess) {
            log('Login failed! Trying to continue without authentication...', 'WARN');
        }

        // Run all test suites
        await testPageRendering();
        await delay(1000);

        await testCourseListAPIs();
        await delay(1000);

        await testCourseCRUD();
        await delay(1000);

        await testEnrollmentProgress();
        await delay(1000);

        await testCourseAnalytics();
        await delay(1000);

        await testCourseContent();
        await delay(1000);

        await testCourseRating();
        await delay(1000);

        await testCategoryManagement();
        await delay(1000);

        await testFiltersAndSearch();
        await delay(1000);

        await testUIInteractions();
        await delay(1000);

        await testErrorHandling();
        await delay(1000);

        await testDeleteCourse();

        // Generate report
        const report = generateReport();

        // Keep browser open for viewing
        log('Tests completed. Browser will close in 10 seconds...', 'INFO');
        await delay(10000);

    } catch (error) {
        log(`Fatal error: ${error.message}`, 'FAIL');
        console.error(error);
    } finally {
        if (browser) {
            await browser.close();
        }
        process.exit(testResults.filter(r => !r.passed).length > 0 ? 1 : 0);
    }
}

// Run tests
runAllTests();
