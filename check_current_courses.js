const {poolPromise} = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Get all courses
        const result = await pool.request().query(`
            SELECT
                course_id,
                title,
                target_audience,
                created_at
            FROM courses
            ORDER BY course_id
        `);

        console.log('\n📚 Courses in database:', result.recordset.length);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (result.recordset.length === 0) {
            console.log('❌ No courses found - database is clean\n');
            process.exit(0);
        }

        for (const course of result.recordset) {
            console.log(`\n📖 Course ${course.course_id}: ${course.title}`);
            console.log(`   Created: ${course.created_at}`);
            console.log(`   target_audience (raw): ${course.target_audience}`);

            if (course.target_audience) {
                try {
                    const parsed = JSON.parse(course.target_audience);
                    console.log(`   Parsed target_audience:`);
                    console.log(`     - Positions: ${JSON.stringify(parsed.positions)}`);
                    console.log(`     - Departments: ${JSON.stringify(parsed.departments)}`);

                    // Get position names
                    if (parsed.positions && parsed.positions.length > 0) {
                        const posIds = parsed.positions.join(', ');
                        const posResult = await pool.request().query(`
                            SELECT position_id, position_name
                            FROM Positions
                            WHERE position_id IN (${posIds})
                        `);
                        console.log(`\n   👔 Selected Positions:`);
                        posResult.recordset.forEach(p => {
                            console.log(`      ✅ ID ${p.position_id}: ${p.position_name}`);
                        });
                    }

                    // Get department names
                    if (parsed.departments && parsed.departments.length > 0) {
                        const deptIds = parsed.departments.join(', ');
                        const deptResult = await pool.request().query(`
                            SELECT unit_id, unit_name_th, level_id
                            FROM OrganizationUnits
                            WHERE unit_id IN (${deptIds})
                            ORDER BY level_id, unit_id
                        `);
                        console.log(`\n   🏢 Selected Departments:`);
                        deptResult.recordset.forEach(d => {
                            console.log(`      ✅ ID ${d.unit_id}: ${d.unit_name_th} (level_id: ${d.level_id})`);
                        });
                    }
                } catch (e) {
                    console.log(`   ❌ Error parsing JSON: ${e.message}`);
                }
            } else {
                console.log(`   ⚠️  target_audience is NULL`);
            }

            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        console.log('\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
