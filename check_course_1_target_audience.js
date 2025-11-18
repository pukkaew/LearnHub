const {poolPromise} = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Get Course 1 data
        const result = await pool.request().query(`
            SELECT
                course_id,
                title,
                target_audience
            FROM courses
            WHERE course_id = 1
        `);

        if (result.recordset.length === 0) {
            console.log('❌ Course 1 not found');
            process.exit(1);
        }

        const course = result.recordset[0];
        console.log('\n📚 Course:', course.title);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Parse target_audience
        let targetAudience;
        try {
            targetAudience = JSON.parse(course.target_audience);
        } catch (e) {
            console.log('❌ Error parsing target_audience:', e.message);
            console.log('Raw value:', course.target_audience);
            process.exit(1);
        }

        console.log('\n🎯 Target Audience (raw JSON):');
        console.log(JSON.stringify(targetAudience, null, 2));

        // Get position details
        if (targetAudience.positions && targetAudience.positions.length > 0) {
            console.log('\n👔 Positions Selected:');
            const posIds = targetAudience.positions.join(', ');
            const posResult = await pool.request().query(`
                SELECT position_id, position_name
                FROM Positions
                WHERE position_id IN (${posIds})
            `);

            posResult.recordset.forEach(pos => {
                console.log(`  ✅ ID ${pos.position_id}: ${pos.position_name}`);
            });
        } else {
            console.log('\n👔 No positions selected');
        }

        // Get department details
        if (targetAudience.departments && targetAudience.departments.length > 0) {
            console.log('\n🏢 Departments Selected:');
            const deptIds = targetAudience.departments.join(', ');
            const deptResult = await pool.request().query(`
                SELECT unit_id, unit_name_th, level_id
                FROM OrganizationUnits
                WHERE unit_id IN (${deptIds})
                ORDER BY level_id, unit_id
            `);

            deptResult.recordset.forEach(dept => {
                console.log(`  ✅ ID ${dept.unit_id}: ${dept.unit_name_th} (level_id: ${dept.level_id})`);
            });
        } else {
            console.log('\n🏢 No departments selected');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
