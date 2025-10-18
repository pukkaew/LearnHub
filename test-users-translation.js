const { getTranslation } = require('./utils/languages');

console.log('=== Testing Users Management English Translations ===\n');

const testKeys = [
    'userManagementSystem',
    'totalUsers',
    'activeUsers',
    'pendingUsers',
    'exportData',
    'addNewUser',
    'searchUsers',
    'statusActive',
    'statusInactive',
    'roleAdmin',
    'roleHR',
    'roleEmployee',
    'userAddedSuccess',
    'userEditedSuccess',
    'passwordMismatch',
    'selectUserType',
    'employeeWithAccess',
    'applicantNoAccess'
];

testKeys.forEach(key => {
    const en = getTranslation('en', key);
    const th = getTranslation('th', key);
    console.log(`${key}:`);
    console.log(`  EN: ${en}`);
    console.log(`  TH: ${th}`);
    console.log('');
});

console.log('=== Testing Dynamic Message Interpolation Keys ===\n');
console.log('confirmBulkAction (EN):', getTranslation('en', 'confirmBulkAction'));
console.log('bulkActionSuccess (EN):', getTranslation('en', 'bulkActionSuccess'));
