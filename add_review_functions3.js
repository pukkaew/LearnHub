const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/detail.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Just insert before loadRelatedCourses
const insertBefore = 'async function loadRelatedCourses() {';

if (content.includes(insertBefore)) {
    const functionsToInsert = `// Initialize review form functionality
function initReviewForm() {
    const formContainer = document.getElementById('review-form-container');
    const starButtons = document.querySelectorAll('.star-btn');
    const selectedRatingInput = document.getElementById('selected-rating');
    const submitBtn = document.getElementById('submit-review-btn');

    // Star rating click handler
    starButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const rating = parseInt(btn.dataset.rating);
            selectedRatingInput.value = rating;

            // Update star display
            starButtons.forEach(star => {
                const starRating = parseInt(star.dataset.rating);
                if (starRating <= rating) {
                    star.classList.remove('text-gray-300');
                    star.classList.add('text-yellow-400');
                } else {
                    star.classList.remove('text-yellow-400');
                    star.classList.add('text-gray-300');
                }
            });
        });
    });

    // Submit review handler
    if (submitBtn) {
        submitBtn.addEventListener('click', submitReview);
    }
}

async function submitReview() {
    const rating = parseInt(document.getElementById('selected-rating').value);
    const reviewText = document.getElementById('review-text').value.trim();
    const submitBtn = document.getElementById('submit-review-btn');

    if (rating === 0) {
        alert(t('pleaseSelectRating'));
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>' + t('submitting');

    try {
        const response = await fetch(\`/courses/api/\${courseId}/reviews\`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rating: rating,
                review_text: reviewText
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(t('reviewSubmitted'));
            loadReviews();
            document.getElementById('selected-rating').value = 0;
            document.getElementById('review-text').value = '';
            document.querySelectorAll('.star-btn').forEach(star => {
                star.classList.remove('text-yellow-400');
                star.classList.add('text-gray-300');
            });
        } else {
            alert(data.message || t('errorSubmittingReview'));
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        alert(t('errorSubmittingReview'));
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>' + t('submitReview');
    }
}

function showReviewFormIfEnrolled(isEnrolled) {
    const formContainer = document.getElementById('review-form-container');
    if (formContainer && isEnrolled) {
        formContainer.classList.remove('hidden');
    }
}

`;
    content = content.replace(insertBefore, functionsToInsert + insertBefore);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Added review functions');
} else {
    console.log('❌ Could not find loadRelatedCourses function');
}
