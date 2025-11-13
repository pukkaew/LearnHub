const { poolPromise } = require('./config/database');

async function checkRolesAndPermissions() {
    try {
        const pool = await poolPromise;

        console.log('\n=== Checking Admin User Role ===\n');

        // 1. Check Admin user details with role
        const adminUser = await pool.request().query(`
            SELECT u.user_id, u.employee_id, u.first_name, u.last_name, u.role_id, r.role_name
            FROM Users u
            LEFT JOIN Roles r ON u.role_id = r.role_id
            WHERE u.employee_id = 'ADM001'
        `);

        if (adminUser.recordset.length > 0) {
            const user = adminUser.recordset[0];
            console.log('Admin User Details:');
            console.log('  User ID:', user.user_id);
            console.log('  Employee ID:', user.employee_id);
            console.log('  Name:', user.first_name, user.last_name);
            console.log('  Role ID:', user.role_id);
            console.log('  Role Name:', user.role_name);
        } else {
            console.log('Admin user not found!');
        }

        console.log('\n=== All Roles in System ===\n');

        // 2. List all roles
        const allRoles = await pool.request().query(`
            SELECT role_id, role_name, description
            FROM Roles
            ORDER BY role_id
        `);

        console.log('Available Roles:');
        allRoles.recordset.forEach(role => {
            console.log(`  ${role.role_id}: ${role.role_name} - ${role.description || 'No description'}`);
        });

        console.log('\n=== Checking Category Tables ===\n');

        // 3. Check for category-related tables
        const tables = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME LIKE '%Category%' OR TABLE_NAME LIKE '%Categories%'
            ORDER BY TABLE_NAME
        `);

        console.log('Category-related tables:');
        if (tables.recordset.length > 0) {
            tables.recordset.forEach(table => {
                console.log('  -', table.TABLE_NAME);
            });
        } else {
            console.log('  No category tables found');
        }

        console.log('\n=== Checking Courses Table Structure ===\n');

        // 4. Check Courses table columns
        const courseColumns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Courses'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('Courses table columns:');
        courseColumns.recordset.forEach(col => {
            console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkRolesAndPermissions();
