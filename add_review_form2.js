const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Find the Reviews Tab opening div and add form after it
const searchPattern = /<div id="tab-reviews" class="tab-content hidden">/;
const match = content.match(searchPattern);

if (match) {
    const reviewForm = `<div id="tab-reviews" class="tab-content hidden">
                        <!-- Review Form -->
                        <div id="review-form-container" class="mb-6 p-4 bg-gray-50 rounded-lg hidden">
                            <h4 class="font-semibold text-gray-900 mb-3"><%= t('writeReview') %></h4>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2"><%= t('yourRating') %></label>
                                <div id="star-rating" class="flex space-x-1">
                                    <button type="button" class="star-btn text-2xl text-gray-300 hover:text-yellow-400" data-rating="1"><i class="fas fa-star"></i></button>
                                    <button type="button" class="star-btn text-2xl text-gray-300 hover:text-yellow-400" data-rating="2"><i class="fas fa-star"></i></button>
                                    <button type="button" class="star-btn text-2xl text-gray-300 hover:text-yellow-400" data-rating="3"><i class="fas fa-star"></i></button>
                                    <button type="button" class="star-btn text-2xl text-gray-300 hover:text-yellow-400" data-rating="4"><i class="fas fa-star"></i></button>
                                    <button type="button" class="star-btn text-2xl text-gray-300 hover:text-yellow-400" data-rating="5"><i class="fas fa-star"></i></button>
                                </div>
                                <input type="hidden" id="selected-rating" value="0">
                            </div>
                            <div class="mb-4">
                                <label for="review-text" class="block text-sm font-medium text-gray-700 mb-2"><%= t('yourReview') %></label>
                                <textarea id="review-text" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="<%= t('reviewPlaceholder') %>"></textarea>
                            </div>
                            <button id="submit-review-btn" type="button" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="fas fa-paper-plane mr-2"></i><%= t('submitReview') %>
                            </button>
                        </div>

                        <!-- Reviews List -->`;

    content = content.replace(searchPattern, reviewForm);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Added review form to reviews tab');
} else {
    console.log('❌ Could not find the reviews tab pattern');
}
