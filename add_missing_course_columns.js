const {poolPromise} = require('./config/database');

async function addMissingColumns() {
    try {
        console.log('🔧 Adding missing columns to courses table...\n');

        const pool = await poolPromise;

        // รายการ columns ที่ต้องเพิ่ม
        const columnsToAdd = [
            { name: 'course_code', type: 'NVARCHAR(50)', nullable: true },
            { name: 'course_type', type: 'NVARCHAR(50)', nullable: true },
            { name: 'language', type: 'NVARCHAR(20)', nullable: true },
            { name: 'learning_objectives', type: 'NVARCHAR(MAX)', nullable: true },
            { name: 'target_audience', type: 'NVARCHAR(MAX)', nullable: true },
            { name: 'prerequisite_knowledge', type: 'NVARCHAR(MAX)', nullable: true },
            { name: 'intro_video_url', type: 'NVARCHAR(500)', nullable: true },
            { name: 'max_students', type: 'INT', nullable: true },
            { name: 'passing_score', type: 'INT', nullable: true },
            { name: 'max_attempts', type: 'INT', nullable: true },
            { name: 'show_correct_answers', type: 'BIT', nullable: true },
            { name: 'is_published', type: 'BIT', nullable: true },
            { name: 'certificate_template', type: 'NVARCHAR(255)', nullable: true },
            { name: 'certificate_validity', type: 'NVARCHAR(50)', nullable: true }
        ];

        for (const column of columnsToAdd) {
            try {
                console.log(`Adding column: ${column.name}...`);
                await pool.request().query(`
                    ALTER TABLE courses
                    ADD ${column.name} ${column.type} ${column.nullable ? 'NULL' : 'NOT NULL'}
                `);
                console.log(`✅ ${column.name} added\n`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log(`⚠️  ${column.name} already exists\n`);
                } else {
                    console.error(`❌ Error adding ${column.name}:`, error.message, '\n');
                }
            }
        }

        console.log('✨ All missing columns processed!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

addMissingColumns();
