const { poolPromise } = require('./config/database');

async function checkCourse1Detail() {
    try {
        console.log('🔍 Checking Course ID 1 in detail...\n');

        const pool = await poolPromise;

        // 1. Check course data
        console.log('📋 Course Data:');
        const courseResult = await pool.request().query(`
            SELECT
                c.course_id,
                c.title,
                c.description,
                c.intro_video_url,
                c.thumbnail,
                c.learning_objectives,
                c.target_audience,
                c.prerequisite_knowledge,
                c.instructor_id,
                c.instructor_name,
                c.start_date,
                c.end_date,
                c.status,
                c.is_published
            FROM courses c
            WHERE c.course_id = 1
        `);

        if (courseResult.recordset.length === 0) {
            console.log('   ❌ Course ID 1 NOT FOUND!\n');
            process.exit(1);
        }

        const course = courseResult.recordset[0];
        console.log(`   ✅ Course found: ${course.title}`);
        console.log(`   - Description: ${course.description ? 'YES (' + course.description.substring(0, 50) + '...)' : 'NO'}`);
        console.log(`   - Thumbnail: ${course.thumbnail || 'NONE'}`);
        console.log(`   - Intro Video: ${course.intro_video_url || 'NONE'}`);
        console.log(`   - Learning Objectives: ${course.learning_objectives || 'NONE'}`);
        console.log(`   - Target Audience: ${course.target_audience || 'NONE'}`);
        console.log(`   - Prerequisites: ${course.prerequisite_knowledge ? 'YES' : 'NO'}`);
        console.log(`   - Instructor: ${course.instructor_name || course.instructor_id || 'NONE'}`);
        console.log(`   - Start Date: ${course.start_date || 'NONE'}`);
        console.log(`   - End Date: ${course.end_date || 'NONE'}`);
        console.log(`   - Status: ${course.status}`);
        console.log(`   - Published: ${course.is_published}`);
        console.log('');

        // 2. Check lessons
        console.log('📚 Lessons/Curriculum:');
        const lessonsResult = await pool.request().query(`
            SELECT material_id, title, type, order_index
            FROM course_materials
            WHERE course_id = 1 AND type = 'lesson'
            ORDER BY order_index
        `);
        console.log(`   Found ${lessonsResult.recordset.length} lessons`);
        lessonsResult.recordset.forEach(lesson => {
            console.log(`   - ${lesson.order_index}. ${lesson.title}`);
        });
        console.log('');

        // 3. Check materials (documents)
        console.log('📄 Materials (Documents):');
        const materialsResult = await pool.request().query(`
            SELECT material_id, title, type, content, file_path
            FROM course_materials
            WHERE course_id = 1 AND type IN ('document', 'pdf', 'file')
            ORDER BY order_index
        `);
        console.log(`   Found ${materialsResult.recordset.length} materials`);
        materialsResult.recordset.forEach(mat => {
            console.log(`   - ${mat.title} (${mat.type})`);
            console.log(`     content: ${mat.content ? 'YES' : 'NO'}, file_path: ${mat.file_path ? 'YES' : 'NO'}`);
        });
        console.log('');

        console.log('✅ Course 1 check complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error checking course:', error);
        console.error('Details:', error.message);
        process.exit(1);
    }
}

checkCourse1Detail();
