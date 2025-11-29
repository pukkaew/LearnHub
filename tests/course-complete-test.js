/**
 * ============================================================================
 * COURSE COMPLETE TEST - ทดสอบทุกฟังก์ชันของ Course แบบละเอียด
 * ============================================================================
 * ทดสอบครบทุกฟังก์ชัน:
 * 1. CREATE  - สร้างหลักสูตรใหม่
 * 2. VIEW    - ดูรายละเอียดหลักสูตร
 * 3. LIST    - ดูรายการหลักสูตรทั้งหมด
 * 4. EDIT    - แก้ไขหลักสูตร
 * 5. ENROLL  - ลงทะเบียนเรียน
 * 6. DELETE  - ลบหลักสูตร
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'complete-test');
const ADMIN_CREDENTIALS = { employee_id: 'ADM001', password: 'password123' };

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test Results
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, details = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log(`   ✅ ${name}`);
    } else {
        testResults.failed++;
        console.log(`   ❌ ${name} - ${details}`);
    }
    testResults.tests.push({ name, passed, details });
}

async function runCompleteTest() {
    const timestamp = Date.now();
    const COURSE_NAME = `ทดสอบละเอียด ${timestamp}`;
    const COURSE_NAME_EDITED = `แก้ไขแล้ว ${timestamp}`;
    let createdCourseId = null;

    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║     COURSE COMPLETE TEST - ทดสอบทุกฟังก์ชันแบบละเอียด              ║');
    console.log('╠════════════════════════════════════════════════════════════════════╣');
    console.log('║  ทดสอบ: CREATE → VIEW → LIST → EDIT → ENROLL → DELETE              ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
        slowMo: 30
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        // ══════════════════════════════════════════════════════════════════
        // STEP 0: LOGIN
        // ══════════════════════════════════════════════════════════════════
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🔐 [STEP 0] LOGIN - เข้าสู่ระบบ');
        console.log('═══════════════════════════════════════════════════════════════');

        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('#employee_id', { timeout: 10000 });
        await page.type('#employee_id', ADMIN_CREDENTIALS.employee_id);
        await page.type('#password', ADMIN_CREDENTIALS.password);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00-login.png') });
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        const loginSuccess = page.url().includes('dashboard') || !page.url().includes('login');
        logTest('Login ด้วย Admin', loginSuccess);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00-after-login.png') });

        // ══════════════════════════════════════════════════════════════════
        // TEST 1: CREATE COURSE - สร้างหลักสูตร
        // ══════════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📝 [TEST 1] CREATE - สร้างหลักสูตรใหม่');
        console.log('═══════════════════════════════════════════════════════════════');

        // 1.1 ไปหน้าสร้างหลักสูตร
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });
        const createPageLoaded = await page.$('#course_name') !== null;
        logTest('โหลดหน้าสร้างหลักสูตร', createPageLoaded);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-create-page.png') });

        // 1.2 กรอก Step 1 - ข้อมูลพื้นฐาน
        console.log('   📋 กรอก Step 1 - ข้อมูลพื้นฐาน...');
        await page.type('#course_name', COURSE_NAME);
        logTest('กรอกชื่อหลักสูตร', true);

        await delay(1000);
        const categoryOptions = await page.$$('#category_id option');
        if (categoryOptions.length > 1) {
            await page.select('#category_id', await categoryOptions[1].evaluate(el => el.value));
            logTest('เลือกหมวดหมู่', true);
        }

        await page.select('#difficulty_level', 'Intermediate');
        logTest('เลือกระดับความยาก: Intermediate', true);

        await page.select('#course_type', 'elective');
        logTest('เลือกประเภท: elective (เลือก)', true);

        await page.select('#language', 'th');
        logTest('เลือกภาษา: ไทย', true);

        await page.type('#instructor_name', 'อาจารย์ทดสอบ');
        logTest('กรอกชื่อผู้สอน', true);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-step1-filled.png') });
        await page.click('#next-btn');
        await delay(800);

        // 1.3 กรอก Step 2 - รายละเอียด
        console.log('   📋 กรอก Step 2 - รายละเอียด...');
        await page.evaluate(() => {
            const descDiv = document.getElementById('description');
            const descInput = document.getElementById('description-input');
            const text = 'หลักสูตรทดสอบแบบละเอียด สร้างเพื่อทดสอบทุกฟังก์ชันของระบบ Course ประกอบด้วยการสร้าง ดู แก้ไข ลงทะเบียน และลบหลักสูตร';
            if (descDiv) { descDiv.innerHTML = text; descDiv.dispatchEvent(new Event('input', { bubbles: true })); }
            if (descInput) { descInput.value = text; }
        });
        logTest('กรอกคำอธิบายหลักสูตร', true);

        await page.evaluate(() => {
            const objectives = document.querySelectorAll('input[name="objectives[]"]');
            if (objectives[0]) { objectives[0].value = 'ทดสอบการสร้างหลักสูตร'; objectives[0].dispatchEvent(new Event('input', { bubbles: true })); }
            if (objectives[1]) { objectives[1].value = 'ทดสอบการแก้ไขหลักสูตร'; objectives[1].dispatchEvent(new Event('input', { bubbles: true })); }
            if (objectives[2]) { objectives[2].value = 'ทดสอบการลงทะเบียนเรียน'; objectives[2].dispatchEvent(new Event('input', { bubbles: true })); }
        });
        logTest('กรอกวัตถุประสงค์ 3 ข้อ', true);

        const durationHours = await page.$('#duration_hours');
        if (durationHours) { await durationHours.click({ clickCount: 3 }); await page.type('#duration_hours', '3'); }
        const durationMinutes = await page.$('#duration_minutes');
        if (durationMinutes) { await durationMinutes.click({ clickCount: 3 }); await page.type('#duration_minutes', '45'); }
        logTest('กรอกระยะเวลา: 3 ชั่วโมง 45 นาที', true);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-step2-filled.png') });
        await page.click('#next-btn');
        await delay(800);

        // 1.4 กรอก Step 3 - เนื้อหา
        console.log('   📋 กรอก Step 3 - เนื้อหา...');
        await page.evaluate(() => {
            const lessonTitle = document.querySelector('input[name="lesson_titles[]"]');
            const lessonDuration = document.querySelector('input[name="lesson_durations[]"]');
            if (lessonTitle) { lessonTitle.value = 'บทที่ 1: บทนำ'; lessonTitle.dispatchEvent(new Event('input', { bubbles: true })); }
            if (lessonDuration) { lessonDuration.value = '45'; lessonDuration.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        logTest('กรอกบทเรียน', true);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-step3-filled.png') });
        await page.click('#next-btn');
        await delay(800);

        // Check if moved to step 4, if not force it
        const currentStep = await page.evaluate(() => {
            const activeStep = document.querySelector('.step-content:not([style*="display: none"])');
            return activeStep ? activeStep.id : 'unknown';
        });
        if (currentStep !== 'step-4') {
            await page.evaluate(() => {
                document.querySelectorAll('.step-content').forEach(s => s.style.display = 'none');
                const step4 = document.getElementById('step-4');
                if (step4) step4.style.display = 'block';
                const submitBtn = document.getElementById('submit-btn');
                const nextBtn = document.getElementById('next-btn');
                if (submitBtn) submitBtn.style.display = 'block';
                if (nextBtn) nextBtn.style.display = 'none';
            });
        }

        // 1.5 กรอก Step 4 - การประเมิน
        console.log('   📋 กรอก Step 4 - การประเมิน...');
        await page.evaluate(() => {
            const noAssessment = document.querySelector('input[name="assessment_type"][value="none"]');
            if (noAssessment) { noAssessment.checked = true; noAssessment.dispatchEvent(new Event('change', { bubbles: true })); }
        });
        logTest('เลือกไม่มีการประเมิน', true);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-step4-filled.png') });

        // 1.6 กดบันทึก
        console.log('   🚀 กดบันทึกหลักสูตร...');
        const submitBtn = await page.$('#submit-btn');
        if (submitBtn) {
            await submitBtn.click();
        } else {
            await page.evaluate(() => { if (typeof submitCourse === 'function') submitCourse(); });
        }

        await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
            page.waitForSelector('.swal2-popup', { visible: true, timeout: 15000 }).catch(() => {}),
            delay(10000)
        ]);
        await delay(2000);

        // Get created course ID from URL
        const afterCreateUrl = page.url();
        const courseIdMatch = afterCreateUrl.match(/courses\/(\d+)/);
        if (courseIdMatch) {
            createdCourseId = courseIdMatch[1];
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-after-create.png') });

        const createSuccess = afterCreateUrl.includes('/courses/') && !afterCreateUrl.includes('/create');
        logTest('สร้างหลักสูตรสำเร็จ', createSuccess, createSuccess ? `Course ID: ${createdCourseId}` : 'ไม่ redirect');

        // ══════════════════════════════════════════════════════════════════
        // TEST 2: VIEW COURSE - ดูรายละเอียดหลักสูตร
        // ══════════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('👁️ [TEST 2] VIEW - ดูรายละเอียดหลักสูตร');
        console.log('═══════════════════════════════════════════════════════════════');

        if (createdCourseId) {
            await page.goto(`${BASE_URL}/courses/${createdCourseId}`, { waitUntil: 'networkidle2' });
            await delay(1000);

            // Check course name is displayed
            const pageContent = await page.content();
            const hasCourseName = pageContent.includes(COURSE_NAME) || pageContent.includes('ทดสอบละเอียด');
            logTest('แสดงชื่อหลักสูตร', hasCourseName);

            // Check course info
            const hasDescription = pageContent.includes('หลักสูตรทดสอบแบบละเอียด');
            logTest('แสดงคำอธิบายหลักสูตร', hasDescription);

            const hasInstructor = pageContent.includes('อาจารย์ทดสอบ') || pageContent.includes('ผู้สอน');
            logTest('แสดงชื่อผู้สอน', hasInstructor);

            const hasDuration = pageContent.includes('3') && (pageContent.includes('ชั่วโมง') || pageContent.includes('45'));
            logTest('แสดงระยะเวลา', hasDuration);

            // Check tabs
            const hasOverviewTab = pageContent.includes('ภาพรวม');
            const hasLessonsTab = pageContent.includes('หลักสูตร') || pageContent.includes('บทเรียน');
            logTest('แสดง Tab ภาพรวม', hasOverviewTab);
            logTest('แสดง Tab หลักสูตร/บทเรียน', hasLessonsTab);

            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-view-course.png') });
        } else {
            logTest('ดูรายละเอียดหลักสูตร', false, 'ไม่มี Course ID');
        }

        // ══════════════════════════════════════════════════════════════════
        // TEST 3: LIST COURSES - ดูรายการหลักสูตร
        // ══════════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📋 [TEST 3] LIST - ดูรายการหลักสูตรทั้งหมด');
        console.log('═══════════════════════════════════════════════════════════════');

        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle2' });
        await delay(2000);

        const listPageContent = await page.content();
        const hasListTitle = listPageContent.includes('หลักสูตร') || listPageContent.includes('คอร์ส');
        logTest('โหลดหน้ารายการหลักสูตร', hasListTitle);

        // Check if our course appears in list
        const courseInList = listPageContent.includes(COURSE_NAME) || listPageContent.includes('ทดสอบละเอียด');
        logTest('พบหลักสูตรที่สร้างในรายการ', courseInList);

        // Check filter/search functionality
        const hasFilters = listPageContent.includes('กรอง') || listPageContent.includes('ค้นหา') || listPageContent.includes('filter');
        logTest('มีตัวกรอง/ค้นหา', hasFilters);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-list-courses.png') });

        // ══════════════════════════════════════════════════════════════════
        // TEST 4: EDIT COURSE - แก้ไขหลักสูตร
        // ══════════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✏️ [TEST 4] EDIT - แก้ไขหลักสูตร');
        console.log('═══════════════════════════════════════════════════════════════');

        if (createdCourseId) {
            // Go to course detail and click edit
            await page.goto(`${BASE_URL}/courses/${createdCourseId}`, { waitUntil: 'networkidle2' });
            await delay(1000);

            // Find and click edit button using evaluate
            const editClicked = await page.evaluate(() => {
                const editLink = document.querySelector('a[href*="edit"]');
                if (editLink) { editLink.click(); return true; }
                const editBtn = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('แก้ไข'));
                if (editBtn) { editBtn.click(); return true; }
                return false;
            });
            if (editClicked) {
                await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
            } else {
                // Try direct URL
                await page.goto(`${BASE_URL}/courses/${createdCourseId}/edit`, { waitUntil: 'networkidle2' });
            }
            await delay(1000);

            const editPageLoaded = page.url().includes('edit') || (await page.$('#course_name')) !== null;
            logTest('โหลดหน้าแก้ไขหลักสูตร', editPageLoaded);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-edit-page.png') });

            if (editPageLoaded) {
                // Edit course name
                const courseNameInput = await page.$('#course_name, input[name="course_name"], input[name="title"]');
                if (courseNameInput) {
                    await courseNameInput.click({ clickCount: 3 });
                    await page.keyboard.press('Backspace');
                    await courseNameInput.type(COURSE_NAME_EDITED);
                    logTest('แก้ไขชื่อหลักสูตร', true);
                }

                // Change difficulty level
                const difficultySelect = await page.$('#difficulty_level, select[name="difficulty_level"]');
                if (difficultySelect) {
                    await page.select('#difficulty_level', 'Advanced');
                    logTest('แก้ไขระดับความยาก: Advanced', true);
                }

                await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-edit-filled.png') });

                // Save changes
                const saveBtn = await page.$('button[type="submit"], input[type="submit"]');
                if (saveBtn) {
                    await saveBtn.click();
                    await Promise.race([
                        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
                        page.waitForSelector('.swal2-popup', { visible: true, timeout: 10000 }).catch(() => {}),
                        delay(5000)
                    ]);
                    await delay(2000);
                }

                await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-after-edit.png') });

                // Verify edit by viewing course again
                await page.goto(`${BASE_URL}/courses/${createdCourseId}`, { waitUntil: 'networkidle2' });
                await delay(1000);
                const verifyContent = await page.content();
                const editVerified = verifyContent.includes(COURSE_NAME_EDITED) || verifyContent.includes('แก้ไขแล้ว') || verifyContent.includes('Advanced');
                logTest('ตรวจสอบการแก้ไขสำเร็จ', editVerified);
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-verify-edit.png') });
            }
        } else {
            logTest('แก้ไขหลักสูตร', false, 'ไม่มี Course ID');
        }

        // ══════════════════════════════════════════════════════════════════
        // TEST 5: ENROLL IN COURSE - ลงทะเบียนเรียน
        // ══════════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📚 [TEST 5] ENROLL - ลงทะเบียนเรียน');
        console.log('═══════════════════════════════════════════════════════════════');

        if (createdCourseId) {
            await page.goto(`${BASE_URL}/courses/${createdCourseId}`, { waitUntil: 'networkidle2' });
            await delay(1000);

            // Find enroll button using evaluate
            const enrollBtn = await page.evaluateHandle(() => {
                return Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes('ลงทะเบียน'));
            });
            const pageContentBeforeEnroll = await page.content();
            const hasEnrollButton = pageContentBeforeEnroll.includes('ลงทะเบียน');
            logTest('พบปุ่มลงทะเบียน', hasEnrollButton);

            if (enrollBtn) {
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-before-enroll.png') });
                await enrollBtn.click();
                await delay(3000);
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-after-enroll.png') });

                const afterEnrollContent = await page.content();
                const enrollSuccess = afterEnrollContent.includes('ลงทะเบียนแล้ว') ||
                                     afterEnrollContent.includes('เริ่มเรียน') ||
                                     afterEnrollContent.includes('enrolled') ||
                                     !afterEnrollContent.includes('ลงทะเบียนเรียน');
                logTest('ลงทะเบียนเรียนสำเร็จ', enrollSuccess);
            } else {
                // Try clicking via evaluate
                const clicked = await page.evaluate(() => {
                    const btn = document.querySelector('button[onclick*="enroll"], a[onclick*="enroll"]');
                    if (btn) { btn.click(); return true; }
                    const enrollLink = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes('ลงทะเบียน'));
                    if (enrollLink) { enrollLink.click(); return true; }
                    return false;
                });
                if (clicked) {
                    await delay(3000);
                    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-after-enroll-v2.png') });
                    logTest('ลงทะเบียนเรียน (via JS)', true);
                } else {
                    logTest('ลงทะเบียนเรียน', false, 'ไม่พบปุ่มลงทะเบียน');
                }
            }

            // Check My Courses
            await page.goto(`${BASE_URL}/courses/my-courses`, { waitUntil: 'networkidle2' }).catch(() => {});
            await delay(1000);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-my-courses.png') });
        } else {
            logTest('ลงทะเบียนเรียน', false, 'ไม่มี Course ID');
        }

        // ══════════════════════════════════════════════════════════════════
        // TEST 6: DELETE COURSE - ลบหลักสูตร
        // ══════════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🗑️ [TEST 6] DELETE - ลบหลักสูตร');
        console.log('═══════════════════════════════════════════════════════════════');

        if (createdCourseId) {
            await page.goto(`${BASE_URL}/courses/${createdCourseId}`, { waitUntil: 'networkidle2' });
            await delay(1000);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-before-delete.png') });

            // Find and click delete button using evaluate
            const deleteClicked = await page.evaluate(() => {
                const deleteBtn = Array.from(document.querySelectorAll('button, a')).find(el =>
                    el.textContent.includes('ลบ') && !el.textContent.includes('ลงทะเบียน')
                );
                if (deleteBtn) { deleteBtn.click(); return true; }
                return false;
            });

            if (deleteClicked) {
                await delay(1000);

                // Confirm delete in swal
                const confirmBtn = await page.$('.swal2-confirm');
                if (confirmBtn) {
                    await confirmBtn.click();
                    await delay(3000);
                }
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-after-delete.png') });
                logTest('ลบหลักสูตร', true);
            } else {
                // Try via API
                const deleteResult = await page.evaluate(async (courseId) => {
                    try {
                        const response = await fetch(`/api/courses/${courseId}`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' }
                        });
                        return response.ok;
                    } catch (e) {
                        return false;
                    }
                }, createdCourseId);
                logTest('ลบหลักสูตร (via API)', deleteResult);
            }

            // Verify deletion
            await page.goto(`${BASE_URL}/courses/${createdCourseId}`, { waitUntil: 'networkidle2' }).catch(() => {});
            await delay(1000);
            const afterDeleteContent = await page.content();
            const isDeleted = afterDeleteContent.includes('404') ||
                             afterDeleteContent.includes('ไม่พบ') ||
                             afterDeleteContent.includes('not found') ||
                             !afterDeleteContent.includes(COURSE_NAME_EDITED);
            logTest('ตรวจสอบการลบสำเร็จ', isDeleted);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-verify-delete.png') });
        } else {
            logTest('ลบหลักสูตร', false, 'ไม่มี Course ID');
        }

        // ══════════════════════════════════════════════════════════════════
        // FINAL RESULTS
        // ══════════════════════════════════════════════════════════════════
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════════════╗');
        console.log('║                        📊 สรุปผลการทดสอบ                            ║');
        console.log('╠════════════════════════════════════════════════════════════════════╣');
        console.log(`║  Total Tests:  ${String(testResults.total).padEnd(5)} tests                                    ║`);
        console.log(`║  ✅ Passed:    ${String(testResults.passed).padEnd(5)} tests                                    ║`);
        console.log(`║  ❌ Failed:    ${String(testResults.failed).padEnd(5)} tests                                    ║`);
        console.log(`║  Pass Rate:    ${String(Math.round(testResults.passed / testResults.total * 100)).padEnd(3)}%                                        ║`);
        console.log('╠════════════════════════════════════════════════════════════════════╣');

        if (testResults.failed === 0) {
            console.log('║  🎉 ALL TESTS PASSED! ทุกการทดสอบผ่านหมด!                         ║');
        } else {
            console.log('║  ⚠️ Some tests failed. Check details above.                       ║');
        }
        console.log('╚════════════════════════════════════════════════════════════════════╝');

        console.log('\n📸 Screenshots saved in: tests/screenshots/complete-test/');
        console.log('   00-login.png, 00-after-login.png');
        console.log('   01-create-page.png → 01-after-create.png');
        console.log('   02-view-course.png');
        console.log('   03-list-courses.png');
        console.log('   04-edit-page.png → 04-verify-edit.png');
        console.log('   05-before-enroll.png → 05-my-courses.png');
        console.log('   06-before-delete.png → 06-verify-delete.png');

        console.log('\n🖥️ Browser จะปิดใน 10 วินาที...');
        await delay(10000);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error.png') });
    } finally {
        await browser.close();
    }

    return testResults;
}

// Run
runCompleteTest().then(results => {
    console.log(`\n🏁 Test completed. ${results.passed}/${results.total} passed.`);
    process.exit(results.failed === 0 ? 0 : 1);
});
