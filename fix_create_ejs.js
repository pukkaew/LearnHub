const fs = require('fs');
const filePath = 'D:/App/LearnHub/views/articles/create.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the saveDraft and submitArticle functions
const pattern = /async function saveDraft\(\) \{[\s\S]*?showLoading\(false\);\s*\}\s*\}\s*async function submitArticle\(event\) \{[\s\S]*?showLoading\(false\);\s*\}\s*\}/;

const replacement = `// Helper function to upload featured image
async function uploadFeaturedImage() {
    const fileInput = document.getElementById('featured_image');
    if (!fileInput.files || fileInput.files.length === 0) {
        return null;
    }

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    try {
        const response = await fetch('/articles/api/upload/image', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        return data.success ? data.url : null;
    } catch (error) {
        console.error('Error uploading image:', error);
        return null;
    }
}

// Helper function to collect article data
async function collectArticleData(status) {
    let featuredImageUrl = await uploadFeaturedImage();

    return {
        title: document.getElementById('title').value,
        summary: document.getElementById('summary').value,
        content: document.getElementById('content-editor').innerHTML,
        category: document.getElementById('category').value,
        reading_time: document.getElementById('reading_time').value,
        tags: tags.join(','),
        difficulty: document.getElementById('difficulty').value,
        language: document.getElementById('language').value,
        visibility: document.querySelector('input[name="visibility"]:checked')?.value || 'public',
        allow_comments: document.querySelector('input[name="allow_comments"]')?.checked,
        meta_description: document.getElementById('meta_description').value,
        slug: document.getElementById('slug').value,
        status: status,
        featured_image: featuredImageUrl
    };
}

async function saveDraft() {
    showLoading(true);

    try {
        const articleData = await collectArticleData('draft');

        const response = await fetch('/articles/api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(articleData)
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(translations.articleSavedAsDraft);
        } else {
            showError(data.message || translations.failedToSaveDraft);
        }
    } catch (error) {
        console.error('Error saving draft:', error);
        showError(translations.errorSavingDraft);
    } finally {
        showLoading(false);
    }
}

async function submitArticle(event) {
    event.preventDefault();

    if (!validateCurrentStep()) {
        return;
    }

    showLoading(true);

    try {
        const status = document.querySelector('input[name="status"]:checked').value;
        const articleData = await collectArticleData(status);

        const response = await fetch('/articles/api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(articleData)
        });

        const data = await response.json();

        if (data.success) {
            const message = status === 'published' ? translations.articlePublished :
                           status === 'scheduled' ? translations.articleScheduled :
                           translations.articleSavedDraft;

            showSuccess(message);
            setTimeout(() => {
                window.location.href = '/articles';
            }, 2000);
        } else {
            showError(data.message || translations.failedToCreate);
        }
    } catch (error) {
        console.error('Error creating article:', error);
        showError(translations.errorCreatingArticle);
    } finally {
        showLoading(false);
    }
}`;

if (pattern.test(content)) {
    content = content.replace(pattern, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated create.ejs with image upload helper functions');
} else {
    console.log('Pattern not found - checking manually...');
    // Manual fix - find saveDraft and replace everything up to showLoading at end of submitArticle
    const startIdx = content.indexOf('async function saveDraft()');
    const endPattern = /showLoading\(false\);\s*\}\s*\}\s*function showLoading/;
    const match = content.match(endPattern);

    if (startIdx !== -1 && match) {
        const endIdx = content.indexOf(match[0]);
        const before = content.substring(0, startIdx);
        const after = content.substring(endIdx).replace(/^showLoading\(false\);\s*\}\s*\}/, '');
        content = before + replacement + '\n\nfunction showLoading' + after.substring(after.indexOf('function showLoading') + 'function showLoading'.length);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Successfully updated create.ejs (manual method)');
    } else {
        console.log('Could not find the code to replace');
        console.log('startIdx:', startIdx);
    }
}
