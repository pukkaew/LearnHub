const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `function updateReviewsDisplay(reviews) {
    const container = document.getElementById('course-reviews');

    if (!reviews || reviews.length === 0) {
        container.innerHTML = \`<p class="text-gray-500">\${t('noReviews')}</p>\`;
        return;
    }

    container.innerHTML = reviews.map(review => \`
        <div class="border-b border-gray-200 pb-4 mb-4">
            <div class="flex items-start space-x-3">
                <img src="\${review.user_avatar || '/images/default-avatar.png'}"
                     alt="\${review.user_name}"
                     class="w-10 h-10 rounded-full">
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <div>
                            <h5 class="font-medium text-gray-900">\${review.user_name}</h5>
                            <div class="flex items-center space-x-2">
                                <div class="flex text-yellow-400">
                                    \${generateStars(review.rating)}
                                </div>
                                <span class="text-sm text-gray-500">\${timeAgo(review.created_at)}</span>
                            </div>
                        </div>
                    </div>
                    \${review.review_text ? \`<p class="text-gray-700">\${review.review_text}</p>\` : ''}
                </div>
            </div>
        </div>
    \`).join('');
}`;

const newCode = `function updateReviewsDisplay(reviews) {
    const container = document.getElementById('course-reviews');

    if (!reviews || reviews.length === 0) {
        container.innerHTML = \`<p class="text-gray-500">\${t('noReviews')}</p>\`;
        return;
    }

    container.innerHTML = reviews.map(review => {
        const userName = review.first_name && review.last_name
            ? \`\${review.first_name} \${review.last_name}\`
            : review.username || t('anonymousUser');
        const userAvatar = review.avatar_url || '/images/default-avatar.png';

        return \`
        <div class="border-b border-gray-200 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
            <div class="flex items-start space-x-3">
                <img src="\${userAvatar}"
                     alt="\${userName}"
                     class="w-10 h-10 rounded-full object-cover"
                     onerror="this.src='/images/default-avatar.png'">
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <div>
                            <h5 class="font-medium text-gray-900">\${userName}</h5>
                            <div class="flex items-center space-x-2">
                                <div class="flex text-yellow-400">
                                    \${generateStars(review.rating)}
                                </div>
                                <span class="text-sm text-gray-500">\${timeAgo(review.created_at)}</span>
                            </div>
                        </div>
                    </div>
                    \${review.review_text ? \`<p class="text-gray-700">\${review.review_text}</p>\` : ''}
                </div>
            </div>
        </div>
    \`}).join('');
}`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated updateReviewsDisplay function');
} else {
    console.log('❌ Could not find the function to replace');
    // Try to find partial match
    if (content.includes('function updateReviewsDisplay')) {
        console.log('Found function declaration but code pattern did not match');
    }
}
