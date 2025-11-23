const { poolPromise } = require('./config/database');

async function checkRelatedTables() {
    try {
        const pool = await poolPromise;

        // Get all tables related to Courses
        const result = await pool.request().query(`
            SELECT
                fk.name AS FK_Name,
                OBJECT_NAME(fk.parent_object_id) AS Child_Table,
                OBJECT_NAME(fk.referenced_object_id) AS Parent_Table
            FROM sys.foreign_keys AS fk
            WHERE OBJECT_NAME(fk.referenced_object_id) = 'Courses'
            OR OBJECT_NAME(fk.parent_object_id) = 'Courses'
        `);

        console.log('\n📋 ตารางที่เกี่ยวข้องกับ Courses:\n');
        result.recordset.forEach(row => {
            console.log(`   ${row.Child_Table} → ${row.Parent_Table} (${row.FK_Name})`);
        });

        console.log('\n');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkRelatedTables();
