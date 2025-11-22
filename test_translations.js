const { getTranslation, translations } = require('./utils/languages');

console.log('🧪 Testing translations...\n');

// Test 1: Check if testTypes exists
console.log('1. Check testTypes in translations.th:');
console.log('   translations.th.testTypes:', translations.th.testTypes);
console.log('');

// Test 2: Check if testTypeGroups exists
console.log('2. Check testTypeGroups in translations.th:');
console.log('   translations.th.testTypeGroups:', translations.th.testTypeGroups);
console.log('');

// Test 3: Test getTranslation function
console.log('3. Test getTranslation function:');
const test1 = getTranslation('th', 'testTypes.pre_training_assessment');
console.log(`   getTranslation('th', 'testTypes.pre_training_assessment'):`, test1);

const test2 = getTranslation('th', 'testTypeGroups.prePostTraining');
console.log(`   getTranslation('th', 'testTypeGroups.prePostTraining'):`, test2);

const test3 = getTranslation('en', 'testTypes.pre_training_assessment');
console.log(`   getTranslation('en', 'testTypes.pre_training_assessment'):`, test3);

const test4 = getTranslation('en', 'testTypeGroups.prePostTraining');
console.log(`   getTranslation('en', 'testTypeGroups.prePostTraining'):`, test4);
console.log('');

// Test 4: Test with non-existent key
console.log('4. Test with non-existent key:');
const test5 = getTranslation('th', 'nonExistent.key');
console.log(`   getTranslation('th', 'nonExistent.key'):`, test5);
