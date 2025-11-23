// Check all course views for translation keys usage

const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views', 'courses');
const { translations } = require('./utils/languages');

console.log('='.repeat(70));
console.log('Checking Course Views for Translation Keys');
console.log('='.repeat(70));

const files = fs.readdirSync(viewsDir);

const allThKeys = Object.keys(translations.th);
const allEnKeys = Object.keys(translations.en);

files.forEach(file => {
    if (!file.endsWith('.ejs')) return;

    const filePath = path.join(viewsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Find all t('key') usages
    const tFunctionRegex = /t\(['"]([^'"]+)['"]\)/g;
    const matches = [...content.matchAll(tFunctionRegex)];

    const usedKeys = matches.map(m => m[1]);
    const uniqueKeys = [...new Set(usedKeys)];

    console.log(`\n📄 ${file}`);
    console.log(`   Used ${uniqueKeys.length} unique translation keys`);

    if (uniqueKeys.length > 0) {
        const missingInTh = uniqueKeys.filter(k => !allThKeys.includes(k));
        const missingInEn = uniqueKeys.filter(k => !allEnKeys.includes(k));

        if (missingInTh.length > 0) {
            console.log(`   ❌ Missing in TH: ${missingInTh.join(', ')}`);
        }
        if (missingInEn.length > 0) {
            console.log(`   ❌ Missing in EN: ${missingInEn.join(', ')}`);
        }
        if (missingInTh.length === 0 && missingInEn.length === 0) {
            console.log(`   ✅ All keys exist in both languages`);
        }

        // Show sample keys
        console.log(`   Sample keys: ${uniqueKeys.slice(0, 5).join(', ')}`);
    } else {
        console.log(`   ⚠️  No t() function calls found (hardcoded text?)`);
    }
});

console.log('\n' + '='.repeat(70));
