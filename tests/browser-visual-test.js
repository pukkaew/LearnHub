/**
 * Browser Visual Test - Opens real browser for manual inspection
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVisualTest() {
    console.log('='.repeat(50));
    console.log('  BROWSER VISUAL TEST - Course System');
    console.log('='.repeat(50));
    console.log('\nOpening browser for visual testing...\n');

    const browser = await puppeteer.launch({
        headless: false,  // Show browser window
        defaultViewport: null,  // Use full window
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        slowMo: 100  // Slow down actions for visibility
    });

    const page = await browser.newPage();

    try {
        // 1. Login Page
        console.log('[1] Opening Login Page...');
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
        await delay(2000);

        // Fill login form
        console.log('[2] Filling login form...');
        await page.type('#employee_id', 'ADM001', { delay: 50 });
        await page.type('#password', 'admin123', { delay: 50 });
        await delay(1000);

        // Click login
        console.log('[3] Logging in...');
        await page.click('button[type="submit"]');
        await delay(3000);

        // 2. Go to Courses
        console.log('[4] Navigating to Courses...');
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        await delay(3000);

        // 3. Click on first course
        console.log('[5] Looking for course to click...');
        const courseLinks = await page.$$('a[href*="/courses/"]');
        const validLinks = [];
        for (const link of courseLinks) {
            const href = await link.evaluate(el => el.href);
            if (href.match(/\/courses\/\d+$/)) {
                validLinks.push(link);
            }
        }

        if (validLinks.length > 0) {
            console.log('[6] Clicking on first course...');
            await validLinks[0].click();
            await delay(3000);

            // 4. Click "เข้าเรียน" button if enrolled
            console.log('[7] Looking for learning button...');
            const clicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                for (const btn of buttons) {
                    const text = btn.textContent || '';
                    if (text.includes('เข้าเรียน') || text.includes('เริ่มเรียน')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });

            if (clicked) {
                console.log('[8] Clicked learning button, viewing content page...');
                await delay(5000);
            }
        }

        // 5. Go to My Courses
        console.log('[9] Navigating to My Courses...');
        await page.goto(`${BASE_URL}/courses/my-courses`, { waitUntil: 'domcontentloaded' });
        await delay(3000);

        // 6. Go to Create Course
        console.log('[10] Navigating to Create Course...');
        await page.goto(`${BASE_URL}/courses/create`, { waitUntil: 'domcontentloaded' });
        await delay(3000);

        console.log('\n' + '='.repeat(50));
        console.log('  TEST COMPLETE - Browser will stay open');
        console.log('  Close browser manually when done');
        console.log('='.repeat(50));

        // Keep browser open for inspection
        console.log('\nPress Ctrl+C to close...');

        // Wait indefinitely (user closes manually)
        await new Promise(() => {});

    } catch (error) {
        console.error('Error:', error.message);
        console.log('\nBrowser will stay open for debugging...');
        await new Promise(() => {});
    }
}

runVisualTest().catch(console.error);
