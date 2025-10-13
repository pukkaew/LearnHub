const { poolPromise, sql } = require('../config/database');

async function seedOrganizationLevels() {
    try {
        const pool = await poolPromise;

        console.log('🏗️  Creating OrganizationLevels table...');

        // Create table if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'OrganizationLevels')
            BEGIN
                CREATE TABLE OrganizationLevels (
                    level_id INT IDENTITY(1,1) PRIMARY KEY,
                    level_code NVARCHAR(20) NOT NULL UNIQUE,
                    level_name_th NVARCHAR(100) NOT NULL,
                    level_name_en NVARCHAR(100),
                    level_order INT NOT NULL,
                    description NVARCHAR(500),
                    is_active BIT DEFAULT 1,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Created table: OrganizationLevels';
            END
        `);

        console.log('✅ Table created/exists');

        // Check if data exists
        const checkResult = await pool.request().query(`
            SELECT COUNT(*) as count FROM OrganizationLevels
        `);

        if (checkResult.recordset[0].count > 0) {
            console.log('⚠️  OrganizationLevels already has data. Skipping insert...');
            console.log('✅ Organization levels already exist!');
        } else {
            console.log('📝 Inserting organization levels...');

            // Insert levels
            await pool.request().query(`
                INSERT INTO OrganizationLevels (level_code, level_name_th, level_name_en, level_order, description, is_active)
                VALUES
                    ('BRANCH', N'สาขา', 'Branch', 1, N'ระดับสาขา - ระดับบนสุดของโครงสร้าง', 1),
                    ('OFFICE', N'สำนัก', 'Office', 2, N'ระดับสำนัก - อยู่ภายใต้สาขา', 1),
                    ('DIVISION', N'ฝ่าย', 'Division', 3, N'ระดับฝ่าย - อยู่ภายใต้สำนัก', 1),
                    ('DEPARTMENT', N'แผนก', 'Department', 4, N'ระดับแผนก - ระดับล่างสุด มีตำแหน่งงานสังกัด', 1)
            `);

            console.log('✅ Organization levels inserted successfully!');
        }

        console.log('');

        // Show results
        const result = await pool.request().query(`
            SELECT level_id, level_code, level_name_th, level_name_en, level_order, is_active
            FROM OrganizationLevels
            ORDER BY level_order
        `);

        console.log('📋 Organization Levels:');
        console.log('==================================================');
        result.recordset.forEach(level => {
            console.log(`${level.level_order}. ${level.level_name_th} (${level.level_code}) - ${level.level_name_en}`);
        });
        console.log('==================================================');
        console.log('');
        console.log('📚 Structure: สาขา → สำนัก → ฝ่าย → แผนก → ตำแหน่งงาน');
        console.log('✅ Done! You can now add organization units.');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding organization levels:', error);
        process.exit(1);
    }
}

// Run the seed
seedOrganizationLevels();
