const { poolPromise, sql } = require('./config/database');

async function createRoles() {
    try {
        const pool = await poolPromise;

        console.log('\n=== ตรวจสอบ Roles ===\n');
        const existing = await pool.request().query('SELECT * FROM Roles ORDER BY role_id');
        console.log('Roles ที่มีอยู่:');
        existing.recordset.forEach(r => console.log(`  ${r.role_id}: ${r.role_name}`));

        // สร้าง Roles ที่ขาดหาย
        const rolesToCreate = [
            { name: 'Employee', desc: 'พนักงานทั่วไป' },
            { name: 'Manager', desc: 'ผู้จัดการ' },
            { name: 'HR', desc: 'ฝ่ายทรัพยากรบุคคล' }
        ];

        console.log('\n=== สร้าง Roles ที่ขาดหาย ===\n');

        for (const role of rolesToCreate) {
            const check = await pool.request()
                .input('roleName', role.name)
                .query('SELECT role_id FROM Roles WHERE role_name = @roleName');

            if (check.recordset.length === 0) {
                const result = await pool.request()
                    .input('roleName', role.name)
                    .input('description', role.desc)
                    .query(`
                        INSERT INTO Roles (role_name, description, is_active, created_at)
                        OUTPUT INSERTED.role_id, INSERTED.role_name
                        VALUES (@roleName, @description, 1, GETDATE())
                    `);
                console.log(`✅ สร้าง ${result.recordset[0].role_name} (ID: ${result.recordset[0].role_id})`);
            } else {
                console.log(`⏭️  ${role.name} มีอยู่แล้ว (ID: ${check.recordset[0].role_id})`);
            }
        }

        console.log('\n=== Roles หลังสร้าง ===\n');
        const final = await pool.request().query('SELECT * FROM Roles ORDER BY role_id');
        final.recordset.forEach(r => console.log(`  ${r.role_id}: ${r.role_name}`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createRoles();
