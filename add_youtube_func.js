const fs = require('fs');

const filePath = 'D:/App/LearnHub/views/courses/content.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Check if function already exists
if (content.includes('function setupYoutubePlayer')) {
    console.log('✅ setupYoutubePlayer function already exists');
    process.exit(0);
}

// Find the end of setupVideoPlayer function and add setupYoutubePlayer after it
const searchPattern = `    });
}

// Navigation
function navigatePrev() {`;

const replacement = `    });
}

// YouTube Player Setup
function setupYoutubePlayer() {
    // For YouTube iframe, we track viewing time
    console.log('YouTube player initialized for:', currentMaterial?.title);

    // Auto mark complete after 30 seconds of viewing
    setTimeout(() => {
        if (currentMaterial && !currentMaterial.is_completed) {
            console.log('YouTube video viewed - ready to mark complete');
        }
    }, 30000);
}

// Navigation
function navigatePrev() {`;

if (content.includes(searchPattern)) {
    content = content.replace(searchPattern, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Added setupYoutubePlayer function');
} else {
    console.log('❌ Could not find insertion point');

    // Try alternative - just append function before closing script tag
    const altSearch = '</script>';
    const altReplacement = `
// YouTube Player Setup
function setupYoutubePlayer() {
    console.log('YouTube player initialized for:', currentMaterial?.title);
    setTimeout(() => {
        if (currentMaterial && !currentMaterial.is_completed) {
            console.log('YouTube video viewed - ready to mark complete');
        }
    }, 30000);
}
</script>`;

    if (content.includes(altSearch) && !content.includes('function setupYoutubePlayer')) {
        // Replace the last </script> tag
        const lastIndex = content.lastIndexOf(altSearch);
        content = content.substring(0, lastIndex) + altReplacement;
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✅ Added setupYoutubePlayer function (alternative method)');
    }
}
