/**
 * Migration: Add Test Positions (Many-to-Many)
 * สร้างตารางสำหรับกำหนดข้อสอบให้หลายตำแหน่ง
 * รวมถึง flag สำหรับข้อสอบกลางที่ทุกตำแหน่งต้องสอบ
 */

const { poolPromise, sql } = require('../config/database');

async function up() {
    const pool = await poolPromise;

    console.log('Adding is_global_applicant_test column to Tests table...');

    // 1. เพิ่ม column is_global_applicant_test ใน Tests
    await pool.request().query(`
        IF NOT EXISTS (
            SELECT * FROM sys.columns
            WHERE object_id = OBJECT_ID('Tests') AND name = 'is_global_applicant_test'
        )
        ALTER TABLE Tests ADD is_global_applicant_test BIT DEFAULT 0
    `);

    console.log('Creating TestPositions table...');

    // 2. สร้างตาราง TestPositions (Many-to-Many)
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TestPositions' AND xtype='U')
        CREATE TABLE TestPositions (
            id INT IDENTITY(1,1) PRIMARY KEY,
            test_id INT NOT NULL,
            position_id INT NOT NULL,
            test_order INT DEFAULT 1,
            is_required BIT DEFAULT 1,
            passing_score_override INT NULL,
            weight_percent INT DEFAULT 100,
            is_active BIT DEFAULT 1,
            created_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT FK_TestPositions_Test FOREIGN KEY (test_id) REFERENCES Tests(test_id) ON DELETE CASCADE,
            CONSTRAINT FK_TestPositions_Position FOREIGN KEY (position_id) REFERENCES Positions(position_id),
            CONSTRAINT UQ_TestPositions UNIQUE (test_id, position_id)
        )
    `);

    console.log('Creating indexes...');

    // 3. สร้าง indexes
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TestPositions_Test')
        CREATE INDEX IX_TestPositions_Test ON TestPositions(test_id);

        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TestPositions_Position')
        CREATE INDEX IX_TestPositions_Position ON TestPositions(position_id);

        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Tests_GlobalApplicant')
        CREATE INDEX IX_Tests_GlobalApplicant ON Tests(is_global_applicant_test) WHERE is_global_applicant_test = 1;
    `);

    console.log('Migration completed successfully!');
}

async function down() {
    const pool = await poolPromise;

    console.log('Dropping TestPositions table...');
    await pool.request().query(`
        IF EXISTS (SELECT * FROM sysobjects WHERE name='TestPositions' AND xtype='U')
        DROP TABLE TestPositions
    `);

    console.log('Removing is_global_applicant_test column...');
    await pool.request().query(`
        IF EXISTS (
            SELECT * FROM sys.columns
            WHERE object_id = OBJECT_ID('Tests') AND name = 'is_global_applicant_test'
        )
        ALTER TABLE Tests DROP COLUMN is_global_applicant_test
    `);

    console.log('Rollback completed successfully!');
}

// Run migration
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.includes('--down')) {
        down().then(() => process.exit(0)).catch(err => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
    } else {
        up().then(() => process.exit(0)).catch(err => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
    }
}

module.exports = { up, down };
