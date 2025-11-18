const {poolPromise} = require('./config/database');

async function addInstructorNameColumn() {
    try {
        console.log('🔧 Adding instructor_name column to courses table...\n');

        const pool = await poolPromise;

        // 1. เพิ่ม column instructor_name
        console.log('1️⃣ Adding instructor_name column...');
        try {
            await pool.request().query(`
                ALTER TABLE courses
                ADD instructor_name NVARCHAR(255) NULL
            `);
            console.log('   ✅ instructor_name column added\n');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('   ⚠️  instructor_name column already exists\n');
            } else {
                throw error;
            }
        }

        // 2. เปลี่ยน instructor_id เป็น nullable
        console.log('2️⃣ Making instructor_id nullable...');
        try {
            await pool.request().query(`
                ALTER TABLE courses
                ALTER COLUMN instructor_id INT NULL
            `);
            console.log('   ✅ instructor_id is now nullable\n');
        } catch (error) {
            console.log('   ⚠️  Could not change instructor_id to nullable:', error.message, '\n');
        }

        console.log('✨ Database schema updated successfully!\n');

    } catch (error) {
        console.error('❌ Error updating schema:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

addInstructorNameColumn();
