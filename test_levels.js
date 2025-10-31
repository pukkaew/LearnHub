const { poolPromise } = require('./config/database');

async function testLevels() {
    try {
        const pool = await poolPromise;

        console.log('\n=== Organization Levels ===');
        const levelsResult = await pool.request()
            .query(`
                SELECT level_id, level_code, level_name_th, level_name_en, level_order, is_active
                FROM OrganizationLevels
                ORDER BY level_order
            `);
        console.log(levelsResult.recordset);

        console.log('\n=== Units by Level ===');
        const unitsByLevel = await pool.request()
            .query(`
                SELECT ol.level_code, ol.level_name_th, COUNT(ou.unit_id) as unit_count
                FROM OrganizationLevels ol
                LEFT JOIN OrganizationUnits ou ON ol.level_id = ou.level_id
                GROUP BY ol.level_code, ol.level_name_th, ol.level_order
                ORDER BY ol.level_order
            `);
        console.log(unitsByLevel.recordset);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testLevels();
