const { poolPromise } = require('./config/database');

async function checkColumnType() {
    try {
        const pool = await poolPromise;

        console.log('🔍 ตรวจสอบ column type ของ duration_hours...\n');

        const result = await pool.request().query(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                NUMERIC_PRECISION,
                NUMERIC_SCALE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Courses'
            AND COLUMN_NAME = 'duration_hours'
        `);

        if (result.recordset.length > 0) {
            const col = result.recordset[0];
            console.log('📋 Column Info:');
            console.log('='.repeat(60));
            console.log(`Column Name:  ${col.COLUMN_NAME}`);
            console.log(`Data Type:    ${col.DATA_TYPE}`);
            console.log(`Precision:    ${col.NUMERIC_PRECISION}`);
            console.log(`Scale:        ${col.NUMERIC_SCALE}`);
            console.log('='.repeat(60));

            if (col.DATA_TYPE === 'int') {
                console.log('\n❌ ปัญหา: duration_hours เป็น INT ซึ่งไม่รองรับทศนิยม');
                console.log('💡 แนะนำ: ควรเปลี่ยนเป็น DECIMAL(5,2) หรือ FLOAT');
                console.log('\n📝 SQL สำหรับแก้ไข:');
                console.log('ALTER TABLE Courses ALTER COLUMN duration_hours DECIMAL(5,2);');
            } else if (col.DATA_TYPE === 'decimal' || col.DATA_TYPE === 'float') {
                console.log('\n✅ ดี: duration_hours รองรับทศนิยม');
            }
        } else {
            console.log('❌ ไม่พบ column duration_hours');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkColumnType();
