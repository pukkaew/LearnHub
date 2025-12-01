const fs = require('fs');

const filePath = 'D:/App/LearnHub/utils/languages.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add Thai translations after noRelatedCourses
const oldPattern = `        noRelatedCourses: 'ไม่มีคอร์สที่เกี่ยวข้อง',`;
const newThaiTranslations = `        noRelatedCourses: 'ไม่มีคอร์สที่เกี่ยวข้อง',

        // Review Form
        writeReview: 'เขียนรีวิว',
        yourRating: 'ให้คะแนน',
        yourReview: 'ความคิดเห็นของคุณ',
        reviewPlaceholder: 'เขียนรีวิวของคุณที่นี่...',
        submitReview: 'ส่งรีวิว',
        pleaseSelectRating: 'กรุณาให้คะแนนก่อนส่งรีวิว',
        submitting: 'กำลังส่ง...',
        reviewSubmitted: 'ส่งรีวิวเรียบร้อยแล้ว',
        errorSubmittingReview: 'เกิดข้อผิดพลาดในการส่งรีวิว',
        noReviews: 'ยังไม่มีรีวิว',
        anonymousUser: 'ผู้ใช้นิรนาม',`;

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newThaiTranslations);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Added Thai review translations');
} else {
    console.log('❌ Could not find pattern for Thai translations');
}

// Now add English translations
// Find the English section
const oldEnPattern = `        noRelatedCourses: 'No related courses',`;
const newEnTranslations = `        noRelatedCourses: 'No related courses',

        // Review Form
        writeReview: 'Write a Review',
        yourRating: 'Your Rating',
        yourReview: 'Your Review',
        reviewPlaceholder: 'Write your review here...',
        submitReview: 'Submit Review',
        pleaseSelectRating: 'Please select a rating before submitting',
        submitting: 'Submitting...',
        reviewSubmitted: 'Review submitted successfully',
        errorSubmittingReview: 'Error submitting review',
        noReviews: 'No reviews yet',
        anonymousUser: 'Anonymous User',`;

content = fs.readFileSync(filePath, 'utf8'); // Re-read to get updated content
if (content.includes(oldEnPattern)) {
    content = content.replace(oldEnPattern, newEnTranslations);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Added English review translations');
} else {
    console.log('❌ Could not find pattern for English translations');
}
