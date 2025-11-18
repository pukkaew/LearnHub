const {poolPromise} = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Get Course 1 full data
        const result = await pool.request().query(`
            SELECT
                course_id,
                title,
                target_audience,
                learning_objectives
            FROM courses
            WHERE course_id = 1
        `);

        if (result.recordset.length === 0) {
            console.log('❌ Course 1 not found');
            process.exit(1);
        }

        const course = result.recordset[0];

        console.log('\n📚 Course 1: ' + course.title);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📋 Raw Data from Database:');
        console.log('  target_audience:', course.target_audience);
        console.log('  learning_objectives:', course.learning_objectives);

        console.log('\n🔍 Parsing target_audience...');
        if (course.target_audience) {
            try {
                const parsed = JSON.parse(course.target_audience);
                console.log('  ✅ Successfully parsed JSON:');
                console.log('     - positions:', JSON.stringify(parsed.positions));
                console.log('     - departments:', JSON.stringify(parsed.departments));

                // Check if positions are valid IDs
                if (parsed.positions && parsed.positions.length > 0) {
                    console.log('\n👔 Checking positions...');
                    for (const posId of parsed.positions) {
                        const posResult = await pool.request().query(`
                            SELECT position_id, position_name
                            FROM Positions
                            WHERE position_id = ${posId}
                        `);
                        if (posResult.recordset.length > 0) {
                            console.log(`     ✅ Position ${posId}: ${posResult.recordset[0].position_name}`);
                        } else {
                            console.log(`     ❌ Position ${posId}: NOT FOUND IN DATABASE`);
                        }
                    }
                }

                // Check if departments are valid IDs
                if (parsed.departments && parsed.departments.length > 0) {
                    console.log('\n🏢 Checking departments...');
                    for (const deptId of parsed.departments) {
                        const deptResult = await pool.request().query(`
                            SELECT unit_id, unit_name_th, level_id
                            FROM OrganizationUnits
                            WHERE unit_id = ${deptId}
                        `);
                        if (deptResult.recordset.length > 0) {
                            const dept = deptResult.recordset[0];
                            console.log(`     ✅ Department ${deptId}: ${dept.unit_name_th} (level_id: ${dept.level_id})`);
                        } else {
                            console.log(`     ❌ Department ${deptId}: NOT FOUND IN DATABASE`);
                        }
                    }
                }
            } catch (e) {
                console.log('  ❌ Error parsing JSON:', e.message);
                console.log('  Raw value:', course.target_audience);
            }
        } else {
            console.log('  ⚠️  target_audience is NULL');
            console.log('  → Will display as: "เปิดกว้างสำหรับทุกคน"');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
