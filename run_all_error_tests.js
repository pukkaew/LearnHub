/**
 * Master Test Runner - รันการทดสอบทั้งหมดเพื่อหา Errors
 * Run all error detection tests in sequence
 */

const { spawn } = require('child_process');
const axios = require('axios');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m'
};

const SERVER_URL = 'http://localhost:3000';
const SERVER_CHECK_INTERVAL = 2000;
const SERVER_MAX_WAIT = 30000;

let serverProcess = null;
let serverStarted = false;

// ========== Helper Functions ==========

function log(message, color = colors.white) {
    console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
    const width = 80;
    const padding = Math.floor((width - message.length - 2) / 2);
    const line = '═'.repeat(width);

    console.log(`\n${colors.cyan}╔${line}╗${colors.reset}`);
    console.log(`${colors.cyan}║${' '.repeat(padding)}${colors.yellow}${message}${colors.cyan}${' '.repeat(width - padding - message.length)}║${colors.reset}`);
    console.log(`${colors.cyan}╚${line}╝${colors.reset}\n`);
}

function logSection(title) {
    console.log(`\n${colors.magenta}${'─'.repeat(80)}${colors.reset}`);
    console.log(`${colors.magenta}${title}${colors.reset}`);
    console.log(`${colors.magenta}${'─'.repeat(80)}${colors.reset}\n`);
}

function logStep(step, message) {
    console.log(`${colors.blue}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
    console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logWarning(message) {
    console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== Server Management ==========

async function checkServerHealth() {
    try {
        const response = await axios.get(`${SERVER_URL}/health`, { timeout: 2000 });
        return response.status === 200;
    } catch (error) {
        try {
            const response = await axios.get(SERVER_URL, { timeout: 2000 });
            return response.status === 200 || response.status === 302 || response.status === 404;
        } catch (err) {
            return false;
        }
    }
}

async function waitForServer() {
    logStep('SERVER', 'กำลังตรวจสอบ server...');

    const startTime = Date.now();
    let attempts = 0;

    while (Date.now() - startTime < SERVER_MAX_WAIT) {
        attempts++;

        if (await checkServerHealth()) {
            logSuccess(`Server พร้อมใช้งานแล้ว (ใช้เวลา ${((Date.now() - startTime) / 1000).toFixed(1)}s)`);
            return true;
        }

        if (attempts % 5 === 0) {
            log(`  รอ server... (${attempts} attempts, ${((Date.now() - startTime) / 1000).toFixed(0)}s)`, colors.cyan);
        }

        await delay(SERVER_CHECK_INTERVAL);
    }

    return false;
}

function startServer() {
    return new Promise((resolve, reject) => {
        logStep('SERVER', 'กำลังเริ่ม server...');

        serverProcess = spawn('node', ['server.js'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });

        let output = '';

        serverProcess.stdout.on('data', (data) => {
            output += data.toString();
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    log(`  [SERVER] ${line.trim()}`, colors.cyan);
                }
            });

            // Check if server started
            if (output.includes('Server running') || output.includes('listening')) {
                serverStarted = true;
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    log(`  [SERVER ERROR] ${line.trim()}`, colors.red);
                }
            });
        });

        serverProcess.on('error', (error) => {
            logError(`Failed to start server: ${error.message}`);
            reject(error);
        });

        serverProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                logError(`Server exited with code ${code}`);
            }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            if (!serverStarted) {
                resolve(); // Resolve anyway, will check health later
            }
        }, 10000);
    });
}

function stopServer() {
    if (serverProcess) {
        logStep('SERVER', 'กำลังปิด server...');
        try {
            serverProcess.kill('SIGTERM');
            // Wait a bit before force kill
            setTimeout(() => {
                if (serverProcess && !serverProcess.killed) {
                    serverProcess.kill('SIGKILL');
                }
            }, 3000);
            logSuccess('Server ถูกปิดแล้ว');
        } catch (error) {
            logError(`ไม่สามารถปิด server: ${error.message}`);
        }
    }
}

// ========== Test Execution ==========

function runTest(testFile, testName) {
    return new Promise((resolve, reject) => {
        logSection(`เริ่มทดสอบ: ${testName}`);
        log(`ไฟล์: ${testFile}\n`, colors.cyan);

        const testProcess = spawn('node', [testFile], {
            stdio: 'inherit'
        });

        testProcess.on('exit', (code) => {
            if (code === 0) {
                logSuccess(`${testName} เสร็จสิ้น\n`);
                resolve({ testName, success: true, code: 0 });
            } else {
                logWarning(`${testName} เสร็จสิ้นด้วย code ${code}\n`);
                resolve({ testName, success: false, code });
            }
        });

        testProcess.on('error', (error) => {
            logError(`${testName} เกิดข้อผิดพลาด: ${error.message}\n`);
            reject({ testName, error });
        });
    });
}

// ========== Main Test Sequence ==========

async function runAllTests() {
    logHeader('LearnHub Error Detection Test Suite');

    log('เริ่มการทดสอบเพื่อหา Errors ในระบบ', colors.yellow);
    log('Start Time: ' + new Date().toLocaleString('th-TH'), colors.cyan);
    log('', colors.reset);

    const testResults = [];
    const startTime = Date.now();

    try {
        // Step 1: Check if server is already running
        logStep('1', 'ตรวจสอบสถานะ server...');
        const isRunning = await checkServerHealth();

        if (isRunning) {
            logSuccess('Server ทำงานอยู่แล้ว');
        } else {
            logWarning('Server ไม่ทำงาน - กำลังเริ่ม server...');

            // Start server
            await startServer();

            // Wait for server to be ready
            const serverReady = await waitForServer();

            if (!serverReady) {
                logError('ไม่สามารถเชื่อมต่อ server ได้');
                logWarning('กรุณาเริ่ม server ด้วยตนเอง: npm run dev');
                logWarning('จะดำเนินการทดสอบต่อไป...');
                await delay(2000);
            }
        }

        await delay(2000);

        // Step 2: Run Model Layer Tests (doesn't require API)
        logStep('2', 'ทดสอบ Model Layer และ Database Constraints...');
        await delay(1000);

        try {
            const result = await runTest('test_model_errors.js', 'Model Layer Tests');
            testResults.push(result);
        } catch (error) {
            testResults.push({ testName: 'Model Layer Tests', success: false, error });
        }

        await delay(3000);

        // Step 3: Run API Tests (requires server)
        logStep('3', 'ทดสอบ API Layer และ HTTP Endpoints...');
        await delay(1000);

        // Check server again before API tests
        const serverHealthy = await checkServerHealth();
        if (!serverHealthy) {
            logWarning('Server ไม่พร้อมสำหรับ API tests');
            logWarning('กรุณาตรวจสอบ server และรัน: node test_error_scenarios.js แยกต่างหาก');
        } else {
            try {
                const result = await runTest('test_error_scenarios.js', 'API Layer Tests');
                testResults.push(result);
            } catch (error) {
                testResults.push({ testName: 'API Layer Tests', success: false, error });
            }
        }

        // Step 4: Summary
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);

        logHeader('สรุปผลการทดสอบ');

        console.log(`${colors.cyan}Total Tests Run: ${testResults.length}${colors.reset}`);
        console.log(`${colors.green}Successful: ${testResults.filter(r => r.success).length}${colors.reset}`);
        console.log(`${colors.red}Failed: ${testResults.filter(r => !r.success).length}${colors.reset}`);
        console.log(`${colors.yellow}Duration: ${duration}s${colors.reset}\n`);

        testResults.forEach((result, index) => {
            const status = result.success ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
            console.log(`  ${index + 1}. ${status} - ${result.testName}`);
            if (result.code !== undefined && result.code !== 0) {
                console.log(`     ${colors.yellow}Exit code: ${result.code}${colors.reset}`);
            }
            if (result.error) {
                console.log(`     ${colors.red}Error: ${result.error.message || result.error}${colors.reset}`);
            }
        });

        console.log('');
        log('End Time: ' + new Date().toLocaleString('th-TH'), colors.cyan);

        console.log(`\n${colors.magenta}${'═'.repeat(80)}${colors.reset}\n`);

        logSection('หมายเหตุ');
        console.log(`  ${colors.red}❌ ERROR${colors.reset} = พบข้อผิดพลาดตามที่คาดหวัง (ระบบป้องกันได้) ✅`);
        console.log(`  ${colors.green}✓ PASS${colors.reset}  = ไม่พบ error (อาจเป็นปัญหาถ้าควรมี constraint) ⚠️`);
        console.log('');
        console.log(`  ดูคู่มือเพิ่มเติมที่: ${colors.cyan}TEST_ERROR_GUIDE.md${colors.reset}\n`);

    } catch (error) {
        logError(`Fatal error during test execution: ${error.message}`);
        console.error(error);
    } finally {
        // Cleanup
        if (serverProcess && serverStarted) {
            await delay(2000);
            stopServer();
        }

        log('\nการทดสอบเสร็จสิ้น', colors.yellow);

        setTimeout(() => {
            process.exit(0);
        }, 3000);
    }
}

// ========== Signal Handlers ==========

process.on('SIGINT', () => {
    log('\n\nได้รับสัญญาณ interrupt...', colors.yellow);
    stopServer();
    setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
    log('\n\nได้รับสัญญาณ terminate...', colors.yellow);
    stopServer();
    setTimeout(() => process.exit(0), 1000);
});

process.on('uncaughtException', (error) => {
    logError(`Uncaught exception: ${error.message}`);
    console.error(error);
    stopServer();
    setTimeout(() => process.exit(1), 1000);
});

// ========== Execute ==========

runAllTests().catch((error) => {
    logError(`Test suite failed: ${error.message}`);
    console.error(error);
    stopServer();
    process.exit(1);
});
