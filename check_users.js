const { poolPromise } = require('./config/database');

(async () => {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP 5 user_id, first_name, last_name, employee_id FROM users');
    console.log('Available users for instructor:');
    result.recordset.forEach(u => {
        console.log(`  user_id: ${u.user_id}, name: ${u.first_name} ${u.last_name}, employee_id: ${u.employee_id}`);
    });
    process.exit(0);
})();
