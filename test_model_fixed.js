/**
 * Test Fixed Model - Test if Model works with correct database schema
 * ทดสอบ Model ที่แก้ไขแล้วว่าทำงานได้ถูกต้องหรือไม่
 */

const { poolPromise } = require('./config/database');
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

function log(message, color = colors.white) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
    console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logSection(title) {
    console.log(`\n${colors.magenta}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.magenta}${title}${colors.reset}`);
    console.log(`${colors.magenta}${'='.repeat(70)}${colors.reset}\n`);
}

async function testConnection() {
    logSection('1. Testing Database Connection');

    try {
        const pool = await poolPromise;
        log('Database connected successfully!', colors.green);

        // Check if tests table exists
        const result = await pool.request().query(`
            SELECT COUNT(*) as count FROM tests
        `);

        logSuccess(`Tests table exists with ${result.recordset[0].count} records`);
        return true;
    } catch (error) {
        logError(`Database connection failed: ${error.message}`);
        return false;
    }
}

async function testFindById() {
    logSection('2. Testing Test.findById()');

    try {
        const testId = 1; // Test with ID 1
        const test = await Test.findById(testId);

        if (test) {
            logSuccess(`Found test: ${test.title || test.test_name || '(no title)'}`);
            log(`  Test ID: ${test.test_id}`, colors.cyan);
            log(`  Title: ${test.title}`, colors.cyan);
            log(`  Type: ${test.type}`, colors.cyan);
            log(`  Instructor ID: ${test.instructor_id}`, colors.cyan);
            log(`  Status: ${test.status}`, colors.cyan);
            log(`  Total Marks: ${test.total_marks}`, colors.cyan);
            log(`  Passing Marks: ${test.passing_marks}`, colors.cyan);
            log(`  Time Limit: ${test.time_limit} minutes`, colors.cyan);
            log(`  Attempts Allowed: ${test.attempts_allowed}`, colors.cyan);
            return true;
        } else {
            logError('Test not found (ID 1)');
            return false;
        }
    } catch (error) {
        logError(`findById failed: ${error.message}`);
        return false;
    }
}

async function testFindAll() {
    logSection('3. Testing Test.findAll()');

    try {
        const filters = {
            page: 1,
            limit: 5
        };

        const tests = await Test.findAll(filters);

        if (tests && tests.length > 0) {
            logSuccess(`Found ${tests.length} tests`);

            tests.forEach((test, index) => {
                log(`  ${index + 1}. ${test.title} (ID: ${test.test_id}, Status: ${test.status})`, colors.cyan);
            });

            return true;
        } else {
            log('No tests found (this might be okay if database is empty)', colors.yellow);
            return true;
        }
    } catch (error) {
        logError(`findAll failed: ${error.message}`);
        return false;
    }
}

async function testCreate() {
    logSection('4. Testing Test.create()');

    try {
        const testData = {
            course_id: null,
            instructor_id: 17, // Using existing instructor ID from database
            title: 'Test สร้างโดย Automated Test',
            description: 'นี่คือข้อสอบทดสอบที่สร้างโดย automated test script',
            type: 'Quiz',
            time_limit: 30,
            total_marks: 100,
            passing_marks: 70,
            attempts_allowed: 3,
            randomize_questions: true,
            show_results: true,
            status: 'Draft'
        };

        log('Creating test with data:', colors.cyan);
        log(JSON.stringify(testData, null, 2), colors.cyan);

        const result = await Test.create(testData);

        if (result.success) {
            logSuccess(`Test created successfully! Test ID: ${result.data.test_id}`);

            // Store test ID for cleanup
            global.createdTestId = result.data.test_id;

            return true;
        } else {
            logError(`Test creation failed: ${result.message}`);
            return false;
        }
    } catch (error) {
        logError(`create() failed: ${error.message}`);
        return false;
    }
}

async function testUpdate() {
    logSection('5. Testing Test.update()');

    if (!global.createdTestId) {
        log('Skipping update test (no test ID from create test)', colors.yellow);
        return true;
    }

    try {
        const updateData = {
            title: 'Test อัพเดทโดย Automated Test',
            description: 'ข้อมูลถูกอัพเดทแล้ว',
            status: 'Active',
            passing_marks: 75
        };

        log(`Updating test ID ${global.createdTestId}...`, colors.cyan);

        const result = await Test.update(global.createdTestId, updateData);

        if (result.success) {
            logSuccess('Test updated successfully!');

            // Verify update
            const updatedTest = await Test.findById(global.createdTestId);
            if (updatedTest) {
                log(`  New title: ${updatedTest.title}`, colors.cyan);
                log(`  New status: ${updatedTest.status}`, colors.cyan);
                log(`  New passing marks: ${updatedTest.passing_marks}`, colors.cyan);
            }

            return true;
        } else {
            logError(`Update failed: ${result.message}`);
            return false;
        }
    } catch (error) {
        logError(`update() failed: ${error.message}`);
        return false;
    }
}

async function testDelete() {
    logSection('6. Testing Test.delete()');

    if (!global.createdTestId) {
        log('Skipping delete test (no test ID from create test)', colors.yellow);
        return true;
    }

    try {
        log(`Deleting test ID ${global.createdTestId}...`, colors.cyan);

        const result = await Test.delete(global.createdTestId);

        if (result.success) {
            logSuccess('Test deleted (soft delete) successfully!');

            // Verify deletion
            const deletedTest = await Test.findById(global.createdTestId);
            if (deletedTest && deletedTest.status === 'Deleted') {
                log(`  Test status is now: ${deletedTest.status}`, colors.cyan);
            }

            return true;
        } else {
            logError(`Delete failed: ${result.message}`);
            return false;
        }
    } catch (error) {
        logError(`delete() failed: ${error.message}`);
        return false;
    }
}

async function cleanup() {
    logSection('7. Cleanup');

    if (global.createdTestId) {
        try {
            const pool = await poolPromise;
            await pool.request().query(`
                DELETE FROM tests WHERE test_id = ${global.createdTestId}
            `);
            logSuccess(`Cleaned up test ID ${global.createdTestId} from database`);
        } catch (error) {
            log(`Cleanup warning: ${error.message}`, colors.yellow);
        }
    } else {
        log('No cleanup needed', colors.cyan);
    }
}

// Main test runner
async function runAllTests() {
    console.log(`${colors.yellow}
╔══════════════════════════════════════════════════════════════════════╗
║          LearnHub - Fixed Model Testing                              ║
║          ทดสอบ Model ที่แก้ไขแล้ว                                    ║
╚══════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

    log(`Start Time: ${new Date().toLocaleString('th-TH')}`, colors.cyan);

    const results = [];

    // Run all tests
    results.push(await testConnection());
    results.push(await testFindById());
    results.push(await testFindAll());
    results.push(await testCreate());
    results.push(await testUpdate());
    results.push(await testDelete());

    // Cleanup
    await cleanup();

    // Summary
    logSection('SUMMARY - สรุปผลการทดสอบ');

    const passed = results.filter(r => r === true).length;
    const failed = results.filter(r => r === false).length;

    log(`${colors.green}Tests Passed: ${passed}${colors.reset}`);
    log(`${colors.red}Tests Failed: ${failed}${colors.reset}`);
    log(`${colors.blue}Total Tests: ${results.length}${colors.reset}\n`);

    if (failed === 0) {
        log(`${colors.green}${'✓'.repeat(70)}${colors.reset}`);
        log(`${colors.green}ALL TESTS PASSED! 🎉${colors.reset}`);
        log(`${colors.green}Model is working correctly with database schema!${colors.reset}`);
    } else {
        log(`${colors.red}${'✗'.repeat(70)}${colors.reset}`);
        log(`${colors.red}SOME TESTS FAILED!${colors.reset}`);
        log(`${colors.yellow}Please check the errors above and fix them.${colors.reset}`);
    }

    log(`\nEnd Time: ${new Date().toLocaleString('th-TH')}`, colors.cyan);
    log(`\n${colors.magenta}${'='.repeat(70)}${colors.reset}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
