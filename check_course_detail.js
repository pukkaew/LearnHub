const { sql, poolPromise } = require('./config/database');

async function checkCourseDetail() {
    try {
        const pool = await poolPromise;

        // Get course data
        const courseResult = await pool.request().query(`
            SELECT * FROM courses WHERE course_id = 1
        `);

        if (courseResult.recordset.length === 0) {
            console.log('❌ Course ID 1 not found');
            process.exit(1);
        }

        const course = courseResult.recordset[0];

        console.log('='.repeat(60));
        console.log('📚 COURSE DATA (course_id = 1)');
        console.log('='.repeat(60));
        console.log('title:', course.title);
        console.log('course_code:', course.course_code);
        console.log('description:', course.description?.substring(0, 100) + '...');
        console.log('category:', course.category);
        console.log('difficulty_level:', course.difficulty_level);
        console.log('course_type:', course.course_type);
        console.log('language:', course.language);
        console.log('instructor_name:', course.instructor_name);
        console.log('instructor_id:', course.instructor_id);
        console.log('duration_hours:', course.duration_hours);
        console.log('thumbnail:', course.thumbnail);
        console.log('intro_video_url:', course.intro_video_url);
        console.log('learning_objectives:', course.learning_objectives);
        console.log('target_audience:', course.target_audience);
        console.log('prerequisite_knowledge:', course.prerequisite_knowledge);
        console.log('passing_score:', course.passing_score);
        console.log('max_attempts:', course.max_attempts);
        console.log('max_students:', course.max_students);
        console.log('certificate_validity:', course.certificate_validity);
        console.log('status:', course.status);
        console.log('is_published:', course.is_published);

        // Get materials
        console.log('\n' + '='.repeat(60));
        console.log('📄 COURSE MATERIALS');
        console.log('='.repeat(60));

        const materialsResult = await pool.request()
            .input('courseId', sql.Int, 1)
            .query(`
                SELECT material_id, title, type, content, file_path, order_index, duration_minutes
                FROM course_materials
                WHERE course_id = @courseId
                ORDER BY order_index
            `);

        if (materialsResult.recordset.length === 0) {
            console.log('(No materials found)');
        } else {
            materialsResult.recordset.forEach((m, i) => {
                console.log(`\n[${i+1}] ${m.title}`);
                console.log(`    type: ${m.type}`);
                console.log(`    order: ${m.order_index}`);
                console.log(`    duration: ${m.duration_minutes} min`);
                console.log(`    file_path: ${m.file_path || '(none)'}`);
                console.log(`    content: ${m.content?.substring(0, 50) || '(none)'}...`);
            });
        }

        // Get enrollments
        console.log('\n' + '='.repeat(60));
        console.log('👥 ENROLLMENTS');
        console.log('='.repeat(60));

        const enrollResult = await pool.request()
            .input('courseId', sql.Int, 1)
            .query(`
                SELECT COUNT(*) as count FROM user_courses WHERE course_id = @courseId
            `);
        console.log('Total enrollments:', enrollResult.recordset[0].count);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkCourseDetail();
