const { poolPromise, sql } = require('./config/database');
const bcrypt = require('bcryptjs');

async function testCreateUser() {
    try {
        const pool = await poolPromise;

        console.log('\n=== ทดสอบสร้าง User โดยไม่มีฝ่ายและแผนก ===\n');

        // Test 1: สร้าง User โดยมีเฉพาะสาขา
        console.log('Test 1: สร้าง User โดยมีเฉพาะสาขา (ไม่มี office, division, department)');
        const hashedPassword = await bcrypt.hash('Test1234', 10);

        try {
            const result1 = await pool.request()
                .input('employeeId', sql.NVarChar(20), 'TEST001')
                .input('username', sql.NVarChar(50), 'TEST001')
                .input('password', sql.NVarChar(255), hashedPassword)
                .input('email', sql.NVarChar(100), 'test001@ruxchai.com')
                .input('firstName', sql.NVarChar(50), 'ทดสอบ')
                .input('lastName', sql.NVarChar(50), 'ระบบ')
                .input('branchId', sql.Int, 29) // สาขารักชัย
                .input('officeId', sql.Int, null)
                .input('divisionId', sql.Int, null)
                .input('departmentId', sql.Int, null)
                .input('positionId', sql.Int, null)
                .input('roleId', sql.Int, 1)
                .input('phone', sql.NVarChar(20), '0812345678')
                .query(`
                    INSERT INTO Users (
                        employee_id, username, password, email,
                        first_name, last_name,
                        branch_id, office_id, division_id, department_id, position_id, role_id,
                        phone, is_active, email_verified, created_at, password_changed_at
                    )
                    OUTPUT INSERTED.user_id, INSERTED.employee_id, INSERTED.first_name
                    VALUES (
                        @employeeId, @username, @password, @email,
                        @firstName, @lastName,
                        @branchId, @officeId, @divisionId, @departmentId, @positionId, @roleId,
                        @phone, 1, 0, GETDATE(), GETDATE()
                    )
                `);

            console.log('✅ สร้างสำเร็จ:', result1.recordset[0]);
            console.log(`   User ID: ${result1.recordset[0].user_id}`);
            console.log(`   Employee ID: ${result1.recordset[0].employee_id}`);
            console.log(`   Name: ${result1.recordset[0].first_name}`);
        } catch (error) {
            console.log('❌ สร้างไม่สำเร็จ:', error.message);
        }

        // Test 2: สร้าง User โดยมีสาขา + สำนัก (ไม่มี division, department)
        console.log('\nTest 2: สร้าง User โดยมีสาขา + สำนัก (ไม่มี division, department)');

        try {
            const result2 = await pool.request()
                .input('employeeId', sql.NVarChar(20), 'TEST002')
                .input('username', sql.NVarChar(50), 'TEST002')
                .input('password', sql.NVarChar(255), hashedPassword)
                .input('email', sql.NVarChar(100), 'test002@ruxchai.com')
                .input('firstName', sql.NVarChar(50), 'ทดสอบ2')
                .input('lastName', sql.NVarChar(50), 'ระบบ2')
                .input('branchId', sql.Int, 29)
                .input('officeId', sql.Int, 32) // สำนัก WH
                .input('divisionId', sql.Int, null)
                .input('departmentId', sql.Int, null)
                .input('positionId', sql.Int, null)
                .input('roleId', sql.Int, 1)
                .input('phone', sql.NVarChar(20), '0812345679')
                .query(`
                    INSERT INTO Users (
                        employee_id, username, password, email,
                        first_name, last_name,
                        branch_id, office_id, division_id, department_id, position_id, role_id,
                        phone, is_active, email_verified, created_at, password_changed_at
                    )
                    OUTPUT INSERTED.user_id, INSERTED.employee_id, INSERTED.first_name
                    VALUES (
                        @employeeId, @username, @password, @email,
                        @firstName, @lastName,
                        @branchId, @officeId, @divisionId, @departmentId, @positionId, @roleId,
                        @phone, 1, 0, GETDATE(), GETDATE()
                    )
                `);

            console.log('✅ สร้างสำเร็จ:', result2.recordset[0]);
            console.log(`   User ID: ${result2.recordset[0].user_id}`);
            console.log(`   Employee ID: ${result2.recordset[0].employee_id}`);
            console.log(`   Name: ${result2.recordset[0].first_name}`);
        } catch (error) {
            console.log('❌ สร้างไม่สำเร็จ:', error.message);
        }

        // ลบ test users
        console.log('\nลบ test users...');
        await pool.request().query(`
            DELETE FROM Users WHERE employee_id IN ('TEST001', 'TEST002')
        `);
        console.log('✅ ลบเรียบร้อย');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testCreateUser();
