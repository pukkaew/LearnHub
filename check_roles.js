const {poolPromise} = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query('SELECT * FROM Roles ORDER BY role_id');
        console.log('\n=== Roles in database ===\n');
        r.recordset.forEach(role => {
            console.log(`  ID: ${role.role_id} - ${role.role_name}`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
