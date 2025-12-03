require('dotenv').config();
const { poolPromise, sql } = require('./config/database');

async function checkMaterials() {
    try {
        const pool = await poolPromise;

        // Get all materials for course 5
        console.log('=== All Materials in Course 5 ===');
        const allMaterials = await pool.request()
            .input('courseId', sql.Int, 5)
            .query(`
                SELECT material_id, title, type, file_path, order_index, content, file_size, mime_type
                FROM course_materials
                WHERE course_id = @courseId
                ORDER BY order_index
            `);

        allMaterials.recordset.forEach(m => {
            console.log(`\n--- Material ${m.material_id} ---`);
            console.log(`  title: ${m.title}`);
            console.log(`  type: ${m.type}`);
            console.log(`  file_path: ${m.file_path || 'NULL'}`);
            console.log(`  file_size: ${m.file_size || 'NULL'}`);
            console.log(`  mime_type: ${m.mime_type || 'NULL'}`);
            console.log(`  order_index: ${m.order_index}`);
            console.log(`  content: ${m.content ? m.content.substring(0, 50) + '...' : 'EMPTY'}`);
        });

        console.log(`\nTotal: ${allMaterials.recordset.length} materials`);

    } catch (error) {
        console.error('Error:', error.message);
    }
    process.exit(0);
}

checkMaterials();
