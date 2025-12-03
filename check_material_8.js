require('dotenv').config();
const { poolPromise, sql } = require('./config/database');

async function checkMaterial() {
    try {
        const pool = await poolPromise;

        // Get material 8 from course 5
        const result = await pool.request()
            .input('materialId', sql.Int, 8)
            .query(`
                SELECT * FROM course_materials WHERE material_id = @materialId
            `);

        console.log('=== Material 8 Data ===');
        if (result.recordset.length > 0) {
            const m = result.recordset[0];
            console.log(JSON.stringify(m, null, 2));
            console.log('\n=== Key Fields ===');
            console.log('material_id:', m.material_id);
            console.log('course_id:', m.course_id);
            console.log('title:', m.title);
            console.log('type:', m.type);
            console.log('file_path:', m.file_path);
            console.log('video_url:', m.video_url);
            console.log('file_url:', m.file_url);
            console.log('content:', m.content ? m.content.substring(0, 100) + '...' : 'NULL');
            console.log('description:', m.description ? m.description.substring(0, 100) + '...' : 'NULL');
        } else {
            console.log('No material found with ID 8');
        }

        // Get all materials for course 5
        console.log('\n=== All Materials in Course 5 ===');
        const allMaterials = await pool.request()
            .input('courseId', sql.Int, 5)
            .query(`
                SELECT material_id, title, type, file_path, video_url, order_index
                FROM course_materials
                WHERE course_id = @courseId
                ORDER BY order_index
            `);

        allMaterials.recordset.forEach(m => {
            console.log(`${m.material_id}: ${m.title} (${m.type}) - file_path: ${m.file_path || 'NULL'}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

checkMaterial();
