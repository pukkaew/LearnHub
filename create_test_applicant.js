const { poolPromise, sql } = require('./config/database');

async function createTestApplicant() {
    try {
        const pool = await poolPromise;
        console.log('Connected to database');

        // สร้างผู้สมัครทดสอบใหม่
        const testCode = 'TEST' + Math.random().toString(36).substring(2, 10).toUpperCase();

        const result = await pool.request()
            .input('positionId', sql.Int, 65) // CEO
            .input('nationalId', sql.NVarChar(13), '1234567890123')
            .input('firstName', sql.NVarChar(100), 'ทดสอบ')
            .input('lastName', sql.NVarChar(100), 'ระบบ')
            .input('email', sql.NVarChar(255), 'test@test.com')
            .input('phone', sql.NVarChar(20), '0812345678')
            .input('testCode', sql.NVarChar(20), testCode)
            .query(`
                INSERT INTO Applicants (
                    position_id, national_id, first_name, last_name,
                    email, phone, test_code, status, application_date
                )
                OUTPUT INSERTED.*
                VALUES (
                    @positionId, @nationalId, @firstName, @lastName,
                    @email, @phone, @testCode, 'Pending', GETDATE()
                )
            `);

        console.log('Created test applicant:');
        console.log(`  Name: ${result.recordset[0].first_name} ${result.recordset[0].last_name}`);
        console.log(`  Test Code: ${result.recordset[0].test_code}`);
        console.log(`  Status: ${result.recordset[0].status}`);
        console.log(`\nDashboard URL: http://localhost:3000/applicants/dashboard/${result.recordset[0].test_code}`);
        console.log(`Test Interface: http://localhost:3000/applicants/test/${result.recordset[0].test_code}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createTestApplicant();
