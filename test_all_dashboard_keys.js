// Test all dashboard T object keys
const { translations, getTranslation } = require('./utils/languages');

// All keys used in T object from dashboard/index.ejs
const dashboardKeys = [
    'noCourses',
    'noProgress',
    'noArticles',
    'noNotifications',
    'noBadges',
    'noActivity',
    'noRecentUsers',
    'continue',
    'start',
    'justNow',
    'minutesAgo',
    'hoursAgo',
    'daysAgo',
    'totalEnrolled',
    'browseCourses',
    'today',
    'yesterday',
    'weeksAgo',
    'viewAllArticles',
    'notEnrolledYet',
    'chooseInterestingCourse',
    'by',
    'enrollToTrackProgress',
    'startLearningCourse',
    'statusCompleted',
    'statusInProgress',
    'statusStarted',
    'statusNotStarted',
    'unknown',
    'untitled',
    'badge',
    'user',
    'views',
    'noData'
];

console.log('=== Dashboard Translation Keys Test ===\n');

let missingKeys = [];
let workingKeys = [];

dashboardKeys.forEach(key => {
    const thValue = getTranslation('th', key);
    const thDirect = translations.th ? translations.th[key] : undefined;

    // Check if translation returns the key itself (meaning not found)
    if (thValue === key || !thValue) {
        missingKeys.push({ key, thValue, thDirect });
    } else {
        workingKeys.push({ key, thValue });
    }
});

console.log('✅ Working Keys (' + workingKeys.length + '):');
workingKeys.forEach(({ key, thValue }) => {
    console.log(`   ${key}: "${thValue}"`);
});

console.log('\n❌ Missing/Not Working Keys (' + missingKeys.length + '):');
missingKeys.forEach(({ key, thValue, thDirect }) => {
    console.log(`   ${key}: getTranslation="${thValue}", direct="${thDirect}"`);
});

if (missingKeys.length === 0) {
    console.log('\n🎉 All dashboard translation keys are working!');
} else {
    console.log('\n⚠️  Need to add ' + missingKeys.length + ' keys to languages.js');
}
