// Browser Console Test Script for Edit Page
// Copy and paste this into the browser console on the edit page

console.log('🧪 Testing Edit Page Field Population\n');
console.log('='.repeat(80));

const tests = [];

// Helper function to test field
function testField(fieldId, fieldName, expectedType = 'any') {
    const element = document.getElementById(fieldId);
    if (!element) {
        tests.push({ name: fieldName, status: '❌ NOT FOUND', value: 'Element not found' });
        return;
    }

    let value = element.value || element.textContent || '';
    let isEmpty = !value || value.trim() === '';

    if (element.type === 'checkbox') {
        value = element.checked ? 'checked' : 'unchecked';
        isEmpty = false;
    }

    const status = isEmpty ? '⚠️  EMPTY' : '✅ OK';
    tests.push({ name: fieldName, status, value: value.substring(0, 50) });
}

// Test all fields
console.log('\n📋 Basic Information:');
console.log('-'.repeat(80));
testField('course_id', 'Course ID');
testField('course_name', 'Course Name');
testField('course_code', 'Course Code');
testField('category_id', 'Category');
testField('difficulty_level', 'Difficulty Level');
testField('course_type', 'Course Type');
testField('language', 'Language');
testField('duration_hours', 'Duration Hours');
testField('duration_minutes', 'Duration Minutes');

console.log('\n📝 Course Details:');
console.log('-'.repeat(80));
testField('description', 'Description');
testField('prerequisite_knowledge', 'Prerequisite Knowledge');
testField('learning_objectives', 'Learning Objectives (hidden)');

// Check objectives container
const objectivesContainer = document.getElementById('objectives-container');
const objectiveInputs = objectivesContainer ? objectivesContainer.querySelectorAll('.objective-input') : [];
console.log(`\n  Learning Objectives Count: ${objectiveInputs.length}`);
objectiveInputs.forEach((input, i) => {
    console.log(`    ${i + 1}. "${input.value}"`);
});

console.log('\n👥 Target Audience:');
console.log('-'.repeat(80));
const targetPositions = document.getElementById('target_positions');
const targetDepartments = document.getElementById('target_departments');

if (targetPositions) {
    const selectedPositions = Array.from(targetPositions.selectedOptions).map(o => o.textContent);
    tests.push({
        name: 'Target Positions',
        status: selectedPositions.length > 0 ? '✅ OK' : '⚠️  EMPTY',
        value: selectedPositions.join(', ') || 'None selected'
    });
    console.log(`  Selected Positions: ${selectedPositions.join(', ') || 'None'}`);
}

if (targetDepartments) {
    const selectedDepts = Array.from(targetDepartments.selectedOptions).map(o => o.textContent);
    tests.push({
        name: 'Target Departments',
        status: selectedDepts.length > 0 ? '✅ OK' : '⚠️  EMPTY',
        value: selectedDepts.join(', ') || 'None selected'
    });
    console.log(`  Selected Departments: ${selectedDepts.join(', ') || 'None'}`);
}

console.log('\n🖼️ Image:');
console.log('-'.repeat(80));
const imagePreview = document.getElementById('course-image-preview');
if (imagePreview) {
    const imageSrc = imagePreview.src;
    tests.push({
        name: 'Course Image',
        status: imageSrc.includes('default-avatar') ? '⚠️  DEFAULT' : '✅ OK',
        value: imageSrc.split('/').pop()
    });
    console.log(`  Image: ${imageSrc.split('/').pop()}`);
}

console.log('\n⚙️ Settings:');
console.log('-'.repeat(80));
testField('max_enrollments', 'Max Enrollments');
testField('passing_score', 'Passing Score');
testField('max_attempts', 'Max Attempts');
testField('certificate_validity', 'Certificate Validity');
testField('enrollment_start', 'Enrollment Start');
testField('enrollment_end', 'Enrollment End');

console.log('\n✅ Checkboxes:');
console.log('-'.repeat(80));
testField('is_mandatory', 'Is Mandatory');
testField('allow_certificate', 'Allow Certificate');
testField('is_public', 'Is Public');

console.log('\n👨‍🏫 Instructor:');
console.log('-'.repeat(80));
testField('instructor_id', 'Instructor ID (hidden)');
testField('instructor_name_display', 'Instructor Name (readonly)');

console.log('\n📊 Status:');
console.log('-'.repeat(80));
testField('status', 'Status');

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 SUMMARY:');
console.log('='.repeat(80));

const okCount = tests.filter(t => t.status === '✅ OK').length;
const emptyCount = tests.filter(t => t.status === '⚠️  EMPTY').length;
const errorCount = tests.filter(t => t.status.includes('❌')).length;

console.log(`✅ OK: ${okCount} fields`);
console.log(`⚠️  EMPTY: ${emptyCount} fields`);
console.log(`❌ ERROR: ${errorCount} fields`);

// Detailed results
console.log('\n📋 Detailed Results:');
console.log('='.repeat(80));
tests.forEach(test => {
    console.log(`${test.status} ${test.name}: ${test.value}`);
});

// Show warnings/errors first
const issues = tests.filter(t => t.status !== '✅ OK');
if (issues.length > 0) {
    console.log('\n⚠️  Issues Found:');
    console.log('='.repeat(80));
    issues.forEach(issue => {
        console.log(`${issue.status} ${issue.name}: ${issue.value}`);
    });
}

console.log('\n✅ Test Complete');
