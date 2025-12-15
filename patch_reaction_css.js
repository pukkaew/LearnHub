const fs = require('fs');
const path = 'D:/App/LearnHub/views/articles/detail.ejs';

let content = fs.readFileSync(path, 'utf8');

const cssToAdd = `
/* Reaction Popup Styles - Facebook-like */
.reaction-popup {
    animation: reactionPopup 0.2s ease-out;
    transform-origin: left bottom;
}
@keyframes reactionPopup {
    from {
        opacity: 0;
        transform: scale(0.8) translateY(5px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}
.reaction-icon {
    cursor: pointer;
    font-size: 1.25rem;
    padding: 0.25rem;
    border-radius: 50%;
    transition: transform 0.15s ease;
}
.reaction-icon:hover {
    transform: scale(1.3);
    background-color: rgba(0,0,0,0.05);
}
/* Keep popup visible when hovering it */
.group:hover .reaction-popup {
    display: flex !important;
}
.reaction-popup:hover {
    display: flex !important;
}
/* Author badge style */
.author-badge {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    font-size: 0.625rem;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
/* Pin badge style */
.pin-badge {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: white;
}
`;

// Check if CSS already exists
if (content.includes('.reaction-popup {')) {
    console.log('Reaction CSS already exists');
} else {
    // Add before </style>
    content = content.replace('</style>', cssToAdd + '</style>');
    fs.writeFileSync(path, content, 'utf8');
    console.log('Added reaction popup CSS');
}
