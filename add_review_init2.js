const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add initReviewForm() call - use simple string replacement
const oldSetup = 'setupEventListeners();\n});';
const newSetup = 'setupEventListeners();\n    initReviewForm();\n});';

if (content.includes(oldSetup)) {
    content = content.replace(oldSetup, newSetup);
    console.log('✅ Added initReviewForm() call');
} else {
    console.log('❌ Could not find setupEventListeners pattern');
    // Debug
    const setupIdx = content.indexOf('setupEventListeners()');
    if (setupIdx !== -1) {
        console.log('Found setupEventListeners at index:', setupIdx);
        console.log('Next 30 chars:', JSON.stringify(content.substring(setupIdx, setupIdx + 50)));
    }
}

// 2. Add showReviewFormIfEnrolled - look for simpler pattern
const progressPattern = "document.getElementById('progress-fill').style.width = `${course.progress_percentage}%`;";
const insertionPoint = content.indexOf(progressPattern);

if (insertionPoint !== -1) {
    const endOfLine = content.indexOf('\n', insertionPoint + progressPattern.length);
    const nextBrace = content.indexOf('}', endOfLine);
    const insertAt = content.indexOf('\n', nextBrace);

    // Insert after the closing brace of the if block
    const before = content.substring(0, insertAt);
    const after = content.substring(insertAt);
    content = before + '\n\n    // Show review form if enrolled\n    showReviewFormIfEnrolled(course.enrollment_status === \'active\');' + after;

    console.log('✅ Added showReviewFormIfEnrolled() call');
} else {
    console.log('❌ Could not find progress pattern');
}

fs.writeFileSync(filePath, content, 'utf8');
