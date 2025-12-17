const fs = require('fs');
const path = 'D:/App/LearnHub/utils/languages.js';

let content = fs.readFileSync(path, 'utf8');

// Add Thai translations after positionNamePlaceholder
content = content.replace(
    /positionNamePlaceholder: 'เช่น วิศวกรซอฟต์แวร์, นักวิเคราะห์ระบบ, ผู้จัดการฝ่าย',/,
    `positionNamePlaceholder: 'เช่น วิศวกรซอฟต์แวร์, นักวิเคราะห์ระบบ, ผู้จัดการฝ่าย',
        positionNameEn: 'ชื่อตำแหน่ง (ภาษาอังกฤษ)',
        positionNameEnPlaceholder: 'เช่น Software Engineer, System Analyst',`
);

// Add English translations after positionNamePlaceholder
content = content.replace(
    /positionNamePlaceholder: 'e\.g\. Software Engineer, System Analyst, Department Manager',/,
    `positionNamePlaceholder: 'e.g. Software Engineer, System Analyst, Department Manager',
        positionNameEn: 'Position Name (English)',
        positionNameEnPlaceholder: 'e.g. Software Engineer, System Analyst',`
);

fs.writeFileSync(path, content);
console.log('Translations added!');
