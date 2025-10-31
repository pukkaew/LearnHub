const { poolPromise, sql } = require('./config/database');

async function createSampleData() {
    try {
        const pool = await poolPromise;

        console.log('\n=== สร้างฝ่ายและแผนกตัวอย่าง ===\n');

        // สร้างฝ่ายภายใต้สำนัก WH (unit_id=32)
        console.log('1. สร้างฝ่ายภายใต้สำนัก WH...');

        const division1 = await pool.request()
            .input('parent_id', sql.Int, 32)
            .input('level_id', sql.Int, 4) // DIVISION
            .input('unit_code', sql.NVarChar(20), 'DIV001')
            .input('unit_name_th', sql.NVarChar(100), 'ฝ่ายปฏิบัติการ')
            .input('unit_name_en', sql.NVarChar(100), 'Operations Division')
            .input('unit_abbr', sql.NVarChar(10), 'OPS')
            .input('status', sql.NVarChar(20), 'ACTIVE')
            .query(`
                INSERT INTO OrganizationUnits (
                    parent_id, level_id, unit_code, unit_name_th, unit_name_en, unit_abbr, status
                )
                OUTPUT INSERTED.unit_id, INSERTED.unit_name_th
                VALUES (
                    @parent_id, @level_id, @unit_code, @unit_name_th, @unit_name_en, @unit_abbr, @status
                )
            `);

        const div1Id = division1.recordset[0].unit_id;
        console.log(`   ✓ สร้าง ${division1.recordset[0].unit_name_th} (ID: ${div1Id})`);

        const division2 = await pool.request()
            .input('parent_id', sql.Int, 32)
            .input('level_id', sql.Int, 4)
            .input('unit_code', sql.NVarChar(20), 'DIV002')
            .input('unit_name_th', sql.NVarChar(100), 'ฝ่ายบริหาร')
            .input('unit_name_en', sql.NVarChar(100), 'Administration Division')
            .input('unit_abbr', sql.NVarChar(10), 'ADM')
            .input('status', sql.NVarChar(20), 'ACTIVE')
            .query(`
                INSERT INTO OrganizationUnits (
                    parent_id, level_id, unit_code, unit_name_th, unit_name_en, unit_abbr, status
                )
                OUTPUT INSERTED.unit_id, INSERTED.unit_name_th
                VALUES (
                    @parent_id, @level_id, @unit_code, @unit_name_th, @unit_name_en, @unit_abbr, @status
                )
            `);

        const div2Id = division2.recordset[0].unit_id;
        console.log(`   ✓ สร้าง ${division2.recordset[0].unit_name_th} (ID: ${div2Id})`);

        // สร้างแผนกภายใต้ฝ่ายปฏิบัติการ
        console.log('\n2. สร้างแผนกภายใต้ฝ่ายปฏิบัติการ...');

        const dept1 = await pool.request()
            .input('parent_id', sql.Int, div1Id)
            .input('level_id', sql.Int, 5) // DEPARTMENT
            .input('unit_code', sql.NVarChar(20), 'DEPT001')
            .input('unit_name_th', sql.NVarChar(100), 'แผนกคลังสินค้า')
            .input('unit_name_en', sql.NVarChar(100), 'Warehouse Department')
            .input('unit_abbr', sql.NVarChar(10), 'WH')
            .input('status', sql.NVarChar(20), 'ACTIVE')
            .query(`
                INSERT INTO OrganizationUnits (
                    parent_id, level_id, unit_code, unit_name_th, unit_name_en, unit_abbr, status
                )
                OUTPUT INSERTED.unit_id, INSERTED.unit_name_th
                VALUES (
                    @parent_id, @level_id, @unit_code, @unit_name_th, @unit_name_en, @unit_abbr, @status
                )
            `);
        console.log(`   ✓ สร้าง ${dept1.recordset[0].unit_name_th} (ID: ${dept1.recordset[0].unit_id})`);

        const dept2 = await pool.request()
            .input('parent_id', sql.Int, div1Id)
            .input('level_id', sql.Int, 5)
            .input('unit_code', sql.NVarChar(20), 'DEPT002')
            .input('unit_name_th', sql.NVarChar(100), 'แผนกจัดส่ง')
            .input('unit_name_en', sql.NVarChar(100), 'Delivery Department')
            .input('unit_abbr', sql.NVarChar(10), 'DEL')
            .input('status', sql.NVarChar(20), 'ACTIVE')
            .query(`
                INSERT INTO OrganizationUnits (
                    parent_id, level_id, unit_code, unit_name_th, unit_name_en, unit_abbr, status
                )
                OUTPUT INSERTED.unit_id, INSERTED.unit_name_th
                VALUES (
                    @parent_id, @level_id, @unit_code, @unit_name_th, @unit_name_en, @unit_abbr, @status
                )
            `);
        console.log(`   ✓ สร้าง ${dept2.recordset[0].unit_name_th} (ID: ${dept2.recordset[0].unit_id})`);

        // สร้างแผนกภายใต้ฝ่ายบริหาร
        console.log('\n3. สร้างแผนกภายใต้ฝ่ายบริหาร...');

        const dept3 = await pool.request()
            .input('parent_id', sql.Int, div2Id)
            .input('level_id', sql.Int, 5)
            .input('unit_code', sql.NVarChar(20), 'DEPT003')
            .input('unit_name_th', sql.NVarChar(100), 'แผนกบัญชี')
            .input('unit_name_en', sql.NVarChar(100), 'Accounting Department')
            .input('unit_abbr', sql.NVarChar(10), 'ACC')
            .input('status', sql.NVarChar(20), 'ACTIVE')
            .query(`
                INSERT INTO OrganizationUnits (
                    parent_id, level_id, unit_code, unit_name_th, unit_name_en, unit_abbr, status
                )
                OUTPUT INSERTED.unit_id, INSERTED.unit_name_th
                VALUES (
                    @parent_id, @level_id, @unit_code, @unit_name_th, @unit_name_en, @unit_abbr, @status
                )
            `);
        console.log(`   ✓ สร้าง ${dept3.recordset[0].unit_name_th} (ID: ${dept3.recordset[0].unit_id})`);

        const dept4 = await pool.request()
            .input('parent_id', sql.Int, div2Id)
            .input('level_id', sql.Int, 5)
            .input('unit_code', sql.NVarChar(20), 'DEPT004')
            .input('unit_name_th', sql.NVarChar(100), 'แผนกทรัพยากรบุคคล')
            .input('unit_name_en', sql.NVarChar(100), 'HR Department')
            .input('unit_abbr', sql.NVarChar(10), 'HR')
            .input('status', sql.NVarChar(20), 'ACTIVE')
            .query(`
                INSERT INTO OrganizationUnits (
                    parent_id, level_id, unit_code, unit_name_th, unit_name_en, unit_abbr, status
                )
                OUTPUT INSERTED.unit_id, INSERTED.unit_name_th
                VALUES (
                    @parent_id, @level_id, @unit_code, @unit_name_th, @unit_name_en, @unit_abbr, @status
                )
            `);
        console.log(`   ✓ สร้าง ${dept4.recordset[0].unit_name_th} (ID: ${dept4.recordset[0].unit_id})`);

        // แสดงโครงสร้างสุดท้าย
        console.log('\n=== โครงสร้างสุดท้าย ===\n');
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
            console.log(`${indent}└─ [${unit.level_name_th}] ${unit.unit_name_th}`);
        });

        console.log('\n✅ สร้างฝ่ายและแผนกเรียบร้อย!');
        console.log('\nโครงสร้างครบถ้วน: บริษัท → สาขา → สำนัก → ฝ่าย → แผนก');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createSampleData();
