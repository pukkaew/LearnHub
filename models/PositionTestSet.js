/**
 * Model: PositionTestSet
 * จัดการชุดข้อสอบหลายชุดสำหรับแต่ละตำแหน่ง
 */

const { poolPromise, sql } = require('../config/database');

class PositionTestSet {
    constructor(data) {
        this.set_id = data.set_id;
        this.position_id = data.position_id;
        this.test_id = data.test_id;
        this.test_order = data.test_order;
        this.test_category = data.test_category;
        this.is_required = data.is_required;
        this.weight_percent = data.weight_percent;
        this.passing_score_override = data.passing_score_override;
        this.is_active = data.is_active;
    }

    // ============ Position Test Set Management ============

    /**
     * เพิ่มข้อสอบเข้าชุดข้อสอบของตำแหน่ง
     */
    static async addTestToPosition(data) {
        try {
            const pool = await poolPromise;

            // ตรวจสอบว่ามีอยู่แล้วหรือไม่
            const existCheck = await pool.request()
                .input('positionId', sql.Int, data.position_id)
                .input('testId', sql.Int, data.test_id)
                .query(`
                    SELECT set_id FROM PositionTestSets
                    WHERE position_id = @positionId AND test_id = @testId
                `);

            if (existCheck.recordset.length > 0) {
                return { success: false, message: 'ข้อสอบนี้มีอยู่ในชุดแล้ว' };
            }

            // หาลำดับถัดไป
            const orderResult = await pool.request()
                .input('positionId', sql.Int, data.position_id)
                .query(`
                    SELECT ISNULL(MAX(test_order), 0) + 1 as next_order
                    FROM PositionTestSets WHERE position_id = @positionId
                `);
            const nextOrder = orderResult.recordset[0].next_order;

            const result = await pool.request()
                .input('positionId', sql.Int, data.position_id)
                .input('testId', sql.Int, data.test_id)
                .input('testOrder', sql.Int, data.test_order || nextOrder)
                .input('testCategory', sql.NVarChar(50), data.test_category || null)
                .input('isRequired', sql.Bit, data.is_required !== false ? 1 : 0)
                .input('weightPercent', sql.Int, data.weight_percent || 100)
                .input('passingScoreOverride', sql.Int, data.passing_score_override || null)
                .query(`
                    INSERT INTO PositionTestSets (
                        position_id, test_id, test_order, test_category,
                        is_required, weight_percent, passing_score_override
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @positionId, @testId, @testOrder, @testCategory,
                        @isRequired, @weightPercent, @passingScoreOverride
                    )
                `);

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error adding test to position:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * ดึงชุดข้อสอบทั้งหมดของตำแหน่ง (รวม Global tests และ TestPositions)
     */
    static async getTestsByPosition(positionId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('positionId', sql.Int, positionId)
                .query(`
                    -- Global tests (ทุกตำแหน่งต้องสอบ)
                    SELECT
                        NULL as set_id,
                        @positionId as position_id,
                        t.test_id,
                        0 as test_order,
                        'global' as test_category,
                        1 as is_required,
                        100 as weight_percent,
                        NULL as passing_score_override,
                        1 as is_active,
                        t.created_at,
                        t.updated_at,
                        t.title as test_title,
                        t.description as test_description,
                        t.type as test_type,
                        t.time_limit,
                        t.total_marks,
                        t.passing_marks,
                        t.status as test_status,
                        'global' as assignment_type,
                        (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count
                    FROM Tests t
                    WHERE t.is_global_applicant_test = 1
                      AND t.status = 'Published'
                      AND t.type IN ('job_application_test', 'aptitude_test', 'pre_employment_test')

                    UNION ALL

                    -- Tests from TestPositions (เลือกหลายตำแหน่ง)
                    SELECT
                        NULL as set_id,
                        tp.position_id,
                        t.test_id,
                        tp.test_order,
                        'position' as test_category,
                        tp.is_required,
                        tp.weight_percent,
                        tp.passing_score_override,
                        tp.is_active,
                        tp.created_at,
                        tp.created_at as updated_at,
                        t.title as test_title,
                        t.description as test_description,
                        t.type as test_type,
                        t.time_limit,
                        t.total_marks,
                        t.passing_marks,
                        t.status as test_status,
                        'position' as assignment_type,
                        (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count
                    FROM TestPositions tp
                    JOIN Tests t ON tp.test_id = t.test_id
                    WHERE tp.position_id = @positionId
                      AND tp.is_active = 1
                      AND t.status = 'Published'
                      AND t.is_global_applicant_test = 0

                    UNION ALL

                    -- Tests from PositionTestSets (legacy - เลือกตำแหน่งเดียว)
                    SELECT
                        pts.set_id,
                        pts.position_id,
                        t.test_id,
                        pts.test_order,
                        pts.test_category,
                        pts.is_required,
                        pts.weight_percent,
                        pts.passing_score_override,
                        pts.is_active,
                        pts.created_at,
                        pts.updated_at,
                        t.title as test_title,
                        t.description as test_description,
                        t.type as test_type,
                        t.time_limit,
                        t.total_marks,
                        t.passing_marks,
                        t.status as test_status,
                        'legacy' as assignment_type,
                        (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count
                    FROM PositionTestSets pts
                    JOIN Tests t ON pts.test_id = t.test_id
                    WHERE pts.position_id = @positionId
                      AND pts.is_active = 1
                      AND t.status = 'Published'
                      AND t.is_global_applicant_test = 0
                      AND NOT EXISTS (
                          SELECT 1 FROM TestPositions tp2
                          WHERE tp2.test_id = t.test_id
                            AND tp2.position_id = @positionId
                            AND tp2.is_active = 1
                      )

                    ORDER BY test_order ASC, created_at ASC
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting tests by position:', error);
            return [];
        }
    }

    /**
     * อัปเดตลำดับข้อสอบ
     */
    static async updateTestOrder(setId, newOrder) {
        try {
            const pool = await poolPromise;

            await pool.request()
                .input('setId', sql.Int, setId)
                .input('newOrder', sql.Int, newOrder)
                .query(`
                    UPDATE PositionTestSets
                    SET test_order = @newOrder, updated_at = GETDATE()
                    WHERE set_id = @setId
                `);

            return { success: true };
        } catch (error) {
            console.error('Error updating test order:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * ลบข้อสอบออกจากชุด
     */
    static async removeTestFromPosition(setId) {
        try {
            const pool = await poolPromise;

            await pool.request()
                .input('setId', sql.Int, setId)
                .query(`
                    UPDATE PositionTestSets
                    SET is_active = 0, updated_at = GETDATE()
                    WHERE set_id = @setId
                `);

            return { success: true };
        } catch (error) {
            console.error('Error removing test from position:', error);
            return { success: false, message: error.message };
        }
    }

    // ============ Position Test Config ============

    /**
     * ดึงหรือสร้าง config ของตำแหน่ง
     */
    static async getOrCreateConfig(positionId) {
        try {
            const pool = await poolPromise;

            // ลองดึง config ที่มีอยู่
            let result = await pool.request()
                .input('positionId', sql.Int, positionId)
                .query(`
                    SELECT * FROM PositionTestSetConfig
                    WHERE position_id = @positionId
                `);

            if (result.recordset.length === 0) {
                // สร้าง config ใหม่
                result = await pool.request()
                    .input('positionId', sql.Int, positionId)
                    .query(`
                        INSERT INTO PositionTestSetConfig (position_id)
                        OUTPUT INSERTED.*
                        VALUES (@positionId)
                    `);
            }

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting/creating config:', error);
            return null;
        }
    }

    /**
     * อัปเดต config ของตำแหน่ง
     */
    static async updateConfig(positionId, configData) {
        try {
            const pool = await poolPromise;

            const updateFields = [];
            const request = pool.request().input('positionId', sql.Int, positionId);

            if (configData.passing_criteria !== undefined) {
                updateFields.push('passing_criteria = @passingCriteria');
                request.input('passingCriteria', sql.NVarChar(20), configData.passing_criteria);
            }
            if (configData.min_average_score !== undefined) {
                updateFields.push('min_average_score = @minAverageScore');
                request.input('minAverageScore', sql.Int, configData.min_average_score);
            }
            if (configData.min_tests_to_pass !== undefined) {
                updateFields.push('min_tests_to_pass = @minTestsToPass');
                request.input('minTestsToPass', sql.Int, configData.min_tests_to_pass);
            }
            if (configData.allow_partial_completion !== undefined) {
                updateFields.push('allow_partial_completion = @allowPartial');
                request.input('allowPartial', sql.Bit, configData.allow_partial_completion ? 1 : 0);
            }
            if (configData.max_attempts_per_test !== undefined) {
                updateFields.push('max_attempts_per_test = @maxAttempts');
                request.input('maxAttempts', sql.Int, configData.max_attempts_per_test);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'ไม่มีข้อมูลที่ต้องอัปเดต' };
            }

            updateFields.push('updated_at = GETDATE()');

            await request.query(`
                UPDATE PositionTestSetConfig
                SET ${updateFields.join(', ')}
                WHERE position_id = @positionId
            `);

            return { success: true };
        } catch (error) {
            console.error('Error updating config:', error);
            return { success: false, message: error.message };
        }
    }

    // ============ Applicant Test Progress ============

    /**
     * สร้างรายการข้อสอบที่ต้องทำสำหรับผู้สมัคร
     */
    static async initializeApplicantTests(applicantId, positionId) {
        try {
            const pool = await poolPromise;

            // ดึงชุดข้อสอบของตำแหน่ง
            const tests = await this.getTestsByPosition(positionId);

            if (tests.length === 0) {
                return { success: false, message: 'ไม่พบชุดข้อสอบสำหรับตำแหน่งนี้' };
            }

            // สร้าง progress สำหรับแต่ละข้อสอบ
            for (const test of tests) {
                // ตรวจสอบว่ามี progress อยู่แล้วหรือไม่
                const existCheck = await pool.request()
                    .input('applicantId', sql.Int, applicantId)
                    .input('testId', sql.Int, test.test_id)
                    .query(`
                        SELECT progress_id FROM ApplicantTestProgress
                        WHERE applicant_id = @applicantId AND test_id = @testId
                    `);

                if (existCheck.recordset.length === 0) {
                    // ถ้า set_id เป็น null ให้ไม่ใส่ (สำหรับ global tests หรือ TestPositions)
                    if (test.set_id) {
                        await pool.request()
                            .input('applicantId', sql.Int, applicantId)
                            .input('positionId', sql.Int, positionId)
                            .input('testId', sql.Int, test.test_id)
                            .input('setId', sql.Int, test.set_id)
                            .query(`
                                INSERT INTO ApplicantTestProgress (
                                    applicant_id, position_id, test_id, set_id, status
                                ) VALUES (
                                    @applicantId, @positionId, @testId, @setId, 'pending'
                                )
                            `);
                    } else {
                        await pool.request()
                            .input('applicantId', sql.Int, applicantId)
                            .input('positionId', sql.Int, positionId)
                            .input('testId', sql.Int, test.test_id)
                            .query(`
                                INSERT INTO ApplicantTestProgress (
                                    applicant_id, position_id, test_id, status
                                ) VALUES (
                                    @applicantId, @positionId, @testId, 'pending'
                                )
                            `);
                    }
                }
            }

            return { success: true, total_tests: tests.length };
        } catch (error) {
            console.error('Error initializing applicant tests:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * ดึงรายการข้อสอบและสถานะของผู้สมัคร
     */
    static async getApplicantTestProgress(applicantId, positionId = null) {
        try {
            const pool = await poolPromise;

            let query = `
                SELECT
                    atp.*,
                    pts.test_order,
                    pts.test_category,
                    pts.is_required,
                    pts.weight_percent,
                    pts.passing_score_override,
                    t.title as test_title,
                    t.description as test_description,
                    t.type as test_type,
                    t.time_limit,
                    t.total_marks,
                    t.passing_marks,
                    (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count,
                    p.position_name
                FROM ApplicantTestProgress atp
                LEFT JOIN PositionTestSets pts ON atp.set_id = pts.set_id
                JOIN Tests t ON atp.test_id = t.test_id
                JOIN Positions p ON atp.position_id = p.position_id
                WHERE atp.applicant_id = @applicantId
            `;

            const request = pool.request().input('applicantId', sql.Int, applicantId);

            if (positionId) {
                query += ' AND atp.position_id = @positionId';
                request.input('positionId', sql.Int, positionId);
            }

            query += ' ORDER BY ISNULL(pts.test_order, 999), atp.created_at';

            const result = await request.query(query);

            return result.recordset;
        } catch (error) {
            console.error('Error getting applicant test progress:', error);
            return [];
        }
    }

    /**
     * อัปเดตสถานะข้อสอบของผู้สมัคร
     */
    static async updateApplicantTestStatus(applicantId, testId, statusData) {
        try {
            const pool = await poolPromise;

            const updateFields = ['updated_at = GETDATE()'];
            const request = pool.request()
                .input('applicantId', sql.Int, applicantId)
                .input('testId', sql.Int, testId);

            if (statusData.status) {
                updateFields.push('status = @status');
                request.input('status', sql.NVarChar(20), statusData.status);
            }
            if (statusData.attempt_id) {
                updateFields.push('attempt_id = @attemptId');
                request.input('attemptId', sql.Int, statusData.attempt_id);
            }
            if (statusData.score !== undefined) {
                updateFields.push('score = @score');
                request.input('score', sql.Decimal(5, 2), statusData.score);
            }
            if (statusData.percentage !== undefined) {
                updateFields.push('percentage = @percentage');
                request.input('percentage', sql.Decimal(5, 2), statusData.percentage);
            }
            if (statusData.passed !== undefined) {
                updateFields.push('passed = @passed');
                request.input('passed', sql.Bit, statusData.passed ? 1 : 0);
            }
            if (statusData.started_at) {
                updateFields.push('started_at = @startedAt');
                request.input('startedAt', sql.DateTime2, statusData.started_at);
            }
            if (statusData.completed_at) {
                updateFields.push('completed_at = @completedAt');
                request.input('completedAt', sql.DateTime2, statusData.completed_at);
            }
            if (statusData.time_spent_seconds !== undefined) {
                updateFields.push('time_spent_seconds = @timeSpent');
                request.input('timeSpent', sql.Int, statusData.time_spent_seconds);
            }

            await request.query(`
                UPDATE ApplicantTestProgress
                SET ${updateFields.join(', ')}
                WHERE applicant_id = @applicantId AND test_id = @testId
            `);

            return { success: true };
        } catch (error) {
            console.error('Error updating applicant test status:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * คำนวณผลรวมของผู้สมัคร
     */
    static async calculateApplicantOverallResult(applicantId, positionId) {
        try {
            const pool = await poolPromise;

            // ดึง config และ progress
            const config = await this.getOrCreateConfig(positionId);
            const progress = await this.getApplicantTestProgress(applicantId, positionId);

            if (progress.length === 0) {
                return { success: false, message: 'ไม่พบข้อมูลการสอบ' };
            }

            const completedTests = progress.filter(p => p.status === 'completed');
            const passedTests = completedTests.filter(p => p.passed);
            const requiredTests = progress.filter(p => p.is_required);
            const requiredPassed = requiredTests.filter(p => p.passed);

            // คำนวณคะแนนเฉลี่ย (weighted)
            let totalWeight = 0;
            let weightedScore = 0;
            for (const test of completedTests) {
                const weight = test.weight_percent || 100;
                totalWeight += weight;
                weightedScore += (test.percentage || 0) * weight;
            }
            const averageScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

            // ตรวจสอบการผ่าน
            let overallPassed = false;
            let passReason = '';

            switch (config.passing_criteria) {
                case 'all_pass':
                    // ต้องผ่านทุกข้อสอบที่บังคับ
                    overallPassed = requiredPassed.length === requiredTests.length;
                    passReason = overallPassed
                        ? 'ผ่านทุกข้อสอบที่บังคับ'
                        : `ผ่าน ${requiredPassed.length}/${requiredTests.length} ข้อสอบที่บังคับ`;
                    break;

                case 'average':
                    // คะแนนเฉลี่ยต้องถึงเกณฑ์
                    overallPassed = averageScore >= (config.min_average_score || 60);
                    passReason = `คะแนนเฉลี่ย ${averageScore.toFixed(2)}% ${overallPassed ? '>=' : '<'} ${config.min_average_score}%`;
                    break;

                case 'min_tests':
                    // ต้องผ่านจำนวนข้อสอบขั้นต่ำ
                    overallPassed = passedTests.length >= (config.min_tests_to_pass || 1);
                    passReason = `ผ่าน ${passedTests.length}/${config.min_tests_to_pass} ข้อสอบ`;
                    break;

                default:
                    overallPassed = requiredPassed.length === requiredTests.length;
            }

            return {
                success: true,
                data: {
                    total_tests: progress.length,
                    completed_tests: completedTests.length,
                    passed_tests: passedTests.length,
                    required_tests: requiredTests.length,
                    required_passed: requiredPassed.length,
                    average_score: averageScore,
                    overall_passed: overallPassed,
                    pass_reason: passReason,
                    passing_criteria: config.passing_criteria,
                    is_complete: completedTests.length === progress.length
                }
            };
        } catch (error) {
            console.error('Error calculating overall result:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * ดึงรายการตำแหน่งที่มีชุดข้อสอบ
     */
    static async getPositionsWithTests() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT DISTINCT
                    p.position_id,
                    p.position_name,
                    p.position_type,
                    ou.unit_name_th,
                    (SELECT COUNT(*) FROM PositionTestSets WHERE position_id = p.position_id AND is_active = 1) as test_count
                FROM Positions p
                LEFT JOIN OrganizationUnits ou ON p.unit_id = ou.unit_id
                WHERE p.is_active = 1
                  AND EXISTS (SELECT 1 FROM PositionTestSets WHERE position_id = p.position_id AND is_active = 1)
                ORDER BY p.position_name
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting positions with tests:', error);
            return [];
        }
    }

    /**
     * ดึงสถิติชุดข้อสอบตามตำแหน่ง
     */
    static async getTestSetStatistics(positionId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('positionId', sql.Int, positionId)
                .query(`
                    SELECT
                        COUNT(DISTINCT pts.test_id) as total_tests,
                        SUM(CASE WHEN pts.is_required = 1 THEN 1 ELSE 0 END) as required_tests,
                        SUM(ISNULL(t.time_limit, 0)) as total_time_limit,
                        COUNT(DISTINCT atp.applicant_id) as total_applicants,
                        COUNT(CASE WHEN atp.status = 'completed' THEN 1 END) as completed_attempts,
                        AVG(CASE WHEN atp.status = 'completed' THEN atp.percentage END) as avg_score
                    FROM PositionTestSets pts
                    LEFT JOIN Tests t ON pts.test_id = t.test_id
                    LEFT JOIN ApplicantTestProgress atp ON pts.set_id = atp.set_id
                    WHERE pts.position_id = @positionId AND pts.is_active = 1
                `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting test set statistics:', error);
            return null;
        }
    }
}

module.exports = PositionTestSet;
