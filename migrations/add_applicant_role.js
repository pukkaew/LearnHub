const { poolPromise } = require('../config/database');

async function addApplicantRole() {
    try {
        const pool = await poolPromise;

        console.log('🔄 Adding Applicant role...');

        // Check if Applicant role already exists
        const checkRole = await pool.request().query(`
            SELECT role_id, role_name
            FROM Roles
            WHERE role_name = 'Applicant'
        `);

        if (checkRole.recordset.length > 0) {
            console.log(`⏭️  Applicant role already exists (role_id: ${checkRole.recordset[0].role_id})`);
            return;
        }

        // Insert Applicant role
        const result = await pool.request().query(`
            INSERT INTO Roles (role_name, description, created_at)
            OUTPUT INSERTED.role_id
            VALUES ('Applicant', 'ผู้สมัครงาน - มีสิทธิ์ทำข้อสอบที่ได้รับมอบหมายเท่านั้น', GETDATE())
        `);

        const roleId = result.recordset[0].role_id;
        console.log(`✅ Applicant role created successfully (role_id: ${roleId})`);

        console.log('\n🎉 Applicant role setup completed!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    addApplicantRole()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = addApplicantRole;
