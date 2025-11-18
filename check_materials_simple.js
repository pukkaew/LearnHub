const { poolPromise, sql } = require('./config/database');

async function checkMaterials() {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('courseId', sql.Int, 1)
            .query('SELECT * FROM course_materials WHERE course_id = @courseId');

        console.log('📚 Course Materials for Course ID 1:', result.recordset.length, 'รายการ\n');

        if (result.recordset.length > 0) {
            result.recordset.forEach((m, i) => {
                console.log(`บทที่ ${i+1}: ${m.title}`);
                console.log(`  duration: ${m.duration_minutes} นาที`);
                console.log(`  file_path: ${m.file_path || 'NULL'}\n`);
            });
        } else {
            console.log('❌ ไม่มีบทเรียนเลย!\n');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkMaterials();
