const { poolPromise } = require('./config/database');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');

async function testRealAPICall() {
    try {
        console.log('🔍 Testing REAL API Call (simulating browser request)\n');
        console.log('='.repeat(80));

        const pool = await poolPromise;

        // Get the latest course
        const latestResult = await pool.request().query(`
            SELECT TOP 1 course_id
            FROM courses
            ORDER BY created_at DESC
        `);

        if (latestResult.recordset.length === 0) {
            console.log('❌ No courses found');
            process.exit(1);
        }

        const courseId = latestResult.recordset[0].course_id;
        console.log(`📌 Testing with Course ID: ${courseId}\n`);

        // Simulate what getCourseById does
        console.log('🔄 Step 1: Calling Course.findById (same as API)...');
        const course = await Course.findById(courseId);

        if (!course) {
            console.log('❌ Course not found');
            process.exit(1);
        }

        // Simulate enrollment check (with dummy userId)
        const userId = 1; // dummy
        const enrollment = null; // assume no enrollment for testing

        // This is what the API returns
        const responseData = {
            ...course,
            enrollment_status: enrollment ? enrollment.completion_status || enrollment.status : null,
            progress_percentage: enrollment ? (enrollment.progress_percentage || enrollment.progress || 0) : 0,
            is_enrolled: !!enrollment
        };

        console.log('✅ API Response prepared\n');

        console.log('='.repeat(80));
        console.log('📊 WHAT THE BROWSER RECEIVES FROM API:');
        console.log('='.repeat(80));
        console.log('');

        // Check all fields that should be displayed
        const displayFields = [
            { name: 'course_id', value: responseData.course_id },
            { name: 'title', value: responseData.title },
            { name: 'course_name', value: responseData.course_name },
            { name: 'description', value: responseData.description ? responseData.description.substring(0, 60) + '...' : null },
            { name: 'category_name', value: responseData.category_name },
            { name: 'difficulty_level', value: responseData.difficulty_level },
            { name: 'instructor_name', value: responseData.instructor_name },
            { name: 'instructor_display_name', value: responseData.instructor_display_name },
            { name: 'duration_hours', value: responseData.duration_hours },
            { name: 'enrolled_count', value: responseData.enrolled_count },
            { name: 'rating', value: responseData.rating },
            { name: 'thumbnail', value: responseData.thumbnail },
            { name: 'full_description', value: responseData.full_description ? 'EXISTS' : 'NULL' },
            { name: 'learning_objectives (type)', value: typeof responseData.learning_objectives },
            { name: 'learning_objectives (array)', value: Array.isArray(responseData.learning_objectives) },
            { name: 'learning_objectives (count)', value: Array.isArray(responseData.learning_objectives) ? responseData.learning_objectives.length : 0 },
            { name: 'prerequisites_text', value: responseData.prerequisites_text },
            { name: 'prerequisite_knowledge', value: responseData.prerequisite_knowledge },
            { name: 'course_type', value: responseData.course_type },
            { name: 'language', value: responseData.language },
            { name: 'max_students', value: responseData.max_students },
            { name: 'passing_score', value: responseData.passing_score },
            { name: 'max_attempts', value: responseData.max_attempts },
            { name: 'price', value: responseData.price },
            { name: 'is_free', value: responseData.is_free },
            { name: 'lessons (count)', value: responseData.lessons ? responseData.lessons.length : 0 }
        ];

        displayFields.forEach(field => {
            const icon = field.value !== undefined && field.value !== null ? '✅' : '❌';
            console.log(`${icon} ${field.name.padEnd(35)}: ${field.value}`);
        });

        console.log('\n📋 Learning Objectives Detail:');
        if (Array.isArray(responseData.learning_objectives) && responseData.learning_objectives.length > 0) {
            responseData.learning_objectives.forEach((obj, i) => {
                console.log(`   ${i + 1}. ${obj}`);
            });
        } else {
            console.log('   ⚠️ No learning objectives or not an array');
        }

        console.log('\n📚 Lessons Detail:');
        if (responseData.lessons && responseData.lessons.length > 0) {
            responseData.lessons.forEach((lesson, i) => {
                console.log(`   ${i + 1}. ${lesson.title} (${lesson.duration_minutes || 0} min)`);
            });
        } else {
            console.log('   ⚠️ No lessons found');
        }

        console.log('\n👥 Target Audience:');
        if (typeof responseData.target_audience === 'object' && responseData.target_audience) {
            console.log('   Type: object');
            if (responseData.target_audience.positions) {
                console.log(`   Positions: ${responseData.target_audience.positions.join(', ')}`);
            }
            if (responseData.target_audience.departments) {
                console.log(`   Departments: ${responseData.target_audience.departments.join(', ')}`);
            }
        } else {
            console.log('   Type:', typeof responseData.target_audience);
        }

        console.log('\n' + '='.repeat(80));
        console.log('🔍 HOW DETAIL.EJS USES THESE FIELDS:');
        console.log('='.repeat(80));
        console.log('');
        console.log('Line 340: document.getElementById("course-title").textContent = course.title');
        console.log(`   → Will display: "${responseData.title}"`);
        console.log('');
        console.log('Line 341: document.getElementById("course-description").textContent = course.description');
        console.log(`   → Will display: "${responseData.description ? responseData.description.substring(0, 60) + '...' : 'NULL'}"`);
        console.log('');
        console.log('Line 342: document.getElementById("instructor-name").textContent = course.instructor_name || "ไม่ระบุ"');
        console.log(`   → Will display: "${responseData.instructor_name || 'ไม่ระบุ'}"`);
        console.log('');
        console.log('Line 343: document.getElementById("course-duration").textContent = `${course.duration_hours || 0} ชั่วโมง`');
        console.log(`   → Will display: "${responseData.duration_hours || 0} ชั่วโมง"`);
        console.log('');
        console.log('Line 347: document.getElementById("category-badge").textContent = course.category_name || "ทั่วไป"');
        console.log(`   → Will display: "${responseData.category_name || 'ทั่วไป'}"`);
        console.log('');
        console.log('Line 371-373: Learning Objectives parsing');
        console.log(`   → Type: ${typeof responseData.learning_objectives}`);
        console.log(`   → Array: ${Array.isArray(responseData.learning_objectives)}`);
        if (Array.isArray(responseData.learning_objectives)) {
            console.log(`   → Will display ${responseData.learning_objectives.length} objectives`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ Analysis Complete');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testRealAPICall();
