/**
 * Test Model Layer Errors - Direct Database Testing
 * ทดสอบ Model layer โดยตรงเพื่อหา errors ในการทำงานกับฐานข้อมูล
 */

const { poolPromise, sql } = require('./config/database');
const Test = require('./models/Test');

// Colors for console
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

let errorCount = 0;
let passCount = 0;

function logError(testName, error) {
    errorCount++;
    console.log(`${colors.red}❌ ERROR: ${testName}${colors.reset}`);
    console.log(`   ${colors.red}${error.message}${colors.reset}`);
    if (error.code) console.log(`   Code: ${error.code}`);
    if (error.number) console.log(`   SQL Error: ${error.number}`);
}

function logSuccess(testName, details) {
    passCount++;
    console.log(`${colors.green}✓ PASS: ${testName}${colors.reset}`);
    if (details) console.log(`   ${colors.cyan}${details}${colors.reset}`);
}

function logSection(title) {
    console.log(`\n${colors.magenta}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.magenta}${title}${colors.reset}`);
    console.log(`${colors.magenta}${'='.repeat(70)}${colors.reset}\n`);
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== DATABASE CONSTRAINT TESTS ==========

async function testPrimaryKeyConstraint() {
    logSection('1. PRIMARY KEY CONSTRAINT VIOLATIONS');

    const pool = await poolPromise;

    // Test: Duplicate test_id
    try {
        await pool.request().query(`
            INSERT INTO tests (test_id, test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
            VALUES (1, 'Test Duplicate PK', 'Quiz', 10, 100, 70, 1, GETDATE())
        `);
        await pool.request().query(`
            INSERT INTO tests (test_id, test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
            VALUES (1, 'Test Duplicate PK 2', 'Quiz', 10, 100, 70, 1, GETDATE())
        `);
        logSuccess('Duplicate PRIMARY KEY - ไม่ควร pass!', 'CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Duplicate PRIMARY KEY Violation (test_id = 1)', error);
    }

    // Test: NULL primary key
    try {
        await pool.request().query(`
            INSERT INTO tests (test_id, test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
            VALUES (NULL, 'Test NULL PK', 'Quiz', 10, 100, 70, 1, GETDATE())
        `);
        logSuccess('NULL PRIMARY KEY - ไม่ควร pass!', 'CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('NULL PRIMARY KEY Violation', error);
    }
}

async function testForeignKeyConstraint() {
    logSection('2. FOREIGN KEY CONSTRAINT VIOLATIONS');

    const pool = await poolPromise;

    // Test: Invalid course_id
    try {
        await pool.request()
            .input('courseId', sql.Int, 999999999)
            .query(`
                INSERT INTO tests (test_name, course_id, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES ('Test Invalid FK Course', @courseId, 'Quiz', 10, 100, 70, 1, GETDATE())
            `);
        logSuccess('Invalid course_id FK - ไม่ควร pass!', 'FOREIGN KEY CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Invalid course_id Foreign Key (999999999)', error);
    }

    // Test: Invalid created_by (user_id)
    try {
        await pool.request()
            .input('createdBy', sql.Int, 999999999)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES ('Test Invalid FK User', 'Quiz', 10, 100, 70, @createdBy, GETDATE())
            `);
        logSuccess('Invalid created_by FK - ไม่ควร pass!', 'FOREIGN KEY CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Invalid created_by Foreign Key (999999999)', error);
    }

    // Test: Invalid instructor_id
    try {
        await pool.request()
            .input('instructorId', sql.Int, 999999999)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, instructor_id, created_by, created_date)
                VALUES ('Test Invalid FK Instructor', 'Quiz', 10, 100, 70, @instructorId, 1, GETDATE())
            `);
        logSuccess('Invalid instructor_id FK - ไม่ควร pass!', 'FOREIGN KEY CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Invalid instructor_id Foreign Key (999999999)', error);
    }
}

async function testNotNullConstraints() {
    logSection('3. NOT NULL CONSTRAINT VIOLATIONS');

    const pool = await poolPromise;

    // Test: NULL test_name
    try {
        await pool.request().query(`
            INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
            VALUES (NULL, 'Quiz', 10, 100, 70, 1, GETDATE())
        `);
        logSuccess('NULL test_name - ไม่ควร pass!', 'NOT NULL CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('NULL test_name (Required Field)', error);
    }

    // Test: NULL test_type
    try {
        await pool.request().query(`
            INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
            VALUES ('Test NULL Type', NULL, 10, 100, 70, 1, GETDATE())
        `);
        logSuccess('NULL test_type - ไม่ควร pass!', 'NOT NULL CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('NULL test_type (Required Field)', error);
    }

    // Test: NULL created_by
    try {
        await pool.request().query(`
            INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
            VALUES ('Test NULL Creator', 'Quiz', 10, 100, 70, NULL, GETDATE())
        `);
        logSuccess('NULL created_by - ไม่ควร pass!', 'NOT NULL CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('NULL created_by (Required Field)', error);
    }
}

async function testCheckConstraints() {
    logSection('4. CHECK CONSTRAINT VIOLATIONS');

    const pool = await poolPromise;

    // Test: Negative total_questions
    try {
        await pool.request()
            .input('totalQuestions', sql.Int, -10)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES ('Test Negative Questions', 'Quiz', @totalQuestions, 100, 70, 1, GETDATE())
            `);
        logSuccess('Negative total_questions - ไม่ควร pass!', 'CHECK CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Negative total_questions (-10)', error);
    }

    // Test: Negative total_score
    try {
        await pool.request()
            .input('totalScore', sql.Decimal(5, 2), -100.00)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES ('Test Negative Score', 'Quiz', 10, @totalScore, 70, 1, GETDATE())
            `);
        logSuccess('Negative total_score - ไม่ควร pass!', 'CHECK CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Negative total_score (-100)', error);
    }

    // Test: Negative passing_score
    try {
        await pool.request()
            .input('passingScore', sql.Decimal(5, 2), -50.00)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES ('Test Negative Passing', 'Quiz', 10, 100, @passingScore, 1, GETDATE())
            `);
        logSuccess('Negative passing_score - ไม่ควร pass!', 'CHECK CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Negative passing_score (-50)', error);
    }

    // Test: Passing score > Total score
    try {
        await pool.request()
            .input('totalScore', sql.Decimal(5, 2), 100.00)
            .input('passingScore', sql.Decimal(5, 2), 150.00)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES ('Test Invalid Passing Score', 'Quiz', 10, @totalScore, @passingScore, 1, GETDATE())
            `);
        logSuccess('Passing score > Total score - ไม่ควร pass!', 'CHECK CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Passing score (150) > Total score (100)', error);
    }

    // Test: Negative time_limit_minutes
    try {
        await pool.request()
            .input('timeLimit', sql.Int, -30)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, time_limit_minutes, created_by, created_date)
                VALUES ('Test Negative Time', 'Quiz', 10, 100, 70, @timeLimit, 1, GETDATE())
            `);
        logSuccess('Negative time_limit_minutes - ไม่ควร pass!', 'CHECK CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Negative time_limit_minutes (-30)', error);
    }

    // Test: Negative max_attempts
    try {
        await pool.request()
            .input('maxAttempts', sql.Int, -1)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, max_attempts, created_by, created_date)
                VALUES ('Test Negative Attempts', 'Quiz', 10, 100, 70, @maxAttempts, 1, GETDATE())
            `);
        logSuccess('Negative max_attempts - ไม่ควร pass!', 'CHECK CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Negative max_attempts (-1)', error);
    }

    // Test: Zero max_attempts
    try {
        await pool.request()
            .input('maxAttempts', sql.Int, 0)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, max_attempts, created_by, created_date)
                VALUES ('Test Zero Attempts', 'Quiz', 10, 100, 70, @maxAttempts, 1, GETDATE())
            `);
        logSuccess('Zero max_attempts - ไม่ควร pass!', 'CHECK CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Zero max_attempts (0)', error);
    }
}

async function testDataTypeConstraints() {
    logSection('5. DATA TYPE & LENGTH VIOLATIONS');

    const pool = await poolPromise;

    // Test: test_name exceeds max length (assume 200 chars)
    try {
        const longName = 'A'.repeat(500);
        await pool.request()
            .input('testName', sql.NVarChar(200), longName)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES (@testName, 'Quiz', 10, 100, 70, 1, GETDATE())
            `);
        logSuccess('test_name > 200 chars - ควร truncate หรือ error', 'String truncated or not validated!');
    } catch (error) {
        logError('test_name exceeds max length (500 chars)', error);
    }

    // Test: Invalid test_type (not in allowed values)
    try {
        await pool.request()
            .input('testType', sql.NVarChar(20), 'InvalidType')
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES ('Test Invalid Type', @testType, 10, 100, 70, 1, GETDATE())
            `);
        logSuccess('Invalid test_type - ไม่ควร pass!', 'ENUM/CHECK CONSTRAINT NOT ENFORCED!');
    } catch (error) {
        logError('Invalid test_type (not in allowed values)', error);
    }

    // Test: Decimal overflow
    try {
        await pool.request()
            .input('totalScore', sql.Decimal(5, 2), 99999.99)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES ('Test Overflow', 'Quiz', 10, @totalScore, 70, 1, GETDATE())
            `);
        logSuccess('Decimal overflow - ควร error', 'Decimal overflow not detected!');
    } catch (error) {
        logError('Decimal overflow (99999.99 for DECIMAL(5,2))', error);
    }

    // Test: Integer overflow
    try {
        await pool.request()
            .input('totalQuestions', sql.Int, 2147483648) // Max INT + 1
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES ('Test Int Overflow', 'Quiz', @totalQuestions, 100, 70, 1, GETDATE())
            `);
        logSuccess('Integer overflow - ควร error', 'Integer overflow not detected!');
    } catch (error) {
        logError('Integer overflow (> 2147483647)', error);
    }
}

async function testModelValidation() {
    logSection('6. MODEL VALIDATION TESTS');

    // Test: Create test with missing required fields
    try {
        await Test.create({});
        logSuccess('Create with empty object - ไม่ควร pass!', 'MODEL VALIDATION NOT ENFORCED!');
    } catch (error) {
        logError('Create Test with Empty Object', error);
    }

    // Test: Create test with partial data
    try {
        await Test.create({
            test_name: 'Partial Test'
            // missing other required fields
        });
        logSuccess('Create with partial data - ไม่ควร pass!', 'MODEL VALIDATION NOT ENFORCED!');
    } catch (error) {
        logError('Create Test with Partial Data (missing required fields)', error);
    }

    // Test: Create test with wrong data types
    try {
        await Test.create({
            test_name: 'Wrong Types',
            test_type: 'Quiz',
            total_questions: 'not-a-number',
            total_score: 'invalid',
            passing_score: true,
            created_by: 'not-a-number'
        });
        logSuccess('Create with wrong data types - ไม่ควร pass!', 'TYPE VALIDATION NOT ENFORCED!');
    } catch (error) {
        logError('Create Test with Wrong Data Types', error);
    }

    // Test: Find by invalid ID
    try {
        const result = await Test.findById('invalid-id');
        logSuccess('Find by string ID', `Result: ${result ? 'Found' : 'Not Found'}`);
    } catch (error) {
        logError('Find Test by Invalid ID (string)', error);
    }

    // Test: Find by negative ID
    try {
        const result = await Test.findById(-1);
        logSuccess('Find by negative ID', `Result: ${result ? 'Found' : 'Not Found'}`);
    } catch (error) {
        logError('Find Test by Negative ID (-1)', error);
    }

    // Test: Find by null ID
    try {
        const result = await Test.findById(null);
        logSuccess('Find by null ID', `Result: ${result ? 'Found' : 'Not Found'}`);
    } catch (error) {
        logError('Find Test by NULL ID', error);
    }
}

async function testConcurrencyIssues() {
    logSection('7. CONCURRENCY & RACE CONDITION TESTS');

    const pool = await poolPromise;

    // Test: Simultaneous inserts with same ID
    try {
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(
                pool.request().query(`
                    INSERT INTO tests (test_id, test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                    VALUES (99999, 'Concurrent Test ${i}', 'Quiz', 10, 100, 70, 1, GETDATE())
                `)
            );
        }
        await Promise.all(promises);
        logSuccess('Simultaneous inserts with same ID - ควร error', 'RACE CONDITION NOT HANDLED!');
    } catch (error) {
        logError('Concurrent Inserts with Same Primary Key', error);
    }

    // Test: Update same record simultaneously
    try {
        // First create a test
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM tests WHERE test_id = 88888)
            INSERT INTO tests (test_id, test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
            VALUES (88888, 'Concurrent Update Test', 'Quiz', 10, 100, 70, 1, GETDATE())
        `);

        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(
                pool.request().query(`
                    UPDATE tests SET test_name = 'Updated ${i}', updated_date = GETDATE() WHERE test_id = 88888
                `)
            );
        }
        await Promise.all(promises);

        const result = await pool.request().query(`SELECT test_name FROM tests WHERE test_id = 88888`);
        logSuccess('Concurrent updates', `Final value: ${result.recordset[0]?.test_name}`);
    } catch (error) {
        logError('Concurrent Updates to Same Record', error);
    }
}

async function testTransactionRollback() {
    logSection('8. TRANSACTION & ROLLBACK TESTS');

    const pool = await poolPromise;

    // Test: Transaction rollback on error
    try {
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            await transaction.request().query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES ('Transaction Test 1', 'Quiz', 10, 100, 70, 1, GETDATE())
            `);

            // This should fail and rollback
            await transaction.request().query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES (NULL, 'Quiz', 10, 100, 70, 1, GETDATE())
            `);

            await transaction.commit();
            logSuccess('Transaction with error - ไม่ควร commit!', 'TRANSACTION NOT ROLLED BACK!');
        } catch (error) {
            await transaction.rollback();
            logError('Transaction Rollback on Error', error);
        }
    } catch (error) {
        logError('Transaction Test Failed', error);
    }
}

async function testSQLInjectionOnModel() {
    logSection('9. SQL INJECTION TESTS ON MODEL LAYER');

    // Test: SQL injection in findById
    try {
        const result = await Test.findById("1; DROP TABLE tests; --");
        logSuccess('SQL Injection in findById', result ? 'Injection successful - CRITICAL!' : 'Blocked or no result');
    } catch (error) {
        logError('SQL Injection in findById', error);
    }

    // Test: SQL injection in create
    try {
        await Test.create({
            test_name: "'; DROP TABLE tests; --",
            test_type: "Quiz' OR '1'='1",
            total_questions: 10,
            total_score: 100,
            passing_score: 70,
            created_by: 1
        });
        logSuccess('SQL Injection in create - ควร sanitize!', 'INJECTION NOT SANITIZED!');
    } catch (error) {
        logError('SQL Injection in create()', error);
    }
}

async function testEdgeCaseValues() {
    logSection('10. EDGE CASE VALUES');

    const pool = await poolPromise;

    // Test: Empty string for test_name
    try {
        await pool.request()
            .input('testName', sql.NVarChar(200), '')
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES (@testName, 'Quiz', 10, 100, 70, 1, GETDATE())
            `);
        logSuccess('Empty string test_name - ควร error', 'EMPTY STRING ALLOWED!');
    } catch (error) {
        logError('Empty String for test_name', error);
    }

    // Test: Whitespace-only test_name
    try {
        await pool.request()
            .input('testName', sql.NVarChar(200), '   ')
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES (@testName, 'Quiz', 10, 100, 70, 1, GETDATE())
            `);
        logSuccess('Whitespace-only test_name - ควร error', 'WHITESPACE STRING ALLOWED!');
    } catch (error) {
        logError('Whitespace-only String for test_name', error);
    }

    // Test: Zero values
    try {
        await pool.request()
            .input('totalQuestions', sql.Int, 0)
            .input('totalScore', sql.Decimal(5, 2), 0.00)
            .input('passingScore', sql.Decimal(5, 2), 0.00)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES ('Zero Values Test', 'Quiz', @totalQuestions, @totalScore, @passingScore, 1, GETDATE())
            `);
        logSuccess('Zero values for scores/questions', 'Allowed (may be valid use case)');
    } catch (error) {
        logError('Zero Values for Questions/Scores', error);
    }

    // Test: Very large but valid values
    try {
        await pool.request()
            .input('totalQuestions', sql.Int, 10000)
            .input('timeLimit', sql.Int, 10000)
            .input('maxAttempts', sql.Int, 1000)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, time_limit_minutes, max_attempts, created_by, created_date)
                VALUES ('Large Values Test', 'Quiz', @totalQuestions, 100, 70, @timeLimit, @maxAttempts, 1, GETDATE())
            `);
        logSuccess('Very large valid values', 'Accepted (may need business logic validation)');
    } catch (error) {
        logError('Very Large but Valid Values', error);
    }

    // Test: Special characters in test_name
    try {
        const specialChars = `Test!@#$%^&*()_+-=[]{}|;':",./<>?~\``;
        await pool.request()
            .input('testName', sql.NVarChar(200), specialChars)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES (@testName, 'Quiz', 10, 100, 70, 1, GETDATE())
            `);
        logSuccess('Special characters in test_name', 'Accepted');
    } catch (error) {
        logError('Special Characters in test_name', error);
    }

    // Test: Unicode characters
    try {
        const unicodeName = 'ทดสอบภาษาไทย 测试中文 テスト 😀🎉';
        await pool.request()
            .input('testName', sql.NVarChar(200), unicodeName)
            .query(`
                INSERT INTO tests (test_name, test_type, total_questions, total_score, passing_score, created_by, created_date)
                VALUES (@testName, 'Quiz', 10, 100, 70, 1, GETDATE())
            `);
        logSuccess('Unicode characters in test_name', 'Accepted');
    } catch (error) {
        logError('Unicode Characters in test_name', error);
    }
}

// ========== MAIN EXECUTION ==========

async function runAllTests() {
    console.log(`${colors.yellow}
╔══════════════════════════════════════════════════════════════════════╗
║         LearnHub - Model Layer & Database Error Testing             ║
║              ทดสอบ Model Layer และ Database Constraints              ║
╚══════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

    console.log(`${colors.cyan}Start Time: ${new Date().toLocaleString('th-TH')}${colors.reset}\n`);

    try {
        await testPrimaryKeyConstraint();
        await delay(500);

        await testForeignKeyConstraint();
        await delay(500);

        await testNotNullConstraints();
        await delay(500);

        await testCheckConstraints();
        await delay(500);

        await testDataTypeConstraints();
        await delay(500);

        await testModelValidation();
        await delay(500);

        await testConcurrencyIssues();
        await delay(500);

        await testTransactionRollback();
        await delay(500);

        await testSQLInjectionOnModel();
        await delay(500);

        await testEdgeCaseValues();

        // Summary
        logSection('SUMMARY - สรุปผลการทดสอบ');
        console.log(`${colors.red}Total Errors Found: ${errorCount}${colors.reset}`);
        console.log(`${colors.green}Tests Passed: ${passCount}${colors.reset}`);
        console.log(`${colors.blue}Total Tests: ${errorCount + passCount}${colors.reset}\n`);

        console.log(`${colors.cyan}End Time: ${new Date().toLocaleString('th-TH')}${colors.reset}`);
        console.log(`\n${colors.magenta}${'='.repeat(70)}${colors.reset}\n`);

        console.log(`${colors.yellow}หมายเหตุ:${colors.reset}`);
        console.log(`  - ${colors.red}ERROR${colors.reset} = พบข้อผิดพลาดตามที่คาดหวัง (constraint ทำงานถูกต้อง)`);
        console.log(`  - ${colors.green}PASS${colors.reset} = ไม่พบ error (อาจเป็นปัญหาถ้าควรมี constraint)\n`);

    } catch (error) {
        console.error(`\n${colors.red}Fatal Error:${colors.reset}`, error);
    } finally {
        process.exit(0);
    }
}

// Run tests
runAllTests().catch(console.error);
