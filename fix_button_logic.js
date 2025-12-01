const fs = require('fs');

// 1. Add translation keys
const langPath = 'D:/App/LearnHub/utils/languages.js';
let langContent = fs.readFileSync(langPath, 'utf8');

// Add TH review translation
if (!langContent.includes("review: 'ทบทวน'")) {
    langContent = langContent.replace(
        "continue: 'เรียนต่อ',",
        "continue: 'เรียนต่อ',\n        review: 'ทบทวน',"
    );
    console.log('Added TH review translation');
}

// Add EN review translation
if (!langContent.includes("review: 'Review'")) {
    langContent = langContent.replace(
        "continue: 'Continue',",
        "continue: 'Continue',\n        review: 'Review',"
    );
    console.log('Added EN review translation');
}

fs.writeFileSync(langPath, langContent, 'utf8');

// 2. Fix button logic in my-courses.ejs
const myCoursesPath = 'D:/App/LearnHub/views/courses/my-courses.ejs';
let myCoursesContent = fs.readFileSync(myCoursesPath, 'utf8');

// Replace button logic
const oldButtonLogic = "${progress > 0 ? '<%= t(\"continue\") %>' : '<%= t(\"start\") %>'}";
const newButtonLogic = "${getButtonText(course.status, progress)}";

if (myCoursesContent.includes(oldButtonLogic)) {
    myCoursesContent = myCoursesContent.replace(oldButtonLogic, newButtonLogic);
    console.log('Updated button logic');
}

// Add getButtonText function after getStatusBadge function
const insertAfter = `return badges[status] || badges['not_started'];
    }`;
const newFunction = `return badges[status] || badges['not_started'];
    }

    function getButtonText(status, progress) {
        if (status === 'completed' || progress >= 100) {
            return '<%= t("review") %>';
        } else if (progress > 0) {
            return '<%= t("continue") %>';
        } else {
            return '<%= t("start") %>';
        }
    }`;

if (!myCoursesContent.includes('getButtonText')) {
    myCoursesContent = myCoursesContent.replace(insertAfter, newFunction);
    console.log('Added getButtonText function');
}

fs.writeFileSync(myCoursesPath, myCoursesContent, 'utf8');

console.log('Done!');
