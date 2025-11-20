const { poolPromise, sql } = require('./config/database');

async function fixPositionsDepartments() {
    try {
        const pool = await poolPromise;

        console.log('\n🔧 Fixing Positions-Departments Relationship');
        console.log('='.repeat(60));

        // Department IDs:
        // 1 = Information Technology
        // 2 = Human Resources
        // 3 = Finance
        // 4 = Marketing
        // 5 = Operations
        // 6 = Training

        const updates = [
            // IT Department (1)
            { name: 'IT Manager', dept: 1 },
            { name: 'IT Officer', dept: 1 },
            { name: 'System Analyst', dept: 1 },
            { name: 'Developer', dept: 1 },

            // HR Department (2)
            { name: 'HR Manager', dept: 2 },

            // Finance Department (3)
            { name: 'Finance Manager', dept: 3 },
            { name: 'CFO', dept: 3 },

            // Marketing Department (4)
            { name: 'Sales Officer (RC)', dept: 4 },
            { name: 'Sales Supervisor (RC)', dept: 4 },
            { name: 'Branch Manager (RC)', dept: 4 },
            { name: 'Branch Manager (SC)', dept: 4 },

            // Operations Department (5)
            { name: 'Operations Manager', dept: 5 },
            { name: 'Operations Officer', dept: 5 },
            { name: 'COO', dept: 5 },
            { name: 'Warehouse Officer', dept: 5 },
            { name: 'Warehouse Supervisor', dept: 5 },

            // Training Department (6)
            { name: 'Training Officer', dept: 6 },
            { name: 'OD Manager', dept: 6 },

            // Executive (could be any department, let's put in Operations)
            { name: 'CEO', dept: 5 }
        ];

        console.log('\n📝 Updating positions...\n');

        for (const update of updates) {
            try {
                const result = await pool.request()
                    .input('positionName', sql.NVarChar(100), update.name)
                    .input('departmentId', sql.Int, update.dept)
                    .query(`
                        UPDATE positions
                        SET department_id = @departmentId
                        WHERE position_name = @positionName
                    `);

                if (result.rowsAffected[0] > 0) {
                    // Get department name
                    const deptResult = await pool.request()
                        .input('deptId', sql.Int, update.dept)
                        .query('SELECT department_name FROM departments WHERE department_id = @deptId');

                    const deptName = deptResult.recordset[0]?.department_name || 'Unknown';
                    console.log(`   ✅ ${update.name.padEnd(30)} → ${deptName}`);
                } else {
                    console.log(`   ⚠️  Position not found: ${update.name}`);
                }
            } catch (e) {
                console.log(`   ❌ Error updating ${update.name}: ${e.message}`);
            }
        }

        // Verify the changes
        console.log('\n📊 Verification - Positions per Department:');
        console.log('='.repeat(60));

        const verifyResult = await pool.request().query(`
            SELECT
                d.department_id,
                d.department_name,
                COUNT(p.position_id) as position_count,
                STRING_AGG(p.position_name, ', ') as positions
            FROM departments d
            LEFT JOIN positions p ON d.department_id = p.department_id
            GROUP BY d.department_id, d.department_name
            ORDER BY d.department_id
        `);

        verifyResult.recordset.forEach(r => {
            console.log(`\n${r.department_name}:`);
            console.log(`   Count: ${r.position_count} positions`);
            if (r.positions) {
                console.log(`   Positions: ${r.positions}`);
            }
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ Positions-Departments Relationship Fixed!\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixPositionsDepartments();
