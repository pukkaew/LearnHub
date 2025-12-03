require('dotenv').config();
const { poolPromise } = require('./config/database');

async function checkMaterials() {
    const pool = await poolPromise;

    // Check all materials in database
    const result = await pool.request().query(`
        SELECT material_id, course_id, title, type, file_path, mime_type, order_index
        FROM course_materials
        ORDER BY course_id, order_index
    `);

    console.log('=== All Materials in Database ===');
    console.log(`Total: ${result.recordset.length} materials\n`);
    result.recordset.forEach(m => {
        console.log(`ID: ${m.material_id}`);
        console.log(`  Course: ${m.course_id}`);
        console.log(`  Title: ${m.title}`);
        console.log(`  Type: ${m.type}`);
        console.log(`  File Path: ${m.file_path || 'NULL'}`);
        console.log(`  MIME Type: ${m.mime_type || 'NULL'}`);
        console.log(`  Order: ${m.order_index}`);
        console.log('---');
    });

    process.exit(0);
}

checkMaterials().catch(e => { console.error(e); process.exit(1); });
