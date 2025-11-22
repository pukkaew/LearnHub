const { poolPromise } = require('./config/database');

async function checkDependencies() {
    try {
        const pool = await poolPromise;

        console.log('🔍 ตรวจสอบ dependencies ของ duration_hours...\n');

        // Check for indexes
        const indexes = await pool.request().query(`
            SELECT
                i.name AS index_name,
                i.type_desc AS index_type
            FROM sys.indexes i
            INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE c.name = 'duration_hours'
            AND OBJECT_NAME(i.object_id) = 'Courses'
        `);

        console.log('📊 Indexes:');
        if (indexes.recordset.length > 0) {
            indexes.recordset.forEach(idx => {
                console.log(`   - ${idx.index_name} (${idx.index_type})`);
            });
        } else {
            console.log('   ไม่มี index');
        }

        // Check for constraints
        const constraints = await pool.request().query(`
            SELECT
                dc.name AS constraint_name,
                dc.definition
            FROM sys.default_constraints dc
            INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
            WHERE c.name = 'duration_hours'
            AND OBJECT_NAME(dc.parent_object_id) = 'Courses'
        `);

        console.log('\n🔒 Constraints:');
        if (constraints.recordset.length > 0) {
            constraints.recordset.forEach(con => {
                console.log(`   - ${con.constraint_name}: ${con.definition}`);
            });
        } else {
            console.log('   ไม่มี constraint');
        }

        // Check for computed columns that use duration_hours
        const computed = await pool.request().query(`
            SELECT
                name AS column_name,
                definition
            FROM sys.computed_columns
            WHERE object_id = OBJECT_ID('Courses')
            AND definition LIKE '%duration_hours%'
        `);

        console.log('\n🧮 Computed Columns:');
        if (computed.recordset.length > 0) {
            computed.recordset.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.definition}`);
            });
        } else {
            console.log('   ไม่มี computed column');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkDependencies();
