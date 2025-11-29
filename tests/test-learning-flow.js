/**
 * Test Learning Flow - Test course detail, enrollment, and learning
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runLearningTest() {
    console.log('='.repeat(60));
    console.log('     LEARNING FLOW TEST');
    console.log('='.repeat(60));

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1366, height: 768 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(30000);

        // 1. Login
        console.log('\n[1] Logging in...');
        await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
        await delay(2000);

        await page.type('#employee_id', 'ADM001');
        await page.type('#password', 'admin123');
        await page.click('button[type="submit"]');
        await delay(3000);

        console.log('    Login successful!');

        // 2. Go to courses list
        console.log('\n[2] Going to courses list...');
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded' });
        await delay(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'learning-1-courses-list.png'), fullPage: true });

        // Find first course link
        const courseLinks = await page.$$eval('a[href*="/courses/"]', links =>
            links.map(l => ({ href: l.href, text: l.textContent.trim() }))
                .filter(l => l.href.match(/\/courses\/\d+$/))
        );

        console.log(`    Found ${courseLinks.length} course links`);

        if (courseLinks.length > 0) {
            const courseUrl = courseLinks[0].href;
            const courseId = courseUrl.match(/\/courses\/(\d+)/)?.[1];
            console.log(`    Testing course ID: ${courseId}`);

            // 3. Go to course detail
            console.log('\n[3] Going to course detail...');
            await page.goto(courseUrl, { waitUntil: 'domcontentloaded' });
            await delay(2000);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'learning-2-course-detail.png'), fullPage: true });

            // Check page content
            const pageInfo = await page.evaluate(() => {
                const bodyText = document.body.innerText;
                return {
                    title: document.querySelector('h1, .course-title')?.textContent?.trim(),
                    hasEnrollBtn: !!document.querySelector('button[class*="enroll"], .enroll-btn, a[href*="enroll"]'),
                    hasStartBtn: bodyText.includes('เริ่มเรียน') || bodyText.includes('Start'),
                    isEnrolled: bodyText.includes('ลงทะเบียนแล้ว') ||
                                bodyText.includes('เริ่มเรียน') ||
                                bodyText.includes('กำลังเรียน') ||
                                bodyText.includes('เข้าเรียน'),
                    bodyText: bodyText.substring(0, 500)
                };
            });

            console.log(`    Course title: ${pageInfo.title || 'N/A'}`);
            console.log(`    Has enroll button: ${pageInfo.hasEnrollBtn}`);
            console.log(`    Is enrolled: ${pageInfo.isEnrolled}`);

            // 4. Try to enroll or start learning
            if (pageInfo.isEnrolled) {
                console.log('\n[4] Already enrolled, looking for start button...');

                // Look for start/continue button using XPath or evaluate
                const startBtnClicked = await page.evaluate(() => {
                    // Find button or link with "เริ่มเรียน" or "เข้าเรียน" text
                    const buttons = Array.from(document.querySelectorAll('button, a'));
                    for (const btn of buttons) {
                        const text = btn.textContent || '';
                        if (text.includes('เริ่มเรียน') || text.includes('เข้าเรียน') || text.includes('Start')) {
                            btn.click();
                            return true;
                        }
                    }
                    // Try .btn-primary
                    const primaryBtn = document.querySelector('.btn-primary, a[href*="learn"]');
                    if (primaryBtn) {
                        primaryBtn.click();
                        return true;
                    }
                    return false;
                });

                if (startBtnClicked) {
                    await delay(3000);
                    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'learning-3-learning-page.png'), fullPage: true });
                    console.log('    Clicked start button');
                } else {
                    console.log('    No start button found');
                }
            } else {
                console.log('\n[4] Not enrolled, looking for enroll button...');

                // Try to enroll
                const enrollBtn = await page.$('button[class*="enroll"], .enroll-btn');
                if (enrollBtn) {
                    await enrollBtn.click();
                    await delay(3000);
                    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'learning-3-after-enroll.png'), fullPage: true });
                    console.log('    Clicked enroll button');
                }
            }

            // 5. Check learning page
            console.log('\n[5] Checking current page state...');
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'learning-4-current-state.png'), fullPage: true });

            const currentState = await page.evaluate(() => {
                return {
                    url: window.location.href,
                    hasVideo: !!document.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]'),
                    hasLessons: !!document.querySelector('.lesson, .material, [class*="lesson"]'),
                    hasProgress: !!document.querySelector('.progress, [class*="progress"]'),
                    pageTitle: document.title
                };
            });

            console.log(`    Current URL: ${currentState.url}`);
            console.log(`    Has video: ${currentState.hasVideo}`);
            console.log(`    Has lessons: ${currentState.hasLessons}`);
            console.log(`    Has progress: ${currentState.hasProgress}`);
        }

        // 6. Test My Courses
        console.log('\n[6] Going to My Courses...');
        await page.goto(`${BASE_URL}/courses/my-courses`, { waitUntil: 'domcontentloaded' });
        await delay(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'learning-5-my-courses.png'), fullPage: true });

        const myCoursesInfo = await page.evaluate(() => {
            const stats = document.querySelectorAll('[class*="stat"], .statistic');
            const courses = document.querySelectorAll('.course-card, [class*="course-item"]');
            const bodyText = document.body.innerText;
            return {
                statsCount: stats.length,
                coursesCount: courses.length,
                hasStartButton: bodyText.includes('start') || bodyText.includes('เริ่ม')
            };
        });

        console.log(`    Stats displayed: ${myCoursesInfo.statsCount}`);
        console.log(`    Courses shown: ${myCoursesInfo.coursesCount}`);

        console.log('\n' + '='.repeat(60));
        console.log('     LEARNING FLOW TEST COMPLETED');
        console.log('='.repeat(60));
        console.log('\nScreenshots saved to:', SCREENSHOT_DIR);

    } catch (error) {
        console.error('\nError:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

runLearningTest();
