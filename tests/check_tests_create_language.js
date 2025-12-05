/**
 * Check /tests/create page language by rendering EJS template
 */

const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const { translations } = require('../utils/languages');

// Set up mock t() function for Thai
const t = (key) => translations.th[key] || translations.en[key] || key;

// Mock data
const mockData = {
    t,
    currentLanguage: 'th',
    user: { user_id: 1, first_name: 'Test', role_name: 'Admin' },
    courses: [],
    getSetting: (key, defaultVal) => defaultVal
};

console.log('🔍 Checking /tests/create page language translations...\n');

// Read the EJS template
const templatePath = path.join(__dirname, '../views/tests/create.ejs');
const templateContent = fs.readFileSync(templatePath, 'utf-8');

// Find all t() function calls
const tCallRegex = /<%=\s*t\(['"]([^'"]+)['"]\)\s*%>/g;
let match;
const translationKeys = [];

while ((match = tCallRegex.exec(templateContent)) !== null) {
    translationKeys.push(match[1]);
}

// Remove duplicates
const uniqueKeys = [...new Set(translationKeys)];

console.log(`📊 Found ${uniqueKeys.length} unique translation keys\n`);
console.log('=' .repeat(60));

let thaiCount = 0;
let englishOnlyCount = 0;
let missingCount = 0;

uniqueKeys.forEach(key => {
    const thaiValue = translations.th[key];
    const englishValue = translations.en[key];

    if (thaiValue) {
        console.log(`✅ ${key}`);
        console.log(`   TH: ${thaiValue}`);
        thaiCount++;
    } else if (englishValue) {
        console.log(`⚠️ ${key} (English only)`);
        console.log(`   EN: ${englishValue}`);
        englishOnlyCount++;
    } else {
        console.log(`❌ ${key} (MISSING)`);
        missingCount++;
    }
});

console.log('=' .repeat(60));
console.log(`\n📊 Summary:`);
console.log(`   ✅ Thai translations: ${thaiCount}`);
console.log(`   ⚠️ English only: ${englishOnlyCount}`);
console.log(`   ❌ Missing: ${missingCount}`);
console.log(`   📝 Total keys: ${uniqueKeys.length}`);

if (thaiCount === uniqueKeys.length) {
    console.log('\n🎉 All translation keys have Thai translations!');
} else {
    console.log(`\n⚠️ ${uniqueKeys.length - thaiCount} keys need Thai translations`);
}

// Also check for hardcoded fallbacks with || 'text'
const fallbackRegex = /<%=\s*t\(['"][^'"]+['"]\)\s*\|\|\s*['"]([^'"]+)['"]\s*%>/g;
const fallbacks = [];

while ((match = fallbackRegex.exec(templateContent)) !== null) {
    fallbacks.push(match[1]);
}

if (fallbacks.length > 0) {
    console.log(`\n📝 Found ${fallbacks.length} fallback texts (may need translation keys):`);
    [...new Set(fallbacks)].forEach(fb => {
        console.log(`   - "${fb}"`);
    });
}

console.log('\n✅ Language check completed!');
