/**
 * Complete Course Flow Analysis
 * ตรวจสอบความสอดคล้องระหว่าง Create Form, Course Wizard, Backend Model, และ Detail Page
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('COMPLETE COURSE FLOW ANALYSIS');
console.log('='.repeat(80));

// Define all expected fields across the flow
const fieldDefinitions = {
    // Basic Information (Step 1)
    course_name: {
        form: 'create.ejs',
        formField: 'course_name',
        wizardCollect: 'course_wizard.js',
        modelField: 'course_name or title',
        detailDisplay: 'detail.ejs (title)',
        required: true,
        type: 'text'
    },
    course_code: {
        form: 'create.ejs',
        formField: 'course_code',
        wizardCollect: 'course_wizard.js',
        modelField: 'course_code',
        detailDisplay: 'detail.ejs (sidebar)',
        required: true,
        type: 'text'
    },
    category_id: {
        form: 'create.ejs',
        formField: 'category_id',
        wizardCollect: 'course_wizard.js',
        modelField: 'category_id',
        detailDisplay: 'detail.ejs (category)',
        required: true,
        type: 'select'
    },
    difficulty_level: {
        form: 'create.ejs',
        formField: 'difficulty_level',
        wizardCollect: 'course_wizard.js',
        modelField: 'difficulty_level',
        detailDisplay: 'detail.ejs (sidebar)',
        required: true,
        type: 'select'
    },
    course_type: {
        form: 'create.ejs',
        formField: 'course_type',
        wizardCollect: 'course_wizard.js',
        modelField: 'course_type',
        detailDisplay: 'detail.ejs (sidebar, translated)',
        required: true,
        type: 'select',
        values: ['mandatory', 'optional', 'recommended']
    },
    language: {
        form: 'create.ejs',
        formField: 'language',
        wizardCollect: 'course_wizard.js',
        modelField: 'language',
        detailDisplay: 'detail.ejs (sidebar, translated)',
        required: true,
        type: 'select',
        values: ['th', 'en', 'both']
    },

    // Step 2: Course Details
    description: {
        form: 'create.ejs',
        formField: 'description',
        wizardCollect: 'course_wizard.js',
        modelField: 'description',
        detailDisplay: 'detail.ejs (overview tab)',
        required: true,
        type: 'textarea',
        minLength: 50
    },
    learning_objectives: {
        form: 'create.ejs',
        formField: 'objectives[]',
        wizardCollect: 'course_wizard.js (array)',
        modelField: 'learning_objectives (JSON)',
        detailDisplay: 'detail.ejs (overview tab, list)',
        required: true,
        type: 'array',
        minItems: 3
    },
    target_positions: {
        form: 'create.ejs',
        formField: 'target_positions[]',
        wizardCollect: 'course_wizard.js (array)',
        modelField: 'target_audience.positions (JSON)',
        detailDisplay: 'detail.ejs (overview tab, mapped from DB)',
        required: true,
        type: 'multiselect',
        minItems: 1
    },
    target_departments: {
        form: 'create.ejs',
        formField: 'target_departments[]',
        wizardCollect: 'course_wizard.js (array)',
        modelField: 'target_audience.departments (JSON)',
        detailDisplay: 'detail.ejs (overview tab, mapped from DB)',
        required: true,
        type: 'multiselect',
        minItems: 1
    },
    prerequisite_knowledge: {
        form: 'create.ejs',
        formField: 'prerequisite_knowledge',
        wizardCollect: 'course_wizard.js',
        modelField: 'prerequisite_knowledge',
        detailDisplay: 'detail.ejs (overview tab)',
        required: false,
        type: 'textarea'
    },

    // Step 3: Content & Media
    course_image: {
        form: 'create.ejs',
        formField: 'course_image',
        wizardCollect: 'course_wizard.js (file upload)',
        modelField: 'thumbnail',
        detailDisplay: 'detail.ejs (header image)',
        required: true,
        type: 'file'
    },
    lessons: {
        form: 'create.ejs',
        formField: 'lesson_titles[], lesson_durations[], lesson_descriptions[], lesson_video_urls[]',
        wizardCollect: 'course_wizard.js (array of objects)',
        modelField: 'lessons (inserted to course_materials)',
        detailDisplay: 'detail.ejs (curriculum tab)',
        required: true,
        type: 'array',
        minItems: 1,
        structure: {
            title: 'required',
            duration: 'required',
            description: 'optional',
            video_url: 'optional'
        }
    },

    // Step 4: Assessment
    passing_score: {
        form: 'create.ejs',
        formField: 'passing_score or new_passing_score',
        wizardCollect: 'course_wizard.js',
        modelField: 'passing_score',
        detailDisplay: 'detail.ejs (sidebar)',
        required: false,
        type: 'number',
        default: 70
    },
    max_attempts: {
        form: 'create.ejs',
        formField: 'max_attempts or new_max_attempts',
        wizardCollect: 'course_wizard.js',
        modelField: 'max_attempts',
        detailDisplay: 'detail.ejs (sidebar)',
        required: false,
        type: 'number',
        default: 3
    },
    certificate_validity: {
        form: 'create.ejs',
        formField: 'certificate_validity',
        wizardCollect: 'course_wizard.js (mapped from dropdown)',
        modelField: 'certificate_validity (as string)',
        detailDisplay: 'detail.ejs (sidebar, days)',
        required: false,
        type: 'select',
        values: ['unlimited', '1year', '2years', '3years'],
        mapping: {
            'unlimited': null,
            '1year': '365',
            '2years': '730',
            '3years': '1095'
        }
    },
    max_students: {
        form: 'create.ejs',
        formField: 'max_enrollments or max_students',
        wizardCollect: 'course_wizard.js',
        modelField: 'max_students',
        detailDisplay: 'detail.ejs (sidebar)',
        required: false,
        type: 'number'
    }
};

console.log('\n📋 FIELD MAPPING ANALYSIS');
console.log('='.repeat(80));

console.log('\nTotal Fields Tracked:', Object.keys(fieldDefinitions).length);

// Group by step
const stepGroups = {
    'Step 1: Basic Info': ['course_name', 'course_code', 'category_id', 'difficulty_level', 'course_type', 'language'],
    'Step 2: Course Details': ['description', 'learning_objectives', 'target_positions', 'target_departments', 'prerequisite_knowledge'],
    'Step 3: Content & Media': ['course_image', 'lessons'],
    'Step 4: Assessment': ['passing_score', 'max_attempts', 'certificate_validity', 'max_students']
};

Object.entries(stepGroups).forEach(([stepName, fields]) => {
    console.log(`\n${stepName}:`);
    fields.forEach(fieldName => {
        const field = fieldDefinitions[fieldName];
        const required = field.required ? '✓ Required' : '○ Optional';
        console.log(`  ${required} ${fieldName}`);
        console.log(`    Form: ${field.formField}`);
        console.log(`    Model: ${field.modelField}`);
        console.log(`    Detail: ${field.detailDisplay}`);
        if (field.type === 'array' && field.minItems) {
            console.log(`    Min Items: ${field.minItems}`);
        }
        if (field.default !== undefined) {
            console.log(`    Default: ${field.default}`);
        }
    });
});

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS COMPLETE - Now checking actual files...');
console.log('='.repeat(80));

// Files to check
const filesToCheck = [
    { path: 'views/courses/create.ejs', type: 'Form Template' },
    { path: 'public/js/course-wizard.js', type: 'Frontend Logic' },
    { path: 'models/Course.js', type: 'Backend Model' },
    { path: 'views/courses/detail.ejs', type: 'Detail Template' }
];

console.log('\n📁 FILES TO ANALYZE:\n');
filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, file.path);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? '✅' : '❌'} ${file.type}: ${file.path}`);
});

console.log('\n' + '='.repeat(80));
console.log('NEXT STEPS FOR MANUAL VERIFICATION:');
console.log('='.repeat(80));

console.log('\n1. CHECK FORM (create.ejs):');
console.log('   - Verify all required fields exist');
console.log('   - Check field names match wizard expectations');
console.log('   - Ensure validation attributes are present');

console.log('\n2. CHECK WIZARD (course-wizard.js):');
console.log('   - collectFormData() collects all fields');
console.log('   - Field name mapping is correct (e.g., max_enrollments → max_students)');
console.log('   - certificate_validity mapping works');
console.log('   - lesson video_url is collected');
console.log('   - target_positions and target_departments are collected');

console.log('\n3. CHECK MODEL (Course.js):');
console.log('   - create() method accepts all fields');
console.log('   - Field name mapping in Course.create()');
console.log('   - target_audience JSON structure: {positions: [], departments: []}');
console.log('   - lessons are inserted with video_url → file_path');
console.log('   - findById() returns all fields correctly');

console.log('\n4. CHECK DETAIL (detail.ejs):');
console.log('   - All fields are displayed');
console.log('   - Translations work (language, course_type)');
console.log('   - target_audience mapping from IDs to names');
console.log('   - video_url displays with clickable links');
console.log('   - learning_objectives displayed as list');

console.log('\n' + '='.repeat(80));
console.log('KEY ISSUES TO WATCH FOR:');
console.log('='.repeat(80));

const commonIssues = [
    {
        issue: 'Field name mismatch',
        example: 'Form uses "max_enrollments" but backend expects "max_students"',
        solution: 'Map in course-wizard.js before submit'
    },
    {
        issue: 'Missing video_url collection',
        example: 'Form has video URL inputs but wizard doesn\'t collect them',
        solution: 'Add to collectFormData() in course-wizard.js'
    },
    {
        issue: 'target_audience structure',
        example: 'Backend expects {positions: [], departments: []} but frontend sends flat arrays',
        solution: 'Restructure in Course.create() from target_positions/target_departments'
    },
    {
        issue: 'certificate_validity mapping',
        example: 'Dropdown values (1year, 2years) not converted to days (365, 730)',
        solution: 'Add mapping in course-wizard.js'
    },
    {
        issue: 'Detail page not showing fields',
        example: 'Field exists in DB but detail.ejs doesn\'t display it',
        solution: 'Add display code to detail.ejs'
    },
    {
        issue: 'Default values not set',
        example: 'passing_score and max_attempts are NULL when not explicitly set',
        solution: 'Set defaults in course-wizard.js or Course.create()'
    }
];

console.log('');
commonIssues.forEach((item, i) => {
    console.log(`${i + 1}. ${item.issue}`);
    console.log(`   Example: ${item.example}`);
    console.log(`   Solution: ${item.solution}`);
    console.log('');
});

console.log('='.repeat(80));
console.log('📊 SUMMARY');
console.log('='.repeat(80));

const requiredFields = Object.entries(fieldDefinitions).filter(([k, v]) => v.required);
const optionalFields = Object.entries(fieldDefinitions).filter(([k, v]) => !v.required);

console.log(`\nTotal Fields: ${Object.keys(fieldDefinitions).length}`);
console.log(`  Required: ${requiredFields.length}`);
console.log(`  Optional: ${optionalFields.length}`);

console.log('\n✅ This analysis provides a complete field-by-field mapping.');
console.log('✅ Use this as a checklist to verify each file.');
console.log('✅ All fields should flow from Form → Wizard → Model → Detail');

console.log('\n' + '='.repeat(80));
