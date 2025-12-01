const fs = require('fs');

// 1. Update translation keys
const langPath = 'D:/App/LearnHub/utils/languages.js';
let langContent = fs.readFileSync(langPath, 'utf8');

// Change TH review to viewCourse
if (langContent.includes("review: 'ทบทวน',")) {
    langContent = langContent.replace("review: 'ทบทวน',", "viewCourse: 'เข้าดู',");
    console.log('Updated TH: review -> viewCourse');
}

// Change EN review to viewCourse
if (langContent.includes("review: 'Review',")) {
    langContent = langContent.replace("review: 'Review',", "viewCourse: 'View',");
    console.log('Updated EN: review -> viewCourse');
}

fs.writeFileSync(langPath, langContent, 'utf8');

// 2. Update my-courses.ejs button text function
const myCoursesPath = 'D:/App/LearnHub/views/courses/my-courses.ejs';
let myCoursesContent = fs.readFileSync(myCoursesPath, 'utf8');

// Update getButtonText function
const oldFunction = `function getButtonText(status, progress) {
        if (status === 'completed' || progress >= 100) {
            return '<%= t("review") %>';
        } else if (progress > 0) {
            return '<%= t("continue") %>';
        } else {
            return '<%= t("start") %>';
        }
    }`;

const newFunction = `function getButtonText(status, progress) {
        if (status === 'completed' || progress >= 100) {
            return '<%= t("viewCourse") %>';
        } else if (progress > 0) {
            return '<%= t("continue") %>';
        } else {
            return '<%= t("start") %>';
        }
    }`;

if (myCoursesContent.includes('t("review")')) {
    myCoursesContent = myCoursesContent.replace('t("review")', 't("viewCourse")');
    console.log('Updated button text: review -> viewCourse');
}

fs.writeFileSync(myCoursesPath, myCoursesContent, 'utf8');

console.log('Done!');
console.log('');
console.log('Button text logic:');
console.log('- progress = 0 → "เริ่มเรียน" (Start)');
console.log('- progress > 0 && < 100 → "เรียนต่อ" (Continue)');
console.log('- progress >= 100 or completed → "เข้าดู" (View)');
