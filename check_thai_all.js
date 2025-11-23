const fs = require('fs');

const files = [
    'views/courses/categories.ejs',
    'views/courses/create.ejs',
    'views/courses/edit.ejs',
    'views/courses/index.ejs',
    'views/courses/content.ejs',
    'views/courses/analytics.ejs',
    'views/courses/progress.ejs'
];

files.forEach(file => {
    const path = `D:/App/LearnHub/${file}`;
    if (!fs.existsSync(path)) {
        console.log(`\n❌ File not found: ${file}`);
        return;
    }

    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    const thaiLines = [];

    lines.forEach((line, i) => {
        if (/[ก-๙]/.test(line) &&
            !line.includes('//') &&
            !line.includes('languageMap') &&
            !line.includes('courseTypeMap') &&
            line.trim().length > 0) {
            thaiLines.push({ num: i + 1, text: line.trim().substring(0, 120) });
        }
    });

    if (thaiLines.length > 0) {
        console.log(`\n📄 ${file} (${thaiLines.length} lines with Thai):`);
        thaiLines.slice(0, 10).forEach(({ num, text }) => {
            console.log(`   ${num}: ${text}`);
        });
        if (thaiLines.length > 10) {
            console.log(`   ... และอีก ${thaiLines.length - 10} บรรทัด`);
        }
    } else {
        console.log(`\n✅ ${file} - No Thai text found`);
    }
});
