/**
 * 🧪 สคริปต์ทดสอบระบบสร้างคอร์สแบบละเอียดทุกเงื่อนไข
 *
 * วิธีใช้:
 * 1. เปิดหน้า http://localhost:3000/courses/create
 * 2. กด F12 เปิด DevTools
 * 3. ไปที่ Console tab
 * 4. Copy script นี้ทั้งหมดแล้ว Paste ใน Console
 * 5. Enter เพื่อรัน
 */

console.clear();
console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     🧪 ทดสอบระบบสร้างคอร์สแบบละเอียดทุกเงื่อนไข       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

function testResult(id, name, status, detail = '', critical = false) {
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'orange';

    console.log(`%c${icon} [${id}] ${name}`, `color: ${color}; font-weight: bold`);
    if (detail) console.log(`  → ${detail}`);

    results.tests.push({ id, name, status, detail, critical });
    if (status === 'pass') results.passed++;
    else if (status === 'fail') results.failed++;
    else results.warnings++;
}

function section(title) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${title}`);
    console.log('='.repeat(60) + '\n');
}

// ============================================================================
// SECTION 1: ตรวจสอบ DOM Elements
// ============================================================================
section('1. ตรวจสอบ DOM Elements พื้นฐาน');

// Test 1.1: Form exists
const form = document.getElementById('create-course-form');
testResult('T1.1', 'Form Element',
    form ? 'pass' : 'fail',
    form ? 'Form พบแล้ว' : 'ไม่พบ form element!',
    true);

// Test 1.2: Course name field
const courseNameField = document.getElementById('course_name');
testResult('T1.2', 'Course Name Field',
    courseNameField ? 'pass' : 'fail',
    courseNameField ? `พบ field: name="${courseNameField.getAttribute('name')}"` : 'ไม่พบ course_name field!',
    true);

// Test 1.3: Category field
const categoryField = document.getElementById('category_id');
testResult('T1.3', 'Category Field',
    categoryField ? 'pass' : 'fail',
    categoryField ? `พบ field, มี ${categoryField.options.length} options` : 'ไม่พบ category field!');

// Test 1.4: Description field
const descField = document.getElementById('description');
testResult('T1.4', 'Description Field',
    descField ? 'pass' : 'fail',
    descField ? 'พบ description field' : 'ไม่พบ description field!');

// Test 1.5: Learning objectives
const objectivesFields = document.querySelectorAll('input[name="objectives[]"]');
testResult('T1.5', 'Learning Objectives Fields',
    objectivesFields.length >= 3 ? 'pass' : 'warn',
    `พบ ${objectivesFields.length} fields (ควรมีอย่างน้อย 3)`);

// Test 1.6: Duration fields
const durationHours = document.getElementById('duration_hours');
const durationMinutes = document.getElementById('duration_minutes');
testResult('T1.6', 'Duration Fields',
    durationHours && durationMinutes ? 'pass' : 'fail',
    durationHours && durationMinutes ? 'พบ hours และ minutes fields' : 'ไม่พบ duration fields!');

// Test 1.7: Target departments (multi-select)
const targetDepts = document.getElementById('target_departments');
testResult('T1.7', 'Target Departments Field',
    targetDepts ? 'pass' : 'fail',
    targetDepts ? `Multiple: ${targetDepts.multiple}, Options: ${targetDepts.options.length}` : 'ไม่พบ field!');

// Test 1.8: Target positions (multi-select)
const targetPos = document.getElementById('target_positions');
testResult('T1.8', 'Target Positions Field',
    targetPos ? 'pass' : 'fail',
    targetPos ? `Multiple: ${targetPos.multiple}, Options: ${targetPos.options.length}` : 'ไม่พบ field!');

// Test 1.9: Test type select
const testTypeField = document.getElementById('new_test_type');
testResult('T1.9', 'Test Type Field',
    testTypeField ? 'pass' : 'fail',
    testTypeField ? `พบ field, มี ${testTypeField.options.length} options` : 'ไม่พบ test type field!');

// Test 1.10: Date pickers
const availableFrom = document.getElementById('new_available_from');
const availableUntil = document.getElementById('new_available_until');
testResult('T1.10', 'Date Picker Fields',
    availableFrom && availableUntil ? 'pass' : 'fail',
    availableFrom && availableUntil ? 'พบ available_from และ available_until' : 'ไม่พบ date fields!');

// ============================================================================
// SECTION 2: ตรวจสอบ JavaScript Functions
// ============================================================================
section('2. ตรวจสอบ JavaScript Functions');

// Test 2.1: collectFormData function
testResult('T2.1', 'collectFormData Function',
    typeof collectFormData === 'function' ? 'pass' : 'fail',
    typeof collectFormData === 'function' ? 'Function พร้อมใช้งาน' : 'ไม่พบ function!',
    true);

// Test 2.2: validateStep function
testResult('T2.2', 'validateStep Function',
    typeof validateStep === 'function' ? 'pass' : 'fail',
    typeof validateStep === 'function' ? 'Function พร้อมใช้งาน' : 'ไม่พบ function!');

// Test 2.3: submitCourse function
testResult('T2.3', 'submitCourse Function',
    typeof submitCourse === 'function' ? 'pass' : 'fail',
    typeof submitCourse === 'function' ? 'Function พร้อมใช้งาน' : 'ไม่พบ function!',
    true);

// Test 2.4: convertThaiDateToISO function
testResult('T2.4', 'convertThaiDateToISO Function',
    typeof convertThaiDateToISO === 'function' ? 'pass' : 'fail',
    typeof convertThaiDateToISO === 'function' ? 'Function พร้อมใช้งาน' : 'ไม่พบ function!');

// Test 2.5: handleTestTypeChange function
testResult('T2.5', 'handleTestTypeChange Function',
    typeof handleTestTypeChange === 'function' ? 'pass' : 'fail',
    typeof handleTestTypeChange === 'function' ? 'Function พร้อมใช้งาน' : 'ไม่พบ function!');

// ============================================================================
// SECTION 3: ตรวจสอบ Translations
// ============================================================================
section('3. ตรวจสอบระบบแปลภาษา');

// Test 3.1: window.testTypeTranslations
testResult('T3.1', 'Test Type Translations',
    window.testTypeTranslations ? 'pass' : 'fail',
    window.testTypeTranslations ? 'Translations โหลดแล้ว' : 'ไม่พบ translations!',
    true);

if (window.testTypeTranslations) {
    // Test 3.2: testTypes object
    testResult('T3.2', 'testTypes Object',
        window.testTypeTranslations.testTypes ? 'pass' : 'fail',
        window.testTypeTranslations.testTypes ?
            `มี ${Object.keys(window.testTypeTranslations.testTypes).length} test types` :
            'ไม่พบ testTypes!');

    // Test 3.3: testTypeGroups object
    testResult('T3.3', 'testTypeGroups Object',
        window.testTypeTranslations.testTypeGroups ? 'pass' : 'fail',
        window.testTypeTranslations.testTypeGroups ?
            `มี ${Object.keys(window.testTypeTranslations.testTypeGroups).length} groups` :
            'ไม่พบ testTypeGroups!');
}

// ============================================================================
// SECTION 4: ตรวจสอบ Flatpickr
// ============================================================================
section('4. ตรวจสอบ Flatpickr Date Pickers');

// Test 4.1: Flatpickr library
testResult('T4.1', 'Flatpickr Library',
    typeof flatpickr !== 'undefined' ? 'pass' : 'fail',
    typeof flatpickr !== 'undefined' ? 'Library โหลดแล้ว' : 'ไม่พบ Flatpickr!',
    true);

// Test 4.2: Flatpickr instances
if (availableFrom) {
    testResult('T4.2', 'Flatpickr Instance (available_from)',
        availableFrom._flatpickr ? 'pass' : 'fail',
        availableFrom._flatpickr ? 'Flatpickr ถูก initialize แล้ว' : 'ยังไม่ initialize!');
}

if (availableUntil) {
    testResult('T4.3', 'Flatpickr Instance (available_until)',
        availableUntil._flatpickr ? 'pass' : 'fail',
        availableUntil._flatpickr ? 'Flatpickr ถูก initialize แล้ว' : 'ยังไม่ initialize!');
}

// ============================================================================
// SECTION 5: ทดสอบ Data Collection (Simulation)
// ============================================================================
section('5. ทดสอบ Data Collection');

if (typeof collectFormData === 'function' && form) {
    try {
        // Fill in test data
        console.log('กำลังกรอกข้อมูลทดสอบ...');

        if (courseNameField) courseNameField.value = 'Test Course for Validation';
        if (categoryField && categoryField.options.length > 1) categoryField.selectedIndex = 1;
        const difficultyField = document.getElementById('difficulty_level');
        if (difficultyField) difficultyField.value = 'beginner';
        const courseTypeField = document.getElementById('course_type');
        if (courseTypeField) courseTypeField.value = 'mandatory';
        const languageField = document.getElementById('language');
        if (languageField) languageField.value = 'th';

        if (descField) descField.innerHTML = 'นี่คือคำอธิบายทดสอบที่มีความยาวอย่างน้อย 50 ตัวอักษรเพื่อผ่าน validation';

        objectivesFields.forEach((field, idx) => {
            field.value = `วัตถุประสงค์ข้อที่ ${idx + 1} สำหรับการทดสอบ`;
        });

        if (durationHours) durationHours.value = '2';
        if (durationMinutes) durationMinutes.value = '30';

        // Collect data
        const testData = collectFormData();

        // Test 5.1: Data collected
        testResult('T5.1', 'Data Collection',
            testData ? 'pass' : 'fail',
            testData ? 'ข้อมูลถูกรวบรวมแล้ว' : 'เกิดข้อผิดพลาดในการรวบรวมข้อมูล!',
            true);

        if (testData) {
            // Test 5.2: course_name collected
            testResult('T5.2', 'course_name Field Value',
                testData.course_name ? 'pass' : 'fail',
                testData.course_name ? `ค่า: "${testData.course_name}"` : 'ไม่พบค่า!',
                true);

            // Test 5.3: title mapped from course_name
            testResult('T5.3', 'title Field Mapping (CRITICAL)',
                testData.title ? 'pass' : 'fail',
                testData.title ? `✅ title: "${testData.title}"` : '❌ title ไม่ได้ถูก map จาก course_name!',
                true);

            // Test 5.4: duration calculation
            const expectedDuration = 2 + (30/60);
            testResult('T5.4', 'Duration Calculation',
                testData.duration_hours === expectedDuration ? 'pass' : 'fail',
                `Expected: ${expectedDuration}, Actual: ${testData.duration_hours}`);

            // Test 5.5: target_departments (array)
            testResult('T5.5', 'target_departments Type',
                Array.isArray(testData.target_departments) ? 'pass' : 'fail',
                Array.isArray(testData.target_departments) ?
                    `Array with ${testData.target_departments.length} items` :
                    `Type: ${typeof testData.target_departments}`);

            // Test 5.6: target_positions (array)
            testResult('T5.6', 'target_positions Type',
                Array.isArray(testData.target_positions) ? 'pass' : 'fail',
                Array.isArray(testData.target_positions) ?
                    `Array with ${testData.target_positions.length} items` :
                    `Type: ${typeof testData.target_positions}`);

            // Test 5.7: learning_objectives
            testResult('T5.7', 'learning_objectives',
                Array.isArray(testData.learning_objectives) && testData.learning_objectives.length >= 3 ? 'pass' : 'warn',
                Array.isArray(testData.learning_objectives) ?
                    `Array with ${testData.learning_objectives.length} items` :
                    'Not an array or less than 3 items');

            // Test 5.8: max_students (null handling)
            testResult('T5.8', 'max_students (null handling)',
                testData.max_students === null || typeof testData.max_students === 'number' ? 'pass' : 'fail',
                `Value: ${testData.max_students}, Type: ${typeof testData.max_students}`);

            // Print collected data
            console.log('\n📦 ข้อมูลที่รวบรวมได้:');
            console.log('─'.repeat(60));
            console.log('title:', testData.title);
            console.log('course_name:', testData.course_name);
            console.log('description:', testData.description?.substring(0, 50) + '...');
            console.log('duration_hours:', testData.duration_hours);
            console.log('learning_objectives:', testData.learning_objectives);
            console.log('target_departments:', testData.target_departments);
            console.log('target_positions:', testData.target_positions);
            console.log('max_students:', testData.max_students);
            console.log('category_id:', testData.category_id);
            console.log('difficulty_level:', testData.difficulty_level);
            console.log('course_type:', testData.course_type);
            console.log('language:', testData.language);
        }

    } catch (error) {
        testResult('T5.1', 'Data Collection Error',
            'fail',
            `Error: ${error.message}`,
            true);
        console.error('Full error:', error);
    }
}

// ============================================================================
// SECTION 6: ตรวจสอบ Validation Rules
// ============================================================================
section('6. ตรวจสอบ Validation Rules');

// Test 6.1: validateStep function exists
if (typeof validateStep === 'function') {
    testResult('T6.1', 'Client-side Validation',
        'pass',
        'validateStep function พร้อมใช้งาน');
} else {
    testResult('T6.1', 'Client-side Validation',
        'fail',
        'ไม่พบ validateStep function!');
}

// ============================================================================
// SECTION 7: ตรวจสอบ Lesson Quiz Feature
// ============================================================================
section('7. ตรวจสอบ Lesson Quiz Feature');

// Test 7.1: Lesson quiz checkbox
const lessonQuizCheckboxes = document.querySelectorAll('input[name="lesson_has_quiz[]"]');
testResult('T7.1', 'Lesson Quiz Checkboxes',
    lessonQuizCheckboxes.length > 0 ? 'pass' : 'warn',
    `พบ ${lessonQuizCheckboxes.length} checkboxes`);

// Test 7.2: toggleLessonQuiz function
testResult('T7.2', 'toggleLessonQuiz Function',
    typeof toggleLessonQuiz === 'function' ? 'pass' : 'warn',
    typeof toggleLessonQuiz === 'function' ? 'Function พร้อมใช้งาน' : 'ไม่พบ function!');

// ============================================================================
// SUMMARY
// ============================================================================
section('📊 สรุปผลการทดสอบ');

const totalTests = results.tests.length;
const criticalFailed = results.tests.filter(t => t.critical && t.status === 'fail').length;

console.log(`%cทั้งหมด: ${totalTests} tests`, 'font-weight: bold');
console.log(`%c✅ ผ่าน: ${results.passed}`, 'color: green; font-weight: bold');
console.log(`%c❌ ไม่ผ่าน: ${results.failed}`, 'color: red; font-weight: bold');
console.log(`%c⚠️ คำเตือน: ${results.warnings}`, 'color: orange; font-weight: bold');

if (criticalFailed > 0) {
    console.log(`\n%c🚨 พบปัญหาร้ายแรง ${criticalFailed} ข้อ!`, 'color: red; font-size: 16px; font-weight: bold');
    console.log('ปัญหาเหล่านี้ต้องแก้ไขก่อนจึงจะสามารถสร้างคอร์สได้:');
    results.tests.filter(t => t.critical && t.status === 'fail').forEach(t => {
        console.log(`  ❌ [${t.id}] ${t.name}`);
        if (t.detail) console.log(`     → ${t.detail}`);
    });
} else if (results.failed > 0) {
    console.log(`\n%c⚠️ พบปัญหา ${results.failed} ข้อ (ไม่ร้ายแรง)`, 'color: orange; font-size: 14px; font-weight: bold');
    results.tests.filter(t => t.status === 'fail').forEach(t => {
        console.log(`  ❌ [${t.id}] ${t.name}: ${t.detail}`);
    });
} else if (results.warnings > 0) {
    console.log(`\n%c⚠️ มีคำเตือน ${results.warnings} ข้อ`, 'color: orange; font-size: 14px; font-weight: bold');
} else {
    console.log(`\n%c🎉 ผ่านทุกการทดสอบ! ระบบพร้อมใช้งาน`, 'color: green; font-size: 16px; font-weight: bold');
}

console.log('\n' + '='.repeat(60));
console.log('✅ การทดสอบเสร็จสิ้น');
console.log('='.repeat(60));

// Export results for further inspection
window.testResults = results;
console.log('\n💡 Tip: ดูผลการทดสอบทั้งหมดได้ที่ window.testResults');
