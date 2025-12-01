const fs = require('fs');
const filePath = 'D:/App/LearnHub/utils/languages.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add TH translations after 'noEnrolledCourses'
const thPattern = "noEnrolledCourses: 'คุณยังไม่ได้ลงทะเบียนคอร์สใดๆ',";
const thReplacement = `noEnrolledCourses: 'คุณยังไม่ได้ลงทะเบียนคอร์สใดๆ',
        startLearningToday: 'เริ่มเรียนวันนี้เลย',
        browseCourses: 'ค้นหาคอร์ส',
        continue: 'เรียนต่อ',
        start: 'เริ่มเรียน',
        unknownInstructor: 'ไม่ทราบผู้สอน',`;

if (content.includes(thPattern) && !content.includes("continue: 'เรียนต่อ'")) {
    content = content.replace(thPattern, thReplacement);
    console.log('Added TH translations');
}

// Find EN section and add translations
// Look for the English section myCourses
const enPattern = "myCourses: 'My Courses',";
const enAdditions = `myCourses: 'My Courses',
        startLearningToday: 'Start learning today',
        browseCourses: 'Browse Courses',
        continue: 'Continue',
        start: 'Start',
        unknownInstructor: 'Unknown Instructor',`;

if (content.includes(enPattern) && !content.includes("continue: 'Continue'")) {
    content = content.replace(enPattern, enAdditions);
    console.log('Added EN translations');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Translations updated');
