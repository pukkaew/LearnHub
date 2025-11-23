// Count hardcoded Thai text in course views

const fs = require('fs');
const path = require('path');

const files = [
    'views/courses/create.ejs',
    'views/courses/categories.ejs',
    'views/courses/detail.ejs'
];

console.log('='.repeat(70));
console.log('Hardcoded Thai Text Analysis');
console.log('='.repeat(70));

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Find hardcoded Thai text (not in <%= t('...') %>)
    const thaiTextRegex = />[^<]*[ก-ฮ][^<]*</g;
    const matches = content.match(thaiTextRegex) || [];

    // Filter out those already using t() function
    const hardcodedMatches = matches.filter(m => {
        // Check if this is part of <%= t('...') %>
        return !m.includes('t(');
    });

    console.log(`\n📄 ${file}`);
    console.log(`   Found ${hardcodedMatches.length} hardcoded Thai text instances`);

    if (hardcodedMatches.length > 0 && hardcodedMatches.length <= 20) {
        console.log(`   Examples:`);
        hardcodedMatches.slice(0, 10).forEach(m => {
            const cleaned = m.replace(/>/g, '').replace(/</g, '').trim();
            if (cleaned) {
                console.log(`      - "${cleaned}"`);
            }
        });
    }
});

console.log('\n' + '='.repeat(70));
console.log('\nสรุป: ไฟล์เหล่านี้ต้องแก้ไขให้ใช้ t() function แทนข้อความ hardcoded');
console.log('='.repeat(70));
