const { poolPromise, sql } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Applicant {
    constructor(data) {
        this.applicant_id = data.applicant_id;
        this.national_id = data.national_id;
        this.first_name = data.first_name;
        this.last_name = data.last_name;
        this.first_name_en = data.first_name_en;
        this.last_name_en = data.last_name_en;
        this.birth_date = data.birth_date;
        this.email = data.email;
        this.phone = data.phone;
        this.current_address = data.current_address;
        this.applied_position_id = data.applied_position_id;
        this.test_code_used = data.test_code_used;
        this.first_login_date = data.first_login_date;
        this.last_login_date = data.last_login_date;
    }

    // Validate Thai National ID
    static validateNationalId(nationalId) {
        if (!nationalId || nationalId.length !== 13) {
            return false;
        }

        // Check if all characters are digits
        if (!/^\d+$/.test(nationalId)) {
            return false;
        }

        // Thai ID card validation algorithm
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(nationalId[i]) * (13 - i);
        }
        const remainder = sum % 11;
        const checkDigit = (11 - remainder) % 10;

        return checkDigit === parseInt(nationalId[12]);
    }

    // Find applicant by national ID
    static async findByNationalId(nationalId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('nationalId', sql.NVarChar(13), nationalId)
                .query(`
                    SELECT a.*,
                           jp.position_title, jp.test_code, jp.test_id,
                           d.department_name,
                           t.test_name, t.time_limit_minutes, t.total_questions,
                           (SELECT COUNT(*) FROM ApplicantTestResults WHERE applicant_id = a.applicant_id) as attempt_count
                    FROM Applicants a
                    LEFT JOIN JobPositions jp ON a.applied_position_id = jp.job_position_id
                    LEFT JOIN Departments d ON jp.department_id = d.department_id
                    LEFT JOIN Tests t ON jp.test_id = t.test_id
                    WHERE a.national_id = @nationalId
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error finding applicant: ${error.message}`);
        }
    }

    // Create or update applicant (first time login)
    static async createOrUpdate(applicantData) {
        try {
            const pool = await poolPromise;

            // Validate national ID
            if (!this.validateNationalId(applicantData.national_id)) {
                return {
                    success: false,
                    message: 'Invalid national ID format'
                };
            }

            // Validate test code
            const positionResult = await pool.request()
                .input('testCode', sql.NVarChar(20), applicantData.test_code)
                .query(`
                    SELECT jp.*, t.test_name
                    FROM JobPositions jp
                    JOIN Tests t ON jp.test_id = t.test_id
                    WHERE jp.test_code = @testCode
                    AND jp.is_active = 1
                    AND (jp.close_date IS NULL OR jp.close_date >= CAST(GETDATE() AS DATE))
                `);

            if (positionResult.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Invalid test code or position is no longer available'
                };
            }

            const position = positionResult.recordset[0];

            // Check if applicant already exists
            const existingApplicant = await this.findByNationalId(applicantData.national_id);

            let applicantId;
            if (existingApplicant) {
                // Update existing applicant
                applicantId = existingApplicant.applicant_id;

                await pool.request()
                    .input('applicantId', sql.UniqueIdentifier, applicantId)
                    .input('firstName', sql.NVarChar(100), applicantData.first_name)
                    .input('lastName', sql.NVarChar(100), applicantData.last_name)
                    .input('firstNameEn', sql.NVarChar(100), applicantData.first_name_en || null)
                    .input('lastNameEn', sql.NVarChar(100), applicantData.last_name_en || null)
                    .input('birthDate', sql.Date, applicantData.birth_date)
                    .input('email', sql.NVarChar(100), applicantData.email)
                    .input('phone', sql.NVarChar(20), applicantData.phone)
                    .input('currentAddress', sql.NVarChar(500), applicantData.current_address || null)
                    .input('appliedPositionId', sql.UniqueIdentifier, position.job_position_id)
                    .input('testCodeUsed', sql.NVarChar(20), applicantData.test_code)
                    .query(`
                        UPDATE Applicants
                        SET first_name = @firstName,
                            last_name = @lastName,
                            first_name_en = @firstNameEn,
                            last_name_en = @lastNameEn,
                            birth_date = @birthDate,
                            email = @email,
                            phone = @phone,
                            current_address = @currentAddress,
                            applied_position_id = @appliedPositionId,
                            test_code_used = @testCodeUsed,
                            last_login_date = GETDATE()
                        WHERE applicant_id = @applicantId
                    `);
            } else {
                // Create new applicant
                applicantId = uuidv4();

                await pool.request()
                    .input('applicantId', sql.UniqueIdentifier, applicantId)
                    .input('nationalId', sql.NVarChar(13), applicantData.national_id)
                    .input('firstName', sql.NVarChar(100), applicantData.first_name)
                    .input('lastName', sql.NVarChar(100), applicantData.last_name)
                    .input('firstNameEn', sql.NVarChar(100), applicantData.first_name_en || null)
                    .input('lastNameEn', sql.NVarChar(100), applicantData.last_name_en || null)
                    .input('birthDate', sql.Date, applicantData.birth_date)
                    .input('email', sql.NVarChar(100), applicantData.email)
                    .input('phone', sql.NVarChar(20), applicantData.phone)
                    .input('currentAddress', sql.NVarChar(500), applicantData.current_address || null)
                    .input('appliedPositionId', sql.UniqueIdentifier, position.job_position_id)
                    .input('testCodeUsed', sql.NVarChar(20), applicantData.test_code)
                    .query(`
                        INSERT INTO Applicants (
                            applicant_id, national_id, first_name, last_name,
                            first_name_en, last_name_en, birth_date, email, phone,
                            current_address, applied_position_id, test_code_used,
                            first_login_date, last_login_date, created_date
                        ) VALUES (
                            @applicantId, @nationalId, @firstName, @lastName,
                            @firstNameEn, @lastNameEn, @birthDate, @email, @phone,
                            @currentAddress, @appliedPositionId, @testCodeUsed,
                            GETDATE(), GETDATE(), GETDATE()
                        )
                    `);
            }

            return {
                success: true,
                applicantId: applicantId,
                testId: position.test_id,
                positionTitle: position.position_title,
                testName: position.test_name
            };
        } catch (error) {
            if (error.message.includes('Violation of UNIQUE KEY')) {
                if (error.message.includes('national_id')) {
                    return {
                        success: false,
                        message: 'This national ID has already been used to apply'
                    };
                }
            }
            throw new Error(`Error creating/updating applicant: ${error.message}`);
        }
    }

    // Update login time
    static async updateLoginTime(nationalId) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('nationalId', sql.NVarChar(13), nationalId)
                .query(`
                    UPDATE Applicants
                    SET last_login_date = GETDATE()
                    WHERE national_id = @nationalId
                `);

            return { success: true };
        } catch (error) {
            throw new Error(`Error updating login time: ${error.message}`);
        }
    }

    // Get all applicants with pagination
    static async findAll(page = 1, limit = 50, filters = {}) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE 1=1';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.position_id) {
                whereClause += ' AND a.applied_position_id = @positionId';
                request.input('positionId', sql.UniqueIdentifier, filters.position_id);
            }
            if (filters.department_id) {
                whereClause += ' AND jp.department_id = @departmentId';
                request.input('departmentId', sql.UniqueIdentifier, filters.department_id);
            }
            if (filters.test_status) {
                if (filters.test_status === 'completed') {
                    whereClause += ' AND EXISTS (SELECT 1 FROM ApplicantTestResults WHERE applicant_id = a.applicant_id)';
                } else if (filters.test_status === 'not_started') {
                    whereClause += ' AND NOT EXISTS (SELECT 1 FROM ApplicantTestResults WHERE applicant_id = a.applicant_id)';
                }
            }
            if (filters.search) {
                whereClause += ` AND (
                    a.first_name LIKE @search OR
                    a.last_name LIKE @search OR
                    a.email LIKE @search OR
                    a.phone LIKE @search OR
                    a.national_id LIKE @search
                )`;
                request.input('search', sql.NVarChar(100), `%${filters.search}%`);
            }
            if (filters.date_from) {
                whereClause += ' AND a.created_date >= @dateFrom';
                request.input('dateFrom', sql.Date, filters.date_from);
            }
            if (filters.date_to) {
                whereClause += ' AND a.created_date <= @dateTo';
                request.input('dateTo', sql.Date, filters.date_to);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM Applicants a
                LEFT JOIN JobPositions jp ON a.applied_position_id = jp.job_position_id
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT a.*,
                       jp.position_title, jp.test_code,
                       d.department_name,
                       t.test_name,
                       atr.score, atr.percentage, atr.passed, atr.ranking,
                       atr.start_time as test_start_time, atr.end_time as test_end_time
                FROM Applicants a
                LEFT JOIN JobPositions jp ON a.applied_position_id = jp.job_position_id
                LEFT JOIN Departments d ON jp.department_id = d.department_id
                LEFT JOIN Tests t ON jp.test_id = t.test_id
                LEFT JOIN ApplicantTestResults atr ON a.applicant_id = atr.applicant_id
                ${whereClause}
                ORDER BY a.created_date DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

            return {
                data: result.recordset,
                total: countResult.recordset[0].total,
                page: page,
                totalPages: Math.ceil(countResult.recordset[0].total / limit)
            };
        } catch (error) {
            throw new Error(`Error fetching applicants: ${error.message}`);
        }
    }

    // Start test for applicant
    static async startTest(applicantId, testId, ipAddress, browserInfo) {
        try {
            const pool = await poolPromise;

            // Check if already has a test result
            const existingResult = await pool.request()
                .input('applicantId', sql.UniqueIdentifier, applicantId)
                .input('testId', sql.UniqueIdentifier, testId)
                .query(`
                    SELECT result_id, end_time
                    FROM ApplicantTestResults
                    WHERE applicant_id = @applicantId AND test_id = @testId
                `);

            if (existingResult.recordset.length > 0) {
                const existing = existingResult.recordset[0];
                if (existing.end_time) {
                    return {
                        success: false,
                        message: 'Test has already been completed'
                    };
                }
                // Continue existing test
                return {
                    success: true,
                    resultId: existing.result_id,
                    message: 'Continuing existing test'
                };
            }

            // Create new test result
            const resultId = uuidv4();
            await pool.request()
                .input('resultId', sql.UniqueIdentifier, resultId)
                .input('applicantId', sql.UniqueIdentifier, applicantId)
                .input('testId', sql.UniqueIdentifier, testId)
                .input('ipAddress', sql.NVarChar(50), ipAddress)
                .input('browserInfo', sql.NVarChar(500), browserInfo)
                .query(`
                    INSERT INTO ApplicantTestResults (
                        result_id, applicant_id, test_id, start_time,
                        ip_address, browser_info, created_date
                    ) VALUES (
                        @resultId, @applicantId, @testId, GETDATE(),
                        @ipAddress, @browserInfo, GETDATE()
                    )
                `);

            return {
                success: true,
                resultId: resultId
            };
        } catch (error) {
            throw new Error(`Error starting test: ${error.message}`);
        }
    }

    // Submit test result
    static async submitTest(resultId, answers) {
        try {
            const pool = await poolPromise;

            // Get test result info
            const resultInfo = await pool.request()
                .input('resultId', sql.UniqueIdentifier, resultId)
                .query(`
                    SELECT atr.*, t.total_score, t.passing_score
                    FROM ApplicantTestResults atr
                    JOIN Tests t ON atr.test_id = t.test_id
                    WHERE atr.result_id = @resultId
                `);

            if (resultInfo.recordset.length === 0) {
                return { success: false, message: 'Test result not found' };
            }

            const result = resultInfo.recordset[0];

            // Calculate score (similar to regular test submission)
            let totalScore = 0;
            let maxScore = result.total_score;

            // This would involve calculating the score based on answers
            // For now, we'll assume the score calculation is done elsewhere
            // and passed in the answers parameter

            const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
            const passed = percentage >= result.passing_score;

            // Update test result
            await pool.request()
                .input('resultId', sql.UniqueIdentifier, resultId)
                .input('score', sql.Decimal(5, 2), totalScore)
                .input('percentage', sql.Decimal(5, 2), percentage)
                .input('passed', sql.Bit, passed)
                .query(`
                    UPDATE ApplicantTestResults
                    SET end_time = GETDATE(),
                        score = @score,
                        percentage = @percentage,
                        passed = @passed
                    WHERE result_id = @resultId
                `);

            // Calculate ranking
            await this.calculateRanking(result.test_id);

            // Send notification to HR
            await this.notifyHR(result.applicant_id, passed);

            return {
                success: true,
                score: totalScore,
                percentage: percentage,
                passed: passed
            };
        } catch (error) {
            throw new Error(`Error submitting test: ${error.message}`);
        }
    }

    // Calculate ranking for a test
    static async calculateRanking(testId) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('testId', sql.UniqueIdentifier, testId)
                .query(`
                    WITH RankedResults AS (
                        SELECT result_id,
                               ROW_NUMBER() OVER (ORDER BY percentage DESC, end_time ASC) as ranking
                        FROM ApplicantTestResults
                        WHERE test_id = @testId AND end_time IS NOT NULL
                    )
                    UPDATE atr
                    SET ranking = rr.ranking
                    FROM ApplicantTestResults atr
                    JOIN RankedResults rr ON atr.result_id = rr.result_id
                `);

            return { success: true };
        } catch (error) {
            throw new Error(`Error calculating ranking: ${error.message}`);
        }
    }

    // Send notification to HR
    static async notifyHR(applicantId, passed) {
        try {
            const pool = await poolPromise;

            // Get applicant and HR users
            const applicantInfo = await pool.request()
                .input('applicantId', sql.UniqueIdentifier, applicantId)
                .query(`
                    SELECT CONCAT(a.first_name, ' ', a.last_name) as applicant_name,
                           jp.position_title,
                           d.department_name
                    FROM Applicants a
                    JOIN JobPositions jp ON a.applied_position_id = jp.job_position_id
                    JOIN Departments d ON jp.department_id = d.department_id
                    WHERE a.applicant_id = @applicantId
                `);

            if (applicantInfo.recordset.length === 0) return;

            const applicant = applicantInfo.recordset[0];

            // Get HR users
            const hrUsers = await pool.request()
                .query(`
                    SELECT user_id
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.role_id
                    WHERE r.role_name = 'HR' AND u.is_active = 1
                `);

            // Send notifications to all HR users
            for (const hrUser of hrUsers.recordset) {
                await pool.request()
                    .input('notificationId', sql.UniqueIdentifier, uuidv4())
                    .input('userId', sql.UniqueIdentifier, hrUser.user_id)
                    .input('title', sql.NVarChar(200), 'Applicant Test Completed')
                    .input('message', sql.NVarChar(1000),
                        `${applicant.applicant_name} has completed the test for ${applicant.position_title} position. Status: ${passed ? 'PASSED' : 'FAILED'}`)
                    .input('link', sql.NVarChar(500), `/hr/applicants/${applicantId}`)
                    .query(`
                        INSERT INTO Notifications (
                            notification_id, user_id, notification_type, title, message, link
                        ) VALUES (
                            @notificationId, @userId, 'APPLICANT_TEST', @title, @message, @link
                        )
                    `);
            }

            return { success: true };
        } catch (error) {
            throw new Error(`Error notifying HR: ${error.message}`);
        }
    }

    // Get test statistics for position
    static async getTestStatistics(positionId = null, testId = null) {
        try {
            const pool = await poolPromise;
            const request = pool.request();

            let whereClause = 'WHERE atr.end_time IS NOT NULL';
            if (positionId) {
                whereClause += ' AND a.applied_position_id = @positionId';
                request.input('positionId', sql.UniqueIdentifier, positionId);
            }
            if (testId) {
                whereClause += ' AND atr.test_id = @testId';
                request.input('testId', sql.UniqueIdentifier, testId);
            }

            const result = await request.query(`
                SELECT
                    COUNT(*) as total_applicants,
                    COUNT(CASE WHEN atr.passed = 1 THEN 1 END) as passed_count,
                    COUNT(CASE WHEN atr.passed = 0 THEN 1 END) as failed_count,
                    AVG(CAST(atr.percentage AS FLOAT)) as avg_score,
                    MIN(atr.percentage) as min_score,
                    MAX(atr.percentage) as max_score,
                    AVG(DATEDIFF(MINUTE, atr.start_time, atr.end_time)) as avg_time_minutes
                FROM ApplicantTestResults atr
                JOIN Applicants a ON atr.applicant_id = a.applicant_id
                ${whereClause}
            `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error getting test statistics: ${error.message}`);
        }
    }

    // Export applicants to Excel
    static async exportToExcel(filters = {}) {
        try {
            const pool = await poolPromise;
            const request = pool.request();

            let whereClause = 'WHERE 1=1';

            // Add filters (same as findAll method)
            if (filters.position_id) {
                whereClause += ' AND a.applied_position_id = @positionId';
                request.input('positionId', sql.UniqueIdentifier, filters.position_id);
            }
            if (filters.date_from) {
                whereClause += ' AND a.created_date >= @dateFrom';
                request.input('dateFrom', sql.Date, filters.date_from);
            }
            if (filters.date_to) {
                whereClause += ' AND a.created_date <= @dateTo';
                request.input('dateTo', sql.Date, filters.date_to);
            }

            const result = await request.query(`
                SELECT
                    a.national_id,
                    a.first_name,
                    a.last_name,
                    a.first_name_en,
                    a.last_name_en,
                    a.birth_date,
                    a.email,
                    a.phone,
                    a.current_address,
                    jp.position_title,
                    d.department_name,
                    a.test_code_used,
                    a.first_login_date,
                    a.last_login_date,
                    atr.score,
                    atr.percentage,
                    CASE WHEN atr.passed = 1 THEN 'PASSED' ELSE 'FAILED' END as test_result,
                    atr.ranking,
                    atr.start_time as test_start_time,
                    atr.end_time as test_end_time,
                    CASE
                        WHEN atr.end_time IS NULL AND atr.start_time IS NOT NULL THEN 'IN_PROGRESS'
                        WHEN atr.end_time IS NOT NULL THEN 'COMPLETED'
                        ELSE 'NOT_STARTED'
                    END as test_status
                FROM Applicants a
                LEFT JOIN JobPositions jp ON a.applied_position_id = jp.job_position_id
                LEFT JOIN Departments d ON jp.department_id = d.department_id
                LEFT JOIN ApplicantTestResults atr ON a.applicant_id = atr.applicant_id
                ${whereClause}
                ORDER BY a.created_date DESC, atr.ranking ASC
            `);

            return {
                success: true,
                data: result.recordset,
                filename: `Applicants_${new Date().toISOString().split('T')[0]}.xlsx`
            };
        } catch (error) {
            throw new Error(`Error exporting applicants: ${error.message}`);
        }
    }

    // Search applicant by national ID (for HR)
    static async searchByNationalId(nationalId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('nationalId', sql.NVarChar(13), nationalId)
                .query(`
                    SELECT a.*,
                           jp.position_title, jp.test_code,
                           d.department_name,
                           t.test_name,
                           atr.score, atr.percentage, atr.passed, atr.ranking,
                           atr.start_time as test_start_time, atr.end_time as test_end_time,
                           atr.behavior_log
                    FROM Applicants a
                    LEFT JOIN JobPositions jp ON a.applied_position_id = jp.job_position_id
                    LEFT JOIN Departments d ON jp.department_id = d.department_id
                    LEFT JOIN Tests t ON jp.test_id = t.test_id
                    LEFT JOIN ApplicantTestResults atr ON a.applicant_id = atr.applicant_id
                    WHERE a.national_id = @nationalId
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error searching applicant: ${error.message}`);
        }
    }

    // Log security behavior
    static async logBehavior(resultId, behaviorType, details) {
        try {
            const pool = await poolPromise;

            // Get current behavior log
            const currentLog = await pool.request()
                .input('resultId', sql.UniqueIdentifier, resultId)
                .query(`
                    SELECT behavior_log
                    FROM ApplicantTestResults
                    WHERE result_id = @resultId
                `);

            let behaviorLog = [];
            if (currentLog.recordset.length > 0 && currentLog.recordset[0].behavior_log) {
                try {
                    behaviorLog = JSON.parse(currentLog.recordset[0].behavior_log);
                } catch (e) {
                    behaviorLog = [];
                }
            }

            // Add new behavior entry
            behaviorLog.push({
                timestamp: new Date().toISOString(),
                type: behaviorType,
                details: details
            });

            // Update behavior log
            await pool.request()
                .input('resultId', sql.UniqueIdentifier, resultId)
                .input('behaviorLog', sql.NVarChar(sql.MAX), JSON.stringify(behaviorLog))
                .query(`
                    UPDATE ApplicantTestResults
                    SET behavior_log = @behaviorLog
                    WHERE result_id = @resultId
                `);

            return { success: true };
        } catch (error) {
            throw new Error(`Error logging behavior: ${error.message}`);
        }
    }
}

module.exports = Applicant;