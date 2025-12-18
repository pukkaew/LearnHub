// Test translation system
const { translations, getTranslation } = require('./utils/languages');

// Keys that user reported as not working
const testKeys = [
    'yesterday',
    'weeksAgo',
    'statusStarted',
    'statusNotStarted',
    'unknown',
    'untitled',
    'badge',
    'learningTime',
    'hrs',
    'noData',
    'dashboard',
    'home'
];

console.log('=== Translation Test ===\n');
console.log('Testing Thai (th) translations:\n');

testKeys.forEach(key => {
    const thValue = getTranslation('th', key);
    const enValue = getTranslation('en', key);
    const thDirect = translations.th ? translations.th[key] : undefined;

    console.log(`Key: "${key}"`);
    console.log(`  getTranslation('th', '${key}'): "${thValue}"`);
    console.log(`  translations.th.${key}: "${thDirect}"`);
    console.log(`  getTranslation('en', '${key}'): "${enValue}"`);
    console.log('');
});

// Check structure
console.log('\n=== Structure Check ===\n');
console.log('translations.th exists:', !!translations.th);
console.log('translations.en exists:', !!translations.en);
console.log('Type of translations.th:', typeof translations.th);

// Check if keys exist at top level
console.log('\nDirect access test:');
console.log('translations.th.yesterday:', translations.th?.yesterday);
console.log('translations.th.weeksAgo:', translations.th?.weeksAgo);
console.log('translations.th.statusStarted:', translations.th?.statusStarted);
