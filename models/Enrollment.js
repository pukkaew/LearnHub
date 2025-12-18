const { poolPromise, sql } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Enrollment {
    constructor(data) {
        this.enrollment_id = data.enrollment_id;
        this.user_id = data.user_id;
        this.course_id = data.course_id;
        this.enrollment_date = data.enrollment_date;
        this.enrollment_type = data.enrollment_type;
        this.start_date = data.start_date;
        this.expected_end_date = data.expected_end_date;
        this.actual_end_date = data.actual_end_date;
        this.progress_percentage = data.progress_percentage;
        this.completion_status = data.completion_status;
        this.final_score = data.final_score;
        this.certificate_issued = data.certificate_issued;
        this.certificate_number = data.certificate_number;
    }

    // Enroll user in course
    static async enroll(enrollmentData) {
        try {
            const pool = await poolPromise;
            const enrollmentId = uuidv4();

            // Check if already enrolled
            const existingCheck = await pool.request()
                .input('userId', sql.Int, enrollmentData.user_id)
                .input('courseId', sql.Int, enrollmentData.course_id)
                .query(`
                    SELECT enrollment_id, status
                    FROM user_courses
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            if (existingCheck.recordset.length > 0) {
                const existing = existingCheck.recordset[0];
                if (existing.status !== 'DROPPED') {
                    return {
                        success: false,
                        message: 'User is already enrolled in this course'
                    };
                }
                // Re-enroll if previously dropped
                const result = await pool.request()
                    .input('enrollmentId', sql.Int, existing.enrollment_id)
                    .query(`
                        UPDATE user_courses
                        SET enrollment_date = GETDATE(),
                            progress = 0,
                            status = 'active',
                            certificate_issued = 0,
                            last_access_date = GETDATE()
                        WHERE enrollment_id = @enrollmentId
                    `);

                return {
                    success: true,
                    enrollmentId: existing.enrollment_id,
                    message: 'Successfully re-enrolled in the course'
                };
            }

            // Check prerequisites - skip if prerequisite table doesn't exist
            const prereqCheck = { recordset: [] };

            if (prereqCheck.recordset.length > 0) {
                const missingPrereqs = prereqCheck.recordset.map(p => p.course_name).join(', ');
                return {
                    success: false,
                    message: `Prerequisites not met. Please complete: ${missingPrereqs}`,
                    prerequisites: prereqCheck.recordset
                };
            }

            // Check enrollment limit
            const courseInfo = await pool.request()
                .input('courseId', sql.Int, enrollmentData.course_id)
                .query(`
                    SELECT enrollment_limit,
                           (SELECT COUNT(*) FROM user_courses
                            WHERE course_id = @courseId
                            AND status IN ('active', 'in_progress')) as current_students
                    FROM courses
                    WHERE course_id = @courseId
                `);

            if (courseInfo.recordset.length > 0 && courseInfo.recordset[0].enrollment_limit) {
                if (courseInfo.recordset[0].current_students >= courseInfo.recordset[0].enrollment_limit) {
                    return {
                        success: false,
                        message: 'Course is full. Please join the waiting list.'
                    };
                }
            }

            // Calculate expected end date based on course duration
            const durationResult = await pool.request()
                .input('courseId', sql.Int, enrollmentData.course_id)
                .query(`
                    SELECT duration_hours
                    FROM courses
                    WHERE course_id = @courseId
                `);

            let expectedEndDate = null;
            if (durationResult.recordset.length > 0) {
                const durationDays = Math.ceil(durationResult.recordset[0].duration_hours / 2); // Assume 2 hours study per day
                expectedEndDate = new Date();
                expectedEndDate.setDate(expectedEndDate.getDate() + durationDays);
            }

            // Create enrollment - use columns that exist in user_courses table
            const result = await pool.request()
                .input('userId', sql.Int, enrollmentData.user_id)
                .input('courseId', sql.Int, enrollmentData.course_id)
                .query(`
                    INSERT INTO user_courses (
                        user_id, course_id, enrollment_date,
                        progress, status, certificate_issued, last_access_date
                    ) VALUES (
                        @userId, @courseId, GETDATE(),
                        0, 'active', 0, GETDATE()
                    );
                    SELECT SCOPE_IDENTITY() as enrollment_id;
                `);

            // Skip notification - table may not exist
            // TODO: Add notification support when Notifications table is created

            // Skip gamification points - table may not exist
            // TODO: Add gamification support when UserPoints table is created

            // Get the new enrollment_id from INSERT result
            const newEnrollmentId = result.recordset[0]?.enrollment_id || enrollmentId;

            return {
                success: true,
                enrollmentId: newEnrollmentId
            };
        } catch (error) {
            throw new Error(`Error enrolling in course: ${error.message}`);
        }
    }

    // Get enrollment by ID
    static async findById(enrollmentId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .query(`
                    SELECT e.*,
                           c.title as course_name, c.course_code, c.thumbnail, c.duration_hours,
                           c.passing_score, c.max_attempts,
                           CONCAT(u.first_name, ' ', u.last_name) as student_name,
                           CONCAT(i.first_name, ' ', i.last_name) as instructor_name
                    FROM user_courses e
                    JOIN courses c ON e.course_id = c.course_id
                    JOIN users u ON e.user_id = u.user_id
                    JOIN users i ON c.instructor_id = i.user_id
                    WHERE e.enrollment_id = @enrollmentId
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error finding enrollment: ${error.message}`);
        }
    }

    // Find enrollment by user and course
    static async findByUserAndCourse(userId, courseId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT e.*,
                           e.progress AS progress_percentage,
                           e.status as completion_status
                    FROM user_courses e
                    WHERE e.user_id = @userId AND e.course_id = @courseId
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error finding enrollment: ${error.message}`);
        }
    }

    // Get user's enrollments
    static async getUserEnrollments(userId, status = null) {
        try {
            const pool = await poolPromise;

            let whereClause = 'WHERE e.user_id = @userId';
            const request = pool.request()
                .input('userId', sql.Int, userId);

            if (status) {
                whereClause += ' AND e.status = @status';
                request.input('status', sql.NVarChar(20), status);
            }

            const result = await request.query(`
                SELECT e.enrollment_id,
                       e.user_id,
                       e.course_id,
                       e.enrollment_date,
                       e.progress,
                       e.status,
                       e.completion_date,
                       e.certificate_issued,
                       e.last_access_date,
                       c.title as course_name,
                       c.title,
                       c.thumbnail,
                       c.duration_hours,
                       c.difficulty_level,
                       c.category,
                       c.category as category_name,
                       CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
                       (SELECT COUNT(*) FROM course_materials WHERE course_id = c.course_id) as total_lessons,
                       0 as completed_lessons,
                       e.status as enrollment_status,
                       ISNULL(e.progress, 0) as progress_percentage
                FROM user_courses e
                JOIN courses c ON e.course_id = c.course_id
                LEFT JOIN users i ON c.instructor_id = i.user_id
                ${whereClause}
                ORDER BY e.enrollment_date DESC
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching user enrollments: ${error.message}`);
        }
    }

    // Get course enrollments
    static async getuser_courses(courseId, page = 1, limit = 50) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            const request = pool.request()
                .input('courseId', sql.Int, courseId)
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM user_courses
                WHERE course_id = @courseId
            `);

            // Get paginated enrollments
            const result = await request.query(`
                SELECT e.*,
                       u.employee_id, u.first_name, u.last_name, u.email
                FROM user_courses e
                JOIN users u ON e.user_id = u.user_id
                WHERE e.course_id = @courseId
                ORDER BY e.enrollment_date DESC
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
            throw new Error(`Error fetching course enrollments: ${error.message}`);
        }
    }

    // Update progress - simplified version
    static async updateProgress(enrollmentId, progressPercentage) {
        try {
            const pool = await poolPromise;

            // Update the enrollment progress
            const result = await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .input('progress', sql.Decimal(5,2), progressPercentage)
                .query(`
                    UPDATE user_courses
                    SET progress = @progress,
                        status = CASE
                            WHEN @progress = 0 THEN 'pending'
                            WHEN @progress >= 100 THEN 'completed'
                            ELSE 'active'
                        END,
                        completion_date = CASE
                            WHEN @progress >= 100 AND completion_date IS NULL THEN GETDATE()
                            ELSE completion_date
                        END,
                        last_access_date = GETDATE()
                    WHERE enrollment_id = @enrollmentId
                `);

            // Check if course completed for certificate generation and expiry calculation
            if (progressPercentage >= 100) {
                try {
                    await this.generateCertificate(enrollmentId);
                    // Calculate certificate expiry for recurring courses
                    await this.calculateCertificateExpiry(enrollmentId);
                } catch (certError) {
                    // Log certificate generation error but don't fail progress update
                    console.error('Certificate generation error (non-fatal):', certError.message);
                }
            }

            return {
                success: result.rowsAffected[0] > 0,
                progress: progressPercentage
            };
        } catch (error) {
            throw new Error(`Error updating progress: ${error.message}`);
        }
    }

    // Calculate certificate expiry date for recurring courses
    static async calculateCertificateExpiry(enrollmentId) {
        try {
            const pool = await poolPromise;

            // Get course and enrollment info
            const infoResult = await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .query(`
                    SELECT uc.enrollment_id, uc.course_id, uc.completion_date,
                           c.is_recurring, c.recurrence_type, c.recurrence_months
                    FROM user_courses uc
                    JOIN courses c ON uc.course_id = c.course_id
                    WHERE uc.enrollment_id = @enrollmentId
                `);

            if (infoResult.recordset.length === 0) {
                return { success: false, message: 'Enrollment not found' };
            }

            const info = infoResult.recordset[0];

            // Only process recurring courses
            if (!info.is_recurring) {
                return { success: true, message: 'Not a recurring course' };
            }

            let expiryDate = null;
            const currentYear = new Date().getFullYear();

            if (info.recurrence_type === 'calendar_year') {
                // Expiry at end of current calendar year
                expiryDate = new Date(currentYear, 11, 31, 23, 59, 59);
            } else if (info.recurrence_type === 'custom_months' && info.recurrence_months) {
                // Expiry after X months from completion
                const completionDate = info.completion_date ? new Date(info.completion_date) : new Date();
                expiryDate = new Date(completionDate);
                expiryDate.setMonth(expiryDate.getMonth() + info.recurrence_months);
            }

            if (expiryDate) {
                await pool.request()
                    .input('enrollmentId', sql.Int, enrollmentId)
                    .input('expiryDate', sql.DateTime2, expiryDate)
                    .input('trainingYear', sql.Int, currentYear)
                    .input('renewalStatus', sql.NVarChar(50), 'valid')
                    .query(`
                        UPDATE user_courses
                        SET certificate_expiry_date = @expiryDate,
                            training_year = @trainingYear,
                            renewal_status = @renewalStatus
                        WHERE enrollment_id = @enrollmentId
                    `);

                console.log(`📅 Certificate expiry set for enrollment ${enrollmentId}: ${expiryDate.toISOString()}`);
            }

            return { success: true, expiryDate };
        } catch (error) {
            console.error('Error calculating certificate expiry:', error.message);
            return { success: false, message: error.message };
        }
    }

    // Generate certificate - simplified
    static async generateCertificate(enrollmentId) {
        try {
            const pool = await poolPromise;

            // Check if already has certificate
            const checkResult = await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .query(`
                    SELECT certificate_issued
                    FROM user_courses
                    WHERE enrollment_id = @enrollmentId
                `);

            if (checkResult.recordset.length > 0 && checkResult.recordset[0].certificate_issued) {
                return { success: true, message: 'Certificate already issued' };
            }

            // Generate certificate number
            const year = new Date().getFullYear();
            const countResult = await pool.request()
                .query(`
                    SELECT COUNT(*) as count
                    FROM user_courses
                    WHERE certificate_number LIKE 'CERT-${year}-%'
                `);

            const count = countResult.recordset[0].count + 1;
            const certificateNumber = `CERT-${year}-${String(count).padStart(6, '0')}`;

            // Update enrollment with certificate
            const result = await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .input('certificateNumber', sql.NVarChar(50), certificateNumber)
                .query(`
                    UPDATE user_courses
                    SET certificate_issued = 1,
                        certificate_number = @certificateNumber,
                        certificate_date = GETDATE()
                    WHERE enrollment_id = @enrollmentId
                    AND status = 'completed'
                `);

            return {
                success: result.rowsAffected[0] > 0,
                certificateNumber: result.rowsAffected[0] > 0 ? certificateNumber : null,
                message: result.rowsAffected[0] > 0 ? 'Certificate generated' : 'Course not completed yet'
            };
        } catch (error) {
            throw new Error(`Error generating certificate: ${error.message}`);
        }
    }

    // Drop enrollment
    static async drop(enrollmentId, reason = null) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('enrollmentId', sql.Int, enrollmentId)
                .query(`
                    UPDATE user_courses
                    SET status = 'cancelled',
                        completion_date = GETDATE(),
                        updated_at = GETDATE()
                    WHERE enrollment_id = @enrollmentId
                    AND status IN ('pending', 'active')
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Successfully dropped from course' : 'Cannot drop this enrollment'
            };
        } catch (error) {
            throw new Error(`Error dropping enrollment: ${error.message}`);
        }
    }

    // Get enrollment statistics
    static async getStatistics(courseId = null, userId = null) {
        try {
            const pool = await poolPromise;
            const request = pool.request();

            let whereClause = 'WHERE 1=1';
            if (courseId) {
                whereClause += ' AND course_id = @courseId';
                request.input('courseId', sql.Int, courseId);
            }
            if (userId) {
                whereClause += ' AND user_id = @userId';
                request.input('userId', sql.Int, userId);
            }

            const result = await request.query(`
                SELECT
                    COUNT(*) as total_enrollments,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as in_progress,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as not_started,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as dropped,
                    AVG(CAST(progress AS FLOAT)) as avg_progress,
                    AVG(CASE WHEN grade IS NOT NULL THEN CAST(grade AS FLOAT) END) as avg_score,
                    COUNT(CASE WHEN certificate_issued = 1 THEN 1 END) as certificates_issued
                FROM user_courses
                ${whereClause}
            `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error fetching enrollment statistics: ${error.message}`);
        }
    }

    // Get mandatory courses for position - simplified
    static async getMandatoryCourses(positionId, year = new Date().getFullYear()) {
        try {
            const pool = await poolPromise;
            // Skip - PositionCourseRequirements table doesn't exist in simple schema
            return [];
        } catch (error) {
            throw new Error(`Error fetching mandatory courses: ${error.message}`);
        }
    }

    // Find by user - alias for getUserEnrollments
    static async findByUser(userId, status = null) {
        return this.getUserEnrollments(userId, status);
    }
}

module.exports = Enrollment;