const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Find the rating-display section and add gray color to stars
// This targets the specific pattern in the header
const regex = /(<div id="rating-display"[^>]*>[\s\S]*?<div class="flex">)([\s\S]*?)(<\/div>\s*<span id="rating-text")/;

const match = content.match(regex);
if (match) {
    const starsSection = match[2];
    // Replace all fa-star without color class to have text-gray-300
    const fixedStars = starsSection.replace(/<i class="fas fa-star"><\/i>/g, '<i class="fas fa-star text-gray-300"></i>');

    if (fixedStars !== starsSection) {
        content = content.replace(regex, '$1' + fixedStars + '$3');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✅ Fixed star colors to gray');
    } else {
        console.log('Stars already have colors or pattern not matched');
    }
} else {
    console.log('❌ Could not find rating-display section');
}
