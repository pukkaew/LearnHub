const socketHandler = require('./socketHandler');
const { poolPromise } = require('../config/database');

class ProctoringService {
    constructor() {
        this.activeSessions = new Map(); // testSessionId -> session data
        this.violations = new Map(); // testSessionId -> violations array
        this.suspicionThresholds = {
            tabSwitchWarning: 3,
            tabSwitchMaximum: 5,
            multipleFacesWarning: 2,
            noFaceWarning: 5,
            suspiciousMovementWarning: 10
        };
    }

    async startProctoring(testSessionId, userId, testId) {
        try {
            const pool = await poolPromise;

            // Create proctoring session in database
            const sessionId = require('crypto').randomUUID();
            await pool.request()
                .input('sessionId', sessionId)
                .input('testSessionId', testSessionId)
                .input('userId', userId)
                .input('testId', testId)
                .query(`
                    INSERT INTO proctoring_sessions (sessionId, testSessionId, userId, testId, startTime, status)
                    VALUES (@sessionId, @testSessionId, @userId, @testId, GETDATE(), 'active')
                `);

            const session = {
                sessionId,
                testSessionId,
                userId,
                testId,
                startTime: new Date(),
                isActive: true,
                webcamEnabled: false,
                violations: {
                    tabSwitches: 0,
                    multipleFaces: 0,
                    noFaceDetected: 0,
                    suspiciousMovement: 0,
                    screenshots: []
                },
                warnings: [],
                screenshots: []
            };

            this.activeSessions.set(testSessionId, session);
            this.violations.set(testSessionId, []);

            // Emit to instructors for real-time monitoring
            socketHandler.emitToInstructors('proctoring_session_started', {
                sessionId,
                testSessionId,
                userId,
                testId,
                startTime: session.startTime
            });

            return session;
        } catch (error) {
            console.error('Error starting proctoring session:', error);
            throw error;
        }
    }

    async recordViolation(testSessionId, violationType, data = {}) {
        const session = this.activeSessions.get(testSessionId);
        if (!session) {
            throw new Error('Proctoring session not found');
        }

        try {
            const pool = await poolPromise;
            const violationId = require('crypto').randomUUID();

            // Store violation in database
            await pool.request()
                .input('violationId', violationId)
                .input('sessionId', session.sessionId)
                .input('testSessionId', testSessionId)
                .input('userId', session.userId)
                .input('violationType', violationType)
                .input('severity', this.getViolationSeverity(violationType))
                .input('description', this.getViolationDescription(violationType))
                .input('metadata', JSON.stringify(data))
                .query(`
                    INSERT INTO proctoring_violations (violationId, sessionId, testSessionId, userId, violationType, severity, description, metadata)
                    VALUES (@violationId, @sessionId, @testSessionId, @userId, @violationType, @severity, @description, @metadata)
                `);

            const violation = {
                violationId,
                type: violationType,
                timestamp: new Date(),
                data,
                severity: this.getViolationSeverity(violationType)
            };

            // Update session violations
            switch (violationType) {
                case 'tab_switch':
                    session.violations.tabSwitches++;
                    break;
                case 'multiple_faces':
                    session.violations.multipleFaces++;
                    break;
                case 'no_face_detected':
                    session.violations.noFaceDetected++;
                    break;
                case 'suspicious_movement':
                    session.violations.suspiciousMovement++;
                    break;
            }

            // Add to violations list
            const sessionViolations = this.violations.get(testSessionId) || [];
            sessionViolations.push(violation);
            this.violations.set(testSessionId, sessionViolations);

            // Update session total violations in database
            await pool.request()
                .input('sessionId', session.sessionId)
                .input('totalViolations', sessionViolations.length)
                .query(`
                    UPDATE proctoring_sessions
                    SET totalViolations = @totalViolations, updatedAt = GETDATE()
                    WHERE sessionId = @sessionId
                `);

            // Check if warning should be issued
            const shouldWarn = this.shouldIssueWarning(session, violationType);
            const shouldTerminate = this.shouldTerminateTest(session);

            // Real-time notification to instructors
            socketHandler.emitToInstructors('proctoring_violation', {
                testSessionId,
                userId: session.userId,
                violation,
                totalViolations: sessionViolations.length,
                shouldWarn,
                shouldTerminate
            });

            return violation;
        } catch (error) {
            console.error('Error recording violation:', error);
            throw error;
        }

        // Notify student if warning level reached
        if (shouldWarn) {
            const warning = this.generateWarning(violationType, session.violations[this.getViolationKey(violationType)]);
            session.warnings.push(warning);

            socketHandler.emitToUser(session.userId, 'proctoring_warning', warning);
        }

        // Auto-terminate if threshold exceeded
        if (shouldTerminate) {
            await this.terminateTest(testSessionId, 'excessive_violations');
        }

        return {
            violation,
            shouldWarn,
            shouldTerminate,
            totalViolations: sessionViolations.length
        };
    }

    async captureScreenshot(testSessionId, imageData, violationType = null) {
        const session = this.activeSessions.get(testSessionId);
        if (!session) {
            throw new Error('Proctoring session not found');
        }

        const screenshot = {
            timestamp: new Date(),
            imageData,
            violationType,
            testSessionId
        };

        session.screenshots.push(screenshot);

        // Store in database if needed for evidence
        // await this.saveScreenshotToDatabase(screenshot);

        return screenshot;
    }

    updateWebcamStatus(testSessionId, isEnabled) {
        const session = this.activeSessions.get(testSessionId);
        if (session) {
            session.webcamEnabled = isEnabled;

            if (!isEnabled) {
                this.recordViolation(testSessionId, 'webcam_disabled', {
                    message: 'Webcam was disabled during test'
                });
            }
        }
    }

    async endProctoring(testSessionId, reason = 'completed') {
        const session = this.activeSessions.get(testSessionId);
        if (!session) {
            return null;
        }

        session.endTime = new Date();
        session.isActive = false;
        session.endReason = reason;

        const violations = this.violations.get(testSessionId) || [];
        const report = this.generateProctoringReport(session, violations);

        // Emit final report to instructors
        socketHandler.emitToInstructors('proctoring_session_ended', {
            testSessionId,
            userId: session.userId,
            report
        });

        // Clean up active sessions
        this.activeSessions.delete(testSessionId);

        return report;
    }

    async terminateTest(testSessionId, reason) {
        const session = this.activeSessions.get(testSessionId);
        if (!session) {
            return;
        }

        // Force end the test
        socketHandler.emitToUser(session.userId, 'test_terminated', {
            reason,
            message: this.getTerminationMessage(reason)
        });

        // Notify instructors
        socketHandler.emitToInstructors('test_terminated', {
            testSessionId,
            userId: session.userId,
            reason,
            timestamp: new Date()
        });

        return await this.endProctoring(testSessionId, reason);
    }

    getViolationSeverity(violationType) {
        const severityMap = {
            'tab_switch': 'medium',
            'multiple_faces': 'high',
            'no_face_detected': 'medium',
            'suspicious_movement': 'low',
            'webcam_disabled': 'high',
            'unauthorized_application': 'high'
        };
        return severityMap[violationType] || 'low';
    }

    getViolationDescription(violationType) {
        const descriptionMap = {
            'tab_switch': 'ผู้สอบเปลี่ยนแท็บหรือหน้าต่างระหว่างการสอบ',
            'multiple_faces': 'ตรวจพบใบหน้าหลายคนในกล้อง',
            'no_face_detected': 'ไม่พบใบหน้าในกล้อง',
            'suspicious_movement': 'การเคลื่อนไหวที่น่าสงสัยในกล้อง',
            'webcam_disabled': 'กล้องถูกปิดระหว่างการสอบ',
            'unauthorized_application': 'เปิดแอปพลิเคชันที่ไม่ได้รับอนุญาต'
        };
        return descriptionMap[violationType] || 'การละเมิดที่ไม่ระบุ';
    }

    shouldIssueWarning(session, violationType) {
        const violations = session.violations;
        const thresholds = this.suspicionThresholds;

        switch (violationType) {
            case 'tab_switch':
                return violations.tabSwitches >= thresholds.tabSwitchWarning;
            case 'multiple_faces':
                return violations.multipleFaces >= thresholds.multipleFacesWarning;
            case 'no_face_detected':
                return violations.noFaceDetected >= thresholds.noFaceWarning;
            case 'suspicious_movement':
                return violations.suspiciousMovement >= thresholds.suspiciousMovementWarning;
            default:
                return false;
        }
    }

    shouldTerminateTest(session) {
        const violations = session.violations;
        const thresholds = this.suspicionThresholds;

        return violations.tabSwitches >= thresholds.tabSwitchMaximum ||
               violations.multipleFaces >= 5 ||
               violations.noFaceDetected >= 10;
    }

    getViolationKey(violationType) {
        const keyMap = {
            'tab_switch': 'tabSwitches',
            'multiple_faces': 'multipleFaces',
            'no_face_detected': 'noFaceDetected',
            'suspicious_movement': 'suspiciousMovement'
        };
        return keyMap[violationType];
    }

    generateWarning(violationType, count) {
        const warnings = {
            'tab_switch': `คำเตือน: คุณได้เปลี่ยนหน้าต่างไป ${count} ครั้งแล้ว หากเปลี่ยนเกิน ${this.suspicionThresholds.tabSwitchMaximum} ครั้ง การทดสอบจะถูกยุติ`,
            'multiple_faces': `คำเตือน: ตรวจพบใบหน้าหลายคนในกล้อง ${count} ครั้ง กรุณาทำแบบทดสอบเพียงลำพัง`,
            'no_face_detected': `คำเตือน: ไม่พบใบหน้าในกล้อง ${count} ครั้ง กรุณาอยู่หน้ากล้องตลอดเวลา`,
            'suspicious_movement': `คำเตือน: ตรวจพบการเคลื่อนไหวผิดปกติ ${count} ครั้ง`
        };

        return {
            type: violationType,
            message: warnings[violationType] || 'คำเตือนทั่วไป',
            timestamp: new Date(),
            count
        };
    }

    getTerminationMessage(reason) {
        const messages = {
            'excessive_violations': 'การทดสอบถูกยุติเนื่องจากการละเมิดกฎเกณฑ์มากเกินไป',
            'webcam_disabled': 'การทดสอบถูกยุติเนื่องจากปิดกล้อง',
            'unauthorized_application': 'การทดสอบถูกยุติเนื่องจากเปิดแอปพลิเคชันที่ไม่ได้รับอนุญาต',
            'manual_termination': 'การทดสอบถูกยุติโดยผู้ควบคุม'
        };
        return messages[reason] || 'การทดสอบถูกยุติ';
    }

    generateProctoringReport(session, violations) {
        const report = {
            testSessionId: session.testSessionId,
            userId: session.userId,
            testId: session.testId,
            duration: session.endTime - session.startTime,
            startTime: session.startTime,
            endTime: session.endTime,
            endReason: session.endReason,
            violations: {
                total: violations.length,
                byType: {},
                details: violations
            },
            warnings: session.warnings,
            screenshotCount: session.screenshots.length,
            integrity: this.calculateIntegrityScore(session, violations)
        };

        // Count violations by type
        violations.forEach(violation => {
            report.violations.byType[violation.type] = (report.violations.byType[violation.type] || 0) + 1;
        });

        return report;
    }

    calculateIntegrityScore(session, violations) {
        let score = 100;

        // Deduct points for violations
        violations.forEach(violation => {
            switch (violation.severity) {
                case 'high':
                    score -= 15;
                    break;
                case 'medium':
                    score -= 10;
                    break;
                case 'low':
                    score -= 5;
                    break;
            }
        });

        // Additional deductions for webcam issues
        if (!session.webcamEnabled) {
            score -= 30;
        }

        return Math.max(0, score);
    }

    getActiveSession(testSessionId) {
        return this.activeSessions.get(testSessionId);
    }

    getAllActiveSessions() {
        return Array.from(this.activeSessions.values());
    }

    getSessionViolations(testSessionId) {
        return this.violations.get(testSessionId) || [];
    }
}

module.exports = new ProctoringService();