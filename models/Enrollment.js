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
                .input('userId', sql.UniqueIdentifier, enrollmentData.user_id)
                .input('courseId', sql.UniqueIdentifier, enrollmentData.course_id)
                .query(`
                    SELECT enrollment_id, completion_status
                    FROM CourseEnrollments
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            if (existingCheck.recordset.length > 0) {
                const existing = existingCheck.recordset[0];
                if (existing.completion_status !== 'DROPPED') {
                    return {
                        success: false,
                        message: 'User is already enrolled in this course'
                    };
                }
                // Re-enroll if previously dropped
                const result = await pool.request()
                    .input('enrollmentId', sql.UniqueIdentifier, existing.enrollment_id)
                    .query(`
                        UPDATE CourseEnrollments
                        SET enrollment_date = GETDATE(),
                            enrollment_type = 'SELF',
                            start_date = NULL,
                            expected_end_date = NULL,
                            actual_end_date = NULL,
                            progress_percentage = 0,
                            completion_status = 'NOT_STARTED',
                            final_score = NULL,
                            certificate_issued = 0,
                            certificate_number = NULL,
                            certificate_issued_date = NULL
                        WHERE enrollment_id = @enrollmentId
                    `);

                return {
                    success: true,
                    enrollmentId: existing.enrollment_id,
                    message: 'Successfully re-enrolled in the course'
                };
            }

            // Check prerequisites
            const prereqCheck = await pool.request()
                .input('courseId', sql.UniqueIdentifier, enrollmentData.course_id)
                .input('userId', sql.UniqueIdentifier, enrollmentData.user_id)
                .query(`
                    SELECT cp.*, c.course_name
                    FROM CoursePrerequisites cp
                    JOIN Courses c ON cp.prerequisite_course_id = c.course_id
                    WHERE cp.course_id = @courseId
                    AND cp.is_mandatory = 1
                    AND cp.prerequisite_course_id NOT IN (
                        SELECT course_id
                        FROM CourseEnrollments
                        WHERE user_id = @userId
                        AND completion_status = 'COMPLETED'
                        AND final_score >= (SELECT passing_score FROM Courses WHERE course_id = course_id)
                    )
                `);

            if (prereqCheck.recordset.length > 0) {
                const missingPrereqs = prereqCheck.recordset.map(p => p.course_name).join(', ');
                return {
                    success: false,
                    message: `Prerequisites not met. Please complete: ${missingPrereqs}`,
                    prerequisites: prereqCheck.recordset
                };
            }

            // Check max students limit
            const courseInfo = await pool.request()
                .input('courseId', sql.UniqueIdentifier, enrollmentData.course_id)
                .query(`
                    SELECT max_students,
                           (SELECT COUNT(*) FROM CourseEnrollments
                            WHERE course_id = @courseId
                            AND completion_status IN ('NOT_STARTED', 'IN_PROGRESS')) as current_students
                    FROM Courses
                    WHERE course_id = @courseId
                `);

            if (courseInfo.recordset.length > 0 && courseInfo.recordset[0].max_students) {
                if (courseInfo.recordset[0].current_students >= courseInfo.recordset[0].max_students) {
                    return {
                        success: false,
                        message: 'Course is full. Please join the waiting list.'
                    };
                }
            }

            // Calculate expected end date based on course duration
            const durationResult = await pool.request()
                .input('courseId', sql.UniqueIdentifier, enrollmentData.course_id)
                .query(`
                    SELECT duration_hours
                    FROM Courses
                    WHERE course_id = @courseId
                `);

            let expectedEndDate = null;
            if (durationResult.recordset.length > 0) {
                const durationDays = Math.ceil(durationResult.recordset[0].duration_hours / 2); // Assume 2 hours study per day
                expectedEndDate = new Date();
                expectedEndDate.setDate(expectedEndDate.getDate() + durationDays);
            }

            // Create enrollment
            const result = await pool.request()
                .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
                .input('userId', sql.UniqueIdentifier, enrollmentData.user_id)
                .input('courseId', sql.UniqueIdentifier, enrollmentData.course_id)
                .input('enrollmentType', sql.NVarChar(20), enrollmentData.enrollment_type || 'SELF')
                .input('expectedEndDate', sql.DateTime, expectedEndDate)
                .query(`
                    INSERT INTO CourseEnrollments (
                        enrollment_id, user_id, course_id, enrollment_date,
                        enrollment_type, expected_end_date, progress_percentage,
                        completion_status, created_date
                    ) VALUES (
                        @enrollmentId, @userId, @courseId, GETDATE(),
                        @enrollmentType, @expectedEndDate, 0,
                        'NOT_STARTED', GETDATE()
                    )
                `);

            // Send notification
            await pool.request()
                .input('notificationId', sql.UniqueIdentifier, uuidv4())
                .input('userId', sql.UniqueIdentifier, enrollmentData.user_id)
                .input('courseId', sql.UniqueIdentifier, enrollmentData.course_id)
                .query(`
                    INSERT INTO Notifications (
                        notification_id, user_id, notification_type, title, message, link
                    )
                    SELECT @notificationId, @userId, 'ENROLLMENT',
                           'Course Enrollment Successful',
                           CONCAT('You have been enrolled in ', course_name),
                           CONCAT('/courses/', @courseId)
                    FROM Courses
                    WHERE course_id = @courseId
                `);

            // Add gamification points
            await pool.request()
                .input('pointId', sql.UniqueIdentifier, uuidv4())
                .input('userId', sql.UniqueIdentifier, enrollmentData.user_id)
                .input('activityId', sql.UniqueIdentifier, enrollmentId)
                .query(`
                    INSERT INTO UserPoints (point_id, user_id, activity_type, activity_id, points_earned, description)
                    VALUES (@pointId, @userId, 'COURSE_ENROLL', @activityId, 10, 'Enrolled in a course')
                `);

            return {
                success: true,
                enrollmentId: enrollmentId
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
                .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
                .query(`
                    SELECT e.*,
                           c.course_name, c.course_code, c.thumbnail_image, c.duration_hours,
                           c.passing_score, c.max_attempts,
                           CONCAT(u.first_name, ' ', u.last_name) as student_name,
                           CONCAT(i.first_name, ' ', i.last_name) as instructor_name
                    FROM CourseEnrollments e
                    JOIN Courses c ON e.course_id = c.course_id
                    JOIN Users u ON e.user_id = u.user_id
                    JOIN Users i ON c.instructor_id = i.user_id
                    WHERE e.enrollment_id = @enrollmentId
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
                .input('userId', sql.UniqueIdentifier, userId);

            if (status) {
                whereClause += ' AND e.completion_status = @status';
                request.input('status', sql.NVarChar(20), status);
            }

            const result = await request.query(`
                SELECT e.*,
                       c.course_name, c.course_code, c.thumbnail_image, c.duration_hours,
                       c.difficulty_level, c.course_type,
                       cat.category_name,
                       CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
                       (SELECT COUNT(*) FROM CourseLessons WHERE course_id = c.course_id) as total_lessons,
                       (SELECT COUNT(*) FROM CourseProgress
                        WHERE enrollment_id = e.enrollment_id AND is_completed = 1) as completed_lessons
                FROM CourseEnrollments e
                JOIN Courses c ON e.course_id = c.course_id
                LEFT JOIN CourseCategories cat ON c.category_id = cat.category_id
                LEFT JOIN Users i ON c.instructor_id = i.user_id
                ${whereClause}
                ORDER BY e.enrollment_date DESC
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching user enrollments: ${error.message}`);
        }
    }

    // Get course enrollments
    static async getCourseEnrollments(courseId, page = 1, limit = 50) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            const request = pool.request()
                .input('courseId', sql.UniqueIdentifier, courseId)
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM CourseEnrollments
                WHERE course_id = @courseId
            `);

            // Get paginated enrollments
            const result = await request.query(`
                SELECT e.*,
                       u.employee_id, u.first_name, u.last_name, u.email,
                       d.department_name, p.position_name
                FROM CourseEnrollments e
                JOIN Users u ON e.user_id = u.user_id
                LEFT JOIN Departments d ON u.department_id = d.department_id
                LEFT JOIN Positions p ON u.position_id = p.position_id
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

    // Update progress
    static async updateProgress(enrollmentId, lessonId, completed = false) {
        try {
            const pool = await poolPromise;

            // Check if progress record exists
            const existingCheck = await pool.request()
                .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
                .input('lessonId', sql.UniqueIdentifier, lessonId)
                .query(`
                    SELECT progress_id, is_completed
                    FROM CourseProgress
                    WHERE enrollment_id = @enrollmentId AND lesson_id = @lessonId
                `);

            let progressId;
            if (existingCheck.recordset.length > 0) {
                progressId = existingCheck.recordset[0].progress_id;

                // Update existing progress
                await pool.request()
                    .input('progressId', sql.UniqueIdentifier, progressId)
                    .input('completed', sql.Bit, completed)
                    .query(`
                        UPDATE CourseProgress
                        SET is_completed = @completed,
                            completed_date = CASE WHEN @completed = 1 THEN GETDATE() ELSE NULL END,
                            attempts = attempts + 1,
                            time_spent_seconds = time_spent_seconds + DATEDIFF(SECOND, started_date, GETDATE())
                        WHERE progress_id = @progressId
                    `);
            } else {
                // Create new progress record
                progressId = uuidv4();

                // Get user_id from enrollment
                const enrollmentResult = await pool.request()
                    .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
                    .query(`SELECT user_id FROM CourseEnrollments WHERE enrollment_id = @enrollmentId`);

                if (enrollmentResult.recordset.length === 0) {
                    return { success: false, message: 'Enrollment not found' };
                }

                await pool.request()
                    .input('progressId', sql.UniqueIdentifier, progressId)
                    .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
                    .input('lessonId', sql.UniqueIdentifier, lessonId)
                    .input('userId', sql.UniqueIdentifier, enrollmentResult.recordset[0].user_id)
                    .input('completed', sql.Bit, completed)
                    .query(`
                        INSERT INTO CourseProgress (
                            progress_id, enrollment_id, lesson_id, user_id,
                            started_date, is_completed, completed_date, attempts
                        ) VALUES (
                            @progressId, @enrollmentId, @lessonId, @userId,
                            GETDATE(), @completed,
                            CASE WHEN @completed = 1 THEN GETDATE() ELSE NULL END,
                            1
                        )
                    `);
            }

            // Update overall enrollment progress
            const progressResult = await pool.request()
                .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
                .query(`
                    DECLARE @totalLessons INT, @completedLessons INT, @progress DECIMAL(5,2)

                    SELECT @totalLessons = COUNT(*)
                    FROM CourseLessons cl
                    JOIN CourseEnrollments e ON cl.course_id = e.course_id
                    WHERE e.enrollment_id = @enrollmentId AND cl.is_active = 1

                    SELECT @completedLessons = COUNT(*)
                    FROM CourseProgress
                    WHERE enrollment_id = @enrollmentId AND is_completed = 1

                    SET @progress = CASE
                        WHEN @totalLessons = 0 THEN 0
                        ELSE (CAST(@completedLessons AS DECIMAL(5,2)) / @totalLessons) * 100
                    END

                    UPDATE CourseEnrollments
                    SET progress_percentage = @progress,
                        completion_status = CASE
                            WHEN @progress = 0 THEN 'NOT_STARTED'
                            WHEN @progress = 100 THEN 'COMPLETED'
                            ELSE 'IN_PROGRESS'
                        END,
                        start_date = CASE
                            WHEN start_date IS NULL THEN GETDATE()
                            ELSE start_date
                        END,
                        actual_end_date = CASE
                            WHEN @progress = 100 THEN GETDATE()
                            ELSE actual_end_date
                        END
                    WHERE enrollment_id = @enrollmentId

                    SELECT @progress as progress
                `);

            const progress = progressResult.recordset[0].progress;

            // Check if course completed for certificate generation
            if (progress === 100) {
                await this.generateCertificate(enrollmentId);
            }

            return {
                success: true,
                progress: progress
            };
        } catch (error) {
            throw new Error(`Error updating progress: ${error.message}`);
        }
    }

    // Generate certificate
    static async generateCertificate(enrollmentId) {
        try {
            const pool = await poolPromise;

            // Check if already has certificate
            const checkResult = await pool.request()
                .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
                .query(`
                    SELECT certificate_issued
                    FROM CourseEnrollments
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
                    FROM CourseEnrollments
                    WHERE certificate_number LIKE 'CERT-${year}-%'
                `);

            const count = countResult.recordset[0].count + 1;
            const certificateNumber = `CERT-${year}-${String(count).padStart(6, '0')}`;

            // Update enrollment with certificate
            const result = await pool.request()
                .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
                .input('certificateNumber', sql.NVarChar(50), certificateNumber)
                .query(`
                    UPDATE CourseEnrollments
                    SET certificate_issued = 1,
                        certificate_number = @certificateNumber,
                        certificate_issued_date = GETDATE()
                    WHERE enrollment_id = @enrollmentId
                    AND completion_status = 'COMPLETED'
                `);

            if (result.rowsAffected[0] > 0) {
                // Add gamification points
                const enrollmentInfo = await pool.request()
                    .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
                    .query(`SELECT user_id FROM CourseEnrollments WHERE enrollment_id = @enrollmentId`);

                if (enrollmentInfo.recordset.length > 0) {
                    await pool.request()
                        .input('pointId', sql.UniqueIdentifier, uuidv4())
                        .input('userId', sql.UniqueIdentifier, enrollmentInfo.recordset[0].user_id)
                        .input('activityId', sql.UniqueIdentifier, enrollmentId)
                        .query(`
                            INSERT INTO UserPoints (point_id, user_id, activity_type, activity_id, points_earned, description)
                            VALUES (@pointId, @userId, 'COURSE_COMPLETE', @activityId, 100, 'Completed a course')
                        `);
                }

                return {
                    success: true,
                    certificateNumber: certificateNumber
                };
            }

            return {
                success: false,
                message: 'Course not completed yet'
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
                .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
                .query(`
                    UPDATE CourseEnrollments
                    SET completion_status = 'DROPPED',
                        actual_end_date = GETDATE()
                    WHERE enrollment_id = @enrollmentId
                    AND completion_status IN ('NOT_STARTED', 'IN_PROGRESS')
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
                request.input('courseId', sql.UniqueIdentifier, courseId);
            }
            if (userId) {
                whereClause += ' AND user_id = @userId';
                request.input('userId', sql.UniqueIdentifier, userId);
            }

            const result = await request.query(`
                SELECT
                    COUNT(*) as total_enrollments,
                    COUNT(CASE WHEN completion_status = 'COMPLETED' THEN 1 END) as completed,
                    COUNT(CASE WHEN completion_status = 'IN_PROGRESS' THEN 1 END) as in_progress,
                    COUNT(CASE WHEN completion_status = 'NOT_STARTED' THEN 1 END) as not_started,
                    COUNT(CASE WHEN completion_status = 'DROPPED' THEN 1 END) as dropped,
                    AVG(CAST(progress_percentage AS FLOAT)) as avg_progress,
                    AVG(CASE WHEN final_score IS NOT NULL THEN CAST(final_score AS FLOAT) END) as avg_score,
                    COUNT(CASE WHEN certificate_issued = 1 THEN 1 END) as certificates_issued
                FROM CourseEnrollments
                ${whereClause}
            `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error fetching enrollment statistics: ${error.message}`);
        }
    }

    // Get mandatory courses for position
    static async getMandatoryCourses(positionId, year = new Date().getFullYear()) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('positionId', sql.UniqueIdentifier, positionId)
                .input('year', sql.Int, year)
                .query(`
                    SELECT pcr.*,
                           c.course_name, c.course_code, c.duration_hours,
                           c.difficulty_level, c.thumbnail_image
                    FROM PositionCourseRequirements pcr
                    JOIN Courses c ON pcr.course_id = c.course_id
                    WHERE pcr.position_id = @positionId
                    AND pcr.requirement_year = @year
                    AND pcr.requirement_type = 'MANDATORY'
                    AND pcr.is_active = 1
                    ORDER BY pcr.due_quarter
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching mandatory courses: ${error.message}`);
        }
    }
}

module.exports = Enrollment;