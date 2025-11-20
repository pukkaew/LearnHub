const { poolPromise, sql } = require('./config/database');

async function checkTargetAudienceIssue() {
    try {
        const pool = await poolPromise;

        console.log('\n🔍 Checking Target Audience Setup');
        console.log('='.repeat(60));

        // 1. Check if departments table exists and has data
        console.log('\n📋 1. Checking Departments:');
        try {
            const deptResult = await pool.request().query(`
                SELECT department_id, department_name
                FROM departments
                ORDER BY department_id
            `);

            if (deptResult.recordset.length === 0) {
                console.log('   ❌ No departments found!');
            } else {
                console.log(`   ✅ Found ${deptResult.recordset.length} departments:`);
                deptResult.recordset.forEach(d => {
                    console.log(`      [${d.department_id}] ${d.department_name}`);
                });
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }

        // 2. Check if positions table exists and has data
        console.log('\n📋 2. Checking Positions:');
        try {
            const posResult = await pool.request().query(`
                SELECT p.position_id, p.position_name, p.department_id, d.department_name
                FROM positions p
                LEFT JOIN departments d ON p.department_id = d.department_id
                ORDER BY p.department_id, p.position_id
            `);

            if (posResult.recordset.length === 0) {
                console.log('   ❌ No positions found!');
            } else {
                console.log(`   ✅ Found ${posResult.recordset.length} positions:`);

                // Group by department
                const grouped = {};
                posResult.recordset.forEach(p => {
                    const deptName = p.department_name || 'No Department';
                    if (!grouped[deptName]) grouped[deptName] = [];
                    grouped[deptName].push(p);
                });

                Object.keys(grouped).forEach(deptName => {
                    console.log(`\n      ${deptName}:`);
                    grouped[deptName].forEach(p => {
                        console.log(`        [${p.position_id}] ${p.position_name}`);
                    });
                });
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }

        // 3. Check API endpoints availability
        console.log('\n📋 3. Checking API Routes:');
        console.log('   Expected routes:');
        console.log('     GET /courses/api/target-departments');
        console.log('     GET /courses/api/target-positions');

        // 4. Check if there are any courses with target_audience
        console.log('\n📋 4. Checking Existing Courses Target Audience:');
        try {
            const courseResult = await pool.request().query(`
                SELECT course_id, title, target_audience
                FROM courses
            `);

            if (courseResult.recordset.length === 0) {
                console.log('   ℹ️  No courses found (database is clean)');
            } else {
                courseResult.recordset.forEach(c => {
                    console.log(`\n   Course [${c.course_id}]: ${c.title}`);
                    console.log(`   Target Audience: ${c.target_audience || 'NULL'}`);

                    if (c.target_audience) {
                        try {
                            const parsed = JSON.parse(c.target_audience);
                            console.log(`   Parsed:`, parsed);
                        } catch (e) {
                            console.log(`   ❌ Invalid JSON!`);
                        }
                    }
                });
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }

        // 5. Test the relationship between departments and positions
        console.log('\n📋 5. Testing Department-Position Relationship:');
        try {
            const testResult = await pool.request().query(`
                SELECT
                    d.department_id,
                    d.department_name,
                    COUNT(p.position_id) as position_count
                FROM departments d
                LEFT JOIN positions p ON d.department_id = p.department_id
                GROUP BY d.department_id, d.department_name
                ORDER BY d.department_id
            `);

            testResult.recordset.forEach(r => {
                const status = r.position_count > 0 ? '✅' : '⚠️';
                console.log(`   ${status} ${r.department_name}: ${r.position_count} positions`);
            });
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Target Audience Check Complete\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkTargetAudienceIssue();
