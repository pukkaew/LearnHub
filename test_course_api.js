/**
 * Comprehensive API Test for Course Module
 * Uses direct HTTP requests for reliable testing
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3000';
const ADMIN_CREDENTIALS = { employee_id: 'ADM001', password: 'password123' };

let testResults = [];
let sessionCookie = '';
let testCourseId = null;
let testCategoryId = null;

// HTTP Request Helper
function makeRequest(method, path, body = null, customHeaders = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...customHeaders
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Save session cookies
                if (res.headers['set-cookie']) {
                    const cookies = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
                    if (cookies) sessionCookie = cookies;
                }

                let parsed;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            });
        });

        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Logging helpers
const log = (msg, type = 'INFO') => {
    const symbols = { INFO: '📋', PASS: '✅', FAIL: '❌', WARN: '⚠️', TEST: '🧪' };
    console.log(`${symbols[type] || '📋'} ${msg}`);
};

const addResult = (name, passed, details = '') => {
    testResults.push({ name, passed, details });
    log(`${name}: ${passed ? 'PASSED' : 'FAILED'} ${details}`, passed ? 'PASS' : 'FAIL');
};

// ==================== TEST SUITES ====================

async function loginAsAdmin() {
    log('=== Logging in as Admin ===', 'TEST');
    try {
        const res = await makeRequest('POST', '/auth/login', {
            employee_id: ADMIN_CREDENTIALS.employee_id,
            password: ADMIN_CREDENTIALS.password,
            remember: false
        });

        if (res.status === 200 && res.data.success) {
            log(`Login successful! Session established.`, 'PASS');
            return true;
        } else {
            log(`Login failed: ${res.data.message || 'Unknown error'}`, 'FAIL');
            return false;
        }
    } catch (err) {
        log(`Login error: ${err.message}`, 'FAIL');
        return false;
    }
}

async function testCourseListAPIs() {
    log('\n=== TEST SUITE: Course List APIs ===', 'TEST');

    // Test: Get All Courses
    try {
        const res = await makeRequest('GET', '/courses/api/all');
        const success = res.status === 200 && res.data.success === true;
        addResult('GET /api/all - All Courses', success,
            `Status: ${res.status}, Records: ${res.data?.data?.length || 0}`);
        if (res.data?.data?.length > 0) {
            testCourseId = res.data.data[0].course_id;
            log(`  Found existing course ID: ${testCourseId}`, 'INFO');
        }
    } catch (e) { addResult('GET /api/all - All Courses', false, e.message); }

    // Test: Pagination
    try {
        const res = await makeRequest('GET', '/courses/api/all?page=1&limit=5');
        addResult('GET /api/all - Pagination', res.status === 200,
            `Page: ${res.data?.pagination?.page}, Total: ${res.data?.pagination?.total}`);
    } catch (e) { addResult('GET /api/all - Pagination', false, e.message); }

    // Test: Search
    try {
        const res = await makeRequest('GET', '/courses/api/all?search=test');
        addResult('GET /api/all - Search', res.status === 200,
            `Results: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/all - Search', false, e.message); }

    // Test: Get Categories
    try {
        const res = await makeRequest('GET', '/courses/api/categories');
        addResult('GET /api/categories', res.status === 200,
            `Categories: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/categories', false, e.message); }

    // Test: Get Instructors
    try {
        const res = await makeRequest('GET', '/courses/api/instructors');
        addResult('GET /api/instructors', res.status === 200,
            `Instructors: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/instructors', false, e.message); }

    // Test: Get Target Positions
    try {
        const res = await makeRequest('GET', '/courses/api/target-positions');
        addResult('GET /api/target-positions', res.status === 200,
            `Positions: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/target-positions', false, e.message); }

    // Test: Get Target Departments
    try {
        const res = await makeRequest('GET', '/courses/api/target-departments');
        addResult('GET /api/target-departments', res.status === 200,
            `Departments: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/target-departments', false, e.message); }

    // Test: Recommended Courses
    try {
        const res = await makeRequest('GET', '/courses/api/recommended');
        addResult('GET /api/recommended', res.status === 200,
            `Courses: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/recommended', false, e.message); }

    // Test: Popular Courses
    try {
        const res = await makeRequest('GET', '/courses/api/popular');
        addResult('GET /api/popular', res.status === 200,
            `Courses: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/popular', false, e.message); }

    // Test: My Enrollments
    try {
        const res = await makeRequest('GET', '/courses/api/my-courses');
        addResult('GET /api/my-courses', res.status === 200,
            `Enrollments: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/my-courses', false, e.message); }

    // Test: Available Tests
    try {
        const res = await makeRequest('GET', '/courses/api/tests/available');
        addResult('GET /api/tests/available', res.status === 200,
            `Tests: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/tests/available', false, e.message); }
}

async function testCourseCRUD() {
    log('\n=== TEST SUITE: Course CRUD ===', 'TEST');

    // Test: Create Course (using correct field names based on validation)
    const newCourse = {
        title: `API Test Course ${Date.now()}`,
        course_name: `API Test Course ${Date.now()}`,
        course_code: `ATC${Date.now().toString().slice(-6)}`,
        description: 'This is an automated API test course created for comprehensive testing of the Course module. This description is at least 50 characters long to pass validation.',
        category_id: 1,
        category: 'IT/Computer',
        course_type: 'Online',
        difficulty_level: 'Beginner',
        language: 'th',
        duration_hours: 10,
        max_students: 50,
        is_active: true,
        status: 'published',
        learning_objectives: ['Test objective 1 - Understanding fundamentals', 'Test objective 2 - Practical application', 'Test objective 3 - Advanced concepts'],
        target_audience: 'Developers',
        prerequisites: 'None',
        instructor_name: 'API Test Instructor',
        lessons: [
            {
                title: 'Lesson 1 - Introduction to the Course',
                type: 'video',
                content: 'Introduction video content',
                order_index: 1
            },
            {
                title: 'Lesson 2 - Getting Started',
                type: 'document',
                content: 'Getting started guide content',
                order_index: 2
            }
        ]
    };

    try {
        const res = await makeRequest('POST', '/courses/api/create', newCourse);
        const success = res.status === 201 || (res.status === 200 && res.data.success);
        addResult('POST /api/create - Create Course', success,
            `Status: ${res.status}, Message: ${res.data?.message || 'N/A'}`);

        if (success && res.data?.data?.course_id) {
            testCourseId = res.data.data.course_id;
            log(`  Created course ID: ${testCourseId}`, 'INFO');
        }
    } catch (e) { addResult('POST /api/create - Create Course', false, e.message); }

    if (testCourseId) {
        // Test: Get Course by ID
        try {
            const res = await makeRequest('GET', `/courses/api/${testCourseId}`);
            addResult('GET /api/:id - Get Course', res.status === 200 && res.data.success,
                `Name: ${res.data?.data?.course_name || 'N/A'}`);
        } catch (e) { addResult('GET /api/:id - Get Course', false, e.message); }

        // Test: Update Course
        try {
            const res = await makeRequest('PUT', `/courses/api/${testCourseId}`, {
                course_name: `Updated Course ${Date.now()}`,
                description: 'Updated via API test'
            });
            addResult('PUT /api/:id - Update Course', res.status === 200,
                `Status: ${res.status}`);
        } catch (e) { addResult('PUT /api/:id - Update Course', false, e.message); }
    }
}

async function testEnrollmentProgress() {
    log('\n=== TEST SUITE: Enrollment & Progress ===', 'TEST');

    if (!testCourseId) {
        addResult('Enrollment Tests', false, 'No course ID available');
        return;
    }

    // Test: Enroll
    try {
        const res = await makeRequest('POST', `/courses/api/${testCourseId}/enroll`);
        const success = res.status === 201 || res.status === 200 || res.status === 400;
        addResult('POST /api/:id/enroll', success,
            `Status: ${res.status}, Message: ${res.data?.message || 'N/A'}`);
    } catch (e) { addResult('POST /api/:id/enroll', false, e.message); }

    // Test: Update Progress
    try {
        const res = await makeRequest('PUT', `/courses/api/${testCourseId}/progress`, {
            progress_percentage: 50
        });
        addResult('PUT /api/:id/progress', res.status === 200 || res.status === 404,
            `Status: ${res.status}`);
    } catch (e) { addResult('PUT /api/:id/progress', false, e.message); }
}

async function testCourseAnalytics() {
    log('\n=== TEST SUITE: Analytics & Statistics ===', 'TEST');

    if (!testCourseId) {
        addResult('Analytics Tests', false, 'No course ID available');
        return;
    }

    // Test: Statistics
    try {
        const res = await makeRequest('GET', `/courses/api/${testCourseId}/statistics`);
        addResult('GET /api/:id/statistics', res.status === 200 || res.status === 403,
            `Status: ${res.status}`);
    } catch (e) { addResult('GET /api/:id/statistics', false, e.message); }

    // Test: Analytics
    try {
        const res = await makeRequest('GET', `/courses/api/${testCourseId}/analytics`);
        addResult('GET /api/:id/analytics', res.status === 200 || res.status === 403,
            `Status: ${res.status}`);
    } catch (e) { addResult('GET /api/:id/analytics', false, e.message); }

    // Test: Progress Details
    try {
        const res = await makeRequest('GET', `/courses/api/${testCourseId}/progress`);
        addResult('GET /api/:id/progress', res.status === 200 || res.status === 403,
            `Status: ${res.status}`);
    } catch (e) { addResult('GET /api/:id/progress', false, e.message); }
}

async function testCourseContent() {
    log('\n=== TEST SUITE: Course Content ===', 'TEST');

    if (!testCourseId) {
        addResult('Content Tests', false, 'No course ID available');
        return;
    }

    // Test: Curriculum
    try {
        const res = await makeRequest('GET', `/courses/api/${testCourseId}/curriculum`);
        addResult('GET /api/:id/curriculum', res.status === 200,
            `Sections: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/:id/curriculum', false, e.message); }

    // Test: Materials
    try {
        const res = await makeRequest('GET', `/courses/api/${testCourseId}/materials`);
        addResult('GET /api/:id/materials', res.status === 200,
            `Materials: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/:id/materials', false, e.message); }

    // Test: Discussions
    try {
        const res = await makeRequest('GET', `/courses/api/${testCourseId}/discussions`);
        addResult('GET /api/:id/discussions', res.status === 200,
            `Discussions: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/:id/discussions', false, e.message); }

    // Test: Reviews
    try {
        const res = await makeRequest('GET', `/courses/api/${testCourseId}/reviews`);
        addResult('GET /api/:id/reviews', res.status === 200,
            `Reviews: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/:id/reviews', false, e.message); }

    // Test: Related Courses
    try {
        const res = await makeRequest('GET', `/courses/api/${testCourseId}/related`);
        addResult('GET /api/:id/related', res.status === 200,
            `Related: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/:id/related', false, e.message); }
}

async function testCategoryManagement() {
    log('\n=== TEST SUITE: Category Management ===', 'TEST');

    // Test: Get All Categories Admin
    try {
        const res = await makeRequest('GET', '/courses/api/categories-admin/all');
        addResult('GET /api/categories-admin/all', res.status === 200,
            `Categories: ${res.data?.data?.length || 0}`);
    } catch (e) { addResult('GET /api/categories-admin/all', false, e.message); }

    // Test: Create Category
    try {
        const res = await makeRequest('POST', '/courses/api/categories-admin', {
            category_name: `Test Category ${Date.now()}`,
            category_name_en: `Test Category EN ${Date.now()}`,
            description: 'API test category',
            category_icon: 'fas fa-test',
            category_color: '#3498db',
            display_order: 99
        });
        const success = res.status === 201 || res.status === 200;
        addResult('POST /api/categories-admin', success,
            `Status: ${res.status}`);

        if (success && res.data?.data?.category_id) {
            testCategoryId = res.data.data.category_id;
            log(`  Created category ID: ${testCategoryId}`, 'INFO');
        }
    } catch (e) { addResult('POST /api/categories-admin', false, e.message); }

    if (testCategoryId) {
        // Test: Get Category by ID
        try {
            const res = await makeRequest('GET', `/courses/api/categories-admin/${testCategoryId}`);
            addResult('GET /api/categories-admin/:id', res.status === 200,
                `Name: ${res.data?.data?.category_name || 'N/A'}`);
        } catch (e) { addResult('GET /api/categories-admin/:id', false, e.message); }

        // Test: Update Category
        try {
            const res = await makeRequest('PUT', `/courses/api/categories-admin/${testCategoryId}`, {
                category_name: `Updated Category ${Date.now()}`
            });
            addResult('PUT /api/categories-admin/:id', res.status === 200,
                `Status: ${res.status}`);
        } catch (e) { addResult('PUT /api/categories-admin/:id', false, e.message); }

        // Test: Delete Category
        try {
            const res = await makeRequest('DELETE', `/courses/api/categories-admin/${testCategoryId}`);
            addResult('DELETE /api/categories-admin/:id', res.status === 200,
                `Status: ${res.status}`);
        } catch (e) { addResult('DELETE /api/categories-admin/:id', false, e.message); }
    }
}

async function testFilters() {
    log('\n=== TEST SUITE: Filters ===', 'TEST');

    const filters = [
        { name: 'Category', query: 'category_id=1' },
        { name: 'Difficulty', query: 'difficulty_level=Beginner' },
        { name: 'Course Type', query: 'course_type=Online' },
        { name: 'Active Status', query: 'is_active=true' },
        { name: 'Combined', query: 'difficulty_level=Beginner&course_type=Online&page=1&limit=5' }
    ];

    for (const filter of filters) {
        try {
            const res = await makeRequest('GET', `/courses/api/all?${filter.query}`);
            addResult(`Filter: ${filter.name}`, res.status === 200,
                `Results: ${res.data?.data?.length || 0}`);
        } catch (e) { addResult(`Filter: ${filter.name}`, false, e.message); }
    }
}

async function testErrorHandling() {
    log('\n=== TEST SUITE: Error Handling ===', 'TEST');

    // Non-existent course
    try {
        const res = await makeRequest('GET', '/courses/api/999999');
        addResult('GET Non-existent Course', res.status === 404,
            `Status: ${res.status} (expected 404)`);
    } catch (e) { addResult('GET Non-existent Course', false, e.message); }

    // Non-existent category
    try {
        const res = await makeRequest('GET', '/courses/api/categories-admin/999999');
        addResult('GET Non-existent Category', res.status === 404,
            `Status: ${res.status} (expected 404)`);
    } catch (e) { addResult('GET Non-existent Category', false, e.message); }
}

async function testDeleteCourse() {
    log('\n=== TEST SUITE: Delete Course ===', 'TEST');

    if (!testCourseId) {
        addResult('DELETE Course', false, 'No course ID available');
        return;
    }

    try {
        const res = await makeRequest('DELETE', `/courses/api/${testCourseId}`);
        addResult('DELETE /api/:id', res.status === 200 || res.status === 403,
            `Status: ${res.status}`);
    } catch (e) { addResult('DELETE /api/:id', false, e.message); }
}

// Generate Report
function generateReport() {
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const rate = ((passed / total) * 100).toFixed(2);

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('                    COURSE API TEST REPORT                              ');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`📊 Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Pass Rate: ${rate}%`);
    console.log('═══════════════════════════════════════════════════════════════════════');

    if (failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.filter(r => !r.passed).forEach(r => {
            console.log(`  ❌ ${r.name}: ${r.details}`);
        });
    }

    console.log('\n📋 ALL RESULTS:');
    testResults.forEach(r => {
        console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════════════════');
}

// Main
async function main() {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('        COMPREHENSIVE API TEST FOR COURSE MODULE                        ');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    const loggedIn = await loginAsAdmin();
    if (!loggedIn) {
        log('Cannot continue without authentication', 'FAIL');
        process.exit(1);
    }

    await testCourseListAPIs();
    await testCourseCRUD();
    await testEnrollmentProgress();
    await testCourseAnalytics();
    await testCourseContent();
    await testCategoryManagement();
    await testFilters();
    await testErrorHandling();
    await testDeleteCourse();

    generateReport();
    process.exit(testResults.filter(r => !r.passed).length > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
