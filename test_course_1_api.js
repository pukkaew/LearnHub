const axios = require('axios');

async function testCourseAPI() {
    try {
        console.log('🧪 Testing Course 1 API...\n');

        // You need to login first to get a session
        const loginResponse = await axios.post('http://localhost:3000/auth/login', {
            employee_id: 'ADM001',
            password: 'password123'
        }, {
            withCredentials: true
        });

        const cookies = loginResponse.headers['set-cookie'];

        // Now get course 1
        const courseResponse = await axios.get('http://localhost:3000/courses/api/1', {
            headers: {
                Cookie: cookies.join('; ')
            }
        });

        console.log('✅ API Response:');
        console.log('Success:', courseResponse.data.success);

        if (courseResponse.data.success) {
            const course = courseResponse.data.data;
            console.log('\n📋 Course Data:');
            console.log('- Title:', course.title);
            console.log('- Description:', course.description ? `${course.description.substring(0, 50)}...` : 'NONE');
            console.log('- Learning Objectives Type:', typeof course.learning_objectives);
            console.log('- Learning Objectives:', JSON.stringify(course.learning_objectives));
            console.log('- Target Audience Type:', typeof course.target_audience);
            console.log('- Target Audience:', JSON.stringify(course.target_audience));
            console.log('- Instructor:', course.instructor_name || 'NONE');
            console.log('- Thumbnail:', course.thumbnail || 'NONE');
            console.log('- Intro Video:', course.intro_video_url || 'NONE');
        }

        console.log('\n✅ Test complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

testCourseAPI();
