const fetch = require('node-fetch');

async function testCoursesListAPI() {
    try {
        console.log('🧪 Testing /courses/api/list endpoint...\n');

        const response = await fetch('http://localhost:3000/courses/api/list?page=1&limit=12', {
            headers: {
                'Cookie': 'connect.sid=your_session_cookie_here' // You may need auth
            }
        });

        console.log('📊 Response Status:', response.status);
        console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));

        const data = await response.json();
        console.log('\n📦 API Response:');
        console.log(JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n✅ API Success!');
            console.log(`📚 Number of courses: ${data.data ? data.data.length : 0}`);
            console.log(`📄 Total courses: ${data.pagination ? data.pagination.total : 0}`);
            console.log(`📄 Total pages: ${data.pagination ? data.pagination.totalPages : 0}`);

            if (data.data && data.data.length > 0) {
                console.log('\n🔍 First course structure:');
                const firstCourse = data.data[0];
                console.log('Course ID:', firstCourse.course_id);
                console.log('Title:', firstCourse.title);
                console.log('Category:', firstCourse.category);
                console.log('Category Name:', firstCourse.category_name);
                console.log('Instructor Name:', firstCourse.instructor_name);
                console.log('Duration Hours:', firstCourse.duration_hours);
                console.log('Thumbnail:', firstCourse.thumbnail);
                console.log('Difficulty Level:', firstCourse.difficulty_level);
                console.log('Status:', firstCourse.status);
                console.log('Enrolled Count:', firstCourse.enrolled_count);
                console.log('\n📋 All fields in first course:');
                console.log(Object.keys(firstCourse));
            } else {
                console.log('\n⚠️ No courses returned!');
            }
        } else {
            console.log('\n❌ API Failed:', data.message);
        }

    } catch (error) {
        console.error('\n❌ Error testing API:', error.message);
        console.error('Stack:', error.stack);
    }
}

testCoursesListAPI();
