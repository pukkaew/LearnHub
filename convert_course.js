const fs = require('fs');

// Mapping of Thai strings to i18n keys
const replacements = [
    ['เกิดข้อผิดพลาดในการลงทะเบียนหลักสูตร', 'errorEnrollingInCourse'],
    ['เกิดข้อผิดพลาดในการโหลดการลงทะเบียน', 'errorLoadingEnrollments'],
    ['ค่าความคืบหน้าต้องอยู่ระหว่าง 0-100', 'courseProgressMustBeBetween0And100'],
    ['ไม่พบการลงทะเบียนหลักสูตร', 'courseEnrollmentNotFound'],
    ['อัพเดทความคืบหน้าสำเร็จ', 'courseProgressUpdatedSuccess'],
    ['เกิดข้อผิดพลาดในการอัพเดทความคืบหน้า', 'courseProgressUpdateError'],
    ['ไม่มีสิทธิ์ดูสถิติหลักสูตรนี้', 'courseNoPermissionViewThisCourseStats'],
    ['ไม่มีสิทธิ์ดูสถิติหลักสูตร', 'courseNoPermissionViewCourseStats'],
    ['เกิดข้อผิดพลาดในการโหลดสถิติหลักสูตร', 'courseStatsLoadError'],
    ['หลักสูตรทั้งหมด - Rukchai Hongyen LearnHub', `\${req.t('allCourses')} - Rukchai Hongyen LearnHub`],
    ['เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub', `\${req.t('errorOccurred')} - Rukchai Hongyen LearnHub`],
    ['ไม่สามารถโหลดหน้ารายการหลักสูตรได้', 'courseListPageLoadError'],
    ['ไม่พบหน้าที่ต้องการ - Rukchai Hongyen LearnHub', `\${req.t('pageNotFound')} - Rukchai Hongyen LearnHub`],
    ['หลักสูตร', 'course'],
    ['ไม่สามารถโหลดข้อมูลหลักสูตรได้', 'courseDataLoadError'],
    ['หลักสูตรของฉัน - Rukchai Hongyen LearnHub', `\${req.t('myCourses')} - Rukchai Hongyen LearnHub`],
    ['ไม่สามารถโหลดหน้าหลักสูตรของฉันได้', 'myCoursesPageLoadError'],
    ['ไม่มีสิทธิ์เข้าถึง - Rukchai Hongyen LearnHub', `\${req.t('noPermissionAccess')} - Rukchai Hongyen LearnHub`],
    ['คุณไม่มีสิทธิ์สร้างหลักสูตร', 'courseNoPermissionCreate'],
    ['สร้างหลักสูตรใหม่ - Rukchai Hongyen LearnHub', `\${req.t('createNewCourse')} - Rukchai Hongyen LearnHub`],
    ['ไม่สามารถโหลดหน้าสร้างหลักสูตรได้', 'courseCreatePageLoadError'],
    ['คุณไม่มีสิทธิ์แก้ไขหลักสูตรนี้', 'courseNoPermissionEditThisCourse'],
    ['คุณไม่มีสิทธิ์แก้ไขหลักสูตร', 'courseNoPermissionEdit'],
    ['แก้ไขหลักสูตร: ', 'editCourse: '],
    ['ไม่สามารถโหลดหน้าแก้ไขหลักสูตรได้', 'courseEditPageLoadError'],
    ['เกิดข้อผิดพลาดในการโหลดหมวดหมู่หลักสูตร', 'courseCategoriesLoadError'],
    ['เกิดข้อผิดพลาดในการโหลดหลักสูตรที่แนะนำ', 'recommendedCoursesLoadError'],
    ['เกิดข้อผิดพลาดในการโหลดหลักสูตรยอดนิยม', 'popularCoursesLoadError'],
    ['เกิดข้อผิดพลาดในการโหลดตำแหน่งงาน', 'positionsLoadError'],
    ['เกิดข้อผิดพลาดในการโหลดแผนกงาน', 'departmentsLoadError'],
    ['ไม่มีสิทธิ์ดู Analytics ของหลักสูตรนี้', 'courseNoPermissionViewThisCourseAnalytics'],
    ['ไม่มีสิทธิ์ดู Analytics', 'courseNoPermissionViewAnalytics'],
    ['เกิดข้อผิดพลาดในการโหลด Analytics', 'courseAnalyticsLoadError'],
    ['ไม่มีสิทธิ์ดูความคืบหน้าของหลักสูตรนี้', 'courseNoPermissionViewThisCourseProgress'],
    ['ไม่มีสิทธิ์ดูความคืบหน้า', 'courseNoPermissionViewProgress'],
    ['เกิดข้อผิดพลาดในการโหลดความคืบหน้า', 'courseProgressLoadError'],
    ['ไม่มีสิทธิ์ Export ความคืบหน้าของหลักสูตรนี้', 'courseNoPermissionExportThisCourseProgress'],
    ['ไม่มีสิทธิ์ Export ความคืบหน้า', 'courseNoPermissionExportProgress'],
    ['เกิดข้อผิดพลาดในการ Export ความคืบหน้า', 'courseProgressExportError'],
    ['ไม่มีสิทธิ์ Export Analytics ของหลักสูตรนี้', 'courseNoPermissionExportThisCourseAnalytics'],
    ['ไม่มีสิทธิ์ Export Analytics', 'courseNoPermissionExportAnalytics'],
    ['เกิดข้อผิดพลาดในการ Export Analytics', 'courseAnalyticsExportError'],
    ['คุณไม่มีสิทธิ์จัดการหมวดหมู่หลักสูตร', 'courseNoPermissionManageCategories'],
    ['จัดการหมวดหมู่หลักสูตร - Rukchai Hongyen LearnHub', `\${req.t('manageCourseCategories')} - Rukchai Hongyen LearnHub`],
    ['ไม่สามารถโหลดหน้าจัดการหมวดหมู่ได้', 'courseCategoriesManagePageLoadError'],
    ['เกิดข้อผิดพลาดในการโหลดหมวดหมู่', 'courseCategoryLoadError'],
    ['ไม่พบหมวดหมู่ที่ต้องการ', 'courseCategoryNotFound'],
    ['เกิดข้อผิดพลาดในการโหลดข้อมูลหมวดหมู่', 'courseCategoryDataLoadError'],
    ['กรุณากรอกชื่อหมวดหมู่', 'coursePleaseEnterCategoryName'],
    ['สร้างหมวดหมู่สำเร็จ', 'courseCategoryCreatedSuccess'],
    ['เกิดข้อผิดพลาดในการสร้างหมวดหมู่', 'courseCategoryCreateError'],
    ['อัพเดทหมวดหมู่สำเร็จ', 'courseCategoryUpdatedSuccess'],
    ['เกิดข้อผิดพลาดในการอัพเดทหมวดหมู่', 'courseCategoryUpdateError'],
    ['ลบหมวดหมู่สำเร็จ', 'courseCategoryDeletedSuccess'],
    ['เกิดข้อผิดพลาดในการลบหมวดหมู่', 'courseCategoryDeleteError']
];

const specialReplacements = [
    {
        old: "message: `ไม่สามารถลบได้ เนื่องจากมี ${courseCount.recordset[0].count} หลักสูตรอยู่ในหมวดหมู่นี้`",
        new: "message: req.t('courseCannotDeleteCategoryHasCourses', { count: courseCount.recordset[0].count })"
    }
];

let content = fs.readFileSync('D:\\App\\LearnHub\\controllers\\courseController.js', 'utf8');

// Apply regular replacements
replacements.forEach(([thai, key]) => {
    const patterns = [
        `message: '${thai}'`,
        `title: '${thai}'`,
        `'${thai}'`
    ];

    patterns.forEach(pattern => {
        if (pattern.includes('${')) {
            // Template literal case
            content = content.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                pattern.replace(`'${thai}'`, `\`${key}\``));
        } else {
            // Regular case
            if (pattern.startsWith('message:') || pattern.startsWith('title:')) {
                content = content.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    pattern.replace(`'${thai}'`, `req.t('${key}')`));
            }
        }
    });
});

// Apply special replacements
specialReplacements.forEach(({old, new: newStr}) => {
    content = content.replace(old, newStr);
});

fs.writeFileSync('D:\\App\\LearnHub\\controllers\\courseController.js', content, 'utf8');
console.log('Conversion complete!');
