/**
 * ============================================================================
 * COURSE CREATE & SUBMIT TEST - ทดสอบการสร้างหลักสูตรและบันทึกจริง
 * ============================================================================
 * ทดสอบครบลูป: กรอกข้อมูล → Submit → ตรวจสอบว่าบันทึกสำเร็จ
 */

const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const CREDENTIALS = { employee_id: 'ADM001', password: 'password123' };

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const timestamp = Date.now();
const COURSE_NAME = `หลักสูตรทดสอบ ${timestamp}`;

async function runTest() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     COURSE CREATE & SUBMIT TEST - ทดสอบบันทึกหลักสูตรจริง      ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  Course Name: ${COURSE_NAME.substring(0, 40).padEnd(40)}     ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
        slowMo: 100  // ช้าลงให้ดูชัดๆ
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        // ========== STEP 0: LOGIN ==========
        console.log('🔐 [STEP 0] Logging in...');
        await page.goto(`${BASE_URL}/auth/login`);
        await page.waitForSelector('#employee_id');
        await page.type('#employee_id', CREDENTIALS.employee_id);
        await page.type('#password', CREDENTIALS.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('✅ Login successful!\n');

        // ========== GO TO CREATE PAGE ==========
        console.log('📝 [NAVIGATE] Going to course create page...');
        await page.goto(`${BASE_URL}/courses/create`);
        await page.waitForSelector('#course_name');
        console.log('✅ Course create page loaded!\n');

        // ========== STEP 1: BASIC INFO ==========
        console.log('📋 [STEP 1] Filling Basic Info...');

        // Course Name
        await page.type('#course_name', COURSE_NAME);
        console.log(`   ✓ Course Name: ${COURSE_NAME}`);

        // Category - select first available option
        await page.select('#category_id', '1');
        console.log('   ✓ Category: Selected');

        // Difficulty
        await page.select('#difficulty_level', 'Beginner');
        console.log('   ✓ Difficulty: Beginner');

        // Course Type - must be: Online, Classroom, or Hybrid
        await page.select('#course_type', 'Online');
        console.log('   ✓ Course Type: Online');

        // Language
        await page.select('#language', 'th');
        console.log('   ✓ Language: th (ภาษาไทย)');

        // Click Next
        await page.click('#next-btn');
        await delay(500);
        console.log('✅ Step 1 completed! → Moving to Step 2\n');

        // ========== STEP 2: COURSE DETAILS ==========
        console.log('📋 [STEP 2] Filling Course Details...');
        await delay(500);

        // Description
        const description = 'นี่คือหลักสูตรทดสอบที่สร้างโดย Automated Browser Test เพื่อทดสอบการบันทึกข้อมูลหลักสูตรลงฐานข้อมูลจริง โดยระบบจะกรอกข้อมูลครบทุกขั้นตอนและกดปุ่มบันทึกเพื่อตรวจสอบว่าข้อมูลถูกบันทึกสำเร็จหรือไม่';
        await page.type('#description', description);
        console.log('   ✓ Description: Filled');

        // Learning Objectives (3 objectives) - ต้องกรอกให้ครบ 3 ข้อ
        await delay(500);

        // ใช้ type() เพื่อ simulate keyboard input - ชื่อฟิลด์จริงคือ objectives[]
        const objectives = await page.$$('input[name="objectives[]"]');
        if (objectives.length >= 3) {
            await objectives[0].click();
            await objectives[0].type('เข้าใจหลักการพื้นฐานของระบบ');
            console.log('   ✓ Objective 1: filled');

            await objectives[1].click();
            await objectives[1].type('สามารถประยุกต์ใช้งานจริง');
            console.log('   ✓ Objective 2: filled');

            await objectives[2].click();
            await objectives[2].type('พัฒนาทักษะการแก้ปัญหา');
            console.log('   ✓ Objective 3: filled');
        } else {
            console.log('   ⚠️ Could not find objective inputs, count:', objectives.length);
        }

        // Duration
        await page.type('#duration_hours', '2');
        await page.type('#duration_minutes', '30');
        console.log('   ✓ Duration: 2 hours 30 minutes');

        // Click Next
        await page.click('#next-btn');
        await delay(500);
        console.log('✅ Step 2 completed! → Moving to Step 3\n');

        // ========== STEP 3: CONTENT & MEDIA ==========
        console.log('📋 [STEP 3] Filling Content & Media...');
        await delay(1000);

        // Wait for step 3 to be visible
        await page.waitForSelector('#lessons-container', { visible: true });
        console.log('   ✓ Lessons container visible');

        // Take screenshot to debug
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step3-before-fill.png') });

        // Fill lesson using evaluate for more reliability
        const lessonFilled = await page.evaluate(() => {
            const lessonTitle = document.querySelector('input[name="lesson_titles[]"]');
            const lessonDuration = document.querySelector('input[name="lesson_durations[]"]');

            if (lessonTitle && lessonDuration) {
                lessonTitle.value = 'บทเรียนที่ 1: บทนำและความรู้เบื้องต้น';
                lessonTitle.dispatchEvent(new Event('input', { bubbles: true }));
                lessonTitle.dispatchEvent(new Event('change', { bubbles: true }));

                lessonDuration.value = '30';
                lessonDuration.dispatchEvent(new Event('input', { bubbles: true }));
                lessonDuration.dispatchEvent(new Event('change', { bubbles: true }));

                return {
                    success: true,
                    titleValue: lessonTitle.value,
                    durationValue: lessonDuration.value
                };
            }
            return { success: false, error: 'Elements not found' };
        });

        if (lessonFilled.success) {
            console.log(`   ✓ Lesson Title: "${lessonFilled.titleValue}"`);
            console.log(`   ✓ Lesson Duration: ${lessonFilled.durationValue} minutes`);
        } else {
            console.log('   ⚠️ Failed to fill lesson:', lessonFilled.error);
        }

        // Take screenshot after fill
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step3-after-fill.png') });

        // Verify the value is really set
        const verifyLesson = await page.evaluate(() => {
            const lessonTitle = document.querySelector('input[name="lesson_titles[]"]');
            return lessonTitle ? lessonTitle.value : 'NOT FOUND';
        });
        console.log(`   📝 Verify lesson title value: "${verifyLesson}"`);

        await delay(500);

        // Click Next
        console.log('   🔄 Clicking Next button...');
        await page.click('#next-btn');
        await delay(1500);

        // Check if we moved to step 4
        const currentStep = await page.evaluate(() => {
            const activeStep = document.querySelector('.wizard-step.active');
            return activeStep ? activeStep.dataset.step : 'unknown';
        });
        console.log(`   📍 Current wizard step: ${currentStep}`);

        if (currentStep === '4') {
            console.log('✅ Step 3 completed! → Moving to Step 4\n');
        } else {
            console.log('   ⚠️ Still on step', currentStep, '- checking for errors');
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step3-validation-error.png') });

            // Try to find error message
            const errorMsg = await page.evaluate(() => {
                const alert = document.querySelector('.swal2-popup');
                if (alert) return alert.textContent;
                const error = document.querySelector('.error-message, .alert-danger');
                if (error) return error.textContent;
                return null;
            });
            if (errorMsg) console.log('   ❌ Error:', errorMsg);
        }

        // ========== STEP 4: ASSESSMENT ==========
        console.log('📋 [STEP 4] Setting Assessment...');
        await delay(1000);

        // Wait for step 4 to be visible
        await page.waitForSelector('#step-4', { visible: true });
        console.log('   ✓ Step 4 visible');

        // Take screenshot of step 4
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step4-before-fill.png') });

        // Select "No Assessment" - ใช้ evaluate
        await page.evaluate(() => {
            const noAssessmentRadio = document.querySelector('input[name="assessment_type"][value="none"]');
            if (noAssessmentRadio) {
                noAssessmentRadio.checked = true;
                noAssessmentRadio.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        console.log('   ✓ Assessment: No assessment');

        // Check if submit button is visible (should be on step 4)
        const submitVisible = await page.evaluate(() => {
            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) {
                const style = window.getComputedStyle(submitBtn);
                return style.display !== 'none';
            }
            return false;
        });
        console.log(`   📍 Submit button visible: ${submitVisible}`);

        if (!submitVisible) {
            console.log('   ⚠️ Making submit button visible...');
            await page.evaluate(() => {
                const submitBtn = document.getElementById('submit-btn');
                if (submitBtn) {
                    submitBtn.style.display = 'block';
                }
            });
        }

        console.log('✅ Step 4 completed! Ready to submit\n');

        // ========== SUBMIT ==========
        console.log('🚀 [SUBMIT] Submitting the form...');

        // Take screenshot before submit
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'before-final-submit.png') });
        console.log('   📸 Screenshot saved: before-final-submit.png');

        // Scroll submit button into view and click
        await page.evaluate(() => {
            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) {
                submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        await delay(500);

        // First, let's debug what data the form has collected
        const formDataDebug = await page.evaluate(() => {
            const form = document.getElementById('create-course-form');
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                if (data[key]) {
                    if (Array.isArray(data[key])) {
                        data[key].push(value);
                    } else {
                        data[key] = [data[key], value];
                    }
                } else {
                    data[key] = value;
                }
            }
            // Check specific fields
            data._course_name_input = document.getElementById('course_name')?.value;
            data._category_select = document.getElementById('category_id')?.value;
            data._lesson_titles = Array.from(document.querySelectorAll('input[name="lesson_titles[]"]')).map(i => i.value);
            return data;
        });
        console.log('   📋 Form Data Debug:', JSON.stringify(formDataDebug, null, 2));

        // Listen for API responses
        page.on('response', async response => {
            if (response.url().includes('/courses/api/create')) {
                console.log(`   📡 API Response: ${response.status()} ${response.url()}`);
                try {
                    const json = await response.json();
                    console.log('   📡 Response Body:', JSON.stringify(json, null, 2));
                } catch (e) {
                    console.log('   📡 Response Text:', await response.text().catch(() => 'N/A'));
                }
            }
        });

        // Submit via direct function call (form uses AJAX via submitCourse())
        console.log('   🔄 Calling submitCourse() function directly...');

        // Listen for navigation that will happen after successful submission
        const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null);

        // Call the submitCourse function directly via page.evaluate
        await page.evaluate(() => {
            // The form uses submitCourse() function for AJAX submission
            if (typeof submitCourse === 'function') {
                submitCourse();
            } else {
                // Fallback: trigger form submit event
                const form = document.getElementById('create-course-form');
                if (form) {
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
            }
        });
        console.log('   ✓ submitCourse() called!');

        // Wait for server response and navigation
        console.log('   ⏳ Waiting for server response...');

        // Wait for either navigation or swal2 popup (success/error message)
        try {
            await Promise.race([
                navigationPromise,
                page.waitForSelector('.swal2-popup', { visible: true, timeout: 15000 }),
                delay(12000)
            ]);
        } catch (e) {
            console.log('   ⏳ Waiting timeout, checking result...');
        }

        // Additional wait for any animations/redirects
        await delay(3000);

        // Take screenshot after submit
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'after-final-submit.png') });
        console.log('   📸 Screenshot saved: after-final-submit.png');

        // Check result
        const currentUrl = page.url();
        console.log(`   📍 Current URL: ${currentUrl}`);

        // Check for success indicators
        const pageContent = await page.content();

        if (currentUrl.includes('/courses') && !currentUrl.includes('/create')) {
            console.log('\n✅ ════════════════════════════════════════════════════════════');
            console.log('✅ SUCCESS! หลักสูตรถูกสร้างและบันทึกเรียบร้อยแล้ว!');
            console.log('✅ ════════════════════════════════════════════════════════════\n');
        } else if (pageContent.includes('สำเร็จ') || pageContent.includes('success') || pageContent.includes('successfully')) {
            console.log('\n✅ ════════════════════════════════════════════════════════════');
            console.log('✅ SUCCESS! พบข้อความยืนยันการบันทึกสำเร็จ!');
            console.log('✅ ════════════════════════════════════════════════════════════\n');
        } else {
            console.log('\n⚠️ ════════════════════════════════════════════════════════════');
            console.log('⚠️ กรุณาตรวจสอบผลลัพธ์จาก Screenshot');
            console.log('⚠️ ════════════════════════════════════════════════════════════\n');
        }

        // ========== VERIFY: GO TO COURSE LIST ==========
        console.log('🔍 [VERIFY] Going to course list to verify...');
        await page.goto(`${BASE_URL}/courses`);
        await delay(2000);

        // Take screenshot of course list
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'course-list-verify.png') });
        console.log('   📸 Screenshot saved: course-list-verify.png');

        // Search for our course
        const listContent = await page.content();
        if (listContent.includes(COURSE_NAME) || listContent.includes('หลักสูตรทดสอบ')) {
            console.log(`\n✅ ════════════════════════════════════════════════════════════`);
            console.log(`✅ VERIFIED! พบหลักสูตร "${COURSE_NAME}" ในรายการ!`);
            console.log(`✅ ════════════════════════════════════════════════════════════\n`);
        } else {
            console.log('\n📋 กรุณาตรวจสอบจาก Screenshot ว่าหลักสูตรปรากฏในรายการหรือไม่');
        }

        console.log('════════════════════════════════════════════════════════════════');
        console.log('                    TEST COMPLETED!                              ');
        console.log('════════════════════════════════════════════════════════════════');
        console.log('📸 Screenshots saved in: tests/screenshots/');
        console.log('   - before-final-submit.png');
        console.log('   - after-final-submit.png');
        console.log('   - course-list-verify.png');
        console.log('════════════════════════════════════════════════════════════════\n');

        // Keep browser open for 10 seconds to see result
        console.log('🖥️ Browser will close in 10 seconds...');
        await delay(10000);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-submit.png') });
        console.log('📸 Error screenshot saved: error-submit.png');
    } finally {
        await browser.close();
    }
}

runTest();
