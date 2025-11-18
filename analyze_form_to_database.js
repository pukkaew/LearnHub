const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYZING FORM → DATABASE FLOW\n');
console.log('='.repeat(90));

// Read create.ejs to extract form fields
const createEjsPath = path.join(__dirname, 'views', 'courses', 'create.ejs');
const createEjsContent = fs.readFileSync(createEjsPath, 'utf8');

// Extract all input/select/textarea fields with name attribute
const inputRegex = /<(?:input|select|textarea)[^>]*name=["']([^"']+)["'][^>]*>/g;
const formFields = [];
let match;

while ((match = inputRegex.exec(createEjsContent)) !== null) {
    const fieldName = match[1];
    if (!formFields.includes(fieldName)) {
        formFields.push(fieldName);
    }
}

console.log('📝 STEP 1: FORM FIELDS (from create.ejs)');
console.log('─'.repeat(90));
console.log('Total fields found:', formFields.length);
console.log('');

const categorizedFields = {
    'Basic Info': [],
    'Details': [],
    'Content': [],
    'Assessment': [],
    'Settings': [],
    'Other': []
};

formFields.forEach(field => {
    // Categorize by step
    if (['course_code', 'course_name', 'category_id', 'difficulty_level', 'course_type', 'language'].includes(field)) {
        categorizedFields['Basic Info'].push(field);
    } else if (['instructor_name', 'instructor_id', 'duration_hours', 'duration_minutes', 'price', 'is_free', 'max_enrollments'].includes(field)) {
        categorizedFields['Details'].push(field);
    } else if (field.includes('objective') || field.includes('lesson') || field.includes('prerequisite') || field.includes('target')) {
        categorizedFields['Content'].push(field);
    } else if (field.includes('test') || field.includes('passing') || field.includes('attempt') || field.includes('answer')) {
        categorizedFields['Assessment'].push(field);
    } else if (field.includes('certificate') || field.includes('enrollment') || field.includes('status') || field.includes('video')) {
        categorizedFields['Settings'].push(field);
    } else {
        categorizedFields['Other'].push(field);
    }
});

Object.entries(categorizedFields).forEach(([category, fields]) => {
    if (fields.length > 0) {
        console.log(`\n${category}:`);
        fields.forEach((field, i) => {
            console.log(`  ${i + 1}. ${field}`);
        });
    }
});

console.log('\n');
console.log('='.repeat(90));
console.log('💾 STEP 2: DATABASE COLUMNS (from courses table)');
console.log('─'.repeat(90));

// List of expected database columns based on previous tests
const dbColumns = [
    'course_id',
    'title',
    'description',
    'category',
    'difficulty_level',
    'instructor_id',
    'instructor_name',
    'thumbnail',
    'duration_hours',
    'price',
    'is_free',
    'status',
    'enrollment_limit',
    'start_date',
    'end_date',
    'created_at',
    'updated_at',
    'test_id',
    'course_code',
    'course_type',
    'language',
    'learning_objectives',
    'target_audience',
    'prerequisite_knowledge',
    'intro_video_url',
    'max_students',
    'passing_score',
    'max_attempts',
    'show_correct_answers',
    'is_published',
    'certificate_template',
    'certificate_validity'
];

console.log('Database columns:', dbColumns.length);
dbColumns.forEach((col, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${col}`);
});

console.log('\n');
console.log('='.repeat(90));
console.log('🔄 STEP 3: FIELD NAME MAPPING ANALYSIS');
console.log('─'.repeat(90));
console.log('');

// Map form field names to database column names
const fieldMappings = [
    { form: 'course_name', db: 'title', note: 'Different name!' },
    { form: 'course_code', db: 'course_code', note: 'Direct match' },
    { form: 'category_id', db: 'category', note: 'Needs lookup/conversion' },
    { form: 'difficulty_level', db: 'difficulty_level', note: 'Direct match' },
    { form: 'course_type', db: 'course_type', note: 'Direct match' },
    { form: 'language', db: 'language', note: 'Direct match' },
    { form: 'description', db: 'description', note: 'Direct match' },
    { form: 'instructor_name', db: 'instructor_name', note: 'Direct match' },
    { form: 'instructor_id', db: 'instructor_id', note: 'Optional field' },
    { form: 'duration_hours', db: 'duration_hours', note: 'Needs calculation with duration_minutes' },
    { form: 'duration_minutes', db: null, note: 'Added to duration_hours' },
    { form: 'price', db: 'price', note: 'Direct match' },
    { form: 'is_free', db: 'is_free', note: 'Direct match' },
    { form: 'max_enrollments', db: 'enrollment_limit + max_students', note: 'Maps to TWO columns' },
    { form: 'objectives[]', db: 'learning_objectives', note: 'Array → JSON string' },
    { form: 'lesson_titles[]', db: 'course_materials table', note: 'Separate table' },
    { form: 'lesson_descriptions[]', db: 'course_materials table', note: 'Separate table' },
    { form: 'lesson_durations[]', db: 'course_materials table', note: 'Separate table' },
    { form: 'target_positions[]', db: 'target_audience', note: 'Array → JSON object' },
    { form: 'target_departments[]', db: 'target_audience', note: 'Array → JSON object' },
    { form: 'prerequisite_knowledge', db: 'prerequisite_knowledge', note: 'Direct match' },
    { form: 'new_passing_score', db: 'passing_score', note: 'Copied from test creation' },
    { form: 'new_max_attempts', db: 'max_attempts', note: 'Copied from test creation' },
    { form: 'certificate_validity', db: 'certificate_validity', note: 'Direct match' },
    { form: 'intro_video_url', db: 'intro_video_url', note: 'Optional field' }
];

console.log('Form Field Name              →  Database Column           Note');
console.log('─'.repeat(90));

fieldMappings.forEach(mapping => {
    const formField = mapping.form.padEnd(28);
    const dbCol = (mapping.db || 'N/A').padEnd(26);
    console.log(`${formField} →  ${dbCol} ${mapping.note}`);
});

console.log('\n');
console.log('='.repeat(90));
console.log('⚠️  POTENTIAL ISSUES:');
console.log('─'.repeat(90));

const issues = [];

// Check for missing mappings
const criticalFormFields = ['course_name', 'difficulty_level', 'course_type', 'language', 'instructor_name',
                            'duration_hours', 'price', 'max_enrollments', 'passing_score', 'max_attempts'];

criticalFormFields.forEach(field => {
    const mapping = fieldMappings.find(m => m.form === field);
    if (!mapping) {
        issues.push(`❌ Missing mapping for form field: ${field}`);
    } else if (!mapping.db || mapping.db === 'N/A') {
        issues.push(`❌ Form field "${field}" has no database column`);
    }
});

// Check for potential data loss
const transformFields = fieldMappings.filter(m => m.note.includes('→') || m.note.includes('calculation'));
transformFields.forEach(field => {
    issues.push(`⚠️  Data transformation required: ${field.form} (${field.note})`);
});

if (issues.length === 0) {
    console.log('✅ No critical issues found!');
} else {
    issues.forEach(issue => console.log(issue));
}

console.log('\n');
console.log('='.repeat(90));
console.log('📋 SUMMARY:');
console.log('─'.repeat(90));
console.log(`Total form fields:        ${formFields.length}`);
console.log(`Total database columns:   ${dbColumns.length}`);
console.log(`Mapped fields:            ${fieldMappings.length}`);
console.log(`Potential issues:         ${issues.length}`);
console.log('');

console.log('='.repeat(90));
console.log('🔍 NEXT STEP: Run test to verify actual data flow');
console.log('   Execute: node test_complete_form_flow.js');
console.log('='.repeat(90));
