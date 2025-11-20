const https = require('http');

async function testThaiDisplay() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/courses/1',
        method: 'GET',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Charset': 'utf-8',
            'Cookie': 'connect.sid=test' // You may need a valid session
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';

            console.log('\n📡 Response Status:', res.statusCode);
            console.log('📋 Response Headers:');
            console.log('   Content-Type:', res.headers['content-type']);
            console.log('   Content-Encoding:', res.headers['content-encoding']);

            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('\n🔍 Checking Thai text in response:');
                console.log('=====================================');

                // Check for correct Thai text
                const correctPatterns = [
                    'หมวดหมู่',
                    'ระดับความยาก',
                    'ชื่อคอร์ส',
                    'รหัสหลักสูตร',
                    'คำอธิบายคอร์ส'
                ];

                // Check for corrupted Thai text (double-encoded)
                const corruptedPatterns = [
                    'เธซเธกเธงเธ"เธซเธกเธนเน',
                    'เธฃเธฐเธ"เธฑเธ',
                    'เธเธทเนเธญเธเธญเธฃเนเธช'
                ];

                let correctCount = 0;
                let corruptedCount = 0;

                correctPatterns.forEach(pattern => {
                    if (data.includes(pattern)) {
                        console.log(`✅ Found correct: "${pattern}"`);
                        correctCount++;
                    } else {
                        console.log(`❌ Missing: "${pattern}"`);
                    }
                });

                console.log('\n🔍 Checking for corrupted text:');
                corruptedPatterns.forEach(pattern => {
                    if (data.includes(pattern)) {
                        console.log(`❌ Found corrupted: "${pattern}"`);
                        corruptedCount++;
                    }
                });

                console.log('\n📊 Summary:');
                console.log(`   Correct Thai text: ${correctCount}/${correctPatterns.length}`);
                console.log(`   Corrupted text found: ${corruptedCount}`);

                if (correctCount === correctPatterns.length && corruptedCount === 0) {
                    console.log('\n✅ Thai encoding is working correctly!');
                } else {
                    console.log('\n⚠️ Thai encoding issues detected!');

                    // Show sample of HTML around Thai text
                    const sampleMatch = data.match(/.{50}(เธ|ห|ร|ช|ค).{50}/);
                    if (sampleMatch) {
                        console.log('\n📝 Sample HTML with Thai text:');
                        console.log(sampleMatch[0]);
                    }
                }

                resolve();
            });
        });

        req.on('error', (e) => {
            console.error('❌ Request error:', e.message);
            reject(e);
        });

        req.end();
    });
}

testThaiDisplay()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
