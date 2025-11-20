const { poolPromise, sql } = require('./config/database');

async function checkMaterialsEncoding() {
    try {
        const pool = await poolPromise;

        console.log('\n🔍 Checking Materials Encoding');
        console.log('='.repeat(60));

        // Check materials
        const materialsResult = await pool.request()
            .input('courseId', sql.Int, 1)
            .query('SELECT * FROM course_materials WHERE course_id = @courseId ORDER BY material_id');

        if (materialsResult.recordset.length === 0) {
            console.log('No materials found');
            process.exit(0);
        }

        materialsResult.recordset.forEach((material, index) => {
            console.log(`\n📄 Material ${index + 1}:`);
            console.log(`  ID: ${material.material_id}`);
            console.log(`  Title: ${material.title}`);
            console.log(`  File Path: ${material.file_path}`);

            // Check for mojibake
            if (material.title && material.title.match(/Ã|à¸|Â/)) {
                console.log(`  ⚠️  MOJIBAKE DETECTED!`);

                // Try to fix
                try {
                    const latin1Buffer = Buffer.from(material.title, 'latin1');
                    const utf8String = latin1Buffer.toString('utf8');
                    console.log(`  Fixed: ${utf8String}`);
                } catch (e) {
                    console.log(`  Cannot decode`);
                }
            }
        });

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkMaterialsEncoding();
