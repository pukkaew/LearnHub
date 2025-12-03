// Check course_materials table
const { poolPromise, sql } = require('./config/database');

async function checkMaterials() {
    try {
        const pool = await poolPromise;

        // Get recent materials
        const result = await pool.request()
            .query(`
                SELECT TOP 20
                    cm.material_id,
                    cm.course_id,
                    cm.title,
                    cm.type,
                    cm.file_path,
                    cm.file_size,
                    cm.mime_type,
                    cm.description,
                    cm.content,
                    cm.order_index,
                    c.title as course_title
                FROM course_materials cm
                LEFT JOIN courses c ON cm.course_id = c.course_id
                ORDER BY cm.created_at DESC
            `);

        console.log('\n=== Recent Course Materials ===');
        console.log('Total found:', result.recordset.length);

        result.recordset.forEach((m, i) => {
            console.log(`\n--- Material #${i+1} ---`);
            console.log('  material_id:', m.material_id);
            console.log('  course_id:', m.course_id);
            console.log('  course_title:', m.course_title);
            console.log('  title:', m.title);
            console.log('  type:', m.type);
            console.log('  file_path:', m.file_path);
            console.log('  file_size:', m.file_size);
            console.log('  mime_type:', m.mime_type);
            console.log('  description:', m.description?.substring(0, 100));
        });

        // Count by type
        const typeCount = await pool.request()
            .query(`
                SELECT type, COUNT(*) as count
                FROM course_materials
                GROUP BY type
            `);

        console.log('\n=== Materials by Type ===');
        typeCount.recordset.forEach(t => {
            console.log(`  ${t.type}: ${t.count}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkMaterials();
