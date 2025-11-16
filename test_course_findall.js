const Course = require('./models/Course');

async function testCourseFindAll() {
    try {
        console.log('🧪 Testing Course.findAll() method...\n');

        const result = await Course.findAll(1, 12, {});

        console.log('📊 Result:');
        console.log('Total courses:', result.total);
        console.log('Page:', result.page);
        console.log('Total pages:', result.totalPages);
        console.log('Number of courses returned:', result.data.length);

        if (result.data && result.data.length > 0) {
            console.log('\n🔍 First course structure:');
            const firstCourse = result.data[0];

            console.log('\n📋 All fields:');
            console.log(Object.keys(firstCourse));

            console.log('\n📝 Field values:');
            console.log('course_id:', firstCourse.course_id);
            console.log('title:', firstCourse.title);
            console.log('description:', firstCourse.description ? firstCourse.description.substring(0, 50) + '...' : 'null');
            console.log('category:', firstCourse.category);
            console.log('category_name:', firstCourse.category_name);
            console.log('difficulty_level:', firstCourse.difficulty_level);
            console.log('instructor_id:', firstCourse.instructor_id);
            console.log('instructor_name:', firstCourse.instructor_name);
            console.log('instructor_image:', firstCourse.instructor_image);
            console.log('thumbnail:', firstCourse.thumbnail);
            console.log('duration_hours:', firstCourse.duration_hours);
            console.log('price:', firstCourse.price);
            console.log('is_free:', firstCourse.is_free);
            console.log('status:', firstCourse.status);
            console.log('enrolled_count:', firstCourse.enrolled_count);
            console.log('rating:', firstCourse.rating);
            console.log('rating_count:', firstCourse.rating_count);
            console.log('enrollment_status:', firstCourse.enrollment_status);
            console.log('progress_percentage:', firstCourse.progress_percentage);

            // Check for missing fields that view expects
            const expectedFields = [
                'course_id',
                'title',
                'description',
                'category',
                'category_name',
                'difficulty_level',
                'instructor_name',
                'thumbnail',
                'duration_hours',
                'enrolled_count',
                'rating',
                'enrollment_status',
                'progress_percentage'
            ];

            console.log('\n✅ Checking expected fields:');
            let allFieldsPresent = true;
            expectedFields.forEach(field => {
                const present = firstCourse.hasOwnProperty(field);
                console.log(`   ${field}: ${present ? '✓' : '✗'}`);
                if (!present) allFieldsPresent = false;
            });

            if (allFieldsPresent) {
                console.log('\n✅ All expected fields are present!');
            } else {
                console.log('\n⚠️ Some expected fields are missing!');
            }

            console.log('\n📦 Sample course data:');
            console.log(JSON.stringify(firstCourse, null, 2));
        } else {
            console.log('\n⚠️ No courses returned!');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit();
    }
}

testCourseFindAll();
