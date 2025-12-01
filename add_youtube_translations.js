const fs = require('fs');

const filePath = 'D:/App/LearnHub/utils/languages.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add TH translations
if (!content.includes("youtubeVideo:")) {
    content = content.replace(
        "viewCourse: 'เข้าดู',",
        "viewCourse: 'เข้าดู',\n        youtubeVideo: 'วิดีโอ YouTube',\n        watchOnYoutube: 'ดูบน YouTube',"
    );
    console.log('Added TH YouTube translations');
}

// Add EN translations
if (!content.includes("youtubeVideo: 'YouTube Video'")) {
    content = content.replace(
        "viewCourse: 'View',",
        "viewCourse: 'View',\n        youtubeVideo: 'YouTube Video',\n        watchOnYoutube: 'Watch on YouTube',"
    );
    console.log('Added EN YouTube translations');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
