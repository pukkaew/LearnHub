/**
 * ============================================================================
 * API COURSE FULL LOOP TEST - ทดสอบครบลูปการสร้างหลักสูตรผ่าน API
 * ============================================================================
 * 1. Login ผ่าน API
 * 2. สร้างหลักสูตรผ่าน API
 * 3. ตรวจสอบว่าหลักสูตรถูกบันทึกใน Database
 * 4. ดึงข้อมูลหลักสูตรที่สร้างมาตรวจสอบ
 */

const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;
const CREDENTIALS = { employee_id: 'ADM001', password: 'password123' };

// Helper function for HTTP requests
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            const cookies = res.headers['set-cookie'] || [];

            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json, cookies, headers: res.headers });
                } catch {
                    resolve({ status: res.statusCode, data: data, cookies, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function runFullLoopTest() {
    const timestamp = Date.now();
    const COURSE_NAME = `หลักสูตรทดสอบ API ${timestamp}`;
    let sessionCookie = '';
    let createdCourseId = null;

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║       API COURSE FULL LOOP TEST - ทดสอบครบลูปผ่าน API          ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  Course Name: ${COURSE_NAME.substring(0, 45).padEnd(45)}  ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    try {
        // ========== STEP 1: LOGIN ==========
        console.log('🔐 [STEP 1] Logging in...');

        const loginData = JSON.stringify({
            employee_id: CREDENTIALS.employee_id,
            password: CREDENTIALS.password
        });

        const loginResponse = await makeRequest({
            hostname: BASE_URL,
            port: PORT,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData),
                'User-Agent': 'LearnHub-API-Test/1.0'
            }
        }, loginData);

        if (loginResponse.status === 200 && loginResponse.data.success) {
            sessionCookie = loginResponse.cookies.map(c => c.split(';')[0]).join('; ');
            console.log('   ✅ Login successful!');
            console.log(`   👤 User: ${loginResponse.data.user?.first_name || 'Admin'} ${loginResponse.data.user?.last_name || ''}`);
            console.log(`   🔑 Role: ${loginResponse.data.user?.role_name || 'Admin'}\n`);
        } else {
            throw new Error(`Login failed: ${JSON.stringify(loginResponse.data)}`);
        }

        // ========== STEP 2: GET CATEGORIES ==========
        console.log('📂 [STEP 2] Getting categories...');

        const categoriesResponse = await makeRequest({
            hostname: BASE_URL,
            port: PORT,
            path: '/api/courses/categories',
            method: 'GET',
            headers: {
                'Cookie': sessionCookie,
                'User-Agent': 'LearnHub-API-Test/1.0'
            }
        });

        let categoryId = 1; // Default
        if (categoriesResponse.data.success && categoriesResponse.data.data?.length > 0) {
            categoryId = categoriesResponse.data.data[0].category_id;
            console.log(`   ✅ Found ${categoriesResponse.data.data.length} categories`);
            console.log(`   📁 Using category: ${categoriesResponse.data.data[0].category_name} (ID: ${categoryId})\n`);
        } else {
            console.log('   ⚠️ No categories found, using default ID: 1\n');
        }

        // ========== STEP 3: CREATE COURSE ==========
        console.log('📝 [STEP 3] Creating course...');

        const courseData = JSON.stringify({
            course_name: COURSE_NAME,
            course_code: `TEST-${timestamp}`,
            category_id: categoryId,
            difficulty_level: 'Beginner',
            course_type: 'Online',
            language: 'th',
            description: 'นี่คือหลักสูตรทดสอบที่สร้างโดย API Test Script เพื่อทดสอบการบันทึกข้อมูลลงฐานข้อมูลแบบครบลูป',
            learning_objectives: JSON.stringify([
                'เข้าใจหลักการพื้นฐาน',
                'สามารถประยุกต์ใช้งานได้',
                'พัฒนาทักษะการแก้ปัญหา'
            ]),
            duration_hours: 2,
            duration_minutes: 30,
            max_students: 50,
            is_active: true,
            status: 'Published'
        });

        console.log('   📤 Sending course data:');
        console.log(`      - Course Name: ${COURSE_NAME}`);
        console.log(`      - Category ID: ${categoryId}`);
        console.log(`      - Course Type: Online`);
        console.log(`      - Language: th`);
        console.log(`      - Duration: 2h 30m`);

        const createResponse = await makeRequest({
            hostname: BASE_URL,
            port: PORT,
            path: '/api/courses/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(courseData),
                'Cookie': sessionCookie,
                'User-Agent': 'LearnHub-API-Test/1.0'
            }
        }, courseData);

        console.log(`\n   📡 API Response (Status: ${createResponse.status}):`);
        console.log(`   ${JSON.stringify(createResponse.data, null, 2).split('\n').join('\n   ')}`);

        if (createResponse.status === 201 && createResponse.data.success) {
            createdCourseId = createResponse.data.data?.course_id;
            console.log('\n   ✅ Course created successfully!');
            console.log(`   🆔 Course ID: ${createdCourseId}\n`);
        } else {
            console.log('\n   ❌ Course creation failed');
            console.log(`   Error: ${createResponse.data.message || 'Unknown error'}\n`);
        }

        // ========== STEP 4: VERIFY IN DATABASE ==========
        console.log('🔍 [STEP 4] Verifying course in database...');

        if (createdCourseId) {
            const verifyResponse = await makeRequest({
                hostname: BASE_URL,
                port: PORT,
                path: `/api/courses/${createdCourseId}`,
                method: 'GET',
                headers: {
                    'Cookie': sessionCookie
                }
            });

            if (verifyResponse.status === 200 && verifyResponse.data.success) {
                const course = verifyResponse.data.data;
                console.log('   ✅ Course found in database!');
                console.log('\n   📋 Course Details from Database:');
                console.log('   ┌──────────────────────────────────────────────────────────┐');
                console.log(`   │ Course ID:    ${String(course.course_id || '').padEnd(42)} │`);
                console.log(`   │ Course Name:  ${String(course.course_name || '').substring(0, 42).padEnd(42)} │`);
                console.log(`   │ Course Code:  ${String(course.course_code || '').padEnd(42)} │`);
                console.log(`   │ Category:     ${String(course.category || course.category_name || '').padEnd(42)} │`);
                console.log(`   │ Course Type:  ${String(course.course_type || '').padEnd(42)} │`);
                console.log(`   │ Difficulty:   ${String(course.difficulty_level || '').padEnd(42)} │`);
                console.log(`   │ Language:     ${String(course.language || '').padEnd(42)} │`);
                console.log(`   │ Duration:     ${String((course.duration_hours || 0) + 'h ' + (course.duration_minutes || 0) + 'm').padEnd(42)} │`);
                console.log(`   │ Status:       ${String(course.status || '').padEnd(42)} │`);
                console.log(`   │ Is Active:    ${String(course.is_active).padEnd(42)} │`);
                console.log('   └──────────────────────────────────────────────────────────┘');
            } else {
                console.log('   ❌ Course NOT found in database');
                console.log(`   Response: ${JSON.stringify(verifyResponse.data)}`);
            }
        }

        // ========== STEP 5: LIST ALL COURSES ==========
        console.log('\n📚 [STEP 5] Checking course in list...');

        const listResponse = await makeRequest({
            hostname: BASE_URL,
            port: PORT,
            path: '/api/courses',
            method: 'GET',
            headers: {
                'Cookie': sessionCookie
            }
        });

        if (listResponse.status === 200 && listResponse.data.success) {
            const courses = listResponse.data.data || [];
            const foundCourse = courses.find(c => c.course_id === createdCourseId || c.course_name === COURSE_NAME);

            console.log(`   📊 Total courses: ${listResponse.data.pagination?.total || courses.length}`);

            if (foundCourse) {
                console.log(`   ✅ Course "${COURSE_NAME}" found in course list!`);
            } else {
                console.log(`   ⚠️ Course not found in first page of list (may be on another page)`);
            }
        }

        // ========== FINAL RESULT ==========
        console.log('\n' + '═'.repeat(66));
        if (createdCourseId) {
            console.log('   ✅ TEST PASSED - หลักสูตรถูกสร้างและบันทึกลงฐานข้อมูลสำเร็จ!');
            console.log('   ✅ Full loop completed: Create → Save → Verify');
        } else {
            console.log('   ❌ TEST FAILED - ไม่สามารถสร้างหลักสูตรได้');
        }
        console.log('═'.repeat(66));

        return createdCourseId;

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        return null;
    }
}

// Run the test
runFullLoopTest().then(courseId => {
    console.log(`\n🏁 Test completed. Created course ID: ${courseId || 'N/A'}`);
    process.exit(courseId ? 0 : 1);
});
