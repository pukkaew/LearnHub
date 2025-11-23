const fs = require('fs');

// Read detail.ejs
let content = fs.readFileSync('D:/App/LearnHub/views/courses/detail.ejs', 'utf8');

// Define all the replacements
const replacements = [
    // updateCourseDisplay function
    ["showError('ไม่พบข้อมูลคอร์ส');", "showError(t('errorCourseNotFound'));"],
    ["`รหัสหลักสูตร: ${course.course_code}`", "`${t('courseCode')}: ${course.course_code}`"],
    ["descriptionElement.textContent = 'ไม่มีคำอธิบาย';", "descriptionElement.textContent = t('noDescription');"],
    ["course.instructor_name || 'ไม่ระบุ'", "course.instructor_name || t('notSpecified')"],
    ["`${course.duration_hours || 0} ชั่วโมง`", "`${course.duration_hours || 0} ${t('hours')}`"],
    ["`${course.enrolled_count || 0} คน`", "`${course.enrolled_count || 0} ${t('people')}`"],
    ["course.category_name || 'ทั่วไป'", "course.category_name || t('general')"],
    ["introVideoPlayer.innerHTML = `<div class=\"flex items-center justify-center h-full text-red-500\"><p>เกิดข้อผิดพลาดในการโหลดวิดีโอ</p></div>`;", "introVideoPlayer.innerHTML = `<div class=\"flex items-center justify-center h-full text-red-500\"><p>${t('errorLoadingVideo')}</p></div>`;"],
    ["course.description || 'ไม่มีคำอธิบาย'", "course.description || t('noDescription')"],
    ["'<li class=\"text-gray-500 list-none\">ไม่ได้ระบุวัตถุประสงค์</li>'", "`<li class=\"text-gray-500 list-none\">${t('noObjectives')}</li>`"],
    ["course.prerequisite_knowledge || 'ไม่มีความต้องการพื้นฐานพิเศษ'", "course.prerequisite_knowledge || t('noPrerequisites')"],

    // Target audience section
    ["'<span class=\"font-semibold\">กลุ่มเป้าหมาย:</span>'", "`<span class=\"font-semibold\">${t('targetGroup')}:</span>`"],
    ["`${posCount} ตำแหน่ง`", "`${posCount} ${t('positions')}`"],
    ["`${deptCount} หน่วยงาน`", "`${deptCount} ${t('departments')}`"],
    ["'<span class=\"text-sm font-semibold text-gray-700\">ตำแหน่ง:</span>'", "`<span class=\"text-sm font-semibold text-gray-700\">${t('position')}:</span>`"],
    ["'<span class=\"text-sm font-semibold text-gray-700\">หน่วยงาน:</span>'", "`<span class=\"text-sm font-semibold text-gray-700\">${t('department')}:</span>`"],
    ["'(ทั้งหมด)'", "t('all')"],
    ["'<strong>เงื่อนไข:</strong> คุณสามารถเข้าเรียนได้หากอยู่ใน<strong>ตำแหน่ง</strong>ที่ระบุ <strong>หรือ</strong> อยู่ใน<strong>หน่วยงาน</strong>ที่ระบุ'", "t('eligibilityCondition')"],
    ["'เฉพาะผู้ที่ดำรงตำแหน่งที่ระบุข้างต้น (ทุกหน่วยงาน)'", "t('positionsOnly')"],
    ["'เฉพาะผู้ที่อยู่ในหน่วยงานที่ระบุข้างต้น (ทุกตำแหน่ง)'", "t('departmentsOnly')"],
    ["'เปิดกว้างสำหรับทุกคน'", "t('openForEveryone')"],
    ["'ไม่จำกัดตำแหน่งหรือหน่วยงาน'", "t('noRestrictions')"],

    // updateRatingDisplay
    ["`${rating.toFixed(1)} (${count} รีวิว)`", "`${rating.toFixed(1)} (${count} ${t('reviewCount')})`"],
    ["'ยังไม่มีรีวิว'", "t('noReviews')"],

    // updateEnrollmentStatus
    ["'คุณได้ลงทะเบียนเรียนแล้ว'", "t('enrolled')"],
    ["'เข้าเรียน'", "t('enterCourse')"],
    ["'ให้คะแนนคอร์ส'", "t('rateCourse')"],
    ["'แก้ไขคอร์ส'", "t('editCourse')"],
    ["'เรียนจบแล้ว'", "t('courseCompleted')"],
    ["'ดาวน์โหลดใบประกาศนียบัตร'", "t('downloadCertificate')"],
    ["'เริ่มเรียนคอร์สนี้'", "t('startCourse')"],
    ["'ลงทะเบียนเรียน'", "t('enrollInCourse')"],

    // updateInstructorInfo
    ["'ผู้สอน'", "t('instructor')"],
    ["'ไม่มีข้อมูลประวัติ'", "t('noInstructorBio')"],

    // loadCurriculum
    ["'<div class=\"text-center py-4\"><i class=\"fas fa-spinner fa-spin text-gray-400 mr-2\"></i>กำลังโหลดหลักสูตร...</div>'", "`<div class=\"text-center py-4\"><i class=\"fas fa-spinner fa-spin text-gray-400 mr-2\"></i>${t('loadingCurriculum')}</div>`"],
    ["'<p class=\"text-gray-500\">ไม่สามารถโหลดหลักสูตรได้</p>'", "`<p class=\"text-gray-500\">${t('cannotLoadCurriculum')}</p>`"],
    ["'<p class=\"text-red-500\">เกิดข้อผิดพลาดในการโหลดหลักสูตร</p>'", "`<p class=\"text-red-500\">${t('errorLoadingCurriculum')}</p>`"],

    // updateCurriculumDisplay
    ["'<p class=\"text-gray-500\">ยังไม่มีบทเรียนที่กำหนด</p>'", "`<p class=\"text-gray-500\">${t('noCurriculum')}</p>`"],
    ["`บทเรียนทั้งหมด (${curriculum.length} บท)`", "`${t('allLessons')} (${curriculum.length} ${t('lesson')})`"],
    ["'นาที'", "t('minutes')"],
    ["'ดูวิดีโอ'", "t('watchVideo')"],

    // loadMaterials
    ["'<div class=\"text-center py-4\"><i class=\"fas fa-spinner fa-spin text-gray-400 mr-2\"></i>กำลังโหลดเอกสาร...</div>'", "`<div class=\"text-center py-4\"><i class=\"fas fa-spinner fa-spin text-gray-400 mr-2\"></i>${t('loadingMaterials')}</div>`"],
    ["'<p class=\"text-gray-500\">ไม่สามารถโหลดเอกสารได้</p>'", "`<p class=\"text-gray-500\">${t('cannotLoadMaterials')}</p>`"],
    ["'<p class=\"text-red-500\">เกิดข้อผิดพลาดในการโหลดเอกสาร</p>'", "`<p class=\"text-red-500\">${t('errorLoadingMaterials')}</p>`"],

    // updateMaterialsDisplay
    ["'<p class=\"text-gray-500\">ยังไม่มีเอกสารประกอบการเรียน</p>'", "`<p class=\"text-gray-500\">${t('noMaterials')}</p>`"],
    ["'ดาวน์โหลด'", "t('download')"],

    // loadDiscussions
    ["'<div class=\"text-center py-4\"><i class=\"fas fa-spinner fa-spin text-gray-400 mr-2\"></i>กำลังโหลดการอภิปราย...</div>'", "`<div class=\"text-center py-4\"><i class=\"fas fa-spinner fa-spin text-gray-400 mr-2\"></i>${t('loadingDiscussions')}</div>`"],
    ["'<p class=\"text-gray-500\">ไม่สามารถโหลดการอภิปรายได้</p>'", "`<p class=\"text-gray-500\">${t('cannotLoadDiscussions')}</p>`"],
    ["'<p class=\"text-red-500\">เกิดข้อผิดพลาดในการโหลดการอภิปราย</p>'", "`<p class=\"text-red-500\">${t('errorLoadingDiscussions')}</p>`"],

    // updateDiscussionsDisplay
    ["'ยังไม่มีการอภิปราย'", "t('noDiscussions')"],
    ["'เริ่มการอภิปราย'", "t('startDiscussion')"],
    ["'ตอบกลับ'", "t('reply')"],

    // loadReviews
    ["'<div class=\"text-center py-4\"><i class=\"fas fa-spinner fa-spin text-gray-400 mr-2\"></i>กำลังโหลดรีวิว...</div>'", "`<div class=\"text-center py-4\"><i class=\"fas fa-spinner fa-spin text-gray-400 mr-2\"></i>${t('loadingReviews')}</div>`"],
    ["'<p class=\"text-gray-500\">ไม่สามารถโหลดรีวิวได้</p>'", "`<p class=\"text-gray-500\">${t('cannotLoadReviews')}</p>`"],
    ["'<p class=\"text-red-500\">เกิดข้อผิดพลาดในการโหลดรีวิว</p>'", "`<p class=\"text-red-500\">${t('errorLoadingReviews')}</p>`"],

    // loadRelatedCourses
    ["'<div class=\"text-center py-4 text-sm\"><i class=\"fas fa-spinner fa-spin text-gray-400 mr-2\"></i>กำลังโหลด...</div>'", "`<div class=\"text-center py-4 text-sm\"><i class=\"fas fa-spinner fa-spin text-gray-400 mr-2\"></i>${t('loadingRelated')}</div>`"],
    ["'<p class=\"text-gray-500 text-sm\">ไม่สามารถโหลดคอร์สที่เกี่ยวข้องได้</p>'", "`<p class=\"text-gray-500 text-sm\">${t('cannotLoadRelated')}</p>`"],

    // updateRelatedCoursesDisplay
    ["'<p class=\"text-gray-500 text-sm\">ไม่มีคอร์สที่เกี่ยวข้อง</p>'", "`<p class=\"text-gray-500 text-sm\">${t('noRelatedCourses')}</p>`"],

    // enrollInCourse
    ["'<i class=\"fas fa-spinner fa-spin mr-2\"></i>กำลังลงทะเบียน...'", "`<i class=\"fas fa-spinner fa-spin mr-2\"></i>${t('enrolling')}`"],
    ["'ลงทะเบียนเรียนสำเร็จ'", "t('enrollmentSuccess')"],
    ["data.message || 'เกิดข้อผิดพลาดในการลงทะเบียน'", "data.message || t('errorEnrollment')"],
    ["'เกิดข้อผิดพลาดในการลงทะเบียน'", "t('errorEnrollment')"],
    ["'ยืนยันการลงทะเบียน'", "t('confirmEnrollmentBtn')"],

    // submitRating
    ["'กรุณาให้คะแนน'", "t('pleaseRate')"],
    ["'<i class=\"fas fa-spinner fa-spin mr-2\"></i>กำลังส่ง...'", "`<i class=\"fas fa-spinner fa-spin mr-2\"></i>${t('submitting')}`"],
    ["'ส่งคะแนนสำเร็จ'", "t('ratingSuccess')"],
    ["data.message || 'เกิดข้อผิดพลาดในการส่งคะแนน'", "data.message || t('errorSubmitRating')"],
    ["'เกิดข้อผิดพลาดในการส่งคะแนน'", "t('errorSubmitRating')"],
    ["'ส่งคะแนน'", "t('submitRatingBtn')"],

    // timeAgo function
    ["'เมื่อสักครู่'", "t('justNow')"],
    ["`${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`", "`${Math.floor(diffInSeconds / 60)} ${t('minutesAgo')}`"],
    ["`${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`", "`${Math.floor(diffInSeconds / 3600)} ${t('hoursAgo')}`"],
    ["`${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`", "`${Math.floor(diffInSeconds / 86400)} ${t('daysAgo')}`"],

    // showLoading
    ["'กำลังโหลด...'", "t('loading')"]
];

// Apply each replacement
let changeCount = 0;
replacements.forEach(([oldStr, newStr]) => {
    const oldContent = content;
    content = content.split(oldStr).join(newStr);
    if (oldContent !== content) {
        changeCount++;
        console.log(`✓ Replaced: ${oldStr.substring(0, 50)}...`);
    }
});

// Write back to file
fs.writeFileSync('D:/App/LearnHub/views/courses/detail.ejs', content, 'utf8');

console.log(`\n✅ Complete! Made ${changeCount} replacements.`);
