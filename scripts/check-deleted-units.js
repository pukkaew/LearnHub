const { poolPromise } = require('../config/database');

async function checkDeletedUnits() {
    try {
        const pool = await poolPromise;

        console.log('🗑️ หน่วยงานที่ถูกลบ (is_active = 0):');
        console.log('==================================================');

        const result = await pool.request().query(`
            SELECT unit_code, unit_name_th, is_active
            FROM OrganizationUnits
            WHERE is_active = 0
            ORDER BY unit_code
        `);

        if (result.recordset.length === 0) {
            console.log('(ไม่มีหน่วยงานที่ถูกลบ)');
        } else {
            result.recordset.forEach(unit => {
                console.log(`- รหัส: ${unit.unit_code} | ชื่อ: ${unit.unit_name_th}`);
            });
        }

        console.log('==================================================');
        console.log('');
        console.log('✅ หน่วยงานที่ active (is_active = 1):');
        console.log('==================================================');

        const activeResult = await pool.request().query(`
            SELECT unit_code, unit_name_th, is_active
            FROM OrganizationUnits
            WHERE is_active = 1
            ORDER BY unit_code
        `);

        activeResult.recordset.forEach(unit => {
            console.log(`- รหัส: ${unit.unit_code} | ชื่อ: ${unit.unit_name_th}`);
        });

        console.log('==================================================');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkDeletedUnits();
