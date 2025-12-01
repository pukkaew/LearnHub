const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Use regex that handles any line ending
const regex = /(setupEventListeners\(\);)(\s*\}\);)/;
const match = content.match(regex);

if (match) {
    content = content.replace(regex, '$1\n    initReviewForm();$2');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Added initReviewForm() call');
} else {
    console.log('❌ Could not find setupEventListeners pattern');

    // Try to just append after setupEventListeners();
    const idx = content.indexOf('setupEventListeners();');
    if (idx !== -1) {
        console.log('Found at index:', idx);
        // Find the next line ending
        const lineEnd = content.indexOf(';', idx) + 1;
        const before = content.substring(0, lineEnd);
        const after = content.substring(lineEnd);
        content = before + '\n    initReviewForm();' + after;
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✅ Added initReviewForm() using alternative method');
    }
}
