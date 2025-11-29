/**
 * Test script for enrollment functionality
 */
const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
    employee_id: 'ADM001',
    password: 'password123'
};

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEnrollment() {
    console.log('🚀 Starting Enrollment Test...\n');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        args: ['--disable-web-security']
    });

    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            console.log(`❌ [Browser Error]: ${text}`);
        } else if (text.includes('enroll') || text.includes('Enroll') || text.includes('Error')) {
            console.log(`📝 [Browser]: ${text}`);
        }
    });

    // Log network errors
    page.on('requestfailed', request => {
        console.log(`❌ [Network Failed]: ${request.url()} - ${request.failure().errorText}`);
    });

    // Log API responses
    page.on('response', response => {
        const url = response.url();
        if (url.includes('/api/') && url.includes('enroll')) {
            console.log(`📡 [API Response]: ${url} - Status: ${response.status()}`);
        }
    });

    try {
        // Step 1: Login
        console.log('1️⃣ Logging in...');
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
        await delay(1000);

        await page.type('#employee_id', TEST_CREDENTIALS.employee_id);
        await page.type('#password', TEST_CREDENTIALS.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
        console.log('✅ Login successful\n');

        // Step 2: Go to course detail (course 215)
        console.log('2️⃣ Navigating to course detail...');
        await page.goto(`${BASE_URL}/courses/215`, { waitUntil: 'networkidle0' });
        await delay(2000);

        // Take screenshot
        await page.screenshot({ path: 'tests/screenshots/enrollment-1-detail-page.png', fullPage: true });
        console.log('📸 Screenshot saved: enrollment-1-detail-page.png\n');

        // Step 3: Check if enrollment button exists
        console.log('3️⃣ Checking for enrollment button...');
        const enrollBtn = await page.$('button[onclick*="showEnrollmentModal"]');
        const enrollBtnAlt = await page.$('.btn-ruxchai-primary');
        const enrollBtnByText = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            for (const btn of buttons) {
                if (btn.textContent.includes('ลงทะเบียน') || btn.textContent.includes('Enroll')) {
                    return {
                        text: btn.textContent,
                        disabled: btn.disabled,
                        classes: btn.className,
                        onclick: btn.getAttribute('onclick')
                    };
                }
            }
            return null;
        });

        if (enrollBtnByText) {
            console.log('✅ Found enrollment button:', enrollBtnByText);
        } else {
            console.log('⚠️ Enrollment button not found by text');
        }

        // Check courseId variable
        const courseId = await page.evaluate(() => {
            return typeof window.courseId !== 'undefined' ? window.courseId : 'undefined';
        });
        console.log(`📝 Course ID in page: ${courseId}\n`);

        // Step 4: Find and click enrollment button
        console.log('4️⃣ Looking for enrollment button to click...');
        const allButtons = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('button')).map(btn => ({
                text: btn.textContent.trim().substring(0, 50),
                id: btn.id,
                classes: btn.className,
                disabled: btn.disabled,
                onclick: btn.getAttribute('onclick')
            }));
        });
        console.log('All buttons on page:');
        allButtons.forEach((btn, i) => console.log(`  ${i+1}. ${btn.text || '[empty]'} | id="${btn.id}" | onclick="${btn.onclick}"`));

        // Try to click the enrollment button
        const enrollButtonClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            for (const btn of buttons) {
                const text = btn.textContent;
                const onclick = btn.getAttribute('onclick');
                if (text.includes('ลงทะเบียน') || onclick?.includes('showEnrollmentModal')) {
                    console.log('Clicking enrollment button:', text);
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (!enrollButtonClicked) {
            console.log('❌ Could not find enrollment button to click');
            // Check if maybe already enrolled
            const enrollmentStatus = await page.evaluate(() => {
                const statusElements = document.querySelectorAll('[class*="status"], [class*="badge"], .text-green-500, .text-blue-500');
                return Array.from(statusElements).map(el => el.textContent).join(' | ');
            });
            console.log('Page status elements:', enrollmentStatus);
        } else {
            console.log('✅ Clicked enrollment button\n');
            await delay(500);
        }

        // Step 5: Check if modal opened
        console.log('5️⃣ Checking if enrollment modal is visible...');
        const modalVisible = await page.evaluate(() => {
            const modal = document.getElementById('enrollment-modal');
            if (!modal) return { exists: false };
            return {
                exists: true,
                hidden: modal.classList.contains('hidden'),
                display: window.getComputedStyle(modal).display,
                visibility: window.getComputedStyle(modal).visibility
            };
        });
        console.log('Modal status:', modalVisible);

        await page.screenshot({ path: 'tests/screenshots/enrollment-2-modal.png', fullPage: true });
        console.log('📸 Screenshot saved: enrollment-2-modal.png\n');

        if (!modalVisible.exists) {
            console.log('❌ Modal does not exist in DOM');
            return;
        }

        if (modalVisible.hidden) {
            console.log('⚠️ Modal has hidden class - trying to show it manually');
            await page.evaluate(() => {
                document.getElementById('enrollment-modal').classList.remove('hidden');
            });
            await delay(500);
        }

        // Step 6: Click confirm enrollment button
        console.log('6️⃣ Clicking confirm enrollment button...');
        const confirmBtn = await page.$('#confirm-enrollment');
        if (confirmBtn) {
            const confirmBtnInfo = await page.evaluate(() => {
                const btn = document.getElementById('confirm-enrollment');
                return {
                    text: btn.textContent,
                    disabled: btn.disabled,
                    classes: btn.className
                };
            });
            console.log('Confirm button info:', confirmBtnInfo);

            // Check if button is clickable
            const isClickable = await page.evaluate(() => {
                const btn = document.getElementById('confirm-enrollment');
                const rect = btn.getBoundingClientRect();
                const style = window.getComputedStyle(btn);
                return {
                    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                    pointerEvents: style.pointerEvents,
                    zIndex: style.zIndex,
                    opacity: style.opacity
                };
            });
            console.log('Button clickability:', isClickable);

            // Try clicking
            console.log('Attempting to click confirm button...');

            // Listen for network request
            const responsePromise = page.waitForResponse(
                response => response.url().includes('/enroll'),
                { timeout: 10000 }
            ).catch(() => null);

            await confirmBtn.click();
            console.log('✅ Clicked confirm button');

            // Wait for response
            const response = await responsePromise;
            if (response) {
                console.log(`📡 Enrollment API response: ${response.status()}`);
                try {
                    const data = await response.json();
                    console.log('Response data:', JSON.stringify(data, null, 2));
                } catch (e) {
                    console.log('Could not parse response as JSON');
                }
            } else {
                console.log('⚠️ No enrollment API request was made');
            }

            await delay(2000);
            await page.screenshot({ path: 'tests/screenshots/enrollment-3-result.png', fullPage: true });
            console.log('📸 Screenshot saved: enrollment-3-result.png\n');

        } else {
            console.log('❌ Confirm button not found');
        }

        // Step 7: Check final result
        console.log('7️⃣ Checking final enrollment status...');
        await delay(1000);
        const finalStatus = await page.evaluate(() => {
            // Check for success message
            const successMsg = document.querySelector('.alert-success, .bg-green-100, [class*="success"]');
            // Check for error message
            const errorMsg = document.querySelector('.alert-error, .bg-red-100, [class*="error"]');
            // Check enrollment button state
            const enrollBtn = Array.from(document.querySelectorAll('button')).find(btn =>
                btn.textContent.includes('ลงทะเบียน') || btn.textContent.includes('เข้าเรียน')
            );

            return {
                successMsg: successMsg ? successMsg.textContent : null,
                errorMsg: errorMsg ? errorMsg.textContent : null,
                buttonText: enrollBtn ? enrollBtn.textContent.trim() : null
            };
        });
        console.log('Final status:', finalStatus);

        console.log('\n✅ Test completed!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        await page.screenshot({ path: 'tests/screenshots/enrollment-error.png', fullPage: true });
    } finally {
        await delay(3000);
        await browser.close();
    }
}

testEnrollment();
