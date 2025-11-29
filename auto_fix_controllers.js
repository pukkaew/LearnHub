const fs = require('fs');
const path = require('path');

// Translation mapping from Thai text to translation keys
const translationMap = {
    // Course Controller
    'เกิดข้อผิดพลาดในการโหลดรายการหลักสูตร': 'errorLoadingCourseList',
    'ไม่พบหลักสูตรที่ต้องการ': 'courseNotFound',
    'เกิดข้อผิดพลาดในการโหลดข้อมูลหลักสูตร': 'errorLoadingCourseData',
    'ไม่มีสิทธิ์สร้างหลักสูตร': 'noPermissionCreateCourse',
    'เกิดข้อผิดพลาดในการสร้างข้อสอบ': 'errorCreatingTest',
    'สร้างหลักสูตรสำเร็จ': 'courseCreatedSuccess',
    'เกิดข้อผิดพลาดในการสร้างหลักสูตร': 'errorCreatingCourse',
    'ไม่มีสิทธิ์แก้ไขหลักสูตรนี้': 'noPermissionEditThisCourse',
    'ไม่มีสิทธิ์แก้ไขหลักสูตร': 'noPermissionEditCourse',
    'อัพเดทหลักสูตรสำเร็จ': 'courseUpdatedSuccess',
    'เกิดข้อผิดพลาดในการอัพเดทหลักสูตร': 'errorUpdatingCourse',
    'ไม่มีสิทธิ์ลบหลักสูตร': 'noPermissionDeleteCourse',
    'ลบหลักสูตรสำเร็จ': 'courseDeletedSuccess',
    'เกิดข้อผิดพลาดในการลบหลักสูตร': 'errorDeletingCourse',
    'หลักสูตรนี้ยังไม่เปิดใช้งาน': 'courseNotActive',
    'คุณได้ลงทะเบียนหลักสูตรนี้แล้ว': 'alreadyEnrolledInCourse',
    'ลงทะเบียนหลักสูตรสำเร็จ': 'enrollmentSuccess',
    'เกิดข้อผิดพลาดในการลงทะเบียน': 'errorEnrolling',

    // Auth Controller
    'กรุณากรอกรหัสพนักงาน/เลขบัตรประชาชนและรหัสผ่าน': 'pleaseEnterEmployeeIdAndPassword',
    'รหัสพนักงาน/เลขบัตรประชาชนหรือรหัสผ่านไม่ถูกต้อง': 'invalidEmployeeIdOrPassword',
    'บัญชีของคุณถูกระงับการใช้งาน': 'accountSuspended',
    'บัญชีของคุณถูกปิดการใช้งานแล้ว กรุณาติดต่อฝ่าย HR': 'accountDisabledContactHR',
    'บัญชีของคุณถูกล็อค กรุณาติดต่อผู้ดูแลระบบ': 'accountLockedContactAdmin',
    'เข้าสู่ระบบสำเร็จ': 'loginSuccess',
    'เกิดข้อผิดพลาดในการเข้าสู่ระบบ': 'errorLoggingIn',
    'ออกจากระบบสำเร็จ': 'logoutSuccess',
    'ลงทะเบียนสำเร็จ': 'registrationSuccess',

    // Test Controller
    'เกิดข้อผิดพลาดในการโหลดรายการข้อสอบ': 'errorLoadingTestList',
    'ไม่พบข้อสอบที่ต้องการ': 'testNotFound',
    'ไม่มีสิทธิ์เข้าถึงข้อสอบนี้': 'noPermissionAccessTest',
    'เกิดข้อผิดพลาดในการโหลดข้อมูลข้อสอบ': 'errorLoadingTestData',
    'ไม่มีสิทธิ์สร้างข้อสอบ': 'noPermissionCreateTest',
    'สร้างข้อสอบสำเร็จ': 'testCreatedSuccess',
    'ไม่มีสิทธิ์แก้ไขข้อสอบนี้': 'noPermissionEditThisTest',
    'ไม่มีสิทธิ์แก้ไขข้อสอบ': 'noPermissionEditTest',
    'อัพเดทข้อสอบสำเร็จ': 'testUpdatedSuccess',
    'เกิดข้อผิดพลาดในการอัพเดทข้อสอบ': 'errorUpdatingTest',
    'ไม่มีสิทธิ์ลบข้อสอบ': 'noPermissionDeleteTest',
    'ลบข้อสอบสำเร็จ': 'testDeletedSuccess',
    'เกิดข้อผิดพลาดในการลบข้อสอบ': 'errorDeletingTest',

    // Article Controller
    'เกิดข้อผิดพลาดในการโหลดรายการบทความ': 'errorLoadingArticleList',
    'ไม่พบบทความที่ต้องการ': 'articleNotFound',
    'ไม่มีสิทธิ์เข้าถึงบทความนี้': 'noPermissionAccessArticle',
    'เกิดข้อผิดพลาดในการโหลดข้อมูลบทความ': 'errorLoadingArticleData',
    'ไม่มีสิทธิ์สร้างบทความ': 'noPermissionCreateArticle',
    'สร้างบทความสำเร็จ': 'articleCreatedSuccess',
    'เกิดข้อผิดพลาดในการสร้างบทความ': 'errorCreatingArticle',
    'ไม่มีสิทธิ์แก้ไขบทความนี้': 'noPermissionEditThisArticle',
    'ไม่มีสิทธิ์แก้ไขบทความ': 'noPermissionEditArticle',
    'อัพเดทบทความสำเร็จ': 'articleUpdatedSuccess',
    'เกิดข้อผิดพลาดในการอัพเดทบทความ': 'errorUpdatingArticle',
    'ไม่มีสิทธิ์ลบบทความ': 'noPermissionDeleteArticle',
    'ลบบทความสำเร็จ': 'articleDeletedSuccess',
    'เกิดข้อผิดพลาดในการลบบทความ': 'errorDeletingArticle',

    // Applicant Controller
    'กรุณากรอกเลขบัตรประชาชน 13 หลัก': 'pleaseEnterIdCard13Digits',
    'ไม่พบตำแหน่งงานที่เปิดรับสมัคร': 'positionNotFound',
    'คุณได้สมัครตำแหน่งนี้แล้ว': 'alreadyAppliedForPosition',
    'ลงทะเบียนสมัครงานสำเร็จ': 'applicationSuccess',
    'ไม่พบรหัสการทดสอบนี้': 'testCodeNotFound',
    'เกิดข้อผิดพลาดในการค้นหาข้อมูล': 'errorSearchingData',
    'คุณได้ทำการทดสอบเสร็จสิ้นแล้ว': 'testAlreadyCompleted',
    'สถานะการสมัครไม่อนุญาตให้ทำการทดสอบ': 'applicationStatusNotAllowTest',

    // Setting Controller
    'กรุณาเข้าสู่ระบบก่อนใช้งาน': 'pleaseLoginFirst',
    'เกิดข้อผิดพลาดในการดึงข้อมูล': 'errorFetchingData',
    'ไม่พบการตั้งค่าที่ระบุ': 'settingNotFound',
    'คุณไม่มีสิทธิ์ในการแก้ไขการตั้งค่า': 'noPermissionEditSettings',
    'ข้อมูลไม่ถูกต้อง': 'invalidData',
    'อัพเดทการตั้งค่าสำเร็จ': 'settingsUpdatedSuccess',
    'เกิดข้อผิดพลาดในการอัพเดทการตั้งค่า': 'errorUpdatingSettings',

    // Question Bank Controller
    'เกิดข้อผิดพลาดในการแสดงคลังข้อสอบ': 'errorDisplayingQuestionBank',
    'เกิดข้อผิดพลาดในการแสดงฟอร์ม': 'errorDisplayingForm',
    'ไม่พบข้อสอบที่ต้องการแก้ไข': 'questionNotFoundForEdit',
    'คุณไม่มีสิทธิ์แก้ไขข้อสอบนี้': 'noPermissionEditThisQuestion',
    'เกิดข้อผิดพลาดในการแสดงฟอร์มแก้ไข': 'errorDisplayingEditForm',
    'ไม่พบข้อสอบที่ต้องการดู': 'questionNotFoundForView',
    'เกิดข้อผิดพลาดในการแสดงรายละเอียดข้อสอบ': 'errorDisplayingQuestionDetails',
    'เกิดข้อผิดพลาดในการดึงข้อมูลข้อสอบ': 'errorFetchingQuestionData',

    // HR Applicant Controller
    'เกิดข้อผิดพลาดในการดึงข้อมูลผู้สมัคร': 'errorFetchingApplicantData',
    'เลขบัตรประชาชนไม่ถูกต้อง': 'invalidIdCardNumber',
    'ไม่สามารถสร้างผู้สมัครได้': 'cannotCreateApplicant',
    'เพิ่มผู้สมัครสำเร็จ': 'applicantAddedSuccess',
    'เกิดข้อผิดพลาดในการเพิ่มผู้สมัคร': 'errorAddingApplicant',

    // User Controller
    'เกิดข้อผิดพลาดในการโหลดรายชื่อผู้สอน': 'errorLoadingInstructorList'
};

function fixControllerFile(filePath) {
    console.log(`\n📝 Processing: ${filePath}`);

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changes = 0;

    // Check if file already has language util import
    const hasLanguageImport = content.includes('const { t } = require');

    // Replace message: 'Thai text' with message: req.t('key')
    for (const [thaiText, key] of Object.entries(translationMap)) {
        const patterns = [
            // message: 'Thai text'
            new RegExp(`message:\\s*'${thaiText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
            // message: "Thai text"
            new RegExp(`message:\\s*"${thaiText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
            // req.flash('error', 'Thai text')
            new RegExp(`req\\.flash\\((['"])\\w+\\1,\\s*['"]${thaiText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, 'g'),
            // req.flash('error_msg', 'Thai text')
            new RegExp(`req\\.flash\\((['"])\\w+_msg\\1,\\s*['"]${thaiText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, 'g')
        ];

        for (const pattern of patterns) {
            if (pattern.test(content)) {
                if (pattern.source.includes('message:')) {
                    content = content.replace(pattern, `message: req.t('${key}')`);
                } else if (pattern.source.includes('req.flash')) {
                    content = content.replace(
                        pattern,
                        match => {
                            const flashType = match.match(/req\.flash\(['"](\w+(_msg)?)['"]/)[1];
                            return `req.flash('${flashType}', req.t('${key}'))`;
                        }
                    );
                }
                changes++;
            }
        }
    }

    // Add language util import if not present and changes were made
    if (changes > 0 && !hasLanguageImport) {
        // Find the last require statement
        const lastRequireMatch = content.match(/const .+ = require\(.+\);/g);
        if (lastRequireMatch) {
            const lastRequire = lastRequireMatch[lastRequireMatch.length - 1];
            const insertPosition = content.indexOf(lastRequire) + lastRequire.length;
            content = content.slice(0, insertPosition) +
                      '\nconst { t } = require(\'../utils/languages\');' +
                      content.slice(insertPosition);
        }
    }

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed ${changes} occurrences in ${path.basename(filePath)}`);
        return changes;
    } else {
        console.log(`⏭️  No changes needed in ${path.basename(filePath)}`);
        return 0;
    }
}

// Process all controller files
const controllersDir = path.join(__dirname, 'controllers');
const controllers = fs.readdirSync(controllersDir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(controllersDir, file));

console.log('🚀 Starting automated i18n fix for controllers...\n');
console.log(`Found ${controllers.length} controller files\n`);

let totalChanges = 0;
for (const controller of controllers) {
    totalChanges += fixControllerFile(controller);
}

console.log(`\n✅ Complete! Fixed ${totalChanges} occurrences across all controllers`);
console.log('\n⚠️  Note: Some controllers may have dynamic messages that need manual review');
