const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Handle both Windows (\r\n) and Unix (\n) line endings
const oldSetup = 'setupEventListeners();\r\n});';
const newSetup = 'setupEventListeners();\r\n    initReviewForm();\r\n});';

if (content.includes(oldSetup)) {
    content = content.replace(oldSetup, newSetup);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Added initReviewForm() call');
} else {
    // Try Unix line endings
    const oldSetupUnix = 'setupEventListeners();\n});';
    const newSetupUnix = 'setupEventListeners();\n    initReviewForm();\n});';
    if (content.includes(oldSetupUnix)) {
        content = content.replace(oldSetupUnix, newSetupUnix);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✅ Added initReviewForm() call (Unix)');
    } else {
        console.log('❌ Could not find setupEventListeners pattern');
    }
}
