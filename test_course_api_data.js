const { poolPromise, sql } = require('./config/database');
const Course = require('./models/Course');

async function testAPIResponse() {
    try {
        console.log('🔍 Testing API Response for Course Detail\n');
        console.log('='.repeat(70));

        const pool = await poolPromise;

        // Get the latest course
        const latestCourse = await pool.request().query(`
            SELECT TOP 1 course_id, title
            FROM courses
            ORDER BY created_at DESC
        `);

        if (latestCourse.recordset.length === 0) {
            console.log('❌ No courses found in database');
            process.exit(1);
        }

        const courseId = latestCourse.recordset[0].course_id;
        const expectedTitle = latestCourse.recordset[0].title;

        console.log(`\n📌 Testing Course ID: ${courseId}`);
        console.log(`📌 Expected Title: ${expectedTitle}\n`);

        // Get course using Course.findById (same as API)
        const course = await Course.findById(courseId);

        if (!course) {
            console.log('❌ Course.findById returned null');
            process.exit(1);
        }

        console.log('📊 COURSE DATA FROM API:\n');
        console.log('='.repeat(70));

        // Check critical fields
        const checks = [
            { name: 'course_id', value: course.course_id },
            { name: 'title', value: course.title },
            { name: 'course_name', value: course.course_name },
            { name: 'description', value: course.description ? `${course.description.substring(0, 50)}...` : null },
            { name: 'full_description', value: course.full_description ? `${course.full_description.substring(0, 50)}...` : null },
            { name: 'category', value: course.category },
            { name: 'category_name', value: course.category_name },
            { name: 'difficulty_level', value: course.difficulty_level },
            { name: 'course_type', value: course.course_type },
            { name: 'language', value: course.language },
            { name: 'instructor_name', value: course.instructor_name },
            { name: 'instructor_display_name', value: course.instructor_display_name },
            { name: 'duration_hours', value: course.duration_hours },
            { name: 'thumbnail', value: course.thumbnail },
            { name: 'price', value: course.price },
            { name: 'max_students', value: course.max_students },
            { name: 'passing_score', value: course.passing_score },
            { name: 'max_attempts', value: course.max_attempts },
            { name: 'learning_objectives (type)', value: typeof course.learning_objectives },
            { name: 'learning_objectives (isArray)', value: Array.isArray(course.learning_objectives) },
            { name: 'target_audience (type)', value: typeof course.target_audience },
            { name: 'prerequisite_knowledge', value: course.prerequisite_knowledge },
            { name: 'prerequisites_text', value: course.prerequisites_text },
            { name: 'enrolled_count', value: course.enrolled_count },
            { name: 'lessons (count)', value: course.lessons ? course.lessons.length : 0 }
        ];

        checks.forEach(check => {
            const icon = check.value !== undefined && check.value !== null ? '✅' : '❌';
            console.log(`${icon} ${check.name.padEnd(35)}: ${check.value}`);
        });

        console.log('\n📋 Learning Objectives (parsed):');
        if (Array.isArray(course.learning_objectives)) {
            course.learning_objectives.forEach((obj, i) => {
                console.log(`   ${i + 1}. ${obj}`);
            });
        } else {
            console.log(`   Type: ${typeof course.learning_objectives}`);
            console.log(`   Value: ${course.learning_objectives}`);
        }

        console.log('\n👥 Target Audience (parsed):');
        if (typeof course.target_audience === 'object') {
            console.log(`   Type: object`);
            console.log(`   Keys: ${Object.keys(course.target_audience).join(', ')}`);
            if (course.target_audience.positions) {
                console.log(`   Positions: ${course.target_audience.positions.join(', ')}`);
            }
            if (course.target_audience.departments) {
                console.log(`   Departments: ${course.target_audience.departments.join(', ')}`);
            }
        } else {
            console.log(`   Type: ${typeof course.target_audience}`);
            console.log(`   Value: ${course.target_audience}`);
        }

        console.log('\n📚 Lessons:');
        if (course.lessons && course.lessons.length > 0) {
            course.lessons.forEach((lesson, i) => {
                console.log(`   ${i + 1}. ${lesson.title} (${lesson.duration_minutes || 0} min)`);
            });
        } else {
            console.log('   No lessons found');
        }

        console.log('\n' + '='.repeat(70));
        console.log('✅ API Response Test Complete!');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testAPIResponse();
