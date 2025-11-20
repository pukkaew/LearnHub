const { poolPromise } = require('./config/database');

async function checkTargetAudienceData() {
    try {
        const pool = await poolPromise;
        console.log('🔌 Connected to database\n');

        // Check departments (OrganizationUnits)
        console.log('═══════════════════════════════════════');
        console.log('📊 DEPARTMENTS (OrganizationUnits)');
        console.log('═══════════════════════════════════════');
        const depts = await pool.request().query(`
            SELECT unit_id, unit_name_th, unit_name_en, level_id, parent_id
            FROM OrganizationUnits
            WHERE is_active = 1
            ORDER BY level_id, unit_id
        `);

        console.log(`Total departments: ${depts.recordset.length}\n`);
        depts.recordset.forEach(dept => {
            console.log(`ID: ${dept.unit_id} | Level: ${dept.level_id} | Parent: ${dept.parent_id || 'NULL'} | Name: ${dept.unit_name_th || dept.unit_name_en}`);
        });

        // Check positions
        console.log('\n═══════════════════════════════════════');
        console.log('📊 POSITIONS');
        console.log('═══════════════════════════════════════');
        const positions = await pool.request().query(`
            SELECT position_id, position_name, unit_id, level
            FROM positions
            ORDER BY position_id
        `);

        console.log(`Total positions: ${positions.recordset.length}\n`);
        positions.recordset.forEach(pos => {
            console.log(`ID: ${pos.position_id} | unit_id: ${pos.unit_id || 'NULL'} | level: ${pos.level || 'NULL'} | Name: ${pos.position_name}`);
        });

        // Check relationship
        console.log('\n═══════════════════════════════════════');
        console.log('🔗 RELATIONSHIP CHECK');
        console.log('═══════════════════════════════════════');

        const positionsWithUnitId = positions.recordset.filter(p => p.unit_id);
        const departmentIds = depts.recordset.map(d => d.unit_id);

        console.log(`\nPositions with unit_id: ${positionsWithUnitId.length}`);
        console.log(`Department IDs available: ${departmentIds.join(', ')}\n`);

        positionsWithUnitId.forEach(pos => {
            const deptExists = departmentIds.includes(pos.unit_id);
            const status = deptExists ? '✅' : '❌';
            const dept = depts.recordset.find(d => d.unit_id === pos.unit_id);
            console.log(`${status} Position "${pos.position_name}" → unit_id: ${pos.unit_id} ${dept ? `(${dept.unit_name_th || dept.unit_name_en})` : '(NOT FOUND)'}`);
        });

        // Check positions without unit_id
        const positionsWithoutUnitId = positions.recordset.filter(p => !p.unit_id);
        if (positionsWithoutUnitId.length > 0) {
            console.log(`\n⚠️  Positions WITHOUT unit_id: ${positionsWithoutUnitId.length}`);
            positionsWithoutUnitId.forEach(pos => {
                console.log(`   - ${pos.position_name} (ID: ${pos.position_id})`);
            });
        }

        console.log('\n═══════════════════════════════════════');
        console.log('💡 RECOMMENDATIONS');
        console.log('═══════════════════════════════════════');

        if (positionsWithoutUnitId.length > 0) {
            console.log(`\n⚠️  ${positionsWithoutUnitId.length} positions don't have unit_id assigned`);
            console.log('   → These positions won\'t appear when filtering by department');
            console.log('   → Solution: Update positions to assign unit_id');
        }

        const unmatchedPositions = positionsWithUnitId.filter(p => !departmentIds.includes(p.unit_id));
        if (unmatchedPositions.length > 0) {
            console.log(`\n❌ ${unmatchedPositions.length} positions have invalid unit_id (department not found)`);
            console.log('   → These positions reference non-existent departments');
            unmatchedPositions.forEach(pos => {
                console.log(`   - ${pos.position_name} → unit_id: ${pos.unit_id}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

checkTargetAudienceData();
