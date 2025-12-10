/**
 * Migration: Create Position Test Sets Tables
 * สร้างตารางสำหรับกำหนดชุดข้อสอบหลายชุดต่อตำแหน่ง
 */

const { poolPromise, sql } = require('../config/database');

async function up() {
    const pool = await poolPromise;

    console.log('Creating PositionTestSets table...');

    // ตารางกำหนดว่าตำแหน่งไหนต้องสอบข้อสอบอะไรบ้าง
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PositionTestSets' AND xtype='U')
        CREATE TABLE PositionTestSets (
            set_id INT IDENTITY(1,1) PRIMARY KEY,
            position_id INT NOT NULL,
            test_id INT NOT NULL,
            test_order INT DEFAULT 1,                    -- ลำดับการสอบ (1, 2, 3...)
            test_category NVARCHAR(50) NULL,             -- หมวดหมู่: language, general, specific
            is_required BIT DEFAULT 1,                   -- บังคับต้องสอบหรือไม่
            weight_percent INT DEFAULT 100,              -- น้ำหนักคะแนน (%)
            passing_score_override INT NULL,             -- เกณฑ์ผ่านเฉพาะข้อสอบนี้ (ถ้าต้องการแตกต่างจาก default)
            is_active BIT DEFAULT 1,
            created_at DATETIME2 DEFAULT GETDATE(),
            updated_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT FK_PositionTestSets_Position FOREIGN KEY (position_id) REFERENCES Positions(position_id),
            CONSTRAINT FK_PositionTestSets_Test FOREIGN KEY (test_id) REFERENCES Tests(test_id),
            CONSTRAINT UQ_PositionTestSets UNIQUE (position_id, test_id)
        )
    `);

    console.log('Creating PositionTestSetConfig table...');

    // ตารางกำหนดเกณฑ์การผ่านรวม
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PositionTestSetConfig' AND xtype='U')
        CREATE TABLE PositionTestSetConfig (
            config_id INT IDENTITY(1,1) PRIMARY KEY,
            position_id INT NOT NULL UNIQUE,
            passing_criteria NVARCHAR(20) DEFAULT 'all_pass',  -- all_pass, average, min_tests
            min_average_score INT DEFAULT 60,                   -- คะแนนเฉลี่ยขั้นต่ำ (ถ้าใช้ average)
            min_tests_to_pass INT DEFAULT NULL,                 -- จำนวนข้อสอบขั้นต่ำที่ต้องผ่าน (ถ้าใช้ min_tests)
            allow_partial_completion BIT DEFAULT 0,             -- อนุญาตให้สอบไม่ครบได้หรือไม่
            test_code_prefix NVARCHAR(10) DEFAULT 'TEST',       -- Prefix สำหรับสร้าง test code
            test_code_expiry_days INT DEFAULT 7,                -- Test code หมดอายุกี่วัน
            max_attempts_per_test INT DEFAULT 1,                -- จำนวนครั้งที่สอบได้ต่อข้อสอบ
            created_at DATETIME2 DEFAULT GETDATE(),
            updated_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT FK_PositionTestSetConfig_Position FOREIGN KEY (position_id) REFERENCES Positions(position_id)
        )
    `);

    console.log('Creating ApplicantTestProgress table...');

    // ตารางเก็บความคืบหน้าการสอบของผู้สมัคร
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ApplicantTestProgress' AND xtype='U')
        CREATE TABLE ApplicantTestProgress (
            progress_id INT IDENTITY(1,1) PRIMARY KEY,
            applicant_id INT NOT NULL,
            position_id INT NOT NULL,
            test_id INT NOT NULL,
            set_id INT NULL,                             -- อ้างอิง PositionTestSets
            status NVARCHAR(20) DEFAULT 'pending',       -- pending, in_progress, completed, expired
            attempt_id INT NULL,                         -- อ้างอิง ApplicantTestAttempts
            score DECIMAL(5,2) NULL,
            percentage DECIMAL(5,2) NULL,
            passed BIT NULL,
            started_at DATETIME2 NULL,
            completed_at DATETIME2 NULL,
            time_spent_seconds INT NULL,
            created_at DATETIME2 DEFAULT GETDATE(),
            updated_at DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT FK_ApplicantTestProgress_Applicant FOREIGN KEY (applicant_id) REFERENCES Applicants(applicant_id),
            CONSTRAINT FK_ApplicantTestProgress_Position FOREIGN KEY (position_id) REFERENCES Positions(position_id),
            CONSTRAINT FK_ApplicantTestProgress_Test FOREIGN KEY (test_id) REFERENCES Tests(test_id),
            CONSTRAINT FK_ApplicantTestProgress_Set FOREIGN KEY (set_id) REFERENCES PositionTestSets(set_id),
            CONSTRAINT UQ_ApplicantTestProgress UNIQUE (applicant_id, test_id)
        )
    `);

    console.log('Creating indexes...');

    // สร้าง indexes
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PositionTestSets_Position')
        CREATE INDEX IX_PositionTestSets_Position ON PositionTestSets(position_id);

        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ApplicantTestProgress_Applicant')
        CREATE INDEX IX_ApplicantTestProgress_Applicant ON ApplicantTestProgress(applicant_id);

        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ApplicantTestProgress_Status')
        CREATE INDEX IX_ApplicantTestProgress_Status ON ApplicantTestProgress(status);
    `);

    console.log('Migration completed successfully!');
}

async function down() {
    const pool = await poolPromise;

    console.log('Dropping tables...');

    await pool.request().query(`
        IF EXISTS (SELECT * FROM sysobjects WHERE name='ApplicantTestProgress' AND xtype='U')
        DROP TABLE ApplicantTestProgress;

        IF EXISTS (SELECT * FROM sysobjects WHERE name='PositionTestSetConfig' AND xtype='U')
        DROP TABLE PositionTestSetConfig;

        IF EXISTS (SELECT * FROM sysobjects WHERE name='PositionTestSets' AND xtype='U')
        DROP TABLE PositionTestSets;
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
