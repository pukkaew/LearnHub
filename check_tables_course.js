require('dotenv').config();
const { poolPromise } = require('./config/database');

async function checkTables() {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE='BASE TABLE'
        ORDER BY TABLE_NAME
    `);
    console.log('Tables in database:');
    result.recordset.forEach(t => console.log('  ' + t.TABLE_NAME));
    process.exit(0);
}
checkTables().catch(e => { console.error(e); process.exit(1); });
