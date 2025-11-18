/**
 * Detailed Course Flow Verification
 * อ่านและวิเคราะห์ไฟล์จริงเพื่อหาความไม่สอดคล้อง
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('DETAILED COURSE FLOW VERIFICATION');
console.log('='.repeat(80));

const issues = [];
const warnings = [];
const successes = [];

function addIssue(category, description, location, severity = 'error') {
    issues.push({ category, description, location, severity });
}

function addWarning(category, description, location) {
    warnings.push({ category, description, location });
}

function addSuccess(description) {
    successes.push(description);
}

// Read files
const createEjsPath = path.join(__dirname, 'views/courses/create.ejs');
const wizardJsPath = path.join(__dirname, 'public/js/course-wizard.js');
const courseModelPath = path.join(__dirname, 'models/Course.js');
const detailEjsPath = path.join(__dirname, 'views/courses/detail.ejs');

console.log('\n📂 Reading files...\n');

let createEjs, wizardJs, courseModel, detailEjs;

try {
    createEjs = fs.readFileSync(createEjsPath, 'utf8');
    console.log('✅ create.ejs loaded');
} catch (e) {
    addIssue('File Read', 'Cannot read create.ejs', createEjsPath, 'critical');
}

try {
    wizardJs = fs.readFileSync(wizardJsPath, 'utf8');
    console.log('✅ course-wizard.js loaded');
} catch (e) {
    addIssue('File Read', 'Cannot read course-wizard.js', wizardJsPath, 'critical');
}

try {
    courseModel = fs.readFileSync(courseModelPath, 'utf8');
    console.log('✅ Course.js loaded');
} catch (e) {
    addIssue('File Read', 'Cannot read Course.js', courseModelPath, 'critical');
}

try {
    detailEjs = fs.readFileSync(detailEjsPath, 'utf8');
    console.log('✅ detail.ejs loaded');
} catch (e) {
    addIssue('File Read', 'Cannot read detail.ejs', detailEjsPath, 'critical');
}

console.log('\n' + '='.repeat(80));
console.log('VERIFICATION CHECKS');
console.log('='.repeat(80));

// CHECK 1: Form fields exist in create.ejs
console.log('\n1️⃣  CHECKING FORM FIELDS (create.ejs)...\n');

const requiredFormFields = {
    'course_name': 'name="course_name"',
    'course_code': 'name="course_code"',
    'category_id': 'name="category_id"',
    'difficulty_level': 'name="difficulty_level"',
    'course_type': 'name="course_type"',
    'language': 'name="language"',
    'description': 'name="description"',
    'objectives[]': 'name="objectives[]"',
    'target_positions[]': 'name="target_positions[]"',
    'target_departments[]': 'name="target_departments[]"',
    'course_image': 'name="course_image"',
    'lesson_titles[]': 'name="lesson_titles[]"',
    'lesson_durations[]': 'name="lesson_durations[]"',
    'lesson_video_urls[]': 'name="lesson_video_urls[]"'
};

Object.entries(requiredFormFields).forEach(([fieldName, pattern]) => {
    if (createEjs && createEjs.includes(pattern)) {
        addSuccess(`✅ Form field found: ${fieldName}`);
        console.log(`   ✅ ${fieldName}`);
    } else {
        addIssue('Form Field Missing', `Field "${fieldName}" not found in form`, 'create.ejs');
        console.log(`   ❌ ${fieldName} - NOT FOUND`);
    }
});

// CHECK 2: Wizard collects all fields
console.log('\n2️⃣  CHECKING WIZARD DATA COLLECTION (course-wizard.js)...\n');

const wizardChecks = {
    'course_name collection': /data\.course_name\s*=|getElementById\(['"]course_name['"]\)/,
    'course_code collection': /data\.course_code\s*=|getElementById\(['"]course_code['"]\)/,
    'course_type collection': /data\.course_type\s*=|getElementById\(['"]course_type['"]\)/,
    'language collection': /data\.language\s*=|getElementById\(['"]language['"]\)/,
    'learning_objectives collection': /objectives\s*\[/,
    'target_positions collection': /target_positions|selectedOptions/,
    'target_departments collection': /target_departments|selectedOptions/,
    'lesson video_url collection': /lesson_video_urls|video_url/,
    'max_students mapping': /max_students\s*=\s*.*max_enrollments/,
    'certificate_validity mapping': /certValidityMap|certificate_validity/
};

Object.entries(wizardChecks).forEach(([checkName, pattern]) => {
    if (wizardJs && pattern.test(wizardJs)) {
        addSuccess(`✅ Wizard: ${checkName}`);
        console.log(`   ✅ ${checkName}`);
    } else {
        addWarning('Wizard Collection', `May be missing: ${checkName}`, 'course-wizard.js');
        console.log(`   ⚠️  ${checkName} - CHECK MANUALLY`);
    }
});

// CHECK 3: Model accepts and processes fields
console.log('\n3️⃣  CHECKING MODEL PROCESSING (Course.js)...\n');

const modelChecks = {
    'accepts course_code': /courseData\.course_code/,
    'accepts course_type': /courseData\.course_type/,
    'accepts language': /courseData\.language/,
    'accepts passing_score': /courseData\.passing_score/,
    'accepts max_attempts': /courseData\.max_attempts/,
    'accepts certificate_validity': /courseData\.certificate_validity/,
    'accepts max_students': /courseData\.max_students/,
    'accepts learning_objectives': /courseData\.learning_objectives/,
    'processes target_positions': /target_positions/,
    'processes target_departments': /target_departments/,
    'creates target_audience JSON': /target_audience.*positions.*departments/,
    'inserts lessons with video_url': /lesson\.video_url|file_path/,
    'maps video_url in findById': /video_url.*file_path|file_path.*video_url/
};

Object.entries(modelChecks).forEach(([checkName, pattern]) => {
    if (courseModel && pattern.test(courseModel)) {
        addSuccess(`✅ Model: ${checkName}`);
        console.log(`   ✅ ${checkName}`);
    } else {
        addIssue('Model Processing', `Missing: ${checkName}`, 'Course.js');
        console.log(`   ❌ ${checkName} - NOT FOUND`);
    }
});

// CHECK 4: Detail page displays all fields
console.log('\n4️⃣  CHECKING DETAIL PAGE DISPLAY (detail.ejs)...\n');

const detailChecks = {
    'displays course_code': /course\.course_code|course_code/,
    'displays course_type': /course\.course_type|course_type/,
    'displays language': /course\.language/,
    'displays passing_score': /course\.passing_score|passing_score/,
    'displays max_attempts': /course\.max_attempts|max_attempts/,
    'displays certificate_validity': /certificate_validity/,
    'displays max_students': /max_students/,
    'displays learning_objectives': /learning_objectives/,
    'displays target_audience': /target_audience|target-audience/,
    'maps positions to names': /positionsMapping/,
    'maps departments to names': /departmentsMapping/,
    'displays video_url with link': /video_url.*href|ดูวิดีโอ/,
    'translates language': /language.*ไทย|อังกฤษ/,
    'translates course_type': /course_type.*บังคับ|เลือก/
};

Object.entries(detailChecks).forEach(([checkName, pattern]) => {
    if (detailEjs && pattern.test(detailEjs)) {
        addSuccess(`✅ Detail: ${checkName}`);
        console.log(`   ✅ ${checkName}`);
    } else {
        addWarning('Detail Display', `May be missing: ${checkName}`, 'detail.ejs');
        console.log(`   ⚠️  ${checkName} - CHECK MANUALLY`);
    }
});

// RESULTS
console.log('\n' + '='.repeat(80));
console.log('VERIFICATION RESULTS');
console.log('='.repeat(80));

console.log(`\n✅ Successes: ${successes.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log(`❌ Issues: ${issues.length}`);

if (issues.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('❌ ISSUES FOUND');
    console.log('='.repeat(80));
    issues.forEach((issue, i) => {
        console.log(`\n${i + 1}. [${issue.severity.toUpperCase()}] ${issue.category}`);
        console.log(`   Description: ${issue.description}`);
        console.log(`   Location: ${issue.location}`);
    });
}

if (warnings.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  WARNINGS (Manual Verification Needed)');
    console.log('='.repeat(80));
    warnings.forEach((warning, i) => {
        console.log(`\n${i + 1}. ${warning.category}`);
        console.log(`   Description: ${warning.description}`);
        console.log(`   Location: ${warning.location}`);
    });
}

console.log('\n' + '='.repeat(80));
console.log('FINAL VERDICT');
console.log('='.repeat(80));

if (issues.length === 0 && warnings.length === 0) {
    console.log('\n🎉 PERFECT! All checks passed!');
    console.log('✅ Create form and detail page are fully synchronized');
    console.log('✅ All data flows correctly through the system');
} else if (issues.length === 0) {
    console.log('\n✅ GOOD! No critical issues found');
    console.log(`⚠️  ${warnings.length} warnings need manual verification`);
    console.log('📝 Review the warnings above to ensure everything works as expected');
} else {
    console.log('\n❌ ISSUES DETECTED!');
    console.log(`❌ ${issues.length} issues need to be fixed`);
    console.log(`⚠️  ${warnings.length} warnings need manual verification`);
    console.log('\n📝 Fix the issues above to ensure proper data flow');
}

console.log('\n' + '='.repeat(80));

process.exit(issues.length > 0 ? 1 : 0);
