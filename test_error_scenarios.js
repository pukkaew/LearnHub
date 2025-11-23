/**
 * Test Error Scenarios for LearnHub Tests API
 * ทดสอบสถานการณ์ที่ทำให้เกิด Error เพื่อตรวจสอบ Error Handling
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/tests/api`;

// Test Data
const testData = {
    valid: {
        test_name: 'ทดสอบ Error Handling',
        test_description: 'ข้อสอบสำหรับทดสอบระบบ',
        course_id: 1,
        test_type: 'Quiz',
        duration_minutes: 60,
        passing_score: 70,
        max_attempts: 3,
        is_active: true,
        shuffle_questions: false,
        show_results: true
    },
    invalid: {
        missingRequired: {
            test_description: 'ไม่มี test_name'
        },
        wrongDataType: {
            test_name: 'Test Wrong Type',
            duration_minutes: 'not-a-number',
            passing_score: 'invalid',
            max_attempts: 'abc',
            is_active: 'yes'
        },
        negativeValues: {
            test_name: 'Test Negative',
            duration_minutes: -30,
            passing_score: -50,
            max_attempts: -1
        },
        outOfRange: {
            test_name: 'Test Out of Range',
            duration_minutes: 10000,
            passing_score: 150,
            max_attempts: 1000
        },
        sqlInjection: {
            test_name: "'; DROP TABLE tests; --",
            test_description: "1' OR '1'='1",
            course_id: "1 OR 1=1"
        },
        xssAttempt: {
            test_name: "<script>alert('XSS')</script>",
            test_description: "<img src=x onerror=alert('XSS')>"
        },
        veryLongStrings: {
            test_name: 'A'.repeat(1000),
            test_description: 'B'.repeat(10000)
        },
        nullValues: {
            test_name: null,
            course_id: null,
            duration_minutes: null
        },
        emptyStrings: {
            test_name: '',
            test_description: '',
            test_type: ''
        }
    }
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
};

let errorCount = 0;
let testResults = [];

function logError(testName, error) {
    errorCount++;
    const result = {
        test: testName,
        status: 'ERROR',
        error: error.response ? {
            status: error.response.status,
            message: error.response.data.message || error.response.data,
            data: error.response.data
        } : {
            message: error.message
        }
    };
    testResults.push(result);
    console.log(`${colors.red}❌ ${testName}${colors.reset}`);
    console.log(`   Status: ${error.response?.status || 'N/A'}`);
    console.log(`   Message: ${error.response?.data?.message || error.message}`);
}

function logSuccess(testName, message) {
    const result = {
        test: testName,
        status: 'PASSED',
        message: message
    };
    testResults.push(result);
    console.log(`${colors.green}✓ ${testName}${colors.reset}`);
    if (message) console.log(`   ${message}`);
}

function logInfo(message) {
    console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logSection(title) {
    console.log(`\n${colors.magenta}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.magenta}${title}${colors.reset}`);
    console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== TEST CASES ==========

// 1. Authentication & Authorization Tests
async function testAuthenticationErrors() {
    logSection('1. AUTHENTICATION & AUTHORIZATION ERRORS');

    // Test: No authentication token
    try {
        await axios.get(`${API_BASE}/all`);
        logSuccess('ไม่มี token - ควรต้อง error 401/403', 'No error occurred - SECURITY ISSUE!');
    } catch (error) {
        logError('ไม่มี Authentication Token', error);
    }

    // Test: Invalid token
    try {
        await axios.get(`${API_BASE}/all`, {
            headers: { 'Authorization': 'Bearer invalid-token-12345' }
        });
        logSuccess('Invalid token - ควรต้อง error 401/403', 'No error occurred - SECURITY ISSUE!');
    } catch (error) {
        logError('Invalid Authentication Token', error);
    }

    // Test: Expired token (ถ้าระบบมี token expiry)
    try {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        await axios.get(`${API_BASE}/all`, {
            headers: { 'Authorization': `Bearer ${expiredToken}` }
        });
        logSuccess('Expired token - ควรต้อง error', 'No error occurred - SECURITY ISSUE!');
    } catch (error) {
        logError('Expired Token', error);
    }
}

// 2. Validation Errors
async function testValidationErrors() {
    logSection('2. VALIDATION ERRORS');

    // Test: Missing required fields
    try {
        await axios.post(`${API_BASE}/create`, testData.invalid.missingRequired);
        logSuccess('Missing required fields - ควรต้อง error 400', 'No error occurred - VALIDATION ISSUE!');
    } catch (error) {
        logError('Missing Required Fields (test_name)', error);
    }

    // Test: Wrong data types
    try {
        await axios.post(`${API_BASE}/create`, testData.invalid.wrongDataType);
        logSuccess('Wrong data types - ควรต้อง error 400', 'No error occurred - VALIDATION ISSUE!');
    } catch (error) {
        logError('Wrong Data Types (string instead of number)', error);
    }

    // Test: Negative values
    try {
        await axios.post(`${API_BASE}/create`, testData.invalid.negativeValues);
        logSuccess('Negative values - ควรต้อง error 400', 'No error occurred - VALIDATION ISSUE!');
    } catch (error) {
        logError('Negative Values (duration, score, attempts)', error);
    }

    // Test: Out of range values
    try {
        await axios.post(`${API_BASE}/create`, testData.invalid.outOfRange);
        logSuccess('Out of range values - ควรต้อง error 400', 'No error occurred - VALIDATION ISSUE!');
    } catch (error) {
        logError('Out of Range Values (too large)', error);
    }

    // Test: Empty strings
    try {
        await axios.post(`${API_BASE}/create`, testData.invalid.emptyStrings);
        logSuccess('Empty strings - ควรต้อง error 400', 'No error occurred - VALIDATION ISSUE!');
    } catch (error) {
        logError('Empty Strings for Required Fields', error);
    }

    // Test: Null values
    try {
        await axios.post(`${API_BASE}/create`, testData.invalid.nullValues);
        logSuccess('Null values - ควรต้อง error 400', 'No error occurred - VALIDATION ISSUE!');
    } catch (error) {
        logError('Null Values for Required Fields', error);
    }

    // Test: Very long strings (buffer overflow test)
    try {
        await axios.post(`${API_BASE}/create`, testData.invalid.veryLongStrings);
        logSuccess('Very long strings - ควรต้อง error 400', 'No error occurred - VALIDATION ISSUE!');
    } catch (error) {
        logError('Very Long Strings (1000+ characters)', error);
    }
}

// 3. Security Tests
async function testSecurityErrors() {
    logSection('3. SECURITY ERRORS (SQL Injection & XSS)');

    // Test: SQL Injection attempts
    try {
        await axios.post(`${API_BASE}/create`, testData.invalid.sqlInjection);
        logSuccess('SQL Injection - ควรต้อง error/sanitized', 'No error occurred - SECURITY ISSUE!');
    } catch (error) {
        logError('SQL Injection Attempt', error);
    }

    // Test: XSS attempts
    try {
        await axios.post(`${API_BASE}/create`, testData.invalid.xssAttempt);
        logSuccess('XSS Attempt - ควรต้อง error/sanitized', 'No error occurred - SECURITY ISSUE!');
    } catch (error) {
        logError('XSS Attack Attempt', error);
    }

    // Test: Path traversal in test_id
    try {
        await axios.get(`${API_BASE}/../../../etc/passwd`);
        logSuccess('Path Traversal - ควรต้อง error 400/404', 'No error occurred - SECURITY ISSUE!');
    } catch (error) {
        logError('Path Traversal Attempt', error);
    }

    // Test: NoSQL Injection (if applicable)
    try {
        await axios.get(`${API_BASE}/999999`, {
            params: { $where: "1==1" }
        });
    } catch (error) {
        logError('NoSQL Injection Attempt', error);
    }
}

// 4. Not Found Errors
async function testNotFoundErrors() {
    logSection('4. NOT FOUND ERRORS');

    // Test: Non-existent test ID
    try {
        await axios.get(`${API_BASE}/999999999`);
        logSuccess('Non-existent test ID - ควรต้อง error 404', 'No error occurred!');
    } catch (error) {
        logError('Non-existent Test ID (999999999)', error);
    }

    // Test: Invalid test ID format
    try {
        await axios.get(`${API_BASE}/invalid-id`);
        logSuccess('Invalid test ID format - ควรต้อง error 400/404', 'No error occurred!');
    } catch (error) {
        logError('Invalid Test ID Format (string)', error);
    }

    // Test: Negative test ID
    try {
        await axios.get(`${API_BASE}/-1`);
        logSuccess('Negative test ID - ควรต้อง error 400/404', 'No error occurred!');
    } catch (error) {
        logError('Negative Test ID (-1)', error);
    }

    // Test: Zero test ID
    try {
        await axios.get(`${API_BASE}/0`);
        logSuccess('Zero test ID - ควรต้อง error 404', 'No error occurred!');
    } catch (error) {
        logError('Zero Test ID (0)', error);
    }

    // Test: Delete non-existent test
    try {
        await axios.delete(`${API_BASE}/999999999`);
        logSuccess('Delete non-existent test - ควรต้อง error 404', 'No error occurred!');
    } catch (error) {
        logError('Delete Non-existent Test', error);
    }
}

// 5. Business Logic Errors
async function testBusinessLogicErrors() {
    logSection('5. BUSINESS LOGIC ERRORS');

    // Test: Start inactive test
    try {
        await axios.post(`${API_BASE}/1/start`);
        logSuccess('Start inactive test - ควรต้อง error 400', 'No error occurred!');
    } catch (error) {
        logError('Start Inactive Test (is_active = false)', error);
    }

    // Test: Exceed max attempts
    try {
        await axios.post(`${API_BASE}/1/start`);
        logSuccess('Exceed max attempts - ควรต้อง error 400', 'No error occurred!');
    } catch (error) {
        logError('Exceed Maximum Attempts', error);
    }

    // Test: Submit already completed test
    try {
        await axios.post(`${API_BASE}/1/1/submit`, {
            answers: [{ question_id: 1, answer: 'A' }]
        });
        logSuccess('Submit completed test - ควรต้อง error 400', 'No error occurred!');
    } catch (error) {
        logError('Submit Already Completed Test', error);
    }

    // Test: Submit test with invalid attempt_id
    try {
        await axios.post(`${API_BASE}/1/999999/submit`, {
            answers: [{ question_id: 1, answer: 'A' }]
        });
        logSuccess('Invalid attempt_id - ควรต้อง error 404', 'No error occurred!');
    } catch (error) {
        logError('Submit with Invalid Attempt ID', error);
    }

    // Test: Submit without answers
    try {
        await axios.post(`${API_BASE}/1/1/submit`, {});
        logSuccess('Submit without answers - ควรต้อง error 400', 'No error occurred!');
    } catch (error) {
        logError('Submit Test Without Answers', error);
    }

    // Test: Submit with empty answers array
    try {
        await axios.post(`${API_BASE}/1/1/submit`, {
            answers: []
        });
        logSuccess('Submit with empty answers - ควรต้อง error 400', 'No error occurred!');
    } catch (error) {
        logError('Submit Test With Empty Answers Array', error);
    }

    // Test: Start test twice (duplicate attempt)
    try {
        await axios.post(`${API_BASE}/1/start`);
        await axios.post(`${API_BASE}/1/start`);
        logSuccess('Duplicate active attempt - ควรต้อง error 400', 'No error occurred!');
    } catch (error) {
        logError('Start Test With Existing Active Attempt', error);
    }
}

// 6. Edge Cases & Race Conditions
async function testEdgeCases() {
    logSection('6. EDGE CASES & UNUSUAL SCENARIOS');

    // Test: Update with empty body
    try {
        await axios.put(`${API_BASE}/1`, {});
        logSuccess('Update with empty body - ควรต้อง error 400', 'No error occurred!');
    } catch (error) {
        logError('Update Test With Empty Body', error);
    }

    // Test: Create test with course_id that doesn't exist
    try {
        await axios.post(`${API_BASE}/create`, {
            ...testData.valid,
            course_id: 999999999
        });
        logSuccess('Non-existent course_id - ควรต้อง error 400', 'No error occurred!');
    } catch (error) {
        logError('Create Test With Non-existent Course ID', error);
    }

    // Test: Get tests with invalid pagination
    try {
        await axios.get(`${API_BASE}/all`, {
            params: { page: -1, limit: 0 }
        });
        logSuccess('Invalid pagination - ควรต้อง error 400', 'No error occurred!');
    } catch (error) {
        logError('Invalid Pagination Parameters (negative/zero)', error);
    }

    // Test: Get tests with very large limit
    try {
        await axios.get(`${API_BASE}/all`, {
            params: { page: 1, limit: 100000 }
        });
        logSuccess('Very large limit - ควรต้อง error/capped', 'No error occurred!');
    } catch (error) {
        logError('Very Large Pagination Limit (100000)', error);
    }

    // Test: Malformed JSON
    try {
        await axios.post(`${API_BASE}/create`, 'not-valid-json', {
            headers: { 'Content-Type': 'application/json' }
        });
        logSuccess('Malformed JSON - ควรต้อง error 400', 'No error occurred!');
    } catch (error) {
        logError('Malformed JSON Body', error);
    }

    // Test: Wrong HTTP method
    try {
        await axios.patch(`${API_BASE}/create`, testData.valid);
        logSuccess('Wrong HTTP method - ควรต้อง error 405', 'No error occurred!');
    } catch (error) {
        logError('Wrong HTTP Method (PATCH instead of POST)', error);
    }
}

// 7. Rate Limiting & Performance Tests
async function testRateLimiting() {
    logSection('7. RATE LIMITING & PERFORMANCE');

    // Test: Rapid requests (potential DoS)
    logInfo('Sending 50 rapid requests...');
    const promises = [];
    for (let i = 0; i < 50; i++) {
        promises.push(axios.get(`${API_BASE}/all`).catch(e => e));
    }

    try {
        const results = await Promise.all(promises);
        const rateLimited = results.filter(r => r.response?.status === 429);
        if (rateLimited.length > 0) {
            logError(`Rate Limiting Triggered (${rateLimited.length}/50 requests blocked)`, {
                response: { status: 429, data: { message: 'Too Many Requests' } }
            });
        } else {
            logSuccess('Rapid Requests', `All 50 requests succeeded - No rate limiting detected`);
        }
    } catch (error) {
        logError('Rate Limiting Test', error);
    }
}

// 8. Database Constraint Violations
async function testDatabaseConstraints() {
    logSection('8. DATABASE CONSTRAINT VIOLATIONS');

    // Test: Duplicate test_name (if unique constraint exists)
    try {
        await axios.post(`${API_BASE}/create`, testData.valid);
        await axios.post(`${API_BASE}/create`, testData.valid);
        logSuccess('Duplicate test_name - ควรต้อง error 409/400', 'No error occurred - constraint not enforced!');
    } catch (error) {
        logError('Duplicate Test Name (Unique Constraint)', error);
    }

    // Test: Foreign key constraint (invalid instructor_id)
    try {
        await axios.post(`${API_BASE}/create`, {
            ...testData.valid,
            instructor_id: 999999999
        });
        logSuccess('Invalid instructor_id - ควรต้อง error 400', 'No error occurred - constraint not enforced!');
    } catch (error) {
        logError('Invalid Foreign Key (instructor_id)', error);
    }
}

// ========== MAIN EXECUTION ==========

async function runAllTests() {
    console.log(`${colors.yellow}
╔════════════════════════════════════════════════════════════╗
║      LearnHub Tests API - Error Scenarios Testing         ║
║                  ทดสอบเพื่อหา Errors                       ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

    logInfo(`Testing API: ${API_BASE}`);
    logInfo(`Start Time: ${new Date().toLocaleString('th-TH')}`);

    await delay(1000);

    // Run all test suites
    await testAuthenticationErrors();
    await delay(500);

    await testValidationErrors();
    await delay(500);

    await testSecurityErrors();
    await delay(500);

    await testNotFoundErrors();
    await delay(500);

    await testBusinessLogicErrors();
    await delay(500);

    await testEdgeCases();
    await delay(500);

    await testRateLimiting();
    await delay(500);

    await testDatabaseConstraints();

    // Summary
    logSection('SUMMARY - สรุปผลการทดสอบ');
    console.log(`${colors.yellow}Total Errors Found: ${errorCount}${colors.reset}`);
    console.log(`${colors.blue}Total Tests Run: ${testResults.length}${colors.reset}\n`);

    // Group errors by status code
    const errorsByStatus = {};
    testResults.filter(r => r.status === 'ERROR').forEach(r => {
        const status = r.error.status || 'Unknown';
        if (!errorsByStatus[status]) errorsByStatus[status] = [];
        errorsByStatus[status].push(r.test);
    });

    console.log('Errors by Status Code:');
    Object.keys(errorsByStatus).sort().forEach(status => {
        console.log(`  ${colors.red}${status}${colors.reset}: ${errorsByStatus[status].length} errors`);
        errorsByStatus[status].forEach(test => {
            console.log(`    - ${test}`);
        });
    });

    logInfo(`\nEnd Time: ${new Date().toLocaleString('th-TH')}`);

    console.log(`\n${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);
}

// Run tests
runAllTests().catch(console.error);
