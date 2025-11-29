/**
 * Tester Bug Hunter - ทดสอบแบบ QA Tester มืออาชีพ
 * เน้นหาบัคที่อาจซ่อนอยู่ในระบบ Course
 */

const puppeteer = require('puppeteer');

const CONFIG = {
    BASE_URL: 'http://localhost:3000',
    CREDENTIALS: {
        employee_id: 'ADM001',
        password: 'password123'
    },
    TIMEOUT: 30000
};

let browser, page;
const bugs = [];

function reportBug(category, severity, description, evidence) {
    bugs.push({ category, severity, description, evidence, timestamp: new Date().toISOString() });
    console.log(`\n🐛 [${severity}] ${category}: ${description}`);
    if (evidence) console.log(`   📸 Evidence: ${evidence}`);
}

async function setup() {
    browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Capture console errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            reportBug('Console Error', 'MEDIUM', msg.text(), 'Browser console');
        }
    });

    // Capture page errors
    page.on('pageerror', error => {
        reportBug('Page Error', 'HIGH', error.message, 'JavaScript error');
    });
}

async function login() {
    console.log('🔐 Logging in...');
    await page.goto(`${CONFIG.BASE_URL}/auth/login`, { waitUntil: 'networkidle2' });
    await page.type('#employee_id', CONFIG.CREDENTIALS.employee_id);
    await page.type('#password', CONFIG.CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });
    console.log('✅ Logged in successfully\n');
}

async function testXSSInCourseForm() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 1: XSS Injection ในฟอร์มสร้าง Course');
    console.log('═══════════════════════════════════════════════════════════');

    await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });

    const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        "'; DROP TABLE courses; --",
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')">',
        '{{constructor.constructor("alert(1)")()}}'
    ];

    for (let i = 0; i < xssPayloads.length; i++) {
        const payload = xssPayloads[i];
        console.log(`\n  Testing payload ${i + 1}/${xssPayloads.length}: ${payload.substring(0, 30)}...`);

        try {
            // Clear and type in course name field
            const nameField = await page.$('#course_name, input[name="course_name"]');
            if (nameField) {
                await nameField.click({ clickCount: 3 });
                await nameField.type(payload);

                // Check if payload appears unescaped in the DOM
                const pageContent = await page.content();
                if (pageContent.includes(payload) && !pageContent.includes(payload.replace(/</g, '&lt;'))) {
                    reportBug('XSS Vulnerability', 'CRITICAL',
                        `XSS payload reflected unescaped: ${payload.substring(0, 50)}`,
                        'Course name field');
                }

                // Clear field
                await nameField.click({ clickCount: 3 });
                await page.keyboard.press('Backspace');
            }
        } catch (e) {
            console.log(`  ⚠️ Could not test payload: ${e.message}`);
        }
    }

    console.log('  ✅ XSS test completed');
}

async function testNegativeAndBoundaryValues() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 2: Negative และ Boundary Values');
    console.log('═══════════════════════════════════════════════════════════');

    await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });

    const testValues = [
        { value: '-1', expected: 'blocked', desc: 'Negative number (-1)' },
        { value: '-999999', expected: 'blocked', desc: 'Large negative (-999999)' },
        { value: '0', expected: 'warning', desc: 'Zero value' },
        { value: '99999999999', expected: 'warning', desc: 'Extremely large number' },
        { value: '1.5', expected: 'allowed', desc: 'Decimal value' },
        { value: 'abc', expected: 'blocked', desc: 'Text in number field' },
        { value: '-0', expected: 'warning', desc: 'Negative zero' },
        { value: '   ', expected: 'blocked', desc: 'Whitespace only' },
        { value: '1e10', expected: 'warning', desc: 'Scientific notation' }
    ];

    // Find duration field
    const durationField = await page.$('#duration_hours, input[name="duration_hours"], input[name="duration"]');

    if (durationField) {
        for (const test of testValues) {
            console.log(`\n  Testing: ${test.desc}`);

            await durationField.click({ clickCount: 3 });
            await durationField.type(test.value);

            // Get the value that was actually entered
            const enteredValue = await page.evaluate(el => el.value, durationField);
            console.log(`    Input: "${test.value}" → Field value: "${enteredValue}"`);

            // Check for validation messages
            const validationMsg = await page.evaluate(() => {
                const msgs = document.querySelectorAll('.text-red-500, .error, .invalid-feedback, [role="alert"]');
                return Array.from(msgs).map(m => m.textContent).join(' | ');
            });

            if (validationMsg) {
                console.log(`    Validation: ${validationMsg.substring(0, 50)}`);
            }

            // Check if negative was accepted
            if (test.expected === 'blocked' && enteredValue === test.value) {
                const numValue = parseFloat(enteredValue);
                if (!isNaN(numValue) && numValue < 0) {
                    reportBug('Input Validation', 'HIGH',
                        `Negative value accepted in duration field: ${test.value}`,
                        'Duration field accepts negative numbers');
                }
            }

            await durationField.click({ clickCount: 3 });
            await page.keyboard.press('Backspace');
        }
    } else {
        console.log('  ⚠️ Duration field not found on step 1, checking next step...');

        // Try navigating to step 2
        const nextBtn = await page.$('.next-step, button:has-text("Next"), button:has-text("ถัดไป")');
        if (nextBtn) {
            await nextBtn.click();
            await page.waitForTimeout(1000);
        }
    }

    console.log('  ✅ Boundary test completed');
}

async function testFormSubmissionWithInvalidData() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 3: Form Submission พร้อมข้อมูลไม่ถูกต้อง');
    console.log('═══════════════════════════════════════════════════════════');

    await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });

    // Try to submit empty form
    console.log('\n  Testing: Empty form submission');

    // Find and click submit/next button
    const submitBtn = await page.$('button[type="submit"], .submit-btn, #submitBtn');
    const nextBtn = await page.$('.next-step, button:has-text("ถัดไป")');

    if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(500);

        // Check if moved to next step without validation
        const currentStep = await page.evaluate(() => {
            const active = document.querySelector('.step.active, [data-step].active, .wizard-step.active');
            return active ? active.dataset.step || active.getAttribute('data-step') : '1';
        });

        if (currentStep !== '1') {
            reportBug('Form Validation', 'MEDIUM',
                'Empty form allowed to proceed to next step',
                `Moved to step ${currentStep} without required fields`);
        }
    }

    console.log('  ✅ Form submission test completed');
}

async function testAPIDirectly() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 4: Direct API Testing (Bypass Client Validation)');
    console.log('═══════════════════════════════════════════════════════════');

    // Get cookies for authentication
    const cookies = await page.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const testCases = [
        {
            name: 'XSS in course_name',
            data: {
                course_name: '<script>alert("XSS")</script>Test Course',
                category_id: 1,
                description: 'This is a test description that is at least 50 characters long for validation purposes here',
                duration_hours: 10,
                max_enrollments: 100,
                is_active: true
            }
        },
        {
            name: 'Negative duration',
            data: {
                course_name: 'Test Course Negative ' + Date.now(),
                category_id: 1,
                description: 'This is a test description that is at least 50 characters long for validation purposes here',
                duration_hours: -5,
                max_enrollments: 100,
                is_active: true
            }
        },
        {
            name: 'Zero duration',
            data: {
                course_name: 'Test Course Zero ' + Date.now(),
                category_id: 1,
                description: 'This is a test description that is at least 50 characters long for validation purposes here',
                duration_hours: 0,
                max_enrollments: 100,
                is_active: true
            }
        },
        {
            name: 'SQL Injection in name',
            data: {
                course_name: "Test'; DROP TABLE courses; --",
                category_id: 1,
                description: 'This is a test description that is at least 50 characters long for validation purposes here',
                duration_hours: 10,
                max_enrollments: 100,
                is_active: true
            }
        },
        {
            name: 'Empty course_name',
            data: {
                course_name: '',
                category_id: 1,
                description: 'This is a test description that is at least 50 characters long for validation purposes here',
                duration_hours: 10,
                max_enrollments: 100,
                is_active: true
            }
        },
        {
            name: 'Negative max_enrollments',
            data: {
                course_name: 'Test Course Neg Enroll ' + Date.now(),
                category_id: 1,
                description: 'This is a test description that is at least 50 characters long for validation purposes here',
                duration_hours: 10,
                max_enrollments: -10,
                is_active: true
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n  Testing: ${testCase.name}`);

        try {
            const response = await page.evaluate(async (data, cookie) => {
                const res = await fetch('/api/courses', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': cookie
                    },
                    body: JSON.stringify(data),
                    credentials: 'include'
                });
                return {
                    status: res.status,
                    data: await res.json().catch(() => res.text())
                };
            }, testCase.data, cookieString);

            console.log(`    Response: ${response.status}`);
            console.log(`    Data: ${JSON.stringify(response.data).substring(0, 100)}`);

            // Analyze response
            if (response.status === 200 || response.status === 201) {
                // Check for XSS
                if (testCase.name.includes('XSS') && response.data.data) {
                    const savedName = response.data.data.course_name || '';
                    if (savedName.includes('<script>')) {
                        reportBug('XSS Vulnerability', 'CRITICAL',
                            'XSS payload saved unescaped in database',
                            `Saved name: ${savedName}`);
                    } else {
                        console.log('    ✅ XSS was sanitized');
                    }
                }

                // Check for negative duration
                if (testCase.name.includes('Negative duration')) {
                    const savedDuration = response.data.data?.duration_hours;
                    if (savedDuration < 0) {
                        reportBug('Data Validation', 'HIGH',
                            'Negative duration was saved to database',
                            `Saved duration: ${savedDuration}`);
                    } else {
                        console.log(`    ✅ Negative duration handled (saved as: ${savedDuration})`);
                    }
                }

                // Check for negative enrollments
                if (testCase.name.includes('Negative max_enrollments')) {
                    const savedMax = response.data.data?.max_enrollments;
                    if (savedMax < 0) {
                        reportBug('Data Validation', 'HIGH',
                            'Negative max_enrollments was saved',
                            `Saved value: ${savedMax}`);
                    }
                }
            } else if (response.status === 400) {
                console.log('    ✅ Request properly rejected');
            }

        } catch (e) {
            console.log(`    ❌ Error: ${e.message}`);
        }
    }

    console.log('  ✅ API test completed');
}

async function testSessionAndAuth() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 5: Session และ Authentication');
    console.log('═══════════════════════════════════════════════════════════');

    // Test accessing protected route without login
    const newPage = await browser.newPage();

    console.log('\n  Testing: Access protected route without login');
    const response = await newPage.goto(`${CONFIG.BASE_URL}/courses/create`, {
        waitUntil: 'networkidle2'
    });

    const finalUrl = newPage.url();
    if (finalUrl.includes('/courses/create')) {
        reportBug('Authorization', 'CRITICAL',
            'Protected route accessible without authentication',
            'courses/create accessible without login');
    } else {
        console.log(`    ✅ Redirected to: ${finalUrl}`);
    }

    // Test API without auth
    console.log('\n  Testing: API access without authentication');
    const apiResponse = await newPage.evaluate(async () => {
        try {
            const res = await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course_name: 'Test' })
            });
            return { status: res.status };
        } catch (e) {
            return { error: e.message };
        }
    });

    console.log(`    API Response: ${apiResponse.status || apiResponse.error}`);
    if (apiResponse.status === 200 || apiResponse.status === 201) {
        reportBug('Authorization', 'CRITICAL',
            'API allows unauthenticated requests',
            'POST /api/courses accessible without auth');
    }

    await newPage.close();
    console.log('  ✅ Auth test completed');
}

async function testFileUpload() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 6: File Upload Security');
    console.log('═══════════════════════════════════════════════════════════');

    await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });

    // Check for file upload fields
    const fileInputs = await page.$$('input[type="file"]');
    console.log(`  Found ${fileInputs.length} file upload field(s)`);

    if (fileInputs.length > 0) {
        // Check if accepts dangerous file types
        for (const input of fileInputs) {
            const accept = await page.evaluate(el => el.accept, input);
            console.log(`    Accept attribute: ${accept || 'none (accepts all)'}`);

            if (!accept || accept === '*/*') {
                reportBug('File Upload', 'MEDIUM',
                    'File input accepts all file types',
                    'No file type restriction');
            }
        }
    }

    console.log('  ✅ File upload test completed');
}

async function testErrorHandling() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST 7: Error Handling และ Information Disclosure');
    console.log('═══════════════════════════════════════════════════════════');

    // Test 404 page
    console.log('\n  Testing: 404 error page');
    await page.goto(`${CONFIG.BASE_URL}/nonexistent-page-12345`, { waitUntil: 'networkidle2' });
    const content404 = await page.content();

    if (content404.includes('stack') || content404.includes('at ') || content404.includes('Error:')) {
        reportBug('Information Disclosure', 'MEDIUM',
            'Stack trace exposed in 404 page',
            'Error details visible to users');
    }

    // Test invalid course ID
    console.log('\n  Testing: Invalid course ID');
    await page.goto(`${CONFIG.BASE_URL}/courses/999999999/detail`, { waitUntil: 'networkidle2' });
    const contentInvalid = await page.content();

    if (contentInvalid.includes('MSSQL') || contentInvalid.includes('SQL') ||
        contentInvalid.includes('stack') || contentInvalid.includes('node_modules')) {
        reportBug('Information Disclosure', 'HIGH',
            'Database/server info exposed in error',
            'Technical details visible');
    }

    console.log('  ✅ Error handling test completed');
}

async function generateReport() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🔍 BUG HUNTER REPORT                            ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

    if (bugs.length === 0) {
        console.log('\n✅ ไม่พบบัคที่สำคัญ! ระบบผ่านการทดสอบ');
    } else {
        console.log(`\n🐛 พบ ${bugs.length} bug(s):\n`);

        const critical = bugs.filter(b => b.severity === 'CRITICAL');
        const high = bugs.filter(b => b.severity === 'HIGH');
        const medium = bugs.filter(b => b.severity === 'MEDIUM');

        if (critical.length > 0) {
            console.log('🔴 CRITICAL:');
            critical.forEach((b, i) => console.log(`   ${i + 1}. ${b.description}`));
        }

        if (high.length > 0) {
            console.log('\n🟠 HIGH:');
            high.forEach((b, i) => console.log(`   ${i + 1}. ${b.description}`));
        }

        if (medium.length > 0) {
            console.log('\n🟡 MEDIUM:');
            medium.forEach((b, i) => console.log(`   ${i + 1}. ${b.description}`));
        }
    }

    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log(`Total bugs found: ${bugs.length}`);
    console.log(`  - Critical: ${bugs.filter(b => b.severity === 'CRITICAL').length}`);
    console.log(`  - High: ${bugs.filter(b => b.severity === 'HIGH').length}`);
    console.log(`  - Medium: ${bugs.filter(b => b.severity === 'MEDIUM').length}`);
    console.log('════════════════════════════════════════════════════════════════════\n');
}

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          🔍 TESTER BUG HUNTER - Professional QA Testing            ║');
    console.log('║                    LearnHub Course System                          ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log(`\nStarted at: ${new Date().toLocaleString('th-TH')}`);
    console.log(`Target: ${CONFIG.BASE_URL}`);

    try {
        await setup();
        await login();

        await testXSSInCourseForm();
        await testNegativeAndBoundaryValues();
        await testFormSubmissionWithInvalidData();
        await testAPIDirectly();
        await testSessionAndAuth();
        await testFileUpload();
        await testErrorHandling();

        await generateReport();

    } catch (error) {
        console.error('Test error:', error);
        reportBug('Test Execution', 'HIGH', error.message, 'Test failed to complete');
    } finally {
        if (browser) await browser.close();
    }
}

runTests();
