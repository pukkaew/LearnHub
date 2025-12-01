const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Fix star colors to be gray by default
const oldStars = `<div class="flex">
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                </div>
                                <span id="rating-text"`;

const newStars = `<div class="flex">
                                    <i class="fas fa-star text-gray-300"></i>
                                    <i class="fas fa-star text-gray-300"></i>
                                    <i class="fas fa-star text-gray-300"></i>
                                    <i class="fas fa-star text-gray-300"></i>
                                    <i class="fas fa-star text-gray-300"></i>
                                </div>
                                <span id="rating-text"`;

if (content.includes(oldStars)) {
    content = content.replace(oldStars, newStars);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fixed star colors to gray');
} else {
    console.log('❌ Could not find star pattern');
    // Check if already fixed
    if (content.includes('fa-star text-gray-300')) {
        console.log('Stars already have gray color');
    }
}
