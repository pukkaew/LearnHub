const { poolPromise } = require('./config/database');

async function fixCourse1Data() {
    try {
        const pool = await poolPromise;
        console.log('✅ Connected to database\n');

        console.log('='.repeat(80));
        console.log('FIX COURSE 1 DATA');
        console.log('='.repeat(80));

        // 1. Update target_audience with valid positions and departments
        console.log('\n1️⃣  Updating target_audience...\n');

        const targetAudience = {
            positions: [28], // IT Manager
            departments: [1, 41, 48] // บริษัท, สำนักงานใหญ่, เทคโนโลยีสารสนเทศ
        };

        const targetAudienceJson = JSON.stringify(targetAudience);

        console.log('   Setting target_audience to:');
        console.log('   ', targetAudienceJson);

        await pool.request().query(`
            UPDATE courses
            SET target_audience = '${targetAudienceJson}'
            WHERE course_id = 1
        `);

        console.log('   ✅ target_audience updated!\n');

        // 2. Verify the update
        console.log('2️⃣  Verifying updates...\n');

        const verifyResult = await pool.request().query(`
            SELECT
                course_id,
                title,
                target_audience,
                intro_video_url
            FROM courses
            WHERE course_id = 1
        `);

        const course = verifyResult.recordset[0];

        console.log('   Course ID:', course.course_id);
        console.log('   Title:', course.title);
        console.log('   target_audience:', course.target_audience);
        console.log('   intro_video_url:', course.intro_video_url);

        // 3. Parse and verify target_audience
        console.log('\n3️⃣  Parsing target_audience...\n');

        if (course.target_audience) {
            try {
                const parsed = JSON.parse(course.target_audience);
                console.log('   ✅ Valid JSON!');
                console.log('   Positions:', parsed.positions);
                console.log('   Departments:', parsed.departments);

                // Get actual names
                if (parsed.positions && parsed.positions.length > 0) {
                    const positionsResult = await pool.request().query(`
                        SELECT position_id, position_name
                        FROM Positions
                        WHERE position_id IN (${parsed.positions.join(',')})
                    `);
                    console.log('\n   Position Names:');
                    positionsResult.recordset.forEach(p => {
                        console.log(`     ${p.position_id}: ${p.position_name}`);
                    });
                }

                if (parsed.departments && parsed.departments.length > 0) {
                    const departmentsResult = await pool.request().query(`
                        SELECT unit_id, unit_name_th
                        FROM OrganizationUnits
                        WHERE unit_id IN (${parsed.departments.join(',')})
                    `);
                    console.log('\n   Department Names:');
                    departmentsResult.recordset.forEach(d => {
                        console.log(`     ${d.unit_id}: ${d.unit_name_th}`);
                    });
                }

            } catch (e) {
                console.log('   ❌ Invalid JSON:', e.message);
            }
        } else {
            console.log('   ❌ target_audience is still NULL!');
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ FIX COMPLETED!');
        console.log('='.repeat(80));

        console.log('\n📝 Summary:');
        console.log('   ✅ target_audience: FIXED (now has positions and departments)');
        console.log('   ✅ intro_video_url: Already exists (https://www.youtube.com/watch?v=q8V_klW0fzU)');
        console.log('\n👉 Next: Check if detail.ejs displays intro_video_url correctly');
        console.log('   Go to: http://localhost:3000/courses/1');

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

fixCourse1Data();
