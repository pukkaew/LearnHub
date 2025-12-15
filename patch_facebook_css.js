const fs = require('fs');
const path = 'D:/App/LearnHub/views/articles/detail.ejs';

let content = fs.readFileSync(path, 'utf8');

// Remove old reaction CSS if exists
content = content.replace(/\/\* Reaction Popup Styles[\s\S]*?\.pin-badge \{[\s\S]*?\}\n/g, '');

// New Facebook-like CSS
const fbCSS = `
/* Facebook-style Comments */
.comment-item {
    position: relative;
}
.reply-item {
    position: relative;
}

/* Reaction Popup - Facebook style */
.reaction-popup {
    animation: popIn 0.15s ease-out;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
}
@keyframes popIn {
    0% { opacity: 0; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
}
.group:hover .reaction-popup,
.reaction-popup:hover {
    display: flex !important;
}

/* Comment bubble hover effect */
.comment-item .bg-gray-100:hover,
.reply-item .bg-gray-100:hover {
    background-color: #e4e6eb;
}

/* Author badge */
.bg-blue-500 {
    background: #1877f2 !important;
}

/* Like button colors */
.text-blue-600 { color: #1877f2 !important; }
.text-red-500 { color: #f33e58 !important; }
.text-yellow-500 { color: #f7b928 !important; }
.text-orange-500 { color: #e9710f !important; }

/* Reply thread line */
.border-l-2.border-gray-200 {
    border-color: #ccd0d5;
}

/* Smooth transitions */
.comment-item, .reply-item {
    transition: background-color 0.2s;
}

/* Action buttons */
.comment-item button, .reply-item button {
    transition: color 0.15s;
}
`;

// Add CSS before </style>
if (!content.includes('/* Facebook-style Comments */')) {
    content = content.replace('</style>', fbCSS + '</style>');
    fs.writeFileSync(path, content, 'utf8');
    console.log('✅ Added Facebook-style CSS');
} else {
    console.log('CSS already exists');
}
