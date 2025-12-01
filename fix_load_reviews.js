const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Fix loadReviews to use stats for rating display
const oldCode = 'updateReviewsDisplay(data.data);';
const newCode = `updateReviewsDisplay(data.data);
            // Update header rating display from review stats
            if (data.stats) {
                updateRatingDisplay(data.stats.average_rating, data.stats.total_reviews);
            }`;

if (content.includes(oldCode) && !content.includes('data.stats.average_rating')) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated loadReviews to use stats');
} else if (content.includes('data.stats.average_rating')) {
    console.log('Already updated');
} else {
    console.log('❌ Could not find pattern');
}
