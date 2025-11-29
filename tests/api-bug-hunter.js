/**
 * API Bug Hunter - ทดสอบ API โดยตรง เน้นหาบัค
 * Bypass client validation เพื่อทดสอบ backend validation
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const bugs = [];
let sessionCookie = null;

function reportBug(severity, category, description, evidence) {
    bugs.push({ severity, category, description, evidence });
    const icon = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟠' : '🟡';
    console.log(`\n${icon} [${severity}] ${category}`);
    console.log(`   Bug: ${description}`);
    if (evidence) console.log(`   Evidence: ${evidence}`);
}

function log(msg) {
    console.log(`  ${msg}`);
}

async function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BugHunter/1.0',
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
    console.log('\n🔐 Logging in...');

    const response = await request('POST', '/auth/login', {
        employee_id: 'ADM001',
        password: 'password123'
    });

    if (response.headers['set-cookie']) {
        const cookies = response.headers['set-cookie'];
        sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
        console.log('✅ Login successful\n');
        return true;
    }

    console.log('❌ Login failed:', response.status, response.data);
    return false;
}

async function testXSSInjection() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 1: XSS Injection via API');
    console.log('═══════════════════════════════════════════════════════════');

    const xssPayloads = [
        { name: 'script tag', payload: '<script>alert("XSS")</script>' },
        { name: 'img onerror', payload: '<img src=x onerror=alert("XSS")>' },
        { name: 'svg onload', payload: '<svg onload=alert("XSS")>' },
        { name: 'event handler', payload: '" onmouseover="alert(\'XSS\')"' },
        { name: 'javascript protocol', payload: 'javascript:alert("XSS")' }
    ];

    for (const xss of xssPayloads) {
        log(`Testing: ${xss.name}`);

        const courseData = {
            course_name: `Test Course ${xss.payload} ${Date.now()}`,
            category_id: 1,
            description: 'This is a test description that is at least 50 characters long for validation purposes here',
            duration_hours: 10,
            max_enrollments: 100,
            is_active: true
        };

        const response = await request('POST', '/courses/api/create', courseData);
        log(`  Status: ${response.status}`);

        if (response.status === 200 || response.status === 201) {
            const savedName = response.data?.data?.course_name || '';
            if (savedName.includes('<script>') || savedName.includes('onerror=') ||
                savedName.includes('onload=') || savedName.includes('javascript:')) {
                reportBug('CRITICAL', 'XSS Vulnerability',
                    `XSS payload "${xss.name}" was saved without sanitization`,
                    `Saved value: ${savedName.substring(0, 80)}`);
            } else {
                log(`  ✅ XSS sanitized - saved as: ${savedName.substring(0, 50)}...`);
            }
        } else if (response.status === 400) {
            log(`  ✅ Request rejected by validation`);
        }
    }
}

async function testNegativeDuration() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 2: Negative Duration Values');
    console.log('═══════════════════════════════════════════════════════════');

    const testValues = [
        { value: -1, desc: 'Negative (-1)' },
        { value: -999, desc: 'Large Negative (-999)' },
        { value: -0.5, desc: 'Negative Decimal (-0.5)' },
        { value: 0, desc: 'Zero (0)' }
    ];

    for (const test of testValues) {
        log(`Testing: ${test.desc}`);

        const courseData = {
            course_name: `Duration Test ${test.value} ${Date.now()}`,
            category_id: 1,
            description: 'This is a test description that is at least 50 characters long for validation purposes here',
            duration_hours: test.value,
            max_enrollments: 100,
            is_active: true
        };

        const response = await request('POST', '/courses/api/create', courseData);
        log(`  Status: ${response.status}`);

        if (response.status === 200 || response.status === 201) {
            const savedDuration = response.data?.data?.duration_hours;
            log(`  Saved duration: ${savedDuration}`);

            if (savedDuration < 0) {
                reportBug('HIGH', 'Input Validation',
                    `Negative duration (${test.value}) was saved to database`,
                    `Saved value: ${savedDuration}`);
            } else if (test.value < 0 && savedDuration >= 0) {
                log(`  ✅ Negative converted to: ${savedDuration}`);
            }
        } else if (response.status === 400) {
            log(`  ✅ Properly rejected: ${JSON.stringify(response.data?.message || response.data).substring(0, 60)}`);
        }
    }
}

async function testNegativeMaxEnrollments() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 3: Negative Max Enrollments');
    console.log('═══════════════════════════════════════════════════════════');

    const testValues = [-1, -100, 0];

    for (const value of testValues) {
        log(`Testing: max_enrollments = ${value}`);

        const courseData = {
            course_name: `Max Enrollment Test ${value} ${Date.now()}`,
            category_id: 1,
            description: 'This is a test description that is at least 50 characters long for validation purposes here',
            duration_hours: 10,
            max_enrollments: value,
            is_active: true
        };

        const response = await request('POST', '/courses/api/create', courseData);
        log(`  Status: ${response.status}`);

        if (response.status === 200 || response.status === 201) {
            const savedMax = response.data?.data?.max_enrollments;
            log(`  Saved max_enrollments: ${savedMax}`);

            if (savedMax < 0) {
                reportBug('HIGH', 'Input Validation',
                    `Negative max_enrollments (${value}) was saved`,
                    `Saved value: ${savedMax}`);
            }
        } else if (response.status === 400) {
            log(`  ✅ Properly rejected`);
        }
    }
}

async function testEmptyRequiredFields() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 4: Empty Required Fields');
    console.log('═══════════════════════════════════════════════════════════');

    const testCases = [
        { field: 'course_name', data: { course_name: '', category_id: 1, description: 'Test description that is long enough', duration_hours: 10 } },
        { field: 'course_name (whitespace)', data: { course_name: '   ', category_id: 1, description: 'Test description that is long enough', duration_hours: 10 } },
        { field: 'category_id', data: { course_name: 'Test Course ' + Date.now(), category_id: null, description: 'Test description that is long enough', duration_hours: 10 } },
        { field: 'description', data: { course_name: 'Test Course ' + Date.now(), category_id: 1, description: '', duration_hours: 10 } }
    ];

    for (const test of testCases) {
        log(`Testing: Empty ${test.field}`);

        const response = await request('POST', '/api/courses', test.data);
        log(`  Status: ${response.status}`);

        if (response.status === 200 || response.status === 201) {
            reportBug('MEDIUM', 'Required Field Validation',
                `Empty ${test.field} was accepted`,
                'Course created without required field');
        } else if (response.status === 400) {
            log(`  ✅ Properly rejected`);
        }
    }
}

async function testSQLInjection() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 5: SQL Injection');
    console.log('═══════════════════════════════════════════════════════════');

    const sqlPayloads = [
        "'; DROP TABLE courses; --",
        "1; DELETE FROM users WHERE '1'='1",
        "' OR '1'='1",
        "'; UPDATE users SET role='admin' WHERE '1'='1'; --",
        "UNION SELECT * FROM users --"
    ];

    for (const payload of sqlPayloads) {
        log(`Testing: ${payload.substring(0, 40)}...`);

        const courseData = {
            course_name: payload + ' ' + Date.now(),
            category_id: 1,
            description: 'This is a test description that is at least 50 characters long for validation purposes here',
            duration_hours: 10,
            max_enrollments: 100,
            is_active: true
        };

        try {
            const response = await request('POST', '/courses/api/create', courseData);
            log(`  Status: ${response.status}`);

            if (response.status === 500) {
                reportBug('HIGH', 'SQL Injection',
                    'SQL injection payload caused server error',
                    `Payload: ${payload.substring(0, 40)}`);
            } else if (response.status === 200 || response.status === 201) {
                log(`  ✅ Payload handled safely (escaped/parameterized)`);
            }
        } catch (e) {
            reportBug('HIGH', 'SQL Injection',
                'SQL injection payload crashed server',
                `Payload: ${payload.substring(0, 40)}`);
        }
    }
}

async function testAuthBypass() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 6: Authentication Bypass');
    console.log('═══════════════════════════════════════════════════════════');

    // Save current cookie
    const savedCookie = sessionCookie;
    sessionCookie = null; // Remove auth

    log('Testing: API access without authentication');
    const response = await request('POST', '/api/courses', {
        course_name: 'Unauthorized Test ' + Date.now(),
        category_id: 1,
        description: 'Test',
        duration_hours: 10
    });

    log(`  Status: ${response.status}`);

    if (response.status === 200 || response.status === 201) {
        reportBug('CRITICAL', 'Authentication Bypass',
            'API accessible without authentication',
            'POST /api/courses allowed without session');
    } else if (response.status === 401 || response.status === 403 || response.status === 302) {
        log('  ✅ Properly requires authentication');
    }

    // Restore cookie
    sessionCookie = savedCookie;
}

async function testBoundaryValues() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 7: Boundary Value Testing');
    console.log('═══════════════════════════════════════════════════════════');

    const tests = [
        { field: 'course_name', value: 'A'.repeat(500), desc: 'Very long name (500 chars)' },
        { field: 'course_name', value: 'A'.repeat(5), desc: 'Very short name (5 chars)' },
        { field: 'duration_hours', value: 999999999, desc: 'Huge duration' },
        { field: 'max_enrollments', value: 999999999, desc: 'Huge max enrollments' }
    ];

    for (const test of tests) {
        log(`Testing: ${test.desc}`);

        const courseData = {
            course_name: test.field === 'course_name' ? test.value : `Boundary Test ${Date.now()}`,
            category_id: 1,
            description: 'This is a test description that is at least 50 characters long for validation purposes here',
            duration_hours: test.field === 'duration_hours' ? test.value : 10,
            max_enrollments: test.field === 'max_enrollments' ? test.value : 100,
            is_active: true
        };

        const response = await request('POST', '/courses/api/create', courseData);
        log(`  Status: ${response.status}`);

        if (response.status === 200 || response.status === 201) {
            if (test.field === 'course_name' && test.value.length > 200) {
                const savedName = response.data?.data?.course_name;
                if (savedName && savedName.length === test.value.length) {
                    reportBug('MEDIUM', 'Boundary Validation',
                        `Very long ${test.field} (${test.value.length} chars) was accepted`,
                        'No maximum length validation');
                }
            }
        }
    }
}

async function testSpecialCharacters() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 8: Special Characters Handling');
    console.log('═══════════════════════════════════════════════════════════');

    const specialChars = [
        { name: 'Unicode emoji', value: 'Test Course 🎓📚 ' + Date.now() },
        { name: 'Thai characters', value: 'หลักสูตรทดสอบ ' + Date.now() },
        { name: 'Null byte', value: 'Test\x00Course ' + Date.now() },
        { name: 'Newlines', value: 'Test\nCourse\rWith\r\nNewlines ' + Date.now() },
        { name: 'HTML entities', value: 'Test &lt;script&gt; &amp; Course ' + Date.now() }
    ];

    for (const test of specialChars) {
        log(`Testing: ${test.name}`);

        const courseData = {
            course_name: test.value,
            category_id: 1,
            description: 'This is a test description that is at least 50 characters long for validation purposes here',
            duration_hours: 10,
            max_enrollments: 100,
            is_active: true
        };

        const response = await request('POST', '/courses/api/create', courseData);
        log(`  Status: ${response.status}`);

        if (response.status === 200 || response.status === 201) {
            log(`  ✅ Handled successfully`);
        } else {
            log(`  Response: ${JSON.stringify(response.data).substring(0, 60)}`);
        }
    }
}

async function generateReport() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🔍 BUG HUNTER REPORT                            ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

    const critical = bugs.filter(b => b.severity === 'CRITICAL');
    const high = bugs.filter(b => b.severity === 'HIGH');
    const medium = bugs.filter(b => b.severity === 'MEDIUM');

    if (bugs.length === 0) {
        console.log('\n✅ ไม่พบบัค! ระบบผ่านการทดสอบทุกข้อ');
    } else {
        console.log(`\n🐛 พบ ${bugs.length} Bug(s):\n`);

        if (critical.length > 0) {
            console.log('🔴 CRITICAL BUGS:');
            critical.forEach((b, i) => {
                console.log(`   ${i + 1}. [${b.category}] ${b.description}`);
                if (b.evidence) console.log(`      Evidence: ${b.evidence}`);
            });
        }

        if (high.length > 0) {
            console.log('\n🟠 HIGH SEVERITY BUGS:');
            high.forEach((b, i) => {
                console.log(`   ${i + 1}. [${b.category}] ${b.description}`);
                if (b.evidence) console.log(`      Evidence: ${b.evidence}`);
            });
        }

        if (medium.length > 0) {
            console.log('\n🟡 MEDIUM SEVERITY BUGS:');
            medium.forEach((b, i) => {
                console.log(`   ${i + 1}. [${b.category}] ${b.description}`);
                if (b.evidence) console.log(`      Evidence: ${b.evidence}`);
            });
        }
    }

    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log(`  Total Bugs: ${bugs.length}`);
    console.log(`  🔴 Critical: ${critical.length}`);
    console.log(`  🟠 High: ${high.length}`);
    console.log(`  🟡 Medium: ${medium.length}`);
    console.log('════════════════════════════════════════════════════════════════════\n');

    return bugs.length;
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║            🔍 API BUG HUNTER - Backend Testing                     ║');
    console.log('║                   LearnHub Course System                           ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log(`\nStarted: ${new Date().toLocaleString('th-TH')}`);
    console.log('Target: POST /api/courses\n');

    try {
        const loggedIn = await login();
        if (!loggedIn) {
            console.log('❌ Cannot proceed without authentication');
            process.exit(1);
        }

        await testXSSInjection();
        await testNegativeDuration();
        await testNegativeMaxEnrollments();
        await testEmptyRequiredFields();
        await testSQLInjection();
        await testAuthBypass();
        await testBoundaryValues();
        await testSpecialCharacters();

        const bugCount = await generateReport();
        process.exit(bugCount > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ Test Error:', error.message);
        process.exit(1);
    }
}

main();
