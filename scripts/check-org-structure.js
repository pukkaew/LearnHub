const { poolPromise } = require('../config/database');

async function checkOrgStructure() {
    try {
        const pool = await poolPromise;

        console.log('=== ตรวจสอบโครงสร้างองค์กร ===\n');

        const result = await pool.request().query(`
            SELECT
                ou.unit_id,
                ou.unit_code,
                ou.unit_name_th,
                ou.parent_id,
                ou.level_id,
                ol.level_code,
                ol.level_name_th as level_name,
                ol.level_order,
                parent.unit_name_th as parent_name
            FROM OrganizationUnits ou
            LEFT JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
            LEFT JOIN OrganizationUnits parent ON ou.parent_id = parent.unit_id
            WHERE ou.is_active = 1
            ORDER BY ol.level_order, ou.unit_code
        `);

        if (result.recordset.length === 0) {
            console.log('❌ ไม่มีหน่วยงานในระบบ\n');
        } else {
            result.recordset.forEach(u => {
                console.log(`📋 ID: ${u.unit_id} | รหัส: ${u.unit_code} | ชื่อ: ${u.unit_name_th}`);
                console.log(`   ระดับ: ${u.level_code} (${u.level_name})`);
                console.log(`   level_id: ${u.level_id} | parent_id: ${u.parent_id || 'NULL'}`);
                console.log(`   หน่วยงานแม่: ${u.parent_name || 'ไม่มี (ระดับสูงสุด)'}`);
                console.log('');
            });
        }

        console.log('=== ตรวจสอบระดับองค์กร ===\n');
        const levels = await pool.request().query(`
            SELECT level_id, level_code, level_name_th, level_order, is_active
            FROM OrganizationLevels
            ORDER BY level_order
        `);

        levels.recordset.forEach(l => {
            const status = l.is_active ? '✅ Active' : '❌ Inactive';
            console.log(`${status} | ${l.level_code} (${l.level_name_th}) - Order: ${l.level_order} - ID: ${l.level_id}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkOrgStructure();
