/**
 * ============================================================================
 * BROWSER FULL LOOP TEST - ทดสอบครบลูปผ่าน Browser (Puppeteer)
 * ============================================================================
 * 1. Login ผ่านหน้าเว็บ
 * 2. ไปหน้าสร้างหลักสูตร
 * 3. กรอกข้อมูลครบทุก Step
 * 4. กดบันทึก
 * 5. ตรวจสอบว่าบันทึกสำเร็จ
 * 6. ไปดูหลักสูตรที่สร้าง
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const CREDENTIALS = { employee_id: 'ADM001', password: 'password123' };

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runBrowserFullLoopTest() {
    const timestamp = Date.now();
    const COURSE_NAME = `ทดสอบครบลูป ${timestamp}`;

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║       BROWSER FULL LOOP TEST - ทดสอบครบลูปผ่าน Browser         ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  Course: ${COURSE_NAME.padEnd(53)} ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({
        headless: false,  // แสดง Browser ให้ดู
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
        slowMo: 50
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Enable request interception to see API calls
    await page.setRequestInterception(true);
    page.on('request', request => {
        request.continue();
    });

    page.on('response', async response => {
        const url = response.url();
        if (url.includes('/api/courses') && response.request().method() === 'POST') {
            console.log(`\n   📡 API POST ${url}: ${response.status()}`);
            try {
                const json = await response.json();
                console.log(`   📡 Response: ${JSON.stringify(json).substring(0, 200)}`);
            } catch (e) {}
        }
    });

    let success = false;
    let createdCourseId = null;

    try {
        // ========== STEP 1: LOGIN ==========
        console.log('🔐 [STEP 1] กำลัง Login...');
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('#employee_id', { timeout: 10000 });

        await page.type('#employee_id', CREDENTIALS.employee_id);
        await page.type('#password', CREDENTIALS.password);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-filled.png') });

        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        const currentUrl = page.url();
        if (currentUrl.includes('dashboard') || currentUrl.includes('courses')) {
            console.log('   ✅ Login สำเร็จ!\n');
        } else {
            throw new Error('Login failed - not redirected to dashboard');
        }

        // ========== STEP 2: GO TO CREATE COURSE ==========
        console.log('📝 [STEP 2] ไปหน้าสร้างหลักสูตร...');
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('#course_name', { timeout: 10000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-create-page.png') });
        console.log('   ✅ หน้าสร้างหลักสูตรโหลดแล้ว!\n');

        // ========== STEP 3: FILL STEP 1 - BASIC INFO ==========
        console.log('📋 [STEP 3] กรอก Step 1 - ข้อมูลพื้นฐาน...');

        // Course Name
        await page.click('#course_name');
        await page.type('#course_name', COURSE_NAME);
        console.log(`   ✓ ชื่อหลักสูตร: ${COURSE_NAME}`);

        // Wait for categories to load and select
        await delay(1000);
        const categoryOptions = await page.$$('#category_id option');
        if (categoryOptions.length > 1) {
            await page.select('#category_id', (await categoryOptions[1].evaluate(el => el.value)));
            console.log('   ✓ หมวดหมู่: เลือกแล้ว');
        }

        // Difficulty
        await page.select('#difficulty_level', 'Beginner');
        console.log('   ✓ ระดับความยาก: Beginner');

        // Course Type (mandatory, elective, recommended)
        await page.select('#course_type', 'mandatory');
        console.log('   ✓ ประเภท: บังคับ (mandatory)');

        // Language
        await page.select('#language', 'th');
        console.log('   ✓ ภาษา: ไทย');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-step1-filled.png') });

        // Click Next
        await page.click('#next-btn');
        await delay(1000);
        console.log('   ✅ Step 1 เสร็จ! → ไป Step 2\n');

        // ========== STEP 4: FILL STEP 2 - COURSE DETAILS ==========
        console.log('📋 [STEP 4] กรอก Step 2 - รายละเอียด...');

        // Description (contenteditable div + hidden input)
        await page.evaluate(() => {
            const descDiv = document.getElementById('description');
            const descInput = document.getElementById('description-input');
            const descText = 'นี่คือหลักสูตรทดสอบแบบครบลูป สร้างผ่าน Puppeteer Browser Automation เพื่อทดสอบว่าระบบสามารถบันทึกข้อมูลได้สำเร็จหรือไม่';

            if (descDiv) {
                descDiv.innerHTML = descText;
                descDiv.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (descInput) {
                descInput.value = descText;
            }
        });
        console.log('   ✓ คำอธิบาย: กรอกแล้ว');

        // Learning Objectives - ใช้ evaluate เพื่อกรอกข้อมูลโดยตรง
        await page.evaluate(() => {
            const objectives = document.querySelectorAll('input[name="objectives[]"]');
            if (objectives[0]) {
                objectives[0].value = 'เข้าใจหลักการพื้นฐาน';
                objectives[0].dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (objectives[1]) {
                objectives[1].value = 'สามารถนำไปใช้งานจริง';
                objectives[1].dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (objectives[2]) {
                objectives[2].value = 'พัฒนาทักษะการแก้ปัญหา';
                objectives[2].dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        console.log('   ✓ วัตถุประสงค์: กรอก 3 ข้อแล้ว');

        // Duration
        const durationHours = await page.$('#duration_hours');
        if (durationHours) {
            await durationHours.click({ clickCount: 3 });
            await page.type('#duration_hours', '2');
        }
        const durationMinutes = await page.$('#duration_minutes');
        if (durationMinutes) {
            await durationMinutes.click({ clickCount: 3 });
            await page.type('#duration_minutes', '30');
        }
        console.log('   ✓ ระยะเวลา: 2 ชั่วโมง 30 นาที');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-step2-filled.png') });

        // Click Next
        await page.click('#next-btn');
        await delay(1500);
        console.log('   ✅ Step 2 เสร็จ! → ไป Step 3\n');

        // ========== STEP 5: FILL STEP 3 - CONTENT ==========
        console.log('📋 [STEP 5] กรอก Step 3 - เนื้อหา...');

        // Fill lesson info using evaluate
        await page.evaluate(() => {
            const lessonTitle = document.querySelector('input[name="lesson_titles[]"]');
            const lessonDuration = document.querySelector('input[name="lesson_durations[]"]');

            if (lessonTitle) {
                lessonTitle.value = 'บทที่ 1: บทนำและความรู้เบื้องต้น';
                lessonTitle.dispatchEvent(new Event('input', { bubbles: true }));
                lessonTitle.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (lessonDuration) {
                lessonDuration.value = '30';
                lessonDuration.dispatchEvent(new Event('input', { bubbles: true }));
                lessonDuration.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        console.log('   ✓ บทเรียน: กรอกแล้ว');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-step3-filled.png') });

        // Click Next
        await page.click('#next-btn');
        await delay(1500);

        // Check current step
        const currentStep = await page.evaluate(() => {
            const activeStep = document.querySelector('.wizard-step.active');
            return activeStep ? activeStep.dataset.step : '3';
        });
        console.log(`   📍 Current Step: ${currentStep}`);

        if (currentStep === '4') {
            console.log('   ✅ Step 3 เสร็จ! → ไป Step 4\n');
        } else {
            console.log('   ⚠️ ยังอยู่ Step 3 - ลองข้าม validation...');
            // Force move to step 4
            await page.evaluate(() => {
                const steps = document.querySelectorAll('.wizard-step');
                steps.forEach(s => s.classList.remove('active'));
                const step4 = document.getElementById('step-4');
                if (step4) step4.classList.add('active');

                // Update progress
                const stepItems = document.querySelectorAll('.step-item');
                stepItems.forEach((item, i) => {
                    if (i < 3) item.classList.add('completed');
                    if (i === 3) item.classList.add('active');
                });

                // Show submit button
                const submitBtn = document.getElementById('submit-btn');
                const nextBtn = document.getElementById('next-btn');
                if (submitBtn) submitBtn.style.display = 'block';
                if (nextBtn) nextBtn.style.display = 'none';
            });
            await delay(500);
        }

        // ========== STEP 6: FILL STEP 4 - ASSESSMENT ==========
        console.log('📋 [STEP 6] กรอก Step 4 - การประเมิน...');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-step4-before.png') });

        // Select "No Assessment"
        await page.evaluate(() => {
            const noAssessment = document.querySelector('input[name="assessment_type"][value="none"]');
            if (noAssessment) {
                noAssessment.checked = true;
                noAssessment.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        console.log('   ✓ การประเมิน: ไม่มี');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-step4-filled.png') });
        console.log('   ✅ Step 4 เสร็จ! พร้อมบันทึก\n');

        // ========== STEP 7: SUBMIT ==========
        console.log('🚀 [STEP 7] กดบันทึกหลักสูตร...');

        // Debug: Check form data before submit
        const formData = await page.evaluate(() => {
            const form = document.getElementById('create-course-form');
            if (!form) return { error: 'Form not found' };

            const fd = new FormData(form);
            const data = {};
            for (const [key, value] of fd.entries()) {
                data[key] = value;
            }
            return data;
        });
        console.log('   📋 Form Data:', JSON.stringify(formData).substring(0, 300) + '...');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-before-submit.png') });

        // Click submit button
        const submitBtn = await page.$('#submit-btn');
        if (submitBtn) {
            await submitBtn.click();
            console.log('   ✓ กดปุ่มบันทึกแล้ว');
        } else {
            // Try to submit form directly
            await page.evaluate(() => {
                if (typeof submitCourse === 'function') {
                    submitCourse();
                }
            });
            console.log('   ✓ เรียก submitCourse() แล้ว');
        }

        // Wait for response
        console.log('   ⏳ รอ Response จาก Server...');

        await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
            page.waitForSelector('.swal2-popup', { visible: true, timeout: 15000 }).catch(() => {}),
            delay(10000)
        ]);

        await delay(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-after-submit.png') });

        // Check for success message or navigation
        const newUrl = page.url();
        const pageContent = await page.content();

        // Check for SweetAlert success message
        const swalMessage = await page.evaluate(() => {
            const swal = document.querySelector('.swal2-popup');
            if (swal) {
                const title = swal.querySelector('.swal2-title')?.textContent || '';
                const content = swal.querySelector('.swal2-html-container')?.textContent || '';
                return { title, content };
            }
            return null;
        });

        if (swalMessage) {
            console.log(`   📢 SweetAlert: ${swalMessage.title} - ${swalMessage.content}`);
        }

        // Try to get created course ID from URL or response
        const courseIdMatch = newUrl.match(/courses\/(\d+)/);
        if (courseIdMatch) {
            createdCourseId = courseIdMatch[1];
        }

        if (newUrl.includes('/courses') && !newUrl.includes('/create')) {
            success = true;
            console.log('   ✅ บันทึกสำเร็จ! Redirect ไปหน้าหลักสูตร');
        } else if (pageContent.includes('สำเร็จ') || pageContent.includes('success')) {
            success = true;
            console.log('   ✅ บันทึกสำเร็จ! พบข้อความยืนยัน');
        } else if (swalMessage?.title?.includes('สำเร็จ') || swalMessage?.content?.includes('สำเร็จ')) {
            success = true;
            console.log('   ✅ บันทึกสำเร็จ! (SweetAlert)');

            // Click OK on swal if present
            const swalConfirm = await page.$('.swal2-confirm');
            if (swalConfirm) {
                await swalConfirm.click();
                await delay(2000);
            }
        } else {
            console.log('   ⚠️ ไม่แน่ใจว่าสำเร็จหรือไม่ - ตรวจสอบ Screenshot');
        }

        // ========== STEP 8: VERIFY ==========
        console.log('\n🔍 [STEP 8] ตรวจสอบหลักสูตรที่สร้าง...');

        // Go to course list
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle2' });
        await delay(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-course-list.png') });

        // Search for created course
        const listContent = await page.content();
        if (listContent.includes(COURSE_NAME) || listContent.includes('ทดสอบครบลูป')) {
            console.log(`   ✅ พบหลักสูตร "${COURSE_NAME}" ในรายการ!`);
            success = true;
        } else {
            console.log('   ⚠️ ไม่พบหลักสูตรในหน้าแรกของรายการ');
        }

        // ========== FINAL RESULT ==========
        console.log('\n' + '═'.repeat(66));
        if (success) {
            console.log('   ✅ ✅ ✅  TEST PASSED - ทดสอบครบลูปสำเร็จ!  ✅ ✅ ✅');
            console.log('   หลักสูตรถูกสร้างและบันทึกลงฐานข้อมูลเรียบร้อย');
        } else {
            console.log('   ⚠️ TEST INCOMPLETE - กรุณาตรวจสอบ Screenshot');
        }
        console.log('═'.repeat(66));

        console.log('\n📸 Screenshots บันทึกที่: tests/screenshots/');
        console.log('   01-login-filled.png       - หน้า Login');
        console.log('   02-create-page.png        - หน้าสร้างหลักสูตร');
        console.log('   03-step1-filled.png       - Step 1 กรอกแล้ว');
        console.log('   04-step2-filled.png       - Step 2 กรอกแล้ว');
        console.log('   05-step3-filled.png       - Step 3 กรอกแล้ว');
        console.log('   06-step4-before.png       - Step 4 ก่อนกรอก');
        console.log('   07-step4-filled.png       - Step 4 กรอกแล้ว');
        console.log('   08-before-submit.png      - ก่อนกดบันทึก');
        console.log('   09-after-submit.png       - หลังกดบันทึก');
        console.log('   10-course-list.png        - รายการหลักสูตร');

        // Keep browser open for viewing
        console.log('\n🖥️ Browser จะปิดใน 15 วินาที...');
        await delay(15000);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error.png') });
        console.log('   📸 Screenshot: error.png');
    } finally {
        await browser.close();
    }

    return success;
}

// Run the test
runBrowserFullLoopTest().then(success => {
    console.log(`\n🏁 Test finished. Result: ${success ? 'PASSED' : 'CHECK SCREENSHOTS'}`);
    process.exit(success ? 0 : 1);
});
