const { poolPromise } = require('./config/database');

async function checkRoles() {
    try {
        const pool = await poolPromise;

        console.log('\n=== Roles in Database ===\n');
        const result = await pool.request().query('SELECT role_id, role_name, description, is_active FROM Roles ORDER BY role_id');

        result.recordset.forEach(r => {
            const status = r.is_active ? 'Active' : 'Inactive';
            console.log('ID:', r.role_id, '| Name:', r.role_name, '| Status:', status);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkRoles();
