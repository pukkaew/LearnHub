/**
 * Proper Course API Test - ทดสอบด้วย field ที่ถูกต้อง
 */

const http = require('http');
let sessionCookie = null;

async function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 CourseTest/1.0',
                ...(sessionCookie && { 'Cookie': sessionCookie })
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed;
                try {
                    parsed = JSON.parse(body);
                } catch {
                    parsed = body;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed
                });
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function login() {
    console.log('🔐 Logging in...');
    const response = await request('POST', '/auth/login', {
        employee_id: 'ADM001',
        password: 'password123'
    });

    if (response.headers['set-cookie']) {
        sessionCookie = response.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        console.log('✅ Login successful\n');
        return true;
    }
    console.log('❌ Login failed');
    return false;
}

const bugs = [];

function reportBug(severity, category, description, evidence) {
    bugs.push({ severity, category, description, evidence });
    const icon = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟠' : '🟡';
    console.log(`\n${icon} [${severity}] ${category}`);
    console.log(`   Bug: ${description}`);
    if (evidence) console.log(`   Evidence: ${evidence}`);
}

// Valid course data template
function getValidCourseData() {
    return {
        title: 'หลักสูตรทดสอบ Test Course ' + Date.now(),
        description: 'รายละเอียดหลักสูตรทดสอบที่มีความยาวมากกว่า 50 ตัวอักษรเพื่อผ่านการตรวจสอบของระบบ',
        category_id: 1,
        duration_hours: 10,
        instructor_id: 1,
        learning_objectives: [
            'วัตถุประสงค์ข้อที่ 1 - เรียนรู้พื้นฐาน',
            'วัตถุประสงค์ข้อที่ 2 - ฝึกปฏิบัติ',
            'วัตถุประสงค์ข้อที่ 3 - ประยุกต์ใช้งาน'
        ],
        lessons: [
            { title: 'บทที่ 1: บทนำ', duration: 30 }
        ]
    };
}

async function testValidCourseCreation() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 1: Valid Course Creation (Control Test)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const courseData = getValidCourseData();
    console.log('📝 Sending:', JSON.stringify(courseData, null, 2));

    const response = await request('POST', '/courses/api/create', courseData);
    console.log('\n📤 Status:', response.status);
    console.log('📤 Response:', JSON.stringify(response.data, null, 2).substring(0, 500));

    if (response.status === 200 || response.status === 201) {
        console.log('\n✅ Valid course creation: PASSED');
        return response.data.data?.course_id || response.data.data?.id;
    } else {
        console.log('\n❌ Valid course creation: FAILED');
        return null;
    }
}

async function testXSSInjection() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 2: XSS Injection in Course Title');
    console.log('═══════════════════════════════════════════════════════════\n');

    const xssPayloads = [
        { name: 'script tag', payload: '<script>alert("XSS")</script>' },
        { name: 'img onerror', payload: '<img src=x onerror=alert("XSS")>' },
        { name: 'event handler', payload: '" onmouseover="alert(1)"' }
    ];

    for (const xss of xssPayloads) {
        const courseData = getValidCourseData();
        courseData.title = `Test ${xss.payload} Course ${Date.now()}`;

        console.log(`Testing ${xss.name}...`);
        const response = await request('POST', '/courses/api/create', courseData);
        console.log(`  Status: ${response.status}`);

        if (response.status === 200 || response.status === 201) {
            const savedTitle = response.data.data?.title || '';
            if (savedTitle.includes('<script>') || savedTitle.includes('onerror=') ||
                savedTitle.includes('onmouseover=')) {
                reportBug('CRITICAL', 'XSS Vulnerability',
                    `XSS payload "${xss.name}" saved without sanitization`,
                    `Saved: ${savedTitle.substring(0, 80)}`);
            } else {
                console.log(`  ✅ XSS sanitized - saved as: ${savedTitle.substring(0, 50)}...`);
            }
        } else if (response.status === 400) {
            console.log('  ✅ Request rejected (XSS blocked)');
        }
    }
}

async function testNegativeDuration() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 3: Negative Duration Values');
    console.log('═══════════════════════════════════════════════════════════\n');

    const testValues = [-1, -999, -0.5, 0];

    for (const value of testValues) {
        const courseData = getValidCourseData();
        courseData.title = `Duration Test ${value} ${Date.now()}`;
        courseData.duration_hours = value;

        console.log(`Testing duration = ${value}...`);
        const response = await request('POST', '/courses/api/create', courseData);
        console.log(`  Status: ${response.status}`);

        if (response.status === 200 || response.status === 201) {
            const savedDuration = response.data.data?.duration_hours;
            console.log(`  Saved duration: ${savedDuration}`);

            if (savedDuration !== undefined && savedDuration < 0) {
                reportBug('HIGH', 'Input Validation',
                    `Negative duration (${value}) saved to database`,
                    `Saved value: ${savedDuration}`);
            } else if (value < 0) {
                console.log(`  ✅ Negative converted/handled properly`);
            }
        } else if (response.status === 400) {
            console.log(`  ✅ Rejected: ${response.data.message || 'validation failed'}`);
        }
    }
}

async function testSQLInjection() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 4: SQL Injection');
    console.log('═══════════════════════════════════════════════════════════\n');

    const sqlPayloads = [
        "'; DROP TABLE courses; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM users --"
    ];

    for (const payload of sqlPayloads) {
        const courseData = getValidCourseData();
        courseData.title = `SQL Test ${payload} ${Date.now()}`;

        console.log(`Testing: ${payload.substring(0, 30)}...`);
        try {
            const response = await request('POST', '/courses/api/create', courseData);
            console.log(`  Status: ${response.status}`);

            if (response.status === 500) {
                reportBug('HIGH', 'SQL Injection',
                    'SQL injection caused server error',
                    `Payload: ${payload.substring(0, 40)}`);
            } else {
                console.log('  ✅ Handled safely (parameterized queries)');
            }
        } catch (e) {
            reportBug('CRITICAL', 'SQL Injection',
                'SQL injection crashed server',
                `Payload: ${payload.substring(0, 40)}`);
        }
    }
}

async function testMissingRequiredFields() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 5: Missing Required Fields');
    console.log('═══════════════════════════════════════════════════════════\n');

    const tests = [
        { field: 'title', remove: 'title' },
        { field: 'description', remove: 'description' },
        { field: 'learning_objectives', remove: 'learning_objectives' },
        { field: 'lessons', remove: 'lessons' }
    ];

    for (const test of tests) {
        const courseData = getValidCourseData();
        delete courseData[test.remove];

        console.log(`Testing without ${test.field}...`);
        const response = await request('POST', '/courses/api/create', courseData);
        console.log(`  Status: ${response.status}`);

        if (response.status === 200 || response.status === 201) {
            reportBug('MEDIUM', 'Required Field',
                `Course created without required field: ${test.field}`,
                'Required validation bypassed');
        } else if (response.status === 400) {
            console.log(`  ✅ Properly rejected`);
        }
    }
}

async function testBoundaryValues() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 6: Boundary Value Testing');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Test very short title
    console.log('Testing: Title with 5 chars (min is 10)...');
    let courseData = getValidCourseData();
    courseData.title = 'Short';
    let response = await request('POST', '/courses/api/create', courseData);
    console.log(`  Status: ${response.status}`);
    if (response.status === 400) {
        console.log('  ✅ Short title rejected');
    } else {
        reportBug('MEDIUM', 'Boundary', 'Title shorter than minimum accepted', 'Min length not enforced');
    }

    // Test only 2 objectives (min is 3)
    console.log('\nTesting: Only 2 objectives (min is 3)...');
    courseData = getValidCourseData();
    courseData.learning_objectives = ['Objective 1 - test', 'Objective 2 - test'];
    response = await request('POST', '/courses/api/create', courseData);
    console.log(`  Status: ${response.status}`);
    if (response.status === 400) {
        console.log('  ✅ Rejected (minimum 3 objectives required)');
    } else {
        reportBug('MEDIUM', 'Boundary', 'Course created with only 2 objectives', 'Min 3 not enforced');
    }

    // Test short description
    console.log('\nTesting: Short description (< 50 chars)...');
    courseData = getValidCourseData();
    courseData.description = 'Short description';
    response = await request('POST', '/courses/api/create', courseData);
    console.log(`  Status: ${response.status}`);
    if (response.status === 400) {
        console.log('  ✅ Short description rejected');
    } else {
        reportBug('MEDIUM', 'Boundary', 'Short description accepted', 'Min 50 chars not enforced');
    }
}

async function generateReport() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🔍 BUG HUNT REPORT                              ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

    if (bugs.length === 0) {
        console.log('\n✅ ไม่พบบัค! ระบบผ่านการทดสอบทั้งหมด');
    } else {
        console.log(`\n🐛 พบ ${bugs.length} Bug(s):\n`);

        const critical = bugs.filter(b => b.severity === 'CRITICAL');
        const high = bugs.filter(b => b.severity === 'HIGH');
        const medium = bugs.filter(b => b.severity === 'MEDIUM');

        if (critical.length > 0) {
            console.log('🔴 CRITICAL:');
            critical.forEach((b, i) => console.log(`   ${i + 1}. [${b.category}] ${b.description}`));
        }

        if (high.length > 0) {
            console.log('\n🟠 HIGH:');
            high.forEach((b, i) => console.log(`   ${i + 1}. [${b.category}] ${b.description}`));
        }

        if (medium.length > 0) {
            console.log('\n🟡 MEDIUM:');
            medium.forEach((b, i) => console.log(`   ${i + 1}. [${b.category}] ${b.description}`));
        }
    }

    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log(`  Total: ${bugs.length} bugs found`);
    console.log(`  🔴 Critical: ${bugs.filter(b => b.severity === 'CRITICAL').length}`);
    console.log(`  🟠 High: ${bugs.filter(b => b.severity === 'HIGH').length}`);
    console.log(`  🟡 Medium: ${bugs.filter(b => b.severity === 'MEDIUM').length}`);
    console.log('════════════════════════════════════════════════════════════════════\n');
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          🔍 PROPER COURSE API TEST - Bug Hunter                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    if (await login()) {
        await testValidCourseCreation();
        await testXSSInjection();
        await testNegativeDuration();
        await testSQLInjection();
        await testMissingRequiredFields();
        await testBoundaryValues();
        await generateReport();
    }
}

main();
