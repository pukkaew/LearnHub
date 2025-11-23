// Check for missing translations between Thai and English

const { translations } = require('./utils/languages');

const thKeys = Object.keys(translations.th);
const enKeys = Object.keys(translations.en);

const missingInEn = thKeys.filter(k => !enKeys.includes(k));
const missingInTh = enKeys.filter(k => !thKeys.includes(k));

console.log('='.repeat(70));
console.log('Translation Keys Analysis');
console.log('='.repeat(70));

console.log(`\nTotal Thai keys: ${thKeys.length}`);
console.log(`Total English keys: ${enKeys.length}`);

if (missingInEn.length > 0) {
    console.log(`\n❌ Missing in English (${missingInEn.length} keys):`);
    console.log(missingInEn.slice(0, 30).join(', '));
    if (missingInEn.length > 30) {
        console.log(`... and ${missingInEn.length - 30} more`);
    }
}

if (missingInTh.length > 0) {
    console.log(`\n❌ Missing in Thai (${missingInTh.length} keys):`);
    console.log(missingInTh.slice(0, 30).join(', '));
    if (missingInTh.length > 30) {
        console.log(`... and ${missingInTh.length - 30} more`);
    }
}

if (missingInEn.length === 0 && missingInTh.length === 0) {
    console.log('\n✅ All translation keys are present in both languages!');
}

// Check for specific course-related keys
const courseKeys = thKeys.filter(k => k.toLowerCase().includes('course'));
console.log(`\n📚 Course-related keys: ${courseKeys.length}`);
console.log('Sample course keys:');
courseKeys.slice(0, 15).forEach(key => {
    console.log(`  - ${key}: TH="${translations.th[key]}" | EN="${translations.en[key] || 'MISSING'}"`);
});

console.log('\n' + '='.repeat(70));
