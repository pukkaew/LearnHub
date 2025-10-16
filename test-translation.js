const { getTranslation } = require('./utils/languages');

// Test Thai translations
console.log('=== Testing Thai Translations ===');
console.log('positionManagement (th):', getTranslation('th', 'positionManagement'));
console.log('createNewPosition (th):', getTranslation('th', 'createNewPosition'));
console.log('errorLoadingPositions (th):', getTranslation('th', 'errorLoadingPositions'));
console.log('positionNotFound (th):', getTranslation('th', 'positionNotFound'));

console.log('\n=== Testing English Translations ===');
console.log('positionManagement (en):', getTranslation('en', 'positionManagement'));
console.log('createNewPosition (en):', getTranslation('en', 'createNewPosition'));
console.log('errorLoadingPositions (en):', getTranslation('en', 'errorLoadingPositions'));
console.log('positionNotFound (en):', getTranslation('en', 'positionNotFound'));

console.log('\n=== Testing Missing Key ===');
console.log('nonExistentKey (th):', getTranslation('th', 'nonExistentKey'));
