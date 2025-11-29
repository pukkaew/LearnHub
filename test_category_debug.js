/**
 * Quick debug test for category creation API
 */

const http = require('http');

// Test with color
const categoryData = {
    category_name: 'Test Category ' + Date.now(),
    category_color: '#3498db'
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
        'User-Agent': 'Mozilla/5.0 TestScript/1.0'
    }
};

console.log('Logging in...');
const loginReq = http.request(loginOptions, (loginRes) => {
    let loginBody = '';
    const cookies = loginRes.headers['set-cookie'];

    loginRes.on('data', chunk => loginBody += chunk);
    loginRes.on('end', () => {
        if (loginRes.statusCode !== 200) {
            console.log('Login failed:', loginBody);
            process.exit(1);
        }

        // Now create category
        const dataStr = JSON.stringify(categoryData);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/courses/api/categories-admin',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(dataStr),
                'Cookie': cookies ? cookies.join('; ') : '',
                'User-Agent': 'Mozilla/5.0 TestScript/1.0'
            }
        };

        console.log('Creating category with data:', JSON.stringify(categoryData, null, 2));

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log('\n=== CATEGORY CREATION RESULT ===');
                console.log('Status:', res.statusCode);
                try {
                    const result = JSON.parse(body);
                    console.log('Response:', JSON.stringify(result, null, 2));
                } catch (e) {
                    console.log('Raw response:', body);
                }
                process.exit(0);
            });
        });

        req.on('error', (e) => {
            console.error('Request error:', e.message);
            process.exit(1);
        });

        req.write(dataStr);
        req.end();
    });
});

loginReq.on('error', (e) => {
    console.error('Login request error:', e.message);
    process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
