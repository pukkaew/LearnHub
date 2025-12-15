const fs = require('fs');
const filePath = 'D:/App/LearnHub/views/articles/edit.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Change data.article to data.data in loadArticle function
content = content.replace(
    'originalData = data.article;',
    'originalData = data.data;'
);
content = content.replace(
    'populateForm(data.article);',
    'populateForm(data.data);'
);

// Fix 2: Replace handleSaveArticle to use JSON instead of FormData
const oldHandleSave = `// Handle save article
async function handleSaveArticle(e) {
    if (e) e.preventDefault();

    try {
        const formData = new FormData();

        // Get form data
        formData.append('title', document.getElementById('articleTitle').value);
        formData.append('summary', document.getElementById('articleSummary').value);
        formData.append('content', quill.root.innerHTML);
        formData.append('category', document.getElementById('articleCategory').value);
        formData.append('status', document.getElementById('articleStatus').value);
        formData.append('tags', document.getElementById('articleTags').value);
        formData.append('meta_description', document.getElementById('metaDescription').value);
        formData.append('slug', document.getElementById('articleSlug').value);
        formData.append('publish_date', document.getElementById('publishDate').value);

        // Featured image
        const imageFile = document.getElementById('featuredImageInput').files[0];
        if (imageFile) {
            formData.append('featured_image', imageFile);
        }

        const response = await fetch(\`/articles/api/\${articleId}\`, {
            method: 'PUT',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showMessage('<%= t('changesSavedSuccessfully') %>', 'success');

            // Update original data
            originalData = { ...originalData, ...data.article };

            // Redirect if published
            if (data.article.status === 'published') {
                setTimeout(() => {
                    window.location.href = \`/articles/\${articleId}\`;
                }, 1500);
            }
        } else {
            showMessage(data.message || '<%= t('errorOccurred') %>', 'error');
        }
    } catch (error) {
        console.error('Error saving article:', error);
        showMessage('<%= t('errorSaving') %>', 'error');
    }
}`;

const newHandleSave = `// Helper function to upload featured image
async function uploadFeaturedImage() {
    const fileInput = document.getElementById('featuredImageInput');
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

// Handle save article
async function handleSaveArticle(e) {
    if (e) e.preventDefault();

    try {
        // Upload featured image first if exists
        let featuredImageUrl = await uploadFeaturedImage();

        // Build article data object
        const articleData = {
            title: document.getElementById('articleTitle').value,
            summary: document.getElementById('articleSummary').value,
            content: quill.root.innerHTML,
            category: document.getElementById('articleCategory').value,
            status: document.getElementById('articleStatus').value,
            tags: document.getElementById('articleTags').value,
            meta_description: document.getElementById('metaDescription').value,
            slug: document.getElementById('articleSlug').value,
            publish_date: document.getElementById('publishDate').value
        };

        // Add featured image if uploaded
        if (featuredImageUrl) {
            articleData.featured_image = featuredImageUrl;
        }

        const response = await fetch(\`/articles/api/\${articleId}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(articleData)
        });

        const data = await response.json();

        if (data.success) {
            showMessage('<%= t('changesSavedSuccessfully') %>', 'success');

            // Update original data
            originalData = { ...originalData, ...articleData };

            // Redirect if published
            if (articleData.status === 'published') {
                setTimeout(() => {
                    window.location.href = \`/articles/\${articleId}\`;
                }, 1500);
            }
        } else {
            showMessage(data.message || '<%= t('errorOccurred') %>', 'error');
        }
    } catch (error) {
        console.error('Error saving article:', error);
        showMessage('<%= t('errorSaving') %>', 'error');
    }
}`;

if (content.includes(oldHandleSave)) {
    content = content.replace(oldHandleSave, newHandleSave);
    console.log('Replaced handleSaveArticle function');
} else {
    console.log('Could not find exact handleSaveArticle match');
}

// Fix 3: Replace autoSave to use JSON instead of FormData
const oldAutoSave = `// Auto-save functionality
async function autoSave() {
    const currentData = {
        title: document.getElementById('articleTitle').value,
        summary: document.getElementById('articleSummary').value,
        content: quill.root.innerHTML,
        category: document.getElementById('articleCategory').value,
        tags: document.getElementById('articleTags').value
    };

    // Check if data has changed
    const hasChanged = Object.keys(currentData).some(key =>
        currentData[key] !== (originalData[key] || '')
    );

    if (hasChanged && currentData.title.trim()) {
        try {
            const formData = new FormData();
            Object.keys(currentData).forEach(key => {
                formData.append(key, currentData[key]);
            });
            formData.append('auto_save', 'true');

            await fetch(\`/articles/api/\${articleId}/autosave\`, {
                method: 'POST',
                body: formData
            });

            // Show subtle auto-save indicator
            showAutoSaveIndicator();
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
}`;

const newAutoSave = `// Auto-save functionality
async function autoSave() {
    const currentData = {
        title: document.getElementById('articleTitle').value,
        summary: document.getElementById('articleSummary').value,
        content: quill.root.innerHTML,
        category: document.getElementById('articleCategory').value,
        tags: document.getElementById('articleTags').value
    };

    // Check if data has changed
    const hasChanged = Object.keys(currentData).some(key =>
        currentData[key] !== (originalData[key] || '')
    );

    if (hasChanged && currentData.title.trim()) {
        try {
            await fetch(\`/articles/api/\${articleId}/autosave\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentData)
            });

            // Show subtle auto-save indicator
            showAutoSaveIndicator();
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
}`;

if (content.includes(oldAutoSave)) {
    content = content.replace(oldAutoSave, newAutoSave);
    console.log('Replaced autoSave function');
} else {
    console.log('Could not find exact autoSave match');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated edit.ejs');
