/**
 * Screenshot Test: /tests/create page
 * Captures the test creation page in Thai language
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function captureTestsCreatePage() {
    console.log('🚀 Starting browser test for /tests/create page...\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(60000);

        const screenshotDir = path.join(__dirname, 'screenshots');

        // Step 1: Login first
        console.log('📝 Step 1: Logging in...');
        await page.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for login form
        await page.waitForSelector('#employee_id', { timeout: 10000 });

        // Fill login form (use employee_id)
        await page.type('#employee_id', 'ADM001');
        await page.type('#password', 'Admin@123');

        // Submit login and wait
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {
            console.log('   Navigation may have completed before listener attached');
        });

        // Wait a moment to ensure login processed
        await new Promise(r => setTimeout(r, 2000));

        // Check if we're logged in by checking URL
        const currentUrl = page.url();
        console.log('   Current URL:', currentUrl);

        if (currentUrl.includes('/login')) {
            // Still on login page, try clicking again
            console.log('   Still on login, retrying...');
            await page.screenshot({ path: path.join(screenshotDir, 'debug_login.png') });
            throw new Error('Login failed - still on login page');
        }

        console.log('✅ Logged in successfully!\n');

        // Step 2: Go to /tests/create
        console.log('📝 Step 2: Navigating to /tests/create...');
        await page.goto('http://localhost:3000/tests/create', { waitUntil: 'networkidle0', timeout: 60000 });
        await new Promise(r => setTimeout(r, 2000));

        // Screenshot Step 1 - Basic Information
        await page.screenshot({
            path: path.join(screenshotDir, 'tests_create_step1.png'),
            fullPage: true
        });
        console.log('📸 Screenshot 1: Step 1 (Basic Information) saved!\n');

        // Click Next to go to Step 2
        console.log('📝 Step 3: Filling Step 1 and moving to Step 2...');
        await page.type('#test_name', 'Test Language Check');
        await page.type('#test_code', 'TEST-001');
        await page.select('#test_type', 'assessment');

        // Click Next button
        await page.evaluate(() => {
            const nextBtn = document.querySelector('#step-1 button[onclick="nextStep()"]');
            if (nextBtn) nextBtn.click();
        });
        await new Promise(r => setTimeout(r, 500));

        // Screenshot Step 2 - Test Settings
        await page.screenshot({
            path: path.join(screenshotDir, 'tests_create_step2.png'),
            fullPage: true
        });
        console.log('📸 Screenshot 2: Step 2 (Settings) saved!\n');

        // Click Next to go to Step 3
        console.log('📝 Step 4: Moving to Step 3...');
        await page.evaluate(() => {
            const nextBtn = document.querySelector('#step-2 button[onclick="nextStep()"]');
            if (nextBtn) nextBtn.click();
        });
        await new Promise(r => setTimeout(r, 500));

        // Screenshot Step 3 - Questions
        await page.screenshot({
            path: path.join(screenshotDir, 'tests_create_step3.png'),
            fullPage: true
        });
        console.log('📸 Screenshot 3: Step 3 (Questions) saved!\n');

        // Open Question Modal
        console.log('📝 Step 5: Opening Question Modal...');
        await page.evaluate(() => {
            const addBtn = document.querySelector('button[onclick="addQuestion()"]');
            if (addBtn) addBtn.click();
        });
        await new Promise(r => setTimeout(r, 500));

        // Screenshot Question Modal
        await page.screenshot({
            path: path.join(screenshotDir, 'tests_create_question_modal.png'),
            fullPage: true
        });
        console.log('📸 Screenshot 4: Question Modal saved!\n');

        // Get all text content to check language
        console.log('📝 Step 6: Analyzing page language...\n');
        const pageText = await page.evaluate(() => document.body.innerText);

        // Check for Thai text
        const thaiPatterns = [
            'สร้างข้อสอบใหม่',
            'ข้อมูลพื้นฐาน',
            'การตั้งค่า',
            'คำถาม',
            'ชื่อข้อสอบ',
            'รหัสข้อสอบ',
            'ประเภทข้อสอบ',
            'หลักสูตรที่เกี่ยวข้อง',
            'ระดับความยาก',
            'ถัดไป',
            'ก่อนหน้า'
        ];

        console.log('🔍 Language Check Results:');
        console.log('=' .repeat(50));

        let foundCount = 0;
        let missingCount = 0;

        thaiPatterns.forEach(pattern => {
            if (pageText.includes(pattern)) {
                console.log(`✅ Found: "${pattern}"`);
                foundCount++;
            } else {
                console.log(`❌ Missing: "${pattern}"`);
                missingCount++;
            }
        });

        console.log('=' .repeat(50));
        console.log(`\n📊 Summary: ${foundCount}/${thaiPatterns.length} Thai texts found`);

        if (missingCount === 0) {
            console.log('🎉 All Thai translations are displaying correctly!');
        } else {
            console.log(`⚠️ ${missingCount} Thai translations may be missing`);
        }

        console.log('\n📁 Screenshots saved to: tests/screenshots/');
        console.log('   - tests_create_step1.png');
        console.log('   - tests_create_step2.png');
        console.log('   - tests_create_step3.png');
        console.log('   - tests_create_question_modal.png');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
        console.log('\n✅ Browser test completed!');
    }
}

captureTestsCreatePage();
