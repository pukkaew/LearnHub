const { poolPromise } = require('../config/database');

async function createOrganizationStructure() {
    try {
        const pool = await poolPromise;

        console.log('🏗️  Creating Organization Structure...\n');

        // =========================================
        // 1. OrganizationLevels Table
        // =========================================
        console.log('📋 Step 1: Creating OrganizationLevels table...');

        const checkLevels = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'OrganizationLevels'
        `);

        if (checkLevels.recordset.length === 0) {
            await pool.request().query(`
                CREATE TABLE OrganizationLevels (
                    level_id INT IDENTITY(1,1) PRIMARY KEY,
                    level_code NVARCHAR(20) NOT NULL UNIQUE,
                    level_name_th NVARCHAR(50) NOT NULL,
                    level_name_en NVARCHAR(50) NOT NULL,
                    level_order INT NOT NULL UNIQUE,
                    is_active BIT DEFAULT 1,
                    created_at DATETIME2 DEFAULT GETDATE()
                )
            `);
            console.log('✅ OrganizationLevels table created');

            // Insert default levels
            console.log('📝 Inserting default organization levels...');
            await pool.request().query(`
                INSERT INTO OrganizationLevels (level_code, level_name_th, level_name_en, level_order)
                VALUES
                    ('COMPANY', N'บริษัท', 'Company', 1),
                    ('BRANCH', N'สาขา', 'Branch', 2),
                    ('OFFICE', N'สำนัก', 'Office', 3),
                    ('DIVISION', N'ฝ่าย', 'Division', 4),
                    ('DEPARTMENT', N'แผนก', 'Department', 5),
                    ('SECTION', N'หน่วย', 'Section', 6)
            `);
            console.log('✅ Default levels inserted');
        } else {
            console.log('⏭️  OrganizationLevels table already exists');
        }

        // =========================================
        // 2. OrganizationUnits Table
        // =========================================
        console.log('\n📊 Step 2: Creating OrganizationUnits table...');

        const checkUnits = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'OrganizationUnits'
        `);

        if (checkUnits.recordset.length === 0) {
            await pool.request().query(`
                CREATE TABLE OrganizationUnits (
                    unit_id INT IDENTITY(1,1) PRIMARY KEY,
                    parent_id INT NULL,
                    level_id INT NOT NULL,

                    -- ข้อมูลหน่วยงาน
                    unit_code NVARCHAR(20) NOT NULL UNIQUE,
                    unit_name_th NVARCHAR(100) NOT NULL,
                    unit_name_en NVARCHAR(100) NULL,
                    unit_abbr NVARCHAR(10) NULL,

                    -- ข้อมูลเพิ่มเติม
                    description NVARCHAR(500) NULL,
                    manager_id INT NULL,
                    cost_center NVARCHAR(20) NULL,

                    -- สถานที่
                    address NVARCHAR(500) NULL,
                    phone NVARCHAR(20) NULL,
                    email NVARCHAR(100) NULL,

                    -- Status
                    status NVARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MERGED', 'CLOSED')),
                    is_active BIT DEFAULT 1,

                    -- Audit
                    created_at DATETIME2 DEFAULT GETDATE(),
                    created_by INT NULL,
                    updated_at DATETIME2 DEFAULT GETDATE(),
                    updated_by INT NULL,

                    CONSTRAINT FK_OrganizationUnits_Parent FOREIGN KEY (parent_id)
                        REFERENCES OrganizationUnits(unit_id),
                    CONSTRAINT FK_OrganizationUnits_Level FOREIGN KEY (level_id)
                        REFERENCES OrganizationLevels(level_id),
                    CONSTRAINT FK_OrganizationUnits_Manager FOREIGN KEY (manager_id)
                        REFERENCES Users(user_id)
                )
            `);

            // Create indexes
            await pool.request().query(`
                CREATE INDEX IX_OrganizationUnits_ParentId ON OrganizationUnits(parent_id)
            `);
            await pool.request().query(`
                CREATE INDEX IX_OrganizationUnits_LevelId ON OrganizationUnits(level_id)
            `);
            await pool.request().query(`
                CREATE INDEX IX_OrganizationUnits_Status ON OrganizationUnits(status)
            `);

            console.log('✅ OrganizationUnits table created');

            // Insert default company unit
            console.log('📝 Inserting default company unit...');
            await pool.request().query(`
                INSERT INTO OrganizationUnits (parent_id, level_id, unit_code, unit_name_th, unit_name_en, status)
                VALUES (
                    NULL,
                    (SELECT level_id FROM OrganizationLevels WHERE level_code = 'COMPANY'),
                    'RUXCHAI',
                    N'บริษัท รักชัยห้องเย็น จำกัด',
                    'Rukchai Hongyen Co., Ltd.',
                    'ACTIVE'
                )
            `);
            console.log('✅ Default company unit created');

        } else {
            console.log('⏭️  OrganizationUnits table already exists');
        }

        // =========================================
        // 3. Migrate Departments → OrganizationUnits
        // =========================================
        console.log('\n🔄 Step 3: Migrating Departments to OrganizationUnits...');

        const checkDepartments = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'Departments'
        `);

        if (checkDepartments.recordset.length > 0) {
            // Check if migration already done
            const checkMigrated = await pool.request().query(`
                SELECT COUNT(*) as count
                FROM OrganizationUnits
                WHERE unit_code LIKE 'DEPT-%'
            `);

            if (checkMigrated.recordset[0].count === 0) {
                const departments = await pool.request().query(`
                    SELECT department_id, department_name, description, is_active
                    FROM Departments
                    WHERE is_active = 1
                `);

                if (departments.recordset.length > 0) {
                    console.log(`📦 Found ${departments.recordset.length} departments to migrate`);

                    for (const dept of departments.recordset) {
                        const deptCode = `DEPT-${String(dept.department_id).padStart(3, '0')}`;

                        await pool.request()
                            .input('parentId', 1) // Assume company unit_id = 1
                            .input('levelId', 5) // DEPARTMENT level
                            .input('unitCode', deptCode)
                            .input('unitNameTh', dept.department_name)
                            .input('description', dept.description)
                            .query(`
                                INSERT INTO OrganizationUnits (
                                    parent_id, level_id, unit_code, unit_name_th, description, status
                                )
                                VALUES (
                                    @parentId,
                                    (SELECT level_id FROM OrganizationLevels WHERE level_code = 'DEPARTMENT'),
                                    @unitCode, @unitNameTh, @description, 'ACTIVE'
                                )
                            `);
                    }

                    console.log(`✅ Migrated ${departments.recordset.length} departments`);
                } else {
                    console.log('ℹ️  No departments to migrate');
                }
            } else {
                console.log('⏭️  Departments already migrated');
            }
        } else {
            console.log('ℹ️  Departments table not found, skipping migration');
        }

        // =========================================
        // 4. Update Positions Table
        // =========================================
        console.log('\n📝 Step 4: Updating Positions table...');

        // Check if columns exist
        const checkPositionColumns = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Positions'
            AND COLUMN_NAME IN ('position_type', 'unit_id', 'position_level', 'job_grade', 'min_salary', 'max_salary')
        `);

        const existingColumns = checkPositionColumns.recordset.map(r => r.COLUMN_NAME);

        if (!existingColumns.includes('position_type')) {
            await pool.request().query(`
                ALTER TABLE Positions
                ADD position_type NVARCHAR(20) DEFAULT 'EMPLOYEE' CHECK (position_type IN ('EMPLOYEE', 'APPLICANT'))
            `);
            console.log('✅ Added position_type column');
        }

        if (!existingColumns.includes('unit_id')) {
            await pool.request().query(`
                ALTER TABLE Positions
                ADD unit_id INT NULL
            `);
            await pool.request().query(`
                ALTER TABLE Positions
                ADD CONSTRAINT FK_Positions_Unit FOREIGN KEY (unit_id)
                    REFERENCES OrganizationUnits(unit_id)
            `);
            console.log('✅ Added unit_id column with FK');
        }

        if (!existingColumns.includes('position_level')) {
            await pool.request().query(`
                ALTER TABLE Positions
                ADD position_level NVARCHAR(20) NULL
            `);
            console.log('✅ Added position_level column');
        }

        if (!existingColumns.includes('job_grade')) {
            await pool.request().query(`
                ALTER TABLE Positions
                ADD job_grade NVARCHAR(10) NULL
            `);
            console.log('✅ Added job_grade column');
        }

        if (!existingColumns.includes('min_salary')) {
            await pool.request().query(`
                ALTER TABLE Positions
                ADD min_salary DECIMAL(10,2) NULL,
                    max_salary DECIMAL(10,2) NULL
            `);
            console.log('✅ Added salary columns');
        }

        // =========================================
        // 5. Update Users Table
        // =========================================
        console.log('\n👥 Step 5: Updating Users table...');

        const checkUserColumns = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Users'
            AND COLUMN_NAME = 'unit_id'
        `);

        if (checkUserColumns.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE Users
                ADD unit_id INT NULL
            `);

            await pool.request().query(`
                ALTER TABLE Users
                ADD CONSTRAINT FK_Users_OrganizationUnit
                    FOREIGN KEY (unit_id) REFERENCES OrganizationUnits(unit_id)
            `);

            console.log('✅ Added unit_id column to Users with FK');

            // Migrate department_id → unit_id
            console.log('🔄 Migrating Users.department_id → Users.unit_id...');

            await pool.request().query(`
                UPDATE u
                SET u.unit_id = ou.unit_id
                FROM Users u
                INNER JOIN Departments d ON u.department_id = d.department_id
                INNER JOIN OrganizationUnits ou ON ou.unit_code = CONCAT('DEPT-', RIGHT('000' + CAST(d.department_id AS NVARCHAR), 3))
                WHERE u.department_id IS NOT NULL
            `);

            console.log('✅ Migrated user departments to organization units');
        } else {
            console.log('⏭️  unit_id already exists in Users table');
        }

        console.log('\n🎉 Organization Structure migration completed successfully!\n');
        console.log('📊 Summary:');
        console.log('  ✅ OrganizationLevels - ระดับองค์กร (6 levels)');
        console.log('  ✅ OrganizationUnits - หน่วยงานทั้งหมด');
        console.log('  ✅ Positions - ปรับปรุงรองรับ organization units');
        console.log('  ✅ Users - เพิ่ม unit_id และ migrate ข้อมูล');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    createOrganizationStructure()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = createOrganizationStructure;
