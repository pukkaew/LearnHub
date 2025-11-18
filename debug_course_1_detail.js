const sql = require('mssql');
const { poolPromise } = require('./config/database');

async function debugCourse1() {
    try {
        const pool = await poolPromise;
        console.log('✅ Connected to database\n');

        // 1. Check raw course data
        console.log('='.repeat(60));
        console.log('1. RAW COURSE DATA FROM DATABASE');
        console.log('='.repeat(60));

        const courseResult = await pool.request()
            .input('courseId', sql.Int, 1)
            .query(`
                SELECT
                    course_id, title, course_code, course_type, language,
                    learning_objectives, target_audience,
                    passing_score, max_attempts, certificate_validity, max_students
                FROM courses
                WHERE course_id = @courseId
            `);

        if (courseResult.recordset.length === 0) {
            console.log('❌ Course 1 not found!');
            return;
        }

        const course = courseResult.recordset[0];
        console.log('\nBasic Info:');
        console.log(`  Title: ${course.title}`);
        console.log(`  Code: ${course.course_code || 'NULL ❌'}`);
        console.log(`  Type: ${course.course_type || 'NULL ❌'}`);
        console.log(`  Language: ${course.language || 'NULL ❌'}`);

        console.log('\nTarget Audience (RAW):');
        console.log(`  Type: ${typeof course.target_audience}`);
        console.log(`  Value: ${course.target_audience || 'NULL ❌'}`);

        if (course.target_audience) {
            try {
                const parsed = JSON.parse(course.target_audience);
                console.log('\n  Parsed JSON:');
                console.log(`    Positions: ${JSON.stringify(parsed.positions)}`);
                console.log(`    Departments: ${JSON.stringify(parsed.departments)}`);
            } catch (e) {
                console.log(`  ❌ Failed to parse: ${e.message}`);
            }
        }

        console.log('\nLearning Objectives (RAW):');
        console.log(`  Type: ${typeof course.learning_objectives}`);
        console.log(`  Value: ${course.learning_objectives || 'NULL ❌'}`);

        if (course.learning_objectives) {
            try {
                const parsed = JSON.parse(course.learning_objectives);
                console.log(`\n  Parsed (${parsed.length} items):`);
                parsed.forEach((obj, i) => console.log(`    ${i + 1}. ${obj}`));
            } catch (e) {
                console.log(`  ❌ Failed to parse: ${e.message}`);
            }
        }

        console.log('\nOther Fields:');
        console.log(`  Passing Score: ${course.passing_score || 'NULL ❌'}`);
        console.log(`  Max Attempts: ${course.max_attempts || 'NULL ❌'}`);
        console.log(`  Certificate Validity: ${course.certificate_validity || 'NULL ❌'}`);
        console.log(`  Max Students: ${course.max_students || 'NULL ❌'}`);

        // 2. Check course materials (lessons with videos)
        console.log('\n' + '='.repeat(60));
        console.log('2. COURSE MATERIALS (LESSONS)');
        console.log('='.repeat(60));

        const materialsResult = await pool.request()
            .input('courseId', sql.Int, 1)
            .query(`
                SELECT
                    material_id, title, content, type,
                    file_path, duration_minutes, order_index
                FROM course_materials
                WHERE course_id = @courseId
                ORDER BY order_index
            `);

        console.log(`\nFound ${materialsResult.recordset.length} lessons\n`);

        materialsResult.recordset.forEach((lesson, i) => {
            console.log(`Lesson ${i + 1}:`);
            console.log(`  Title: ${lesson.title}`);
            console.log(`  Type: ${lesson.type}`);
            console.log(`  Duration: ${lesson.duration_minutes} minutes`);
            console.log(`  file_path (video URL): ${lesson.file_path || 'NULL ❌'}`);
            if (lesson.content) {
                console.log(`  Content: ${lesson.content.substring(0, 50)}...`);
            }
            console.log('');
        });

        // 3. Simulate what Course.findById() returns
        console.log('='.repeat(60));
        console.log('3. SIMULATING Course.findById() RESPONSE');
        console.log('='.repeat(60));

        // Parse like Course.js does
        let parsedTargetAudience = {};
        try {
            if (course.target_audience && typeof course.target_audience === 'string') {
                parsedTargetAudience = JSON.parse(course.target_audience);
            }
        } catch (e) {
            parsedTargetAudience = {};
        }

        let parsedObjectives = [];
        try {
            if (course.learning_objectives && typeof course.learning_objectives === 'string') {
                parsedObjectives = JSON.parse(course.learning_objectives);
            }
        } catch (e) {
            parsedObjectives = [];
        }

        // Map lessons like Course.js does
        const mappedLessons = materialsResult.recordset.map(lesson => ({
            ...lesson,
            video_url: lesson.file_path || null
        }));

        const apiResponse = {
            target_audience: parsedTargetAudience,
            learning_objectives: parsedObjectives,
            lessons: mappedLessons
        };

        console.log('\nAPI Response Structure:');
        console.log(JSON.stringify(apiResponse, null, 2));

        // 4. Check if YouTube URLs are valid
        console.log('\n' + '='.repeat(60));
        console.log('4. YOUTUBE URL VALIDATION');
        console.log('='.repeat(60));

        mappedLessons.forEach((lesson, i) => {
            console.log(`\nLesson ${i + 1}: ${lesson.title}`);
            if (lesson.video_url) {
                const isYouTube = lesson.video_url.includes('youtube.com') ||
                                 lesson.video_url.includes('youtu.be');
                console.log(`  URL: ${lesson.video_url}`);
                console.log(`  Is YouTube: ${isYouTube ? '✅' : '❌'}`);

                if (isYouTube) {
                    // Try to extract video ID
                    let videoId = '';
                    try {
                        if (lesson.video_url.includes('youtube.com/watch')) {
                            const url = new URL(lesson.video_url);
                            videoId = url.searchParams.get('v');
                        } else if (lesson.video_url.includes('youtu.be/')) {
                            videoId = lesson.video_url.split('youtu.be/')[1].split('?')[0];
                        } else if (lesson.video_url.includes('youtube.com/embed/')) {
                            videoId = lesson.video_url.split('embed/')[1].split('?')[0];
                        }
                        console.log(`  Video ID: ${videoId ? videoId : '❌ Cannot extract'}`);
                    } catch (e) {
                        console.log(`  ❌ Error parsing URL: ${e.message}`);
                    }
                }
            } else {
                console.log('  ❌ No video URL');
            }
        });

        console.log('\n✅ Analysis complete');
        process.exit(0);

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    }
}

debugCourse1();
