const fs = require('fs');
const path = require('path');

// Extract all Thai messages from controllers
function extractThaiMessages(dir) {
    const messages = new Set();
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (file.endsWith('.js')) {
            const content = fs.readFileSync(filePath, 'utf8');

            // Match message: 'Thai text' or message: "Thai text"
            const messageMatches = content.matchAll(/message:\s*['"]([^'"]*[ก-๙][^'"]*)['"]/g);
            for (const match of messageMatches) {
                messages.add(match[1]);
            }

            // Match title: 'Thai text'
            const titleMatches = content.matchAll(/title:\s*['"]([^'"]*[ก-๙][^'"]*)['"]/g);
            for (const match of titleMatches) {
                messages.add(match[1]);
            }

            // Match error: 'Thai text'
            const errorMatches = content.matchAll(/error:\s*['"]([^'"]*[ก-๙][^'"]*)['"]/g);
            for (const match of errorMatches) {
                messages.add(match[1]);
            }

            // Match req.flash patterns
            const flashMatches = content.matchAll(/req\.flash\([^)]+,\s*['"]([^'"]*[ก-๙][^'"]*)['"]\)/g);
            for (const match of flashMatches) {
                messages.add(match[1]);
            }
        }
    });

    return Array.from(messages).sort();
}

// Generate translation key from Thai text
function generateKey(thaiText) {
    // Remove special characters and spaces
    let clean = thaiText
        .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, '')
        .trim();

    // Create a meaningful key based on content
    if (clean.includes('เกิดข้อผิดพลาด')) {
        if (clean.includes('โหลด')) return `error_loading_${Date.now()}`;
        if (clean.includes('สร้าง')) return `error_creating_${Date.now()}`;
        if (clean.includes('อัพเดท') || clean.includes('แก้ไข')) return `error_updating_${Date.now()}`;
        if (clean.includes('ลบ')) return `error_deleting_${Date.now()}`;
        return `error_${Date.now()}`;
    }
    if (clean.includes('สำเร็จ')) {
        if (clean.includes('สร้าง')) return `created_success_${Date.now()}`;
        if (clean.includes('อัพเดท') || clean.includes('แก้ไข')) return `updated_success_${Date.now()}`;
        if (clean.includes('ลบ')) return `deleted_success_${Date.now()}`;
        return `success_${Date.now()}`;
    }
    if (clean.includes('ไม่พบ')) return `not_found_${Date.now()}`;
    if (clean.includes('ไม่มีสิทธิ์')) return `no_permission_${Date.now()}`;

    // Default: create camelCase from first few words
    return `message_${Date.now()}`;
}

// Create better keys based on the message
function createTranslationKey(thaiText) {
    const keyMap = {
        // Applicant messages
        'ไม่พบการทดสอบสำหรับตำแหน่งนี้': 'noTestForPosition',
        'พบการทดสอบที่ยังไม่เสร็จสิ้น': 'incompleteTestFound',
        'เริ่มการทดสอบสำเร็จ': 'testStartedSuccess',
        'เกิดข้อผิดพลาดในการเริ่มการทดสอบ': 'errorStartingTest',
        'ไม่พบการทดสอบที่ต้องการ': 'testSessionNotFound',
        'การทดสอบนี้เสร็จสิ้นแล้ว': 'testAlreadyFinished',
        'ส่งการทดสอบสำเร็จ': 'testSubmittedSuccess',
        'เกิดข้อผิดพลาดในการส่งการทดสอบ': 'errorSubmittingTest',
        'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้': 'noPermissionAccessData',
        'เกิดข้อผิดพลาดในการโหลดรายชื่อผู้สมัคร': 'errorLoadingApplicantList',
        'ไม่พบข้อมูลผู้สมัคร': 'applicantDataNotFound',
        'เกิดข้อผิดพลาดในการโหลดข้อมูลผู้สมัคร': 'errorLoadingApplicantData',
        'ไม่มีสิทธิ์อัพเดทสถานะผู้สมัคร': 'noPermissionUpdateApplicantStatus',
        'อัพเดทสถานะผู้สมัครสำเร็จ': 'applicantStatusUpdatedSuccess',
        'เกิดข้อผิดพลาดในการอัพเดทสถานะผู้สมัคร': 'errorUpdatingApplicantStatus',
        'ไม่มีสิทธิ์ดูสถิติ': 'noPermissionViewStatistics',
        'เกิดข้อผิดพลาดในการโหลดสถิติ': 'errorLoadingStatistics',
        'ไม่สามารถโหลดหน้าเข้าสู่ระบบได้': 'cannotLoadLoginPage',
        'ไม่สามารถโหลดระบบทดสอบได้': 'cannotLoadTestSystem',
        'ไม่สามารถโหลดหน้าจัดการผู้สมัครงานได้': 'cannotLoadApplicantManagementPage',

        // Dashboard messages
        'เกิดข้อผิดพลาดในการโหลดแดชบอร์ด': 'errorLoadingDashboard',
        'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้': 'cannotLoadDashboardData',
        'เกิดข้อผิดพลาดในการโหลดข้อมูลสถิติ': 'errorLoadingStatisticsData',
        'เกิดข้อผิดพลาดในการโหลดการแจ้งเตือน': 'errorLoadingNotifications',
        'อ่านการแจ้งเตือนแล้ว': 'notificationMarkedRead',
        'เกิดข้อผิดพลาดในการอัพเดทการแจ้งเตือน': 'errorUpdatingNotification',
        'อ่านการแจ้งเตือนทั้งหมดแล้ว': 'allNotificationsMarkedRead',
        'เกิดข้อผิดพลาดในการโหลดประวัติกิจกรรม': 'errorLoadingActivityHistory',
        'เกิดข้อผิดพลาดในการโหลดสถิติผู้ใช้': 'errorLoadingUserStatistics',
        'เกิดข้อผิดพลาดในการโหลดข้อมูลสุขภาพระบบ': 'errorLoadingSystemHealth',

        // HR messages
        'เกิดข้อผิดพลาดในการแสดงฟอร์ม': 'errorDisplayingForm',

        // Titles
        'แดชบอร์ด - Rukchai Hongyen LearnHub': 'pageTitleDashboard',
        'แดชบอร์ดผู้ดูแลระบบ': 'dashboardAdmin',
        'แดชบอร์ดฝ่ายทรัพยากรบุคคล': 'dashboardHR',
        'แดชบอร์ดผู้สอน': 'dashboardInstructor',
        'แดชบอร์ดผู้เรียน': 'dashboardLearner',
        'เข้าสู่ระบบทดสอบ - Rukchai Hongyen LearnHub': 'pageTitleTestLogin',
        'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub': 'pageTitleError',
        'ไม่พบหน้าที่ต้องการ - Rukchai Hongyen LearnHub': 'pageTitleNotFound',
        'ระบบทดสอบ - Rukchai Hongyen LearnHub': 'pageTitleTestSystem',
        'ไม่มีสิทธิ์เข้าถึง - Rukchai Hongyen LearnHub': 'pageTitleNoAccess',
        'จัดการผู้สมัครงาน - Rukchai Hongyen LearnHub': 'pageTitleApplicantManagement',
        'แดชบอร์ด': 'dashboard',
        'เกิดข้อผิดพลาด': 'errorOccurred',
        'ไม่พบหน้าที่ต้องการ': 'pageNotFound',
        'ไม่มีสิทธิ์เข้าถึง': 'noAccess'
    };

    return keyMap[thaiText] || generateKey(thaiText);
}

console.log('Extracting Thai messages from controllers...\n');
const messages = extractThaiMessages('./controllers');

console.log(`Found ${messages.length} unique Thai messages\n`);

// Generate translation entries
const thaiEntries = [];
const enEntries = [];

messages.forEach(msg => {
    const key = createTranslationKey(msg);
    thaiEntries.push(`        ${key}: '${msg}'`);
    // For English, just use a simple translation
    const enMsg = msg
        .replace(/เกิดข้อผิดพลาด/g, 'Error')
        .replace(/ในการ/g, '')
        .replace(/สำเร็จ/g, 'successful')
        .replace(/ไม่พบ/g, 'Not found')
        .replace(/ไม่มีสิทธิ์/g, 'No permission')
        .replace(/กรุณา/g, 'Please');

    enEntries.push(`        ${key}: '${msg}'`); // Keep Thai for manual translation
});

console.log('\n=== Thai Section (add before closing } in th:) ===\n');
console.log(thaiEntries.join(',\n'));

console.log('\n\n=== English Section (add before closing } in en:) ===\n');
console.log(enEntries.join(',\n'));

console.log(`\n\n✅ Generated ${messages.length} translation entries`);
console.log('⚠️  Note: English translations need manual review and proper translation');
