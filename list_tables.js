const { poolPromise } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        console.log('Tables in database:');
        r.recordset.forEach(t => console.log('  -', t.TABLE_NAME));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
