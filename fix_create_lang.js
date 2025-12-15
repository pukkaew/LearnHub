const fs = require('fs');
const filePath = 'D:/App/LearnHub/views/articles/create.ejs';
let content = fs.readFileSync(filePath, 'utf8');

// Find the pattern and add formatDate function
const oldPattern = /tagsLabel: '<%=.*?%>'\s*\};\s*\nlet currentStep = 1;/;
const newCode = `tagsLabel: '<%= t("tags") || "แท็ก" %>'
};

// Current language for date formatting
const currentLanguage = '<%= currentLanguage || "th" %>';

// Format date based on current language
function formatDate(dateString) {
    const locale = currentLanguage === 'en' ? 'en-US' : 'th-TH';
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(locale, options);
}

let currentStep = 1;`;

if (oldPattern.test(content)) {
    content = content.replace(oldPattern, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Added formatDate function to create.ejs');
} else {
    console.log('Pattern not found, checking if already exists...');
    if (content.includes('function formatDate(dateString)')) {
        console.log('formatDate already exists');
    } else {
        console.log('Could not find pattern to replace');
    }
}
