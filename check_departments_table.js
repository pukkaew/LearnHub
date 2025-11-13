const { poolPromise } = require('./config/database');

async function checkDepartmentsTable() {
    try {
        const pool = await poolPromise;

        console.log('\n=== Checking for Departments/Organization Tables ===\n');

        // Check all tables related to departments/organization
        const tables = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME LIKE '%Department%' OR TABLE_NAME LIKE '%Organization%'
            ORDER BY TABLE_NAME
        `);

        console.log('Related tables found:');
        tables.recordset.forEach(table => {
            console.log('  -', table.TABLE_NAME);
        });

        console.log('\n=== Testing User.findById for ADM001 ===\n');

        // Try to get user with the current query
        try {
            const userResult = await pool.request().query(`
                SELECT u.*,
                       r.role_name,
                       d.department_name,
                       p.position_name,
                       p.level as position_level
                FROM Users u
                LEFT JOIN Roles r ON u.role_id = r.role_id
                LEFT JOIN Departments d ON u.department_id = d.department_id
                LEFT JOIN Positions p ON u.position_id = p.position_id
                WHERE u.employee_id = 'ADM001'
            `);

            if (userResult.recordset.length > 0) {
                const user = userResult.recordset[0];
                console.log('SUCCESS - User found with current query:');
                console.log('  User ID:', user.user_id);
                console.log('  Name:', user.first_name, user.last_name);
                console.log('  Role Name:', user.role_name);
                console.log('  Department Name:', user.department_name);
                console.log('  Position Name:', user.position_name);
            }
        } catch (error) {
            console.log('ERROR with current query:', error.message);

            // Try with OrganizationUnits instead
            console.log('\n=== Trying with OrganizationUnits table ===\n');
            const userResult2 = await pool.request().query(`
                SELECT u.*,
                       r.role_name,
                       ou.unit_name_th as department_name,
                       p.position_name_th as position_name,
                       p.level as position_level
                FROM Users u
                LEFT JOIN Roles r ON u.role_id = r.role_id
                LEFT JOIN OrganizationUnits ou ON u.department_id = ou.unit_id
                LEFT JOIN Positions p ON u.position_id = p.position_id
                WHERE u.employee_id = 'ADM001'
            `);

            if (userResult2.recordset.length > 0) {
                const user = userResult2.recordset[0];
                console.log('SUCCESS - User found with OrganizationUnits:');
                console.log('  User ID:', user.user_id);
                console.log('  Name:', user.first_name, user.last_name);
                console.log('  Role Name:', user.role_name);
                console.log('  Department Name:', user.department_name);
                console.log('  Position Name:', user.position_name);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDepartmentsTable();
