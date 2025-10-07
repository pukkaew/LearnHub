const { poolPromise } = require('./config/database');

async function dropTables() {
    try {
        console.log('🗑️  Dropping Settings tables...\n');

        const pool = await poolPromise;
        console.log('✅ Connected to database\n');

        // Drop in correct order (child tables first)
        const tables = [
            'SettingAuditLog',
            'DepartmentSettings',
            'UserSettings',
            'SystemSettings'
        ];

        const procedures = [
            'sp_GetSystemSetting',
            'sp_GetSystemSettingsByCategory',
            'sp_UpdateSystemSetting',
            'sp_GetUserSetting',
            'sp_UpsertUserSetting',
            'sp_GetAllUserSettings',
            'sp_GetSettingAuditLog'
        ];

        // Drop stored procedures
        console.log('Dropping stored procedures...');
        for (const proc of procedures) {
            try {
                await pool.request().query(`DROP PROCEDURE IF EXISTS [dbo].[${proc}]`);
                console.log(`  ✓ Dropped ${proc}`);
            } catch (err) {
                console.log(`  ⚠️  ${proc}: ${err.message}`);
            }
        }

        console.log('\nDropping tables...');
        for (const table of tables) {
            try {
                await pool.request().query(`DROP TABLE IF EXISTS [dbo].[${table}]`);
                console.log(`  ✓ Dropped ${table}`);
            } catch (err) {
                console.log(`  ⚠️  ${table}: ${err.message}`);
            }
        }

        console.log('\n✅ Done!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

dropTables();
