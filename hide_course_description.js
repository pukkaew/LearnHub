const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Hide the description paragraph in header section
const oldLine = `<p id="course-description" class="text-gray-600 mb-4"><%= t('courseDescription') %></p>`;
const newLine = `<!-- Description moved to "About Course" section below -->`;

if (content.includes(oldLine)) {
    content = content.replace(oldLine, newLine);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Hidden course description from header');
    console.log('   Description will now only show in "เกี่ยวกับคอร์สนี้" section');
} else {
    console.log('❌ Could not find the description line');
}
