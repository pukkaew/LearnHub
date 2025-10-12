const { poolPromise } = require('../config/database');

async function createApplicantTables() {
    try {
        const pool = await poolPromise;

        console.log('🔄 Creating Applicant System tables...\n');

        // =========================================
        // 1. ApplicantTestAssignments Table
        // =========================================
        console.log('📋 Creating ApplicantTestAssignments table...');

        const checkAssignments = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'ApplicantTestAssignments'
        `);

        if (checkAssignments.recordset.length === 0) {
            await pool.request().query(`
                CREATE TABLE ApplicantTestAssignments (
                    assignment_id INT IDENTITY(1,1) PRIMARY KEY,
                    applicant_id INT NOT NULL,
                    test_id INT NOT NULL,
                    assigned_by INT NOT NULL,
                    assigned_date DATETIME2 DEFAULT GETDATE(),
                    due_date DATETIME2 NULL,
                    status NVARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED')),
                    is_active BIT DEFAULT 1,
                    created_at DATETIME2 DEFAULT GETDATE(),
                    updated_at DATETIME2 DEFAULT GETDATE(),

                    CONSTRAINT FK_ApplicantTestAssignments_Users_Applicant FOREIGN KEY (applicant_id)
                        REFERENCES Users(user_id),
                    CONSTRAINT FK_ApplicantTestAssignments_Tests FOREIGN KEY (test_id)
                        REFERENCES Tests(test_id),
                    CONSTRAINT FK_ApplicantTestAssignments_Users_AssignedBy FOREIGN KEY (assigned_by)
                        REFERENCES Users(user_id),

                    -- Unique constraint: ผู้สมัคร 1 คนทำแต่ละข้อสอบได้ครั้งเดียว
                    CONSTRAINT UQ_ApplicantTestAssignments_Applicant_Test UNIQUE (applicant_id, test_id)
                );
            `);

            // Create indexes
            await pool.request().query(`
                CREATE INDEX IX_ApplicantTestAssignments_ApplicantId ON ApplicantTestAssignments(applicant_id);
            `);
            await pool.request().query(`
                CREATE INDEX IX_ApplicantTestAssignments_Status ON ApplicantTestAssignments(status);
            `);
            await pool.request().query(`
                CREATE INDEX IX_ApplicantTestAssignments_DueDate ON ApplicantTestAssignments(due_date);
            `);

            console.log('✅ ApplicantTestAssignments table created successfully');
        } else {
            console.log('⏭️  ApplicantTestAssignments table already exists');
        }

        // =========================================
        // 2. ApplicantTestResults Table
        // =========================================
        console.log('\n📊 Creating ApplicantTestResults table...');

        const checkResults = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'ApplicantTestResults'
        `);

        if (checkResults.recordset.length === 0) {
            await pool.request().query(`
                CREATE TABLE ApplicantTestResults (
                    result_id INT IDENTITY(1,1) PRIMARY KEY,
                    assignment_id INT NOT NULL,
                    applicant_id INT NOT NULL,
                    test_id INT NOT NULL,

                    -- Test attempt info
                    started_at DATETIME2 NULL,
                    completed_at DATETIME2 NULL,
                    time_taken_seconds INT NULL,

                    -- Scoring
                    total_questions INT NOT NULL,
                    correct_answers INT DEFAULT 0,
                    score DECIMAL(5,2) NOT NULL DEFAULT 0,
                    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
                    passed BIT DEFAULT 0,

                    -- Answers (JSON format)
                    answers NVARCHAR(MAX) NULL,

                    -- Proctoring info
                    ip_address NVARCHAR(45) NULL,
                    browser_info NVARCHAR(500) NULL,
                    proctoring_flags NVARCHAR(MAX) NULL,

                    -- Review
                    reviewed BIT DEFAULT 0,
                    reviewed_by INT NULL,
                    reviewed_at DATETIME2 NULL,
                    feedback NVARCHAR(MAX) NULL,

                    created_at DATETIME2 DEFAULT GETDATE(),
                    updated_at DATETIME2 DEFAULT GETDATE(),

                    CONSTRAINT FK_ApplicantTestResults_Assignments FOREIGN KEY (assignment_id)
                        REFERENCES ApplicantTestAssignments(assignment_id),
                    CONSTRAINT FK_ApplicantTestResults_Users FOREIGN KEY (applicant_id)
                        REFERENCES Users(user_id),
                    CONSTRAINT FK_ApplicantTestResults_Tests FOREIGN KEY (test_id)
                        REFERENCES Tests(test_id),
                    CONSTRAINT FK_ApplicantTestResults_ReviewedBy FOREIGN KEY (reviewed_by)
                        REFERENCES Users(user_id)
                );
            `);

            // Create indexes
            await pool.request().query(`
                CREATE INDEX IX_ApplicantTestResults_ApplicantId ON ApplicantTestResults(applicant_id);
            `);
            await pool.request().query(`
                CREATE INDEX IX_ApplicantTestResults_TestId ON ApplicantTestResults(test_id);
            `);
            await pool.request().query(`
                CREATE INDEX IX_ApplicantTestResults_Passed ON ApplicantTestResults(passed);
            `);
            await pool.request().query(`
                CREATE INDEX IX_ApplicantTestResults_CompletedAt ON ApplicantTestResults(completed_at);
            `);

            console.log('✅ ApplicantTestResults table created successfully');
        } else {
            console.log('⏭️  ApplicantTestResults table already exists');
        }

        // =========================================
        // 3. ApplicantNotes Table
        // =========================================
        console.log('\n📝 Creating ApplicantNotes table...');

        const checkNotes = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'ApplicantNotes'
        `);

        if (checkNotes.recordset.length === 0) {
            await pool.request().query(`
                CREATE TABLE ApplicantNotes (
                    note_id INT IDENTITY(1,1) PRIMARY KEY,
                    applicant_id INT NOT NULL,
                    created_by INT NOT NULL,
                    note_text NVARCHAR(MAX) NOT NULL,
                    note_type NVARCHAR(20) DEFAULT 'GENERAL' CHECK (note_type IN ('GENERAL', 'INTERVIEW', 'TEST_REVIEW', 'DECISION')),
                    created_at DATETIME2 DEFAULT GETDATE(),
                    updated_at DATETIME2 DEFAULT GETDATE(),

                    CONSTRAINT FK_ApplicantNotes_Users_Applicant FOREIGN KEY (applicant_id)
                        REFERENCES Users(user_id),
                    CONSTRAINT FK_ApplicantNotes_Users_CreatedBy FOREIGN KEY (created_by)
                        REFERENCES Users(user_id)
                );
            `);

            // Create index
            await pool.request().query(`
                CREATE INDEX IX_ApplicantNotes_ApplicantId ON ApplicantNotes(applicant_id);
            `);
            await pool.request().query(`
                CREATE INDEX IX_ApplicantNotes_CreatedAt ON ApplicantNotes(created_at DESC);
            `);

            console.log('✅ ApplicantNotes table created successfully');
        } else {
            console.log('⏭️  ApplicantNotes table already exists');
        }

        console.log('\n🎉 Applicant System tables migration completed successfully!');
        console.log('\n📊 Summary:');
        console.log('  ✅ ApplicantTestAssignments - การมอบหมายข้อสอบให้ผู้สมัคร');
        console.log('  ✅ ApplicantTestResults - ผลสอบของผู้สมัคร');
        console.log('  ✅ ApplicantNotes - บันทึกของ HR เกี่ยวกับผู้สมัคร');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    createApplicantTables()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = createApplicantTables;
