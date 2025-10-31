const { poolPromise, sql } = require('./config/database');

async function fixStructure() {
    try {
        const pool = await poolPromise;

        console.log('\n=== แก้ไขโครงสร้างองค์กร ===\n');

        // 1. เปลี่ยน WH และ WH2 จาก DIVISION (level_id=4) เป็น OFFICE (level_id=3)
        console.log('1. เปลี่ยน WH และ WH2 จากฝ่ายเป็นสำนัก...');
        const updateResult = await pool.request()
            .query(`
                UPDATE OrganizationUnits
                SET level_id = 3
                WHERE unit_id IN (32, 33)
            `);
        console.log(`   อัพเดทเรียบร้อย ${updateResult.rowsAffected[0]} หน่วย`);

        // 2. ลบแผนกทดสอบที่สร้างไว้
        console.log('\n2. ลบแผนกทดสอบที่สร้างไว้...');
        const deleteResult = await pool.request()
            .query(`
                DELETE FROM OrganizationUnits
                WHERE unit_id = 34
            `);
        console.log(`   ลบเรียบร้อย ${deleteResult.rowsAffected[0]} หน่วย`);

        // 3. แสดงโครงสร้างใหม่
        console.log('\n3. โครงสร้างหลังแก้ไข:\n');
        const treeResult = await pool.request().query(`
            WITH OrgTree AS (
                SELECT
                    ou.unit_id,
                    ou.unit_code,
                    ou.unit_name_th,
                    ol.level_code,
                    ol.level_name_th,
                    ou.parent_id,
                    0 as depth,
                    CAST(ou.unit_name_th AS NVARCHAR(500)) as path
                FROM OrganizationUnits ou
                INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                WHERE ou.parent_id IS NULL

                UNION ALL

                SELECT
                    ou.unit_id,
                    ou.unit_code,
                    ou.unit_name_th,
                    ol.level_code,
                    ol.level_name_th,
                    ou.parent_id,
                    t.depth + 1,
                    CAST(t.path + ' > ' + ou.unit_name_th AS NVARCHAR(500))
                FROM OrganizationUnits ou
                INNER JOIN OrganizationLevels ol ON ou.level_id = ol.level_id
                INNER JOIN OrgTree t ON ou.parent_id = t.unit_id
                WHERE ou.is_active = 1
            )
            SELECT * FROM OrgTree ORDER BY path
        `);

        treeResult.recordset.forEach(unit => {
            const indent = '  '.repeat(unit.depth);
            console.log(`${indent}└─ [${unit.level_name_th}] ${unit.unit_name_th} (${unit.unit_code})`);
        });

        console.log('\n✅ แก้ไขโครงสร้างเรียบร้อย!');
        console.log('\nตอนนี้โครงสร้างคือ: บริษัท → สาขา → สำนัก');
        console.log('ยังไม่มี: ฝ่าย และ แผนก');
        console.log('\nต้องการให้สร้างฝ่ายและแผนกตัวอย่างหรือไม่?');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixStructure();
