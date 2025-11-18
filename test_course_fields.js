const { poolPromise } = require('./config/database');
const Course = require('./models/Course');

async function testCourseFields() {
    try {
        console.log('🔍 Testing Course.findById() Field Names\n');
        console.log('='.repeat(80));

        const pool = await poolPromise;

        // Get latest course
        const latest = await pool.request().query(`
            SELECT TOP 1 course_id, title
            FROM courses
            ORDER BY created_at DESC
        `);

        if (latest.recordset.length === 0) {
            console.log('❌ No courses found');
            process.exit(1);
        }

        const courseId = latest.recordset[0].course_id;
        console.log(`Testing Course ID: ${courseId}\n`);

        // Get via Course.findById
        const course = await Course.findById(courseId);

        if (!course) {
            console.log('❌ Course.findById returned null');
            process.exit(1);
        }

        console.log('📊 FIELD NAME VERIFICATION:\n');
        console.log('─'.repeat(80));

        const fieldsToCheck = [
            'course_id',
            'title',
            'course_name',
            'description',
            'category',
            'category_name',
            'difficulty_level',
            'course_type',
            'language',
            'instructor_name',
            'instructor_display_name',
            'instructor_avatar',
            'instructor_title',
            'instructor_bio',
            'duration_hours',
            'price',
            'is_free',
            'max_students',
            'passing_score',
            'max_attempts',
            'learning_objectives',
            'target_audience',
            'prerequisite_knowledge',
            'prerequisites_text',
            'full_description',
            'lessons',
            'enrolled_count',
            'rating',
            'rating_count'
        ];

        console.log('Field Name                    Has Value?   Type         Value Preview');
        console.log('─'.repeat(80));

        fieldsToCheck.forEach(field => {
            const hasValue = course[field] !== undefined && course[field] !== null;
            const type = typeof course[field];
            let preview = '';

            if (hasValue) {
                if (type === 'string') {
                    preview = course[field].substring(0, 30);
                } else if (type === 'number') {
                    preview = course[field].toString();
                } else if (type === 'boolean') {
                    preview = course[field] ? 'true' : 'false';
                } else if (Array.isArray(course[field])) {
                    preview = `[${course[field].length} items]`;
                } else if (type === 'object') {
                    preview = `{${Object.keys(course[field]).join(', ')}}`;
                }
            } else {
                preview = 'NULL/UNDEFINED';
            }

            const icon = hasValue ? '✅' : '❌';
            console.log(`${icon} ${field.padEnd(28)} ${String(hasValue).padEnd(10)} ${type.padEnd(12)} ${preview}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('🎯 CRITICAL CHECKS:\n');

        const checks = {
            'Has title': !!course.title,
            'Has course_name (alias)': !!course.course_name,
            'title === course_name': course.title === course.course_name,
            'Has difficulty_level': !!course.difficulty_level,
            'Has instructor_name': !!course.instructor_name,
            'learning_objectives is Array': Array.isArray(course.learning_objectives),
            'target_audience is Object': typeof course.target_audience === 'object',
            'Has lessons': Array.isArray(course.lessons) && course.lessons.length > 0
        };

        Object.entries(checks).forEach(([check, pass]) => {
            const icon = pass ? '✅' : '❌';
            console.log(`${icon} ${check}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('📋 ACTUAL VALUES:\n');
        console.log(`title: "${course.title}"`);
        console.log(`course_name: "${course.course_name}"`);
        console.log(`difficulty_level: "${course.difficulty_level}"`);
        console.log(`course_type: "${course.course_type}"`);
        console.log(`language: "${course.language}"`);
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testCourseFields();
