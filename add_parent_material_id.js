// Migration: Add parent_material_id column to course_materials table
const { poolPromise } = require('./config/database');

async function migrate() {
    const pool = await poolPromise;

    console.log('🔧 Adding parent_material_id column...');

    try {
        await pool.request().query(`
            ALTER TABLE course_materials
            ADD parent_material_id INT NULL
        `);
        console.log('✅ Column parent_material_id added');
    } catch (e) {
        if (e.message.includes('already exists') || e.message.includes('Column names')) {
            console.log('ℹ️ Column already exists');
        } else {
            console.log('❌ Error:', e.message);
        }
    }

    // Verify
    const result = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'course_materials' AND COLUMN_NAME = 'parent_material_id'
    `);
    console.log('Verification:', result.recordset.length > 0 ? 'Column exists ✅' : 'Column NOT found ❌');

    process.exit(0);
}

migrate();
