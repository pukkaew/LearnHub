const { poolPromise } = require('../config/database');

async function createApplicantTestAttempts() {
    try {
        const pool = await poolPromise;

        console.log('Creating ApplicantTestAttempts table...');

        const checkTable = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'ApplicantTestAttempts'
        `);

        if (checkTable.recordset.length === 0) {
            await pool.request().query(`
                CREATE TABLE ApplicantTestAttempts (
                    attempt_id INT IDENTITY(1,1) PRIMARY KEY,
                    test_id INT NOT NULL,
                    applicant_id INT NOT NULL,
                    started_at DATETIME2 DEFAULT GETDATE(),
                    completed_at DATETIME2 NULL,
                    status NVARCHAR(20) DEFAULT 'In_Progress' CHECK (status IN ('In_Progress', 'Completed', 'Abandoned')),
                    score DECIMAL(5,2) NULL,
                    percentage DECIMAL(5,2) NULL,
                    passed BIT NULL,
                    answers NVARCHAR(MAX) NULL,
                    time_spent_seconds INT NULL,
                    ip_address NVARCHAR(45) NULL,
                    browser_info NVARCHAR(500) NULL,
                    created_at DATETIME2 DEFAULT GETDATE(),
                    updated_at DATETIME2 DEFAULT GETDATE(),

                    CONSTRAINT FK_ApplicantTestAttempts_Tests FOREIGN KEY (test_id)
                        REFERENCES Tests(test_id),
                    CONSTRAINT FK_ApplicantTestAttempts_Applicants FOREIGN KEY (applicant_id)
                        REFERENCES Applicants(applicant_id)
                );
            `);

            await pool.request().query(`
                CREATE INDEX IX_ApplicantTestAttempts_ApplicantId ON ApplicantTestAttempts(applicant_id);
            `);
            await pool.request().query(`
                CREATE INDEX IX_ApplicantTestAttempts_TestId ON ApplicantTestAttempts(test_id);
            `);
            await pool.request().query(`
                CREATE INDEX IX_ApplicantTestAttempts_Status ON ApplicantTestAttempts(status);
            `);

            console.log('ApplicantTestAttempts table created successfully');
        } else {
            console.log('ApplicantTestAttempts table already exists');
        }

        console.log('Migration completed!');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

if (require.main === module) {
    createApplicantTestAttempts()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = createApplicantTestAttempts;
