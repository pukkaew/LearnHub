require('dotenv').config();
const sql = require('mssql');

// Database configuration
const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '@Rc9988!Sql',
    server: process.env.DB_SERVER || '45.136.253.81',
    database: process.env.DB_DATABASE || 'RC_LearnHub',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true
    },
    port: parseInt(process.env.DB_PORT || '1433')
};

async function runMigration() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('Connected successfully!');

        // Check and add branch_id column
        console.log('\nChecking branch_id column...');
        const branchCheck = await pool.request().query(`
            SELECT * FROM sys.columns
            WHERE object_id = OBJECT_ID(N'[users]') AND name = 'branch_id'
        `);

        if (branchCheck.recordset.length === 0) {
            console.log('Adding branch_id column...');
            await pool.request().query(`
                ALTER TABLE [users] ADD [branch_id] INT NULL;
            `);
            console.log('✓ Added branch_id column');
        } else {
            console.log('✓ branch_id column already exists');
        }

        // Check and add office_id column
        console.log('\nChecking office_id column...');
        const officeCheck = await pool.request().query(`
            SELECT * FROM sys.columns
            WHERE object_id = OBJECT_ID(N'[users]') AND name = 'office_id'
        `);

        if (officeCheck.recordset.length === 0) {
            console.log('Adding office_id column...');
            await pool.request().query(`
                ALTER TABLE [users] ADD [office_id] INT NULL;
            `);
            console.log('✓ Added office_id column');
        } else {
            console.log('✓ office_id column already exists');
        }

        // Check and add division_id column
        console.log('\nChecking division_id column...');
        const divisionCheck = await pool.request().query(`
            SELECT * FROM sys.columns
            WHERE object_id = OBJECT_ID(N'[users]') AND name = 'division_id'
        `);

        if (divisionCheck.recordset.length === 0) {
            console.log('Adding division_id column...');
            await pool.request().query(`
                ALTER TABLE [users] ADD [division_id] INT NULL;
            `);
            console.log('✓ Added division_id column');
        } else {
            console.log('✓ division_id column already exists');
        }

        // Check if OrganizationUnits table exists
        console.log('\nChecking OrganizationUnits table...');
        const orgTableCheck = await pool.request().query(`
            SELECT * FROM sys.tables WHERE name = 'OrganizationUnits'
        `);

        if (orgTableCheck.recordset.length > 0) {
            console.log('✓ OrganizationUnits table exists');

            // Add FK for branch_id
            console.log('\nChecking FK_Users_Branch constraint...');
            const branchFKCheck = await pool.request().query(`
                SELECT * FROM sys.foreign_keys WHERE name = 'FK_Users_Branch'
            `);

            if (branchFKCheck.recordset.length === 0) {
                console.log('Adding FK constraint for branch_id...');
                await pool.request().query(`
                    ALTER TABLE [users]
                    ADD CONSTRAINT FK_Users_Branch
                    FOREIGN KEY ([branch_id]) REFERENCES [OrganizationUnits]([unit_id]);
                `);
                console.log('✓ Added FK constraint for branch_id');
            } else {
                console.log('✓ FK_Users_Branch constraint already exists');
            }

            // Add FK for office_id
            console.log('\nChecking FK_Users_Office constraint...');
            const officeFKCheck = await pool.request().query(`
                SELECT * FROM sys.foreign_keys WHERE name = 'FK_Users_Office'
            `);

            if (officeFKCheck.recordset.length === 0) {
                console.log('Adding FK constraint for office_id...');
                await pool.request().query(`
                    ALTER TABLE [users]
                    ADD CONSTRAINT FK_Users_Office
                    FOREIGN KEY ([office_id]) REFERENCES [OrganizationUnits]([unit_id]);
                `);
                console.log('✓ Added FK constraint for office_id');
            } else {
                console.log('✓ FK_Users_Office constraint already exists');
            }

            // Add FK for division_id
            console.log('\nChecking FK_Users_Division constraint...');
            const divisionFKCheck = await pool.request().query(`
                SELECT * FROM sys.foreign_keys WHERE name = 'FK_Users_Division'
            `);

            if (divisionFKCheck.recordset.length === 0) {
                console.log('Adding FK constraint for division_id...');
                await pool.request().query(`
                    ALTER TABLE [users]
                    ADD CONSTRAINT FK_Users_Division
                    FOREIGN KEY ([division_id]) REFERENCES [OrganizationUnits]([unit_id]);
                `);
                console.log('✓ Added FK constraint for division_id');
            } else {
                console.log('✓ FK_Users_Division constraint already exists');
            }
        } else {
            console.log('⚠ OrganizationUnits table does not exist. Skipping FK constraints.');
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('Users table now has branch_id, office_id, and division_id columns.');

        await pool.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
