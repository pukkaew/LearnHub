/**
 * Quick debug test for course creation API
 */

const http = require('http');

const courseData = {
    title: 'Test Course Debug Script 12345',
    course_name: 'Test Course Debug Script 12345',
    course_code: 'TCD' + Date.now().toString().slice(-6),
    description: 'This is a debug test course description with enough characters to pass the 50 character validation requirement',
    category_id: 1,
    course_type: 'Online',
    difficulty_level: 'Beginner',
    language: 'th',
    duration_hours: 5,
    max_students: 30,
    status: 'draft',
    learning_objectives: [
        'Learning objective one for testing purposes',
        'Learning objective two for testing purposes',
        'Learning objective three for testing purposes'
    ]
};

// First login to get session
const loginData = JSON.stringify({
    employee_id: 'ADM001',
    password: 'password123'
});

const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestScript/1.0'
    }
};

console.log('Logging in...');
const loginReq = http.request(loginOptions, (loginRes) => {
    let loginBody = '';
    const cookies = loginRes.headers['set-cookie'];
    console.log('Login status:', loginRes.statusCode);
    console.log('Cookies:', cookies);

    loginRes.on('data', chunk => loginBody += chunk);
    loginRes.on('end', () => {
        console.log('Login response:', loginBody);

        if (loginRes.statusCode !== 200) {
            console.log('Login failed!');
            process.exit(1);
        }

        // Now create course
        const courseDataStr = JSON.stringify(courseData);
        const courseOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/courses/api/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(courseDataStr),
                'Cookie': cookies ? cookies.join('; ') : '',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestScript/1.0'
            }
        };

        console.log('\nCreating course with data:', JSON.stringify(courseData, null, 2));

        const courseReq = http.request(courseOptions, (courseRes) => {
            let body = '';
            courseRes.on('data', chunk => body += chunk);
            courseRes.on('end', () => {
                console.log('\n=== COURSE CREATION RESULT ===');
                console.log('Status:', courseRes.statusCode);
                try {
                    const result = JSON.parse(body);
                    console.log('Response:', JSON.stringify(result, null, 2));
                } catch (e) {
                    console.log('Raw response:', body);
                }
                process.exit(0);
            });
        });

        courseReq.on('error', (e) => {
            console.error('Course request error:', e.message);
            process.exit(1);
        });

        courseReq.write(courseDataStr);
        courseReq.end();
    });
});

loginReq.on('error', (e) => {
    console.error('Login request error:', e.message);
    process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
