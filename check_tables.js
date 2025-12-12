const {poolPromise} = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME LIKE '%Bank%' OR TABLE_NAME LIKE '%Question%'
            ORDER BY TABLE_NAME
        `);
        console.log('Tables found:');
        r.recordset.forEach(row => console.log('  -', row.TABLE_NAME));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
