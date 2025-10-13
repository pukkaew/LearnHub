const { poolPromise } = require('../config/database');

async function fixOrganizationLevels() {
    try {
        const pool = await poolPromise;

        console.log('🔍 Checking for units using COMPANY level...');

        // Check if any units use COMPANY level
        const companyLevel = await pool.request().query(`
            SELECT level_id FROM OrganizationLevels WHERE level_code = 'COMPANY'
        `);

        if (companyLevel.recordset.length === 0) {
            console.log('✅ COMPANY level does not exist');
            return;
        }

        const companyLevelId = companyLevel.recordset[0].level_id;

        const unitsUsingCompany = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM OrganizationUnits
            WHERE level_id = ${companyLevelId}
        `);

        const count = unitsUsingCompany.recordset[0].count;

        if (count > 0) {
            console.log(`⚠️  Found ${count} unit(s) using COMPANY level`);
            console.log('🔄 Setting COMPANY level to inactive instead of deleting...');

            await pool.request().query(`
                UPDATE OrganizationLevels
                SET is_active = 0
                WHERE level_code = 'COMPANY'
            `);

            console.log('✅ COMPANY level set to inactive');
        } else {
            console.log('🗑️  No units using COMPANY level, deleting...');

            await pool.request().query(`
                DELETE FROM OrganizationLevels WHERE level_code = 'COMPANY'
            `);

            console.log('✅ COMPANY level deleted');
        }

        // Also set SECTION to inactive if exists
        const sectionCheck = await pool.request().query(`
            SELECT level_id FROM OrganizationLevels WHERE level_code = 'SECTION'
        `);

        if (sectionCheck.recordset.length > 0) {
            await pool.request().query(`
                UPDATE OrganizationLevels
                SET is_active = 0
                WHERE level_code = 'SECTION'
            `);
            console.log('✅ SECTION level set to inactive');
        }

        console.log('');
        console.log('📋 Active Organization Levels:');
        console.log('==================================================');

        const result = await pool.request().query(`
            SELECT level_id, level_code, level_name_th, level_name_en, level_order, is_active
            FROM OrganizationLevels
            WHERE is_active = 1
            ORDER BY level_order
        `);

        result.recordset.forEach(level => {
            console.log(`${level.level_order}. ${level.level_name_th} (${level.level_code}) - ${level.level_name_en}`);
        });

        console.log('==================================================');
        console.log('✅ Done!');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixOrganizationLevels();
