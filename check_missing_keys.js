const langs = require('./utils/languages');

const keysToCheck = [
    'difficultyBeginner',
    'difficultyIntermediate',
    'difficultyAdvanced',
    'category',
    'difficulty',
    'courseName',
    'courseCode',
    'courseDescription',
    'instructor',
    'hours',
    'people',
    'learningProgress',
    'overview',
    'curriculum',
    'materials',
    'discussions',
    'reviewsTab',
    'introVideo',
    'aboutCourse',
    'learningObjectives',
    'targetAudience',
    'prerequisites',
    'courseInfo',
    'difficultyLevel'
];

console.log('Checking missing keys...\n');

keysToCheck.forEach(k => {
    if (!langs.translations.th[k]) {
        console.log('Missing TH:', k);
    }
    if (!langs.translations.en[k]) {
        console.log('Missing EN:', k);
    }
});

console.log('\nDone!');
