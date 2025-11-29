/**
 * Backend Validation Test
 * Tests that XSS sanitization and duration validation work at the API level
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test data
const xssTestName = 'Course <script>alert("XSS")</script> Test';
const negativeDuration = -5;

async function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
                } catch {
                    resolve({ status: res.statusCode, data: body, headers: res.headers });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function login() {
    console.log('🔐 Logging in...');
    const loginData = {
        employee_id: 'ADM001',
        password: 'password123'
    };

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const result = await makeRequest(options, loginData);
    console.log('Login result:', result.status);

    // Get the cookie from headers
    const cookies = result.headers['set-cookie'];
    if (cookies) {
        const sessionCookie = cookies.find(c => c.includes('connect.sid'));
        if (sessionCookie) {
            return sessionCookie.split(';')[0];
        }
    }
    return null;
}

async function testXSSSanitization(cookie) {
    console.log('\n📋 Testing XSS Sanitization...');
    console.log('Input course name:', xssTestName);

    const courseData = {
        course_name: xssTestName,
        category_id: 1,
        description: 'This is a test description that is at least 50 characters long for validation',
        duration_hours: 10,
        max_enrollments: 100,
        is_active: true,
        lessons: [{ title: 'Test Lesson', video_url: 'https://example.com/video.mp4' }]
    };

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/courses',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookie
        }
    };

    const result = await makeRequest(options, courseData);
    console.log('Response status:', result.status);

    if (result.data && result.data.data) {
        const savedName = result.data.data.course_name;
        console.log('Saved course name:', savedName);

        const hasScript = savedName.includes('<script>');
        if (hasScript) {
            console.log('❌ FAIL - XSS content was NOT sanitized');
            return { pass: false, saved: savedName };
        } else {
            console.log('✅ PASS - XSS content was sanitized');
            return { pass: true, saved: savedName, courseId: result.data.data.id };
        }
    }

    return { pass: false, error: result.data };
}

async function testNegativeDuration(cookie) {
    console.log('\n📋 Testing Negative Duration Validation...');
    console.log('Input duration:', negativeDuration);

    const courseData = {
        course_name: 'Test Course for Duration ' + Date.now(),
        category_id: 1,
        description: 'This is a test description that is at least 50 characters long for validation',
        duration_hours: negativeDuration,
        max_enrollments: 100,
        is_active: true,
        lessons: [{ title: 'Test Lesson', video_url: 'https://example.com/video.mp4' }]
    };

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/courses',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookie
        }
    };

    const result = await makeRequest(options, courseData);
    console.log('Response status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    // The backend should either:
    // 1. Return an error for negative duration (status 400)
    // 2. Convert negative to 0 and save

    if (result.status === 400) {
        console.log('✅ PASS - Negative duration was rejected');
        return { pass: true, rejected: true };
    }

    if (result.data && result.data.data) {
        const savedDuration = result.data.data.duration_hours;
        console.log('Saved duration:', savedDuration);

        if (savedDuration < 0) {
            console.log('❌ FAIL - Negative duration was saved');
            return { pass: false, saved: savedDuration };
        } else {
            console.log('✅ PASS - Negative duration was converted to', savedDuration);
            return { pass: true, converted: true, saved: savedDuration };
        }
    }

    return { pass: false, error: result.data };
}

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          Backend Validation Test - XSS & Duration                  ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

    const cookie = await login();
    if (!cookie) {
        console.log('❌ Failed to login');
        process.exit(1);
    }
    console.log('✅ Logged in successfully');

    const xssResult = await testXSSSanitization(cookie);
    const durationResult = await testNegativeDuration(cookie);

    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log('                          SUMMARY');
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('XSS Sanitization:', xssResult.pass ? '✅ PASS' : '❌ FAIL');
    console.log('Negative Duration:', durationResult.pass ? '✅ PASS' : '❌ FAIL');
    console.log('════════════════════════════════════════════════════════════════════');

    process.exit(xssResult.pass && durationResult.pass ? 0 : 1);
}

runTests().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
