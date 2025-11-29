/**
 * Real Course Browser Test - ทดสอบสร้าง Course จริง
 * ใช้ selectors ที่ถูกต้องจาก screenshot
 */

const puppeteer = require('puppeteer');

const CONFIG = {
    BASE_URL: 'http://localhost:3000',
    TIMEOUT: 60000
};

let browser, page;
const results = [];
const bugs = [];

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function pass(name, detail = '') {
    results.push({ name, status: 'PASS', detail });
    console.log(`✅ ${name}${detail ? ' - ' + detail : ''}`);
}

function fail(name, detail = '') {
    results.push({ name, status: 'FAIL', detail });
    console.log(`❌ ${name}${detail ? ' - ' + detail : ''}`);
}

function warn(name, detail = '') {
    results.push({ name, status: 'WARN', detail });
    console.log(`⚠️  ${name}${detail ? ' - ' + detail : ''}`);
}

function bug(severity, desc, evidence) {
    bugs.push({ severity, desc, evidence });
    console.log(`\n🐛 [${severity}] ${desc}`);
}

async function setup() {
    console.log('🚀 Starting browser...\n');
    browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
}

async function screenshot(name) {
    const path = `tests/screenshots/${name}-${Date.now()}.png`;
    await page.screenshot({ path, fullPage: true });
    console.log(`   📸 ${path}`);
    return path;
}

async function login() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔐 LOGIN');
    console.log('═══════════════════════════════════════════════════════════\n');

    await page.goto(`${CONFIG.BASE_URL}/auth/login`, { waitUntil: 'networkidle2' });
    await page.type('#employee_id', 'ADM001');
    await page.type('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    if (!page.url().includes('login')) {
        pass('Login successful');
        return true;
    }
    fail('Login failed');
    return false;
}

async function step1_BasicInfo() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 1: ข้อมูลพื้นฐาน');
    console.log('═══════════════════════════════════════════════════════════\n');

    await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });
    await delay(1000);

    // 1. Course Title - มองหา input ที่มี label "ชื่อหลักสูตร"
    try {
        // Try various selectors for course name
        const titleSelectors = [
            'input[name="title"]',
            'input[id="title"]',
            'input[name="course_name"]',
            'input[placeholder*="ชื่อหลักสูตร"]',
            'input[placeholder*="course"]'
        ];

        let titleInput = null;
        for (const sel of titleSelectors) {
            titleInput = await page.$(sel);
            if (titleInput) break;
        }

        if (!titleInput) {
            // Find by label text
            titleInput = await page.evaluateHandle(() => {
                const labels = document.querySelectorAll('label');
                for (const label of labels) {
                    if (label.textContent.includes('ชื่อหลักสูตร')) {
                        const forId = label.getAttribute('for');
                        if (forId) return document.getElementById(forId);
                        const input = label.parentElement.querySelector('input');
                        if (input) return input;
                    }
                }
                return null;
            });
        }

        if (titleInput) {
            await titleInput.click();
            await titleInput.type('หลักสูตรทดสอบการสร้างอัตโนมัติ ' + Date.now());
            pass('กรอกชื่อหลักสูตร');
        } else {
            fail('ไม่พบ input ชื่อหลักสูตร');
        }
    } catch (e) {
        fail('กรอกชื่อหลักสูตร', e.message);
    }

    // 2. Category - หมวดหมู่
    try {
        const categorySelect = await page.$('select[name="category_id"], #category_id');
        if (categorySelect) {
            await page.select('select[name="category_id"], #category_id', '1');
            pass('เลือกหมวดหมู่');
        } else {
            warn('ไม่พบ select หมวดหมู่');
        }
    } catch (e) {
        warn('เลือกหมวดหมู่', e.message);
    }

    // 3. Difficulty Level - ระดับความยาก
    try {
        const difficultySelectors = [
            'select[name="difficulty_level"]',
            '#difficulty_level',
            'select[name="difficulty"]'
        ];
        for (const sel of difficultySelectors) {
            const select = await page.$(sel);
            if (select) {
                const options = await page.$$eval(`${sel} option`, opts =>
                    opts.filter(o => o.value).map(o => o.value)
                );
                if (options.length > 0) {
                    await page.select(sel, options[0]);
                    pass('เลือกระดับความยาก');
                    break;
                }
            }
        }
    } catch (e) {
        warn('เลือกระดับความยาก', e.message);
    }

    // 4. Course Type - ประเภทหลักสูตร
    try {
        const typeSelectors = [
            'select[name="course_type"]',
            '#course_type',
            'select[name="type"]'
        ];
        for (const sel of typeSelectors) {
            const select = await page.$(sel);
            if (select) {
                const options = await page.$$eval(`${sel} option`, opts =>
                    opts.filter(o => o.value).map(o => o.value)
                );
                if (options.length > 0) {
                    await page.select(sel, options[0]);
                    pass('เลือกประเภทหลักสูตร');
                    break;
                }
            }
        }
    } catch (e) {
        warn('เลือกประเภทหลักสูตร', e.message);
    }

    // 5. Language - ภาษาที่ใช้สอน
    try {
        const langSelectors = [
            'select[name="language"]',
            '#language',
            'select[name="teaching_language"]'
        ];
        for (const sel of langSelectors) {
            const select = await page.$(sel);
            if (select) {
                const options = await page.$$eval(`${sel} option`, opts =>
                    opts.filter(o => o.value).map(o => o.value)
                );
                if (options.length > 0) {
                    await page.select(sel, options[0]);
                    pass('เลือกภาษาที่ใช้สอน');
                    break;
                }
            }
        }
    } catch (e) {
        warn('เลือกภาษาที่ใช้สอน', e.message);
    }

    await screenshot('step1-complete');
    return true;
}

async function clickNextButton() {
    console.log('   กดปุ่มถัดไป...');

    // Find and click "ถัดไป" button
    const clicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            const text = btn.textContent.trim();
            if (text.includes('ถัดไป') || text.includes('Next')) {
                btn.click();
                return true;
            }
        }
        // Try finding by class
        const nextBtn = document.querySelector('.btn-next, .next-step, button[data-action="next"]');
        if (nextBtn) {
            nextBtn.click();
            return true;
        }
        return false;
    });

    if (clicked) {
        await delay(1500);
        pass('กดปุ่มถัดไป');
        return true;
    }

    fail('ไม่พบปุ่มถัดไป');
    return false;
}

async function step2_CourseDetails() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 2: รายละเอียดหลักสูตร');
    console.log('═══════════════════════════════════════════════════════════\n');

    await clickNextButton();
    await delay(1000);

    // Description
    try {
        const descSelectors = [
            'textarea[name="description"]',
            '#description',
            'textarea[name="course_description"]'
        ];
        for (const sel of descSelectors) {
            const textarea = await page.$(sel);
            if (textarea) {
                await textarea.click();
                await textarea.type('รายละเอียดหลักสูตรทดสอบ นี่คือหลักสูตรที่สร้างขึ้นเพื่อทดสอบระบบอัตโนมัติ มีเนื้อหาครอบคลุมหลากหลายหัวข้อที่น่าสนใจ');
                pass('กรอก Description');
                break;
            }
        }
    } catch (e) {
        warn('กรอก Description', e.message);
    }

    // Learning Objectives - วัตถุประสงค์การเรียนรู้
    try {
        // Look for objective inputs or add button
        const objectives = [
            'เข้าใจหลักการพื้นฐานของเนื้อหา',
            'สามารถนำความรู้ไปประยุกต์ใช้ได้',
            'พัฒนาทักษะการคิดวิเคราะห์'
        ];

        // Try to find existing objective inputs
        let objInputs = await page.$$('input[name*="objective"], input[name*="learning"], .objective-input');

        // If not found, try to click add button
        if (objInputs.length === 0) {
            const addBtn = await page.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                    if (btn.textContent.includes('เพิ่มวัตถุประสงค์') ||
                        btn.textContent.includes('Add Objective')) {
                        return true;
                    }
                }
                return false;
            });

            if (addBtn) {
                // Click add button 3 times
                for (let i = 0; i < 3; i++) {
                    await page.evaluate(() => {
                        const buttons = document.querySelectorAll('button');
                        for (const btn of buttons) {
                            if (btn.textContent.includes('เพิ่มวัตถุประสงค์') ||
                                btn.textContent.includes('Add')) {
                                btn.click();
                                return;
                            }
                        }
                    });
                    await delay(300);
                }
            }
        }

        // Now find and fill objective inputs
        objInputs = await page.$$('input[name*="objective"], input[name*="learning"], .objective-input, textarea[name*="objective"]');

        for (let i = 0; i < Math.min(objInputs.length, objectives.length); i++) {
            await objInputs[i].click();
            await objInputs[i].type(objectives[i]);
        }

        if (objInputs.length >= 3) {
            pass('กรอกวัตถุประสงค์การเรียนรู้', `${objInputs.length} ข้อ`);
        } else if (objInputs.length > 0) {
            warn('วัตถุประสงค์ไม่ครบ', `พบ ${objInputs.length}/3`);
        } else {
            warn('ไม่พบ input วัตถุประสงค์');
        }
    } catch (e) {
        warn('กรอกวัตถุประสงค์', e.message);
    }

    // Duration - ชั่วโมงเรียน
    try {
        const durationSelectors = [
            'input[name="duration_hours"]',
            '#duration_hours',
            'input[name="duration"]',
            'input[type="number"][name*="duration"]'
        ];
        for (const sel of durationSelectors) {
            const input = await page.$(sel);
            if (input) {
                await input.click({ clickCount: 3 });
                await input.type('10');
                pass('กรอกชั่วโมงเรียน');
                break;
            }
        }
    } catch (e) {
        warn('กรอกชั่วโมงเรียน', e.message);
    }

    await screenshot('step2-complete');
    return true;
}

async function step3_Content() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 3: เนื้อหาและสื่อ');
    console.log('═══════════════════════════════════════════════════════════\n');

    await clickNextButton();
    await delay(1000);

    // Add Lesson
    try {
        // Look for add lesson button first
        const addLessonClicked = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.includes('เพิ่มบทเรียน') ||
                    btn.textContent.includes('Add Lesson')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (addLessonClicked) {
            await delay(500);
        }

        // Fill lesson title
        const lessonInputs = await page.$$('input[name*="lesson"], input[placeholder*="บทเรียน"], .lesson-title');
        if (lessonInputs.length > 0) {
            await lessonInputs[0].click();
            await lessonInputs[0].type('บทที่ 1: บทนำและพื้นฐาน');
            pass('เพิ่มบทเรียน');
        } else {
            warn('ไม่พบ input บทเรียน');
        }
    } catch (e) {
        warn('เพิ่มบทเรียน', e.message);
    }

    await screenshot('step3-complete');
    return true;
}

async function step4_Assessment() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 STEP 4: การประเมินผล');
    console.log('═══════════════════════════════════════════════════════════\n');

    await clickNextButton();
    await delay(1000);

    // Select "no test" option if available
    try {
        const noTestOption = await page.evaluate(() => {
            const radios = document.querySelectorAll('input[type="radio"]');
            for (const radio of radios) {
                const label = radio.parentElement.textContent.toLowerCase();
                if (label.includes('ไม่มี') || label.includes('none') || label.includes('no test')) {
                    radio.click();
                    return true;
                }
            }
            return false;
        });

        if (noTestOption) {
            pass('เลือกไม่มีข้อสอบ');
        } else {
            warn('ไม่พบตัวเลือกการประเมินผล');
        }
    } catch (e) {
        warn('เลือกการประเมินผล', e.message);
    }

    await screenshot('step4-complete');
    return true;
}

async function submitForm() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 SUBMIT: บันทึกหลักสูตร');
    console.log('═══════════════════════════════════════════════════════════\n');

    await screenshot('before-submit');

    // Find and click submit button
    const submitted = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            const text = btn.textContent.trim();
            if (text.includes('บันทึก') || text.includes('สร้างหลักสูตร') ||
                text.includes('Create') || text.includes('Submit') || text.includes('Save')) {
                btn.click();
                return text;
            }
        }
        // Try submit button by type
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.click();
            return 'submit button';
        }
        return null;
    });

    if (submitted) {
        console.log(`   กดปุ่ม: ${submitted}`);
        await delay(3000);

        // Check result
        const pageContent = await page.content();
        const currentUrl = page.url();

        // Check for error messages
        const errorMsg = await page.evaluate(() => {
            const errors = document.querySelectorAll('.alert-danger, .error-message, .text-red-500, [role="alert"]');
            return Array.from(errors).map(e => e.textContent.trim()).filter(t => t).join(' | ');
        });

        // Check for success
        const successMsg = await page.evaluate(() => {
            const success = document.querySelectorAll('.alert-success, .success-message, .text-green-500');
            return Array.from(success).map(e => e.textContent.trim()).filter(t => t).join(' | ');
        });

        await screenshot('after-submit');

        if (errorMsg) {
            fail('Submit form', errorMsg.substring(0, 150));

            // Check for information disclosure
            if (errorMsg.includes('SQL') || errorMsg.includes('database') ||
                errorMsg.includes('FOREIGN KEY') || errorMsg.includes('constraint')) {
                bug('MEDIUM', 'Information Disclosure ใน Error Message',
                    errorMsg.substring(0, 100));
            }
        } else if (successMsg) {
            pass('Submit form', successMsg.substring(0, 100));
        } else if (!currentUrl.includes('create')) {
            pass('Submit form', `Redirect to: ${currentUrl}`);
        } else {
            warn('Submit result unclear');
        }
    } else {
        fail('ไม่พบปุ่ม Submit');
    }
}

async function testXSSProtection() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔒 SECURITY TEST: XSS Protection');
    console.log('═══════════════════════════════════════════════════════════\n');

    await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });
    await delay(1000);

    const xssPayload = '<script>alert("XSS")</script>';

    // Find title input and type XSS
    const titleInput = await page.$('input[name="title"], input[id="title"], input[name="course_name"]');
    if (titleInput) {
        await titleInput.click({ clickCount: 3 });
        await titleInput.type(`Test ${xssPayload} Course`);

        const value = await page.evaluate(el => el.value, titleInput);
        console.log(`   Input value: ${value.substring(0, 50)}...`);

        // Check DOM for unescaped script
        const hasScript = await page.evaluate(() => {
            return document.body.innerHTML.includes('<script>alert');
        });

        if (hasScript) {
            bug('HIGH', 'XSS payload reflected in DOM unescaped',
                'Script tag appears in HTML');
        } else {
            pass('XSS Protection - Frontend');
        }
    }

    await screenshot('xss-test');
}

async function testNegativeDuration() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔒 SECURITY TEST: Negative Duration');
    console.log('═══════════════════════════════════════════════════════════\n');

    await page.goto(`${CONFIG.BASE_URL}/courses/create`, { waitUntil: 'networkidle2' });

    // Go to step 2 where duration might be
    await clickNextButton();
    await delay(1000);

    const durationInput = await page.$('input[name="duration_hours"], input[name="duration"]');
    if (durationInput) {
        await durationInput.click({ clickCount: 3 });
        await durationInput.type('-10');

        const value = await page.evaluate(el => el.value, durationInput);
        const min = await page.evaluate(el => el.min, durationInput);

        console.log(`   Value: ${value}, Min attribute: ${min}`);

        if (value === '-10' && (!min || min < 0)) {
            warn('Negative Duration - Frontend accepts negative',
                'Backend should validate');
        } else {
            pass('Negative Duration - Frontend validation');
        }
    } else {
        warn('Duration input not found in Step 2');
    }

    await screenshot('negative-duration-test');
}

async function generateReport() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 TEST REPORT                                  ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;

    console.log('Test Results:');
    console.log('────────────────────────────────────────────────────────────');
    results.forEach(r => {
        const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${icon} ${r.name}${r.detail ? ' - ' + r.detail : ''}`);
    });

    if (bugs.length > 0) {
        console.log('\n🐛 Bugs Found:');
        console.log('────────────────────────────────────────────────────────────');
        bugs.forEach((b, i) => {
            console.log(`${i + 1}. [${b.severity}] ${b.desc}`);
            if (b.evidence) console.log(`   Evidence: ${b.evidence}`);
        });
    }

    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${warned} warnings`);
    console.log(`BUGS FOUND: ${bugs.length}`);
    const rate = ((passed / results.length) * 100).toFixed(1);
    console.log(`PASS RATE: ${rate}%`);
    console.log('════════════════════════════════════════════════════════════════════\n');
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          🧪 REAL COURSE CREATION TEST                              ║');
    console.log('║             ทดสอบสร้างหลักสูตรจริงครบทุกขั้นตอน                         ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log(`\nStarted: ${new Date().toLocaleString('th-TH')}\n`);

    try {
        await setup();

        if (await login()) {
            await step1_BasicInfo();
            await step2_CourseDetails();
            await step3_Content();
            await step4_Assessment();
            await submitForm();

            // Security tests
            await testXSSProtection();
            await testNegativeDuration();
        }

        await generateReport();

    } catch (error) {
        console.error('\n❌ Fatal Error:', error.message);
        await screenshot('fatal-error');
    } finally {
        if (browser) await browser.close();
    }
}

const fs = require('fs');
if (!fs.existsSync('tests/screenshots')) {
    fs.mkdirSync('tests/screenshots', { recursive: true });
}

main();
