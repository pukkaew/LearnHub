const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Remove or comment out the JavaScript code that updates course-description
const oldCode = `    // Use innerHTML for description to render HTML properly
    const descriptionElement = document.getElementById('course-description');
    if (course.description) {
        // Remove HTML tags for short description, or keep plain text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = course.description;
        descriptionElement.textContent = tempDiv.textContent || tempDiv.innerText || course.description;
    } else {
        descriptionElement.textContent = t('noDescription');
    }`;

const newCode = `    // Description is now only shown in "About Course" section
    // Removed header description display`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fixed JavaScript code - removed course-description update');
} else {
    console.log('❌ Could not find the JavaScript code to fix');
}
