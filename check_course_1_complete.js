const { poolPromise } = require('./config/database');

async function checkCourse1Complete() {
    try {
        const pool = await poolPromise;
        console.log('✅ Connected to database\n');

        console.log('='.repeat(80));
        console.log('COURSE 1 COMPLETE ANALYSIS');
        console.log('='.repeat(80));

        // Get Course 1 data
        const courseResult = await pool.request().query(`
            SELECT *
            FROM courses
            WHERE course_id = 1
        `);

        if (courseResult.recordset.length === 0) {
            console.log('\n❌ Course 1 not found!');
            process.exit(1);
        }

        const course = courseResult.recordset[0];

        console.log('\n📋 COURSE 1 DATA:\n');
        console.log('Basic Info:');
        console.log(`   Title: ${course.title}`);
        console.log(`   Code: ${course.course_code}`);
        console.log(`   Category: ${course.category}`);
        console.log(`   Difficulty: ${course.difficulty_level}`);
        console.log(`   Type: ${course.course_type}`);
        console.log(`   Language: ${course.language}`);

        console.log('\nProblematic Fields:');
        console.log(`   target_audience: ${course.target_audience || '❌ NULL'}`);
        console.log(`   intro_video_url: ${course.intro_video_url || '❌ NULL'}`);

        console.log('\nOther Fields:');
        console.log(`   learning_objectives: ${course.learning_objectives || 'NULL'}`);
        console.log(`   prerequisite_knowledge: ${course.prerequisite_knowledge || 'NULL'}`);
        console.log(`   max_students: ${course.max_students || 'NULL'}`);
        console.log(`   passing_score: ${course.passing_score || 'NULL'}`);
        console.log(`   max_attempts: ${course.max_attempts || 'NULL'}`);
        console.log(`   certificate_validity: ${course.certificate_validity || 'NULL'}`);

        // Get available positions and departments
        console.log('\n' + '='.repeat(80));
        console.log('AVAILABLE POSITIONS & DEPARTMENTS');
        console.log('='.repeat(80));

        const positionsResult = await pool.request().query(`
            SELECT position_id, position_name
            FROM Positions
            WHERE is_active = 1
            ORDER BY position_id
        `);
        console.log(`\n✅ ${positionsResult.recordset.length} Positions Available:`);
        positionsResult.recordset.slice(0, 10).forEach(p => {
            console.log(`   ${p.position_id}: ${p.position_name}`);
        });
        if (positionsResult.recordset.length > 10) {
            console.log(`   ... and ${positionsResult.recordset.length - 10} more`);
        }

        const departmentsResult = await pool.request().query(`
            SELECT unit_id, unit_name_th
            FROM OrganizationUnits
            WHERE is_active = 1
            ORDER BY unit_id
        `);
        console.log(`\n✅ ${departmentsResult.recordset.length} Departments Available:`);
        departmentsResult.recordset.slice(0, 10).forEach(d => {
            console.log(`   ${d.unit_id}: ${d.unit_name_th}`);
        });
        if (departmentsResult.recordset.length > 10) {
            console.log(`   ... and ${departmentsResult.recordset.length - 10} more`);
        }

        // Get course materials
        console.log('\n' + '='.repeat(80));
        console.log('COURSE MATERIALS (VIDEOS)');
        console.log('='.repeat(80));

        const materialsResult = await pool.request().query(`
            SELECT
                material_id,
                title,
                file_path,
                material_type,
                sequence_number
            FROM course_materials
            WHERE course_id = 1
            ORDER BY sequence_number
        `);

        console.log(`\n📹 ${materialsResult.recordset.length} Materials:`);
        if (materialsResult.recordset.length > 0) {
            materialsResult.recordset.forEach(m => {
                console.log(`\n   ${m.sequence_number}. ${m.title}`);
                console.log(`      Type: ${m.material_type}`);
                console.log(`      Video URL: ${m.file_path || '❌ NULL'}`);
            });
        } else {
            console.log('   ⚠️  No materials found');
        }

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('ISSUES SUMMARY');
        console.log('='.repeat(80));

        const issues = [];

        if (!course.target_audience) {
            issues.push({
                field: 'target_audience',
                problem: 'NULL in database',
                impact: 'กลุ่มเป้าหมายไม่แสดงในหน้า Detail',
                solution: 'ต้อง UPDATE course ให้มี target_audience JSON'
            });
        }

        if (!course.intro_video_url) {
            issues.push({
                field: 'intro_video_url',
                problem: 'NULL in database',
                impact: 'วิดีโอแนะนำไม่แสดงในหน้า Detail',
                solution: 'ต้อง UPDATE course ให้มี intro_video_url'
            });
        }

        if (issues.length > 0) {
            console.log('\n❌ Found', issues.length, 'issues:\n');
            issues.forEach((issue, i) => {
                console.log(`${i + 1}. Field: ${issue.field}`);
                console.log(`   Problem: ${issue.problem}`);
                console.log(`   Impact: ${issue.impact}`);
                console.log(`   Solution: ${issue.solution}`);
                console.log('');
            });
        } else {
            console.log('\n✅ No issues found!');
        }

        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

checkCourse1Complete();
