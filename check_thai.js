const fs = require('fs');
const content = fs.readFileSync('D:/App/LearnHub/views/courses/detail.ejs', 'utf8');
const lines = content.split('\n');

console.log('Lines with Thai characters (excluding comments and mappings):');
lines.forEach((line, i) => {
    if (/[ก-๙]/.test(line) &&
        !line.includes('//') &&
        !line.includes('languageMap') &&
        !line.includes('courseTypeMap') &&
        line.trim().length > 0) {
        console.log(`${i+1}: ${line.trim().substring(0, 120)}`);
    }
});
