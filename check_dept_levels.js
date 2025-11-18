const {poolPromise} = require('./config/database');

(async () => {
    const pool = await poolPromise;
    const result = await pool.request().query(
        'SELECT unit_id, unit_name_th, level_id FROM OrganizationUnits WHERE unit_id IN (1, 41, 48)'
    );

    console.log('Departments:');
    result.recordset.forEach(d => {
        console.log(`  ID ${d.unit_id}: ${d.unit_name_th} (level_id: ${d.level_id})`);
    });

    console.log('\nAPI Filter: level_id IN (2, 4, 5, 6)');
    console.log('\nDepartments that will be returned:');
    result.recordset.filter(d => [2,4,5,6].includes(d.level_id)).forEach(d => {
        console.log(`  ✅ ID ${d.unit_id}: ${d.unit_name_th}`);
    });

    console.log('\nDepartments that will be MISSING:');
    result.recordset.filter(d => ![2,4,5,6].includes(d.level_id)).forEach(d => {
        console.log(`  ❌ ID ${d.unit_id}: ${d.unit_name_th} (level_id: ${d.level_id})`);
    });

    process.exit(0);
})();
