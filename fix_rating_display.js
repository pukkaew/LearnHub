const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix loadReviews to use stats for rating display
const oldLoadReviews = `        if (data.success) {
            updateReviewsDisplay(data.data);
        } else {
            container.innerHTML = \`<p class="text-gray-500">\${t('cannotLoadReviews')}</p>\`;
        }`;

const newLoadReviews = `        if (data.success) {
            updateReviewsDisplay(data.data);
            // Update header rating display from review stats
            if (data.stats) {
                updateRatingDisplay(data.stats.average_rating, data.stats.total_reviews);
            }
        } else {
            container.innerHTML = \`<p class="text-gray-500">\${t('cannotLoadReviews')}</p>\`;
        }`;

if (content.includes(oldLoadReviews)) {
    content = content.replace(oldLoadReviews, newLoadReviews);
    console.log('✅ Updated loadReviews to use stats');
} else {
    console.log('❌ Could not find loadReviews pattern');
}

// 2. Fix default star colors to be gray
const oldStars = `<div class="flex text-yellow-400">
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                </div>
                                <span id="rating-text" class="text-gray-600 ml-1">`;

const newStars = `<div class="flex">
                                    <i class="fas fa-star text-gray-300"></i>
                                    <i class="fas fa-star text-gray-300"></i>
                                    <i class="fas fa-star text-gray-300"></i>
                                    <i class="fas fa-star text-gray-300"></i>
                                    <i class="fas fa-star text-gray-300"></i>
                                </div>
                                <span id="rating-text" class="text-gray-600 ml-1">`;

if (content.includes(oldStars)) {
    content = content.replace(oldStars, newStars);
    console.log('✅ Fixed default star colors to gray');
} else {
    console.log('❌ Could not find star pattern, trying alternative...');
    // Try simpler pattern
    const simpleOld = 'class="flex text-yellow-400">';
    if (content.includes(simpleOld)) {
        content = content.replace(simpleOld, 'class="flex">');
        console.log('✅ Fixed star container class');
    }
}

fs.writeFileSync(filePath, content, 'utf8');
