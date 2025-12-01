const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add initReviewForm() call after setupEventListeners()
const oldSetupEvents = `    setupEventListeners();
});`;
const newSetupEvents = `    setupEventListeners();
    initReviewForm();
});`;

if (content.includes(oldSetupEvents)) {
    content = content.replace(oldSetupEvents, newSetupEvents);
    console.log('✅ Added initReviewForm() call');
} else {
    console.log('❌ Could not find setupEventListeners pattern');
}

// 2. Add showReviewFormIfEnrolled() call after progress check
const oldProgress = `    // Progress (if enrolled)
    if (course.enrollment_status === 'active' && course.progress_percentage && course.progress_percentage > 0) {
        document.getElementById('progress-section').classList.remove('hidden');
        document.getElementById('progress-percentage').textContent = \`\${course.progress_percentage}%\`;
        document.getElementById('progress-fill').style.width = \`\${course.progress_percentage}%\`;
    }`;

const newProgress = `    // Progress (if enrolled)
    if (course.enrollment_status === 'active' && course.progress_percentage && course.progress_percentage > 0) {
        document.getElementById('progress-section').classList.remove('hidden');
        document.getElementById('progress-percentage').textContent = \`\${course.progress_percentage}%\`;
        document.getElementById('progress-fill').style.width = \`\${course.progress_percentage}%\`;
    }

    // Show review form if enrolled
    showReviewFormIfEnrolled(course.enrollment_status === 'active');`;

if (content.includes(oldProgress)) {
    content = content.replace(oldProgress, newProgress);
    console.log('✅ Added showReviewFormIfEnrolled() call');
} else {
    console.log('❌ Could not find progress check pattern');
}

fs.writeFileSync(filePath, content, 'utf8');
