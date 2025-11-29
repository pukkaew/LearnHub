// Auto Browser Test - Course Creation via HTTP API
const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3000';
let sessionCookie = '';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AutoTest/1.0',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let body = '';

            // Capture set-cookie headers
            if (res.headers['set-cookie']) {
                sessionCookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
            }

            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body, headers: res.headers });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runBrowserTest() {
    console.log('🌐 Auto Browser Test - Course Creation\n');
    console.log('=' .repeat(50));

    try {
        // Step 1: Login
        console.log('\n📝 Step 1: Logging in...');

        // Try multiple credential combinations
        const credentials = [
            { employee_id: 'ADM001', password: 'P@ssw0rd123!' },
            { employee_id: 'ADM001', password: 'Admin@123' },
            { employee_id: 'ADM001', password: 'admin123' },
            { employee_id: '100018', password: 'P@ssw0rd123!' },
        ];

        let loginSuccess = false;
        for (const cred of credentials) {
            console.log('   Trying:', cred.employee_id);
            const loginRes = await makeRequest('POST', '/auth/login', cred);

            if (loginRes.status === 200 && loginRes.data.success) {
                console.log('   ✅ Login successful');
                console.log('   User:', loginRes.data.user?.first_name || 'Admin');
                loginSuccess = true;
                break;
            } else {
                console.log('   ❌ Failed:', loginRes.data.message?.substring(0, 50) || loginRes.status);
            }
        }

        if (!loginSuccess) {
            console.log('\n   ❌ All login attempts failed');
            console.log('   Please provide valid credentials');
            process.exit(1);
        }

        // Step 2: Get categories
        console.log('\n📁 Step 2: Fetching categories...');
        const categoriesRes = await makeRequest('GET', '/courses/api/categories');

        if (categoriesRes.data.success && categoriesRes.data.data?.length > 0) {
            console.log('   ✅ Found', categoriesRes.data.data.length, 'categories');
            console.log('   First category:', categoriesRes.data.data[0].category_name);
        } else {
            console.log('   ⚠️ No categories found, using default');
        }

        // Step 3: Create course
        console.log('\n📚 Step 3: Creating course...');
        const courseData = {
            course_name: 'Auto Test Course ' + Date.now(),
            course_code: 'AUTO-' + Math.floor(Math.random() * 10000),
            category_id: categoriesRes.data.data?.[0]?.category_id || 7,
            difficulty_level: 'Beginner',
            course_type: 'mandatory',
            language: 'th',
            description: 'This is an auto-generated test course',
            learning_objectives: [
                'Test objective 1',
                'Test objective 2',
                'Test objective 3'
            ],
            target_positions: [],
            target_departments: [],
            lessons: [
                { title: 'บทที่ 1 - Introduction', duration: 30, description: 'บทนำ', has_quiz: false },
                { title: 'บทที่ 2 - Main Content', duration: 45, description: 'เนื้อหาหลัก', has_quiz: false },
                { title: 'บทที่ 3 - Summary', duration: 30, description: 'สรุป', has_quiz: false }
            ],
            passing_score: null,
            max_attempts: null,
            max_students: null,
            certificate_validity: null
        };

        console.log('   Course name:', courseData.course_name);
        console.log('   Course code:', courseData.course_code);

        const createRes = await makeRequest('POST', '/courses/api/create', courseData);

        console.log('\n📊 Response:');
        console.log('   Status:', createRes.status);
        console.log('   Success:', createRes.data.success);

        if (createRes.data.success) {
            console.log('   ✅ Course created successfully!');
            console.log('   Course ID:', createRes.data.data?.course_id);

            // Step 4: Verify course exists
            console.log('\n🔍 Step 4: Verifying course...');
            const courseId = createRes.data.data?.course_id;
            const verifyRes = await makeRequest('GET', `/courses/api/${courseId}`);

            if (verifyRes.data.success) {
                console.log('   ✅ Course verified');
                console.log('   Title:', verifyRes.data.data?.title);
                console.log('   Category:', verifyRes.data.data?.category);
                console.log('   Lessons:', verifyRes.data.data?.lessons?.length || 0);
            } else {
                console.log('   ⚠️ Could not verify course');
            }

            // Step 5: Cleanup (optional)
            console.log('\n🧹 Step 5: Test complete (course kept for manual review)');
            console.log('   Course URL: http://localhost:3000/courses/' + courseId);

        } else {
            console.log('   ❌ Course creation failed!');
            console.log('   Error:', createRes.data.message);
            if (createRes.data.error) {
                console.log('   Details:', createRes.data.error);
            }
        }

        console.log('\n' + '=' .repeat(50));
        console.log('🏁 Test completed');

    } catch (error) {
        console.error('\n❌ Test error:', error.message);
    }

    process.exit(0);
}

runBrowserTest();
