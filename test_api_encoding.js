const { poolPromise, sql } = require('./config/database');

async function testAPIEncoding() {
    try {
        const pool = await poolPromise;

        // Simulate what the API does - get course data
        const result = await pool.request()
            .input('courseId', sql.Int, 1)
            .query(`
                SELECT *
                FROM courses
                WHERE course_id = @courseId
            `);

        if (result.recordset.length === 0) {
            console.log('❌ No course found');
            process.exit(1);
        }

        const course = result.recordset[0];

        console.log('\n📊 Raw Database Data:');
        console.log('='.repeat(50));
        console.log('Title:', course.title);
        console.log('Description (first 200 chars):');
        console.log(course.description ? course.description.substring(0, 200) : 'null');

        // Simulate JSON.stringify (what API does)
        const jsonString = JSON.stringify({
            success: true,
            data: {
                course_id: course.course_id,
                title: course.title,
                description: course.description
            }
        });

        console.log('\n📤 JSON Response (first 300 chars):');
        console.log('='.repeat(50));
        console.log(jsonString.substring(0, 300));

        // Parse it back (what browser does)
        const parsed = JSON.parse(jsonString);

        console.log('\n📥 Parsed in Browser:');
        console.log('='.repeat(50));
        console.log('Title:', parsed.data.title);
        console.log('Description (first 200 chars):');
        console.log(parsed.data.description ? parsed.data.description.substring(0, 200) : 'null');

        // Check for encoding issues
        console.log('\n🔍 Encoding Check:');
        console.log('='.repeat(50));

        const hasCorruptedChars = parsed.data.description && parsed.data.description.match(/เธ[^\u0E00-\u0E7F]/);
        if (hasCorruptedChars) {
            console.log('❌ Found corrupted Thai characters!');
            console.log('Sample:', hasCorruptedChars[0]);
        } else if (parsed.data.description && parsed.data.description.match(/[\u0E00-\u0E7F]/)) {
            console.log('✅ Thai characters are intact!');
        } else {
            console.log('⚠️  No Thai characters found in description');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testAPIEncoding();
