const { poolPromise } = require('./config/database');

(async () => {
    const pool = await poolPromise;

    console.log('=== AVAILABLE POSITIONS ===');
    const positions = await pool.request().query('SELECT TOP 10 position_id, position_name FROM Positions ORDER BY position_id');
    console.log(`Found ${positions.recordset.length} positions:\n`);
    positions.recordset.forEach(p => {
        console.log(`  ID ${p.position_id}: ${p.position_name}`);
    });

    console.log('\n=== AVAILABLE DEPARTMENTS ===');
    const departments = await pool.request().query('SELECT TOP 10 unit_id, unit_name_th, unit_name_en FROM OrganizationUnits ORDER BY unit_id');
    console.log(`Found ${departments.recordset.length} departments:\n`);
    departments.recordset.forEach(d => {
        console.log(`  ID ${d.unit_id}: ${d.unit_name_th} (${d.unit_name_en})`);
    });

    process.exit(0);
})();
