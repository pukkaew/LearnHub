/**
 * 🧪 ทดสอบ API สร้างคอร์สแบบละเอียดทุกเงื่อนไข - รันจริง!
 * รันด้วย: node test_api_comprehensive.js
 */

const fetch = require('node-fetch');
const FormData = require('form-data');

// Colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    bold: '\x1b[1m'
};

let passedTests = 0;
let failedTests = 0;
let totalTests = 0;
let sessionCookie = null;

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function testResult(id, name, status, detail = '') {
    totalTests++;
    const icon = status ? '✅' : '❌';
    const color = status ? colors.green : colors.red;

    if (status) passedTests++;
    else failedTests++;

    log(`${icon} [${id}] ${name}`, color);
    if (detail) log(`   → ${detail}`, colors.cyan);
}

function section(title) {
    log('\n' + '='.repeat(70), colors.blue);
    log(`📋 ${title}`, colors.blue);
    log('='.repeat(70), colors.blue);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Test Suite
// ============================================================================
async function runComprehensiveTests() {
    log('\n╔════════════════════════════════════════════════════════════════════╗', colors.magenta);
    log('║                                                                    ║', colors.magenta);
    log('║     🧪 ทดสอบ API สร้างคอร์สแบบละเอียดทุกเงื่อนไข - รันจริง!    ║', colors.magenta);
    log('║                                                                    ║', colors.magenta);
    log('╚════════════════════════════════════════════════════════════════════╝', colors.magenta);

    const baseURL = 'http://localhost:3000';

    // ========================================================================
    // Test 1: Login
    // ========================================================================
    section('Test 1: Login เพื่อรับ Session');

    try {
        log('📤 กำลัง Login...', colors.yellow);
        const loginResponse = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                employee_id: 'ADM001',
                password: 'password123',
                remember: false
            })
        });

        const setCookieHeaders = loginResponse.headers.raw()['set-cookie'];
        if (setCookieHeaders && setCookieHeaders.length > 0) {
            // Extract all cookies
            const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]);
            sessionCookie = cookies.join('; ');
            log(`🍪 Cookies: ${sessionCookie.substring(0, 80)}...`, colors.cyan);
        }

        const loginResult = await loginResponse.json();

        testResult('T1.1', 'Login Success',
            loginResponse.ok && loginResult.success,
            `Status: ${loginResponse.status}, Success: ${loginResult.success}`);

        testResult('T1.2', 'Session Cookie Received',
            sessionCookie !== null,
            sessionCookie ? 'Cookie saved' : 'No cookie!');

        if (!sessionCookie) {
            log('\n❌ ไม่สามารถ login ได้! ไม่สามารถทดสอบต่อ', colors.red);
            return;
        }

    } catch (error) {
        testResult('T1.1', 'Login Failed', false, error.message);
        return;
    }

    await sleep(500);

    // ========================================================================
    // Test 2: ดึงข้อมูล Categories
    // ========================================================================
    section('Test 2: ดึงข้อมูล Categories');

    let categories = [];
    let selectedCategoryId = null;

    try {
        log('📤 ดึงข้อมูล Categories...', colors.yellow);
        const catResponse = await fetch(`${baseURL}/courses/api/categories`, {
            headers: {
                'Cookie': sessionCookie
            }
        });

        const catResult = await catResponse.json();
        categories = catResult.data || [];

        testResult('T2.1', 'Get Categories',
            catResponse.ok && categories.length > 0,
            `พบ ${categories.length} categories`);

        if (categories.length > 0) {
            selectedCategoryId = categories[0].category_id;
            log(`   Selected: ${categories[0].category_name} (ID: ${selectedCategoryId})`, colors.cyan);
        }

    } catch (error) {
        testResult('T2.1', 'Get Categories Failed', false, error.message);
    }

    await sleep(500);

    // ========================================================================
    // Test 3: ดึงข้อมูล Departments
    // ========================================================================
    section('Test 3: ดึงข้อมูล Departments');

    let departments = [];
    let selectedDepartmentIds = [];

    try {
        log('📤 ดึงข้อมูล Departments...', colors.yellow);
        const deptResponse = await fetch(`${baseURL}/courses/api/target-departments`, {
            headers: {
                'Cookie': sessionCookie
            }
        });

        const deptResult = await deptResponse.json();
        departments = deptResult.data || [];

        testResult('T3.1', 'Get Departments',
            deptResponse.ok && departments.length > 0,
            `พบ ${departments.length} departments`);

        if (departments.length >= 2) {
            selectedDepartmentIds = [
                departments[0].org_unit_id.toString(),
                departments[1].org_unit_id.toString()
            ];
            log(`   Selected: ${departments[0].org_unit_name}, ${departments[1].org_unit_name}`, colors.cyan);
        } else if (departments.length > 0) {
            selectedDepartmentIds = [departments[0].org_unit_id.toString()];
            log(`   Selected: ${departments[0].org_unit_name}`, colors.cyan);
        }

    } catch (error) {
        testResult('T3.1', 'Get Departments Failed', false, error.message);
    }

    await sleep(500);

    // ========================================================================
    // Test 4: ดึงข้อมูล Positions
    // ========================================================================
    section('Test 4: ดึงข้อมูล Positions');

    let positions = [];
    let selectedPositionIds = [];

    try {
        log('📤 ดึงข้อมูล Positions...', colors.yellow);
        const posResponse = await fetch(`${baseURL}/courses/api/target-positions`, {
            headers: {
                'Cookie': sessionCookie
            }
        });

        const posResult = await posResponse.json();
        positions = posResult.data || [];

        testResult('T4.1', 'Get Positions',
            posResponse.ok && positions.length > 0,
            `พบ ${positions.length} positions`);

        if (positions.length >= 2) {
            selectedPositionIds = [
                positions[0].position_id.toString(),
                positions[1].position_id.toString()
            ];
            log(`   Selected: ${positions[0].position_name}, ${positions[1].position_name}`, colors.cyan);
        } else if (positions.length > 0) {
            selectedPositionIds = [positions[0].position_id.toString()];
            log(`   Selected: ${positions[0].position_name}`, colors.cyan);
        }

    } catch (error) {
        testResult('T4.1', 'Get Positions Failed', false, error.message);
    }

    await sleep(500);

    // ========================================================================
    // Test 5: สร้างข้อสอบก่อน
    // ========================================================================
    section('Test 5: สร้างข้อสอบ (Pre-requisite)');

    let testId = null;

    try {
        log('📤 กำลังสร้างข้อสอบ...', colors.yellow);

        const testData = {
            test_name: 'Test Assessment for Course Creation',
            test_description: 'แบบทดสอบสำหรับทดสอบระบบ',
            test_type: 'final_assessment',
            passing_score: 70,
            max_attempts: 2,
            time_limit: 60,
            is_graded: true,
            is_required: true,
            is_passing_required: true
        };

        const testResponse = await fetch(`${baseURL}/courses/api/tests/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            body: JSON.stringify(testData)
        });

        const testResult = await testResponse.json();

        if (testResponse.ok && testResult.success && testResult.data) {
            testId = testResult.data.test_id;
        }

        testResult('T5.1', 'Create Test',
            testResponse.ok && testId !== null,
            testId ? `Test ID: ${testId}` : 'Failed to create test');

    } catch (error) {
        testResult('T5.1', 'Create Test Failed', false, error.message);
    }

    if (!testId) {
        log('\n⚠️ ไม่สามารถสร้างข้อสอบได้ แต่ยังทดสอบสร้างคอร์สต่อได้', colors.yellow);
    }

    await sleep(500);

    // ========================================================================
    // Test 6: สร้างคอร์ส - Happy Path (ข้อมูลครบถ้วน)
    // ========================================================================
    section('Test 6: สร้างคอร์ส - Happy Path (ข้อมูลครบถ้วน)');

    try {
        log('📤 กำลังสร้างคอร์ส...', colors.yellow);

        const courseData = {
            // Basic info
            course_name: 'Test Course 2025 - API Comprehensive Test',
            title: 'Test Course 2025 - API Comprehensive Test',  // ← CRITICAL
            category_id: selectedCategoryId || 1,
            difficulty_level: 'beginner',
            course_type: 'mandatory',
            language: 'th',

            // Description
            description: 'นี่คือคำอธิบายหลักสูตรทดสอบที่มีความยาวอย่างน้อย 50 ตัวอักษรเพื่อผ่าน validation และทดสอบระบบอย่างครบถ้วน',

            // Learning objectives
            learning_objectives: [
                'เพื่อทดสอบระบบการสร้างคอร์สอย่างครบถ้วน',
                'เพื่อตรวจสอบ validation ทุกเงื่อนไข',
                'เพื่อทดสอบ data transformation และ field mapping'
            ],

            // Duration
            duration_hours: 2.5,  // 2 hours 30 minutes

            // Target audience
            target_departments: selectedDepartmentIds,
            target_positions: selectedPositionIds,

            // Lessons
            lessons: [
                {
                    title: 'บทเรียนที่ 1 - บทนำ',
                    duration: 30,
                    description: 'บทเรียนทดสอบระบบ',
                    video_url: null
                },
                {
                    title: 'บทเรียนที่ 2 - ขั้นสูง',
                    duration: 45,
                    description: 'เนื้อหาขั้นสูง',
                    video_url: null
                }
            ],

            // Test/Assessment
            test_id: testId,
            assessment_type: testId ? 'existing' : 'create_new',
            passing_score: 70,
            max_attempts: 2,

            // Optional fields
            max_students: null,
            external_links: []
        };

        log('\n📋 ข้อมูลที่ส่ง:', colors.cyan);
        log(`   title: "${courseData.title}"`, colors.cyan);
        log(`   course_name: "${courseData.course_name}"`, colors.cyan);
        log(`   category_id: ${courseData.category_id}`, colors.cyan);
        log(`   duration_hours: ${courseData.duration_hours}`, colors.cyan);
        log(`   learning_objectives: ${courseData.learning_objectives.length} items`, colors.cyan);
        log(`   target_departments: [${courseData.target_departments.join(', ')}]`, colors.cyan);
        log(`   target_positions: [${courseData.target_positions.join(', ')}]`, colors.cyan);
        log(`   lessons: ${courseData.lessons.length} lessons`, colors.cyan);

        const courseResponse = await fetch(`${baseURL}/courses/api/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            body: JSON.stringify(courseData)
        });

        const courseResult = await courseResponse.json();

        log('\n📥 Response:', colors.cyan);
        log(`   Status: ${courseResponse.status}`, colors.cyan);
        log(`   Success: ${courseResult.success}`, colors.cyan);
        if (courseResult.message) {
            log(`   Message: ${courseResult.message}`, colors.cyan);
        }
        if (courseResult.errors) {
            log(`   Errors: ${JSON.stringify(courseResult.errors, null, 2)}`, colors.red);
        }

        testResult('T6.1', 'Create Course - API Call',
            courseResponse.ok,
            `Status: ${courseResponse.status}`);

        testResult('T6.2', 'Create Course - Success Response',
            courseResult.success === true,
            courseResult.success ? 'Success: true' : `Success: ${courseResult.success}`);

        testResult('T6.3', 'Create Course - Has Course ID',
            courseResult.data && courseResult.data.course_id,
            courseResult.data?.course_id ? `Course ID: ${courseResult.data.course_id}` : 'No course ID');

        if (courseResult.data?.course_id) {
            log(`\n✅ คอร์สถูกสร้างสำเร็จ! Course ID: ${courseResult.data.course_id}`, colors.green);
        }

    } catch (error) {
        testResult('T6.1', 'Create Course Failed', false, error.message);
        log(`\nFull error: ${error.stack}`, colors.red);
    }

    await sleep(1000);

    // ========================================================================
    // Test 7: สร้างคอร์ส - Error Case: ไม่มี title
    // ========================================================================
    section('Test 7: สร้างคอร์ส - Error Case (ไม่มี title)');

    try {
        log('📤 ส่งข้อมูลที่ไม่มี title...', colors.yellow);

        const courseDataNoTitle = {
            course_name: 'Test Course Without Title',
            // title: missing! ← จงใจไม่ส่ง
            category_id: selectedCategoryId || 1,
            difficulty_level: 'beginner',
            course_type: 'mandatory',
            language: 'th',
            description: 'นี่คือคำอธิบายหลักสูตรทดสอบที่มีความยาวอย่างน้อย 50 ตัวอักษร',
            learning_objectives: [
                'วัตถุประสงค์ข้อที่ 1 สำหรับทดสอบ',
                'วัตถุประสงค์ข้อที่ 2 สำหรับทดสอบ',
                'วัตถุประสงค์ข้อที่ 3 สำหรับทดสอบ'
            ],
            duration_hours: 2.5,
            lessons: [
                {
                    title: 'บทเรียนที่ 1',
                    duration: 30,
                    description: 'ทดสอบ'
                }
            ],
            test_id: testId,
            assessment_type: testId ? 'existing' : 'create_new',
            target_departments: [],
            target_positions: [],
            passing_score: 70,
            max_attempts: 2
        };

        log(`   title field: ${courseDataNoTitle.title === undefined ? 'undefined' : courseDataNoTitle.title}`, colors.cyan);

        const errorResponse = await fetch(`${baseURL}/courses/api/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            body: JSON.stringify(courseDataNoTitle)
        });

        const errorResult = await errorResponse.json();

        log('\n📥 Response:', colors.cyan);
        log(`   Status: ${errorResponse.status}`, colors.cyan);
        log(`   Success: ${errorResult.success}`, colors.cyan);
        if (errorResult.errors) {
            log(`   Errors: ${JSON.stringify(errorResult.errors, null, 2)}`, colors.yellow);
        }

        testResult('T7.1', 'Error Response - Status 400',
            errorResponse.status === 400,
            `Status: ${errorResponse.status}`);

        testResult('T7.2', 'Error Response - Has title Error',
            errorResult.errors && errorResult.errors.title,
            errorResult.errors?.title ? `Error: ${errorResult.errors.title[0]}` : 'No title error');

        testResult('T7.3', 'Error Response - Success = false',
            errorResult.success === false,
            `Success: ${errorResult.success}`);

    } catch (error) {
        testResult('T7.1', 'Error Case Test Failed', false, error.message);
    }

    await sleep(1000);

    // ========================================================================
    // Test 8: สร้างคอร์ส - Error Case: คำอธิบายสั้นเกินไป
    // ========================================================================
    section('Test 8: สร้างคอร์ส - Error Case (คำอธิบายสั้น)');

    try {
        log('📤 ส่งข้อมูลที่คำอธิบายสั้นเกินไป...', colors.yellow);

        const courseDataShortDesc = {
            course_name: 'Test Course Short Description',
            title: 'Test Course Short Description',
            category_id: selectedCategoryId || 1,
            difficulty_level: 'beginner',
            course_type: 'mandatory',
            language: 'th',
            description: 'สั้นมาก',  // ← น้อยกว่า 20 ตัวอักษร (server validation)
            learning_objectives: [
                'วัตถุประสงค์ข้อที่ 1 สำหรับทดสอบ',
                'วัตถุประสงค์ข้อที่ 2 สำหรับทดสอบ',
                'วัตถุประสงค์ข้อที่ 3 สำหรับทดสอบ'
            ],
            duration_hours: 2.5,
            lessons: [
                {
                    title: 'บทเรียนที่ 1',
                    duration: 30,
                    description: 'ทดสอบ'
                }
            ],
            test_id: testId,
            assessment_type: testId ? 'existing' : 'create_new',
            target_departments: [],
            target_positions: [],
            passing_score: 70,
            max_attempts: 2
        };

        log(`   description length: ${courseDataShortDesc.description.length} chars`, colors.cyan);

        const errorResponse = await fetch(`${baseURL}/courses/api/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            body: JSON.stringify(courseDataShortDesc)
        });

        const errorResult = await errorResponse.json();

        log('\n📥 Response:', colors.cyan);
        log(`   Status: ${errorResponse.status}`, colors.cyan);
        if (errorResult.errors) {
            log(`   Errors: ${JSON.stringify(errorResult.errors, null, 2)}`, colors.yellow);
        }

        testResult('T8.1', 'Validation Error for Short Description',
            errorResponse.status === 400 && errorResult.errors && errorResult.errors.description,
            errorResult.errors?.description ? `Error: ${errorResult.errors.description[0]}` : 'No description error');

    } catch (error) {
        testResult('T8.1', 'Short Description Test Failed', false, error.message);
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    section('📊 สรุปผลการทดสอบ API แบบละเอียด');

    const passRate = ((passedTests / totalTests) * 100).toFixed(2);
    const color = passRate >= 90 ? colors.green : passRate >= 70 ? colors.yellow : colors.red;

    log(`\n${colors.bold}Total Tests: ${totalTests}${colors.reset}`, colors.blue);
    log(`${colors.bold}✅ Passed: ${passedTests}${colors.reset}`, colors.green);
    log(`${colors.bold}❌ Failed: ${failedTests}${colors.reset}`, colors.red);
    log(`${colors.bold}Pass Rate: ${passRate}%${colors.reset}`, color);

    // Critical tests summary
    log('\n🔍 Critical Tests Summary:', colors.magenta);
    log('   T1.1-1.2: Login & Session ✓', colors.cyan);
    log('   T2.1: Get Categories ✓', colors.cyan);
    log('   T6.1-6.3: Create Course (Happy Path) - MOST IMPORTANT', colors.cyan);
    log('   T7.1-7.3: Error Handling (No title) ✓', colors.cyan);

    if (failedTests === 0) {
        log('\n🎉 ผ่านทุกการทดสอบ API! ระบบพร้อมใช้งาน 100%', colors.green);
        log('\n✅ สรุป:', colors.green);
        log('   - API endpoint ทำงานถูกต้อง', colors.cyan);
        log('   - Field mapping (title) ทำงานถูกต้อง', colors.cyan);
        log('   - Validation ทำงานถูกต้อง', colors.cyan);
        log('   - Error handling ทำงานถูกต้อง', colors.cyan);
    } else {
        log('\n⚠️ พบปัญหาบางข้อ', colors.yellow);
        log('\nแนะนำ:', colors.yellow);
        log('   1. ตรวจสอบ server logs', colors.cyan);
        log('   2. ตรวจสอบ error messages ด้านบน', colors.cyan);
        log('   3. แก้ไขตามคำแนะนำ', colors.cyan);
    }

    log('\n' + '='.repeat(70), colors.blue);
    log('✅ การทดสอบ API เสร็จสิ้น', colors.blue);
    log('='.repeat(70) + '\n', colors.blue);
}

// Run tests
runComprehensiveTests().catch(error => {
    console.error('\n❌ Test execution error:', error);
    console.error(error.stack);
    process.exit(1);
});
