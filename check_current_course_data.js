const { poolPromise } = require('./config/database');

async function checkCurrentCourseData() {
    try {
        const pool = await poolPromise;
        console.log('✅ Connected to database\n');

        console.log('='.repeat(80));
        console.log('CHECKING CURRENT COURSE DATA');
        console.log('='.repeat(80));

        // 1. Count courses
        const countResult = await pool.request().query('SELECT COUNT(*) as count FROM courses');
        const courseCount = countResult.recordset[0].count;

        console.log(`\n📊 Total Courses: ${courseCount}\n`);

        if (courseCount === 0) {
            console.log('⚠️  No courses found in database!');
            console.log('   Please create a course first at: http://localhost:3000/courses/create');
            process.exit(0);
        }

        // 2. Get all courses
        const coursesResult = await pool.request().query(`
            SELECT
                course_id,
                title,
                course_code,
                target_audience,
                intro_video_url,
                created_at
            FROM courses
            ORDER BY course_id DESC
        `);

        console.log('📋 ALL COURSES:\n');
        coursesResult.recordset.forEach((course, i) => {
            console.log(`${i + 1}. Course ID: ${course.course_id}`);
            console.log(`   Title: ${course.title}`);
            console.log(`   Code: ${course.course_code}`);
            console.log(`   Target Audience: ${course.target_audience || 'NULL ❌'}`);
            console.log(`   Intro Video URL: ${course.intro_video_url || 'NULL ❌'}`);
            console.log(`   Created: ${course.created_at}`);
            console.log('');
        });

        // 3. Check target_audience structure
        console.log('='.repeat(80));
        console.log('CHECKING TARGET AUDIENCE DATA');
        console.log('='.repeat(80));

        for (const course of coursesResult.recordset) {
            console.log(`\nCourse ${course.course_id}: ${course.title}`);

            if (course.target_audience) {
                try {
                    const targetAudience = JSON.parse(course.target_audience);
                    console.log('   ✅ Valid JSON');
                    console.log('   Structure:', JSON.stringify(targetAudience, null, 2));

                    if (targetAudience.positions) {
                        console.log(`   Positions: ${targetAudience.positions.length} items`, targetAudience.positions);
                    } else {
                        console.log('   ❌ No positions field');
                    }

                    if (targetAudience.departments) {
                        console.log(`   Departments: ${targetAudience.departments.length} items`, targetAudience.departments);
                    } else {
                        console.log('   ❌ No departments field');
                    }
                } catch (e) {
                    console.log('   ❌ Invalid JSON:', e.message);
                    console.log('   Raw value:', course.target_audience);
                }
            } else {
                console.log('   ❌ target_audience is NULL');
            }
        }

        // 4. Check if positions and departments exist in DB
        console.log('\n' + '='.repeat(80));
        console.log('CHECKING POSITIONS & DEPARTMENTS IN DATABASE');
        console.log('='.repeat(80));

        const positionsResult = await pool.request().query(`
            SELECT TOP 10 position_id, position_name
            FROM Positions
            ORDER BY position_id
        `);
        console.log(`\n✅ Available Positions (showing first 10):`);
        positionsResult.recordset.forEach(p => {
            console.log(`   ${p.position_id}: ${p.position_name}`);
        });

        const departmentsResult = await pool.request().query(`
            SELECT TOP 10 org_unit_id, org_unit_name
            FROM OrganizationUnits
            ORDER BY org_unit_id
        `);
        console.log(`\n✅ Available Departments (showing first 10):`);
        departmentsResult.recordset.forEach(d => {
            console.log(`   ${d.org_unit_id}: ${d.org_unit_name}`);
        });

        // 5. Check course materials for videos
        console.log('\n' + '='.repeat(80));
        console.log('CHECKING COURSE MATERIALS (VIDEOS)');
        console.log('='.repeat(80));

        for (const course of coursesResult.recordset) {
            const materialsResult = await pool.request()
                .input('courseId', course.course_id)
                .query(`
                    SELECT
                        material_id,
                        title,
                        file_path,
                        material_type
                    FROM course_materials
                    WHERE course_id = @courseId
                    ORDER BY sequence_number
                `);

            console.log(`\nCourse ${course.course_id}: ${course.title}`);
            console.log(`   Total materials: ${materialsResult.recordset.length}`);

            if (materialsResult.recordset.length > 0) {
                materialsResult.recordset.forEach(m => {
                    console.log(`   - ${m.title}`);
                    console.log(`     Type: ${m.material_type}`);
                    console.log(`     Video URL: ${m.file_path || 'NULL ❌'}`);
                });
            } else {
                console.log('   ⚠️  No materials found');
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('ISSUES FOUND');
        console.log('='.repeat(80));

        const issues = [];

        coursesResult.recordset.forEach(course => {
            if (!course.target_audience) {
                issues.push(`Course ${course.course_id}: target_audience is NULL`);
            }
            if (!course.intro_video_url) {
                issues.push(`Course ${course.course_id}: intro_video_url is NULL`);
            }
        });

        if (issues.length > 0) {
            console.log('\n❌ Issues Found:\n');
            issues.forEach((issue, i) => {
                console.log(`${i + 1}. ${issue}`);
            });
        } else {
            console.log('\n✅ No issues found!');
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

checkCurrentCourseData();
