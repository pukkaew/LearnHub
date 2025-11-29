/**
 * Thai Language Test - ทดสอบว่าภาษาไทยใช้ได้หรือไม่
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
                'User-Agent': 'Mozilla/5.0 ThaiTest/1.0',
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

async function testThaiCourse() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST: Thai Language Course Creation');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Test with full Thai data
    const thaiCourseData = {
        course_name: 'หลักสูตรทดสอบภาษาไทย ' + Date.now(),
        category_id: 1,
        description: 'รายละเอียดหลักสูตรทดสอบภาษาไทยที่มีความยาวมากกว่า 50 ตัวอักษรเพื่อผ่านการตรวจสอบความถูกต้องของระบบ',
        duration_hours: 10,
        max_enrollments: 100,
        is_active: true,
        objectives: ['เรียนรู้การเขียนโปรแกรม', 'พัฒนาทักษะ'],
        difficulty_level: 'beginner'
    };

    console.log('📝 Course Data:');
    console.log(JSON.stringify(thaiCourseData, null, 2));
    console.log('');

    const response = await request('POST', '/courses/api/create', thaiCourseData);

    console.log('📤 Response Status:', response.status);
    console.log('📤 Response Data:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 || response.status === 201) {
        console.log('\n✅ Thai language is SUPPORTED!');
    } else {
        console.log('\n❌ Thai language FAILED');
        console.log('   Error:', response.data?.message || response.data?.errors || 'Unknown');
    }
}

async function testEnglishCourse() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 CONTROL TEST: English Course Creation');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Test with English data
    const englishCourseData = {
        course_name: 'English Test Course ' + Date.now(),
        category_id: 1,
        description: 'This is a test description in English that is at least 50 characters long for validation purposes',
        duration_hours: 10,
        max_enrollments: 100,
        is_active: true,
        objectives: ['Learn programming', 'Develop skills'],
        difficulty_level: 'beginner'
    };

    console.log('📝 Course Data:');
    console.log(JSON.stringify(englishCourseData, null, 2));
    console.log('');

    const response = await request('POST', '/courses/api/create', englishCourseData);

    console.log('📤 Response Status:', response.status);
    console.log('📤 Response Data:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 || response.status === 201) {
        console.log('\n✅ English language is SUPPORTED!');
    } else {
        console.log('\n❌ English language FAILED');
        console.log('   Error:', response.data?.message || response.data?.errors || 'Unknown');
    }
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║             🇹🇭 Thai Language Support Test                          ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    if (await login()) {
        await testThaiCourse();
        await testEnglishCourse();
    }
}

main();
