const { poolPromise, sql } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Course {
    constructor(data) {
        this.course_id = data.course_id;
        this.course_code = data.course_code;
        this.course_name = data.course_name;
        this.course_name_en = data.course_name_en;
        this.category_id = data.category_id;
        this.course_type = data.course_type;
        this.difficulty_level = data.difficulty_level;
        this.language = data.language;
        this.description = data.description;
        this.objectives = data.objectives;
        this.target_audience = data.target_audience;
        this.prerequisites = data.prerequisites;
        this.duration_hours = data.duration_hours;
        this.max_students = data.max_students;
        this.thumbnail_image = data.thumbnail_image;
        this.intro_video_url = data.intro_video_url;
        this.instructor_id = data.instructor_id;
        this.passing_score = data.passing_score;
        this.max_attempts = data.max_attempts;
        this.show_correct_answers = data.show_correct_answers;
        this.is_published = data.is_published;
        this.is_active = data.is_active;
    }

    // Find course by ID with full details
    static async findById(courseId) {
        try {
            // Validate courseId is a valid integer
            const parsedCourseId = parseInt(courseId);
            if (isNaN(parsedCourseId) || parsedCourseId <= 0) {
                throw new Error('Validation failed for parameter \'courseId\'. Invalid number.');
            }

            const pool = await poolPromise;
            const result = await pool.request()
                .input('courseId', sql.Int, parsedCourseId)
                .query(`
                    SELECT c.*,
                           cat.category_name,
                           CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                           u.profile_image as instructor_image,
                           (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count,
                           (SELECT AVG(CAST(final_score as FLOAT)) FROM user_courses
                            WHERE course_id = c.course_id AND final_score IS NOT NULL) as avg_score,
                           (SELECT COUNT(*) FROM CourseLessons WHERE course_id = c.course_id) as lesson_count,
                           (SELECT COUNT(*) FROM CourseMaterials WHERE course_id = c.course_id) as material_count
                    FROM Courses c
                    LEFT JOIN CourseCategories cat ON c.category_id = cat.category_id
                    LEFT JOIN Users u ON c.instructor_id = u.user_id
                    WHERE c.course_id = @courseId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const course = result.recordset[0];

            // Get prerequisites
            const prereqResult = await pool.request()
                .input('courseId', sql.Int, parsedCourseId)
                .query(`
                    SELECT p.*, c.course_name, c.course_code
                    FROM CoursePrerequisites p
                    JOIN Courses c ON p.prerequisite_course_id = c.course_id
                    WHERE p.course_id = @courseId
                `);

            course.prerequisites_list = prereqResult.recordset;

            // Get lessons
            const lessonsResult = await pool.request()
                .input('courseId', sql.Int, parsedCourseId)
                .query(`
                    SELECT *
                    FROM CourseLessons
                    WHERE course_id = @courseId AND is_active = 1
                    ORDER BY lesson_order
                `);

            course.lessons = lessonsResult.recordset;

            return course;
        } catch (error) {
            throw new Error(`Error finding course: ${error.message}`);
        }
    }

    // Create new course
    static async create(courseData) {
        try {
            const pool = await poolPromise;
            const courseId = uuidv4();

            // Generate course code
            const year = new Date().getFullYear();
            const countResult = await pool.request()
                .query(`SELECT COUNT(*) as count FROM Courses WHERE course_code LIKE 'CRS-${year}-%'`);

            const count = countResult.recordset[0].count + 1;
            const courseCode = `CRS-${year}-${String(count).padStart(4, '0')}`;

            const result = await pool.request()
                .input('courseId', sql.Int, courseId)
                .input('courseCode', sql.NVarChar(20), courseCode)
                .input('courseName', sql.NVarChar(200), courseData.course_name)
                .input('courseNameEn', sql.NVarChar(200), courseData.course_name_en || null)
                .input('categoryId', sql.Int, courseData.category_id)
                .input('courseType', sql.NVarChar(20), courseData.course_type)
                .input('difficultyLevel', sql.NVarChar(20), courseData.difficulty_level)
                .input('language', sql.NVarChar(20), courseData.language)
                .input('description', sql.NVarChar(sql.MAX), courseData.description)
                .input('objectives', sql.NVarChar(sql.MAX), courseData.objectives || null)
                .input('targetAudience', sql.NVarChar(500), courseData.target_audience || null)
                .input('prerequisites', sql.NVarChar(500), courseData.prerequisites || null)
                .input('durationHours', sql.Decimal(5, 2), courseData.duration_hours || 0)
                .input('maxStudents', sql.Int, courseData.max_students || null)
                .input('thumbnailImage', sql.NVarChar(500), courseData.thumbnail_image || null)
                .input('introVideoUrl', sql.NVarChar(500), courseData.intro_video_url || null)
                .input('instructorId', sql.Int, courseData.instructor_id)
                .input('passingScore', sql.Decimal(5, 2), courseData.passing_score || 60)
                .input('maxAttempts', sql.Int, courseData.max_attempts || 3)
                .input('showCorrectAnswers', sql.Bit, courseData.show_correct_answers !== false)
                .input('createdBy', sql.Int, courseData.created_by || null)
                .query(`
                    INSERT INTO Courses (
                        course_id, course_code, course_name, course_name_en, category_id,
                        course_type, difficulty_level, language, description, objectives,
                        target_audience, prerequisites, duration_hours, max_students,
                        thumbnail_image, intro_video_url, instructor_id, passing_score,
                        max_attempts, show_correct_answers, is_published, is_active,
                        created_by, created_date
                    ) VALUES (
                        @courseId, @courseCode, @courseName, @courseNameEn, @categoryId,
                        @courseType, @difficultyLevel, @language, @description, @objectives,
                        @targetAudience, @prerequisites, @durationHours, @maxStudents,
                        @thumbnailImage, @introVideoUrl, @instructorId, @passingScore,
                        @maxAttempts, @showCorrectAnswers, 0, 1,
                        @createdBy, GETDATE()
                    )
                `);

            // Add prerequisites if provided
            if (courseData.prerequisite_courses && courseData.prerequisite_courses.length > 0) {
                for (const prereqId of courseData.prerequisite_courses) {
                    await pool.request()
                        .input('prerequisiteId', sql.Int, uuidv4())
                        .input('courseId', sql.Int, courseId)
                        .input('prerequisiteCourseId', sql.Int, prereqId)
                        .query(`
                            INSERT INTO CoursePrerequisites (prerequisite_id, course_id, prerequisite_course_id)
                            VALUES (@prerequisiteId, @courseId, @prerequisiteCourseId)
                        `);
                }
            }

            return {
                success: true,
                courseId: courseId,
                courseCode: courseCode
            };
        } catch (error) {
            throw new Error(`Error creating course: ${error.message}`);
        }
    }

    // Update course
    static async update(courseId, updateData) {
        try {
            const pool = await poolPromise;

            // Build dynamic update query
            const updateFields = [];
            const request = pool.request()
                .input('courseId', sql.Int, courseId)
                .input('modifiedBy', sql.Int, updateData.modified_by || null);

            // Add fields to update dynamically
            if (updateData.course_name !== undefined) {
                updateFields.push('course_name = @courseName');
                request.input('courseName', sql.NVarChar(200), updateData.course_name);
            }
            if (updateData.category_id !== undefined) {
                updateFields.push('category_id = @categoryId');
                request.input('categoryId', sql.Int, updateData.category_id);
            }
            if (updateData.course_type !== undefined) {
                updateFields.push('course_type = @courseType');
                request.input('courseType', sql.NVarChar(20), updateData.course_type);
            }
            if (updateData.difficulty_level !== undefined) {
                updateFields.push('difficulty_level = @difficultyLevel');
                request.input('difficultyLevel', sql.NVarChar(20), updateData.difficulty_level);
            }
            if (updateData.description !== undefined) {
                updateFields.push('description = @description');
                request.input('description', sql.NVarChar(sql.MAX), updateData.description);
            }
            if (updateData.objectives !== undefined) {
                updateFields.push('objectives = @objectives');
                request.input('objectives', sql.NVarChar(sql.MAX), updateData.objectives);
            }
            if (updateData.duration_hours !== undefined) {
                updateFields.push('duration_hours = @durationHours');
                request.input('durationHours', sql.Decimal(5, 2), updateData.duration_hours);
            }
            if (updateData.passing_score !== undefined) {
                updateFields.push('passing_score = @passingScore');
                request.input('passingScore', sql.Decimal(5, 2), updateData.passing_score);
            }
            if (updateData.thumbnail_image !== undefined) {
                updateFields.push('thumbnail_image = @thumbnailImage');
                request.input('thumbnailImage', sql.NVarChar(500), updateData.thumbnail_image);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            updateFields.push('modified_date = GETDATE()');
            updateFields.push('modified_by = @modifiedBy');
            updateFields.push('version = version + 1');

            const updateQuery = `
                UPDATE Courses
                SET ${updateFields.join(', ')}
                WHERE course_id = @courseId
            `;

            const result = await request.query(updateQuery);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Course updated successfully' : 'Course not found'
            };
        } catch (error) {
            throw new Error(`Error updating course: ${error.message}`);
        }
    }

    // Publish/Unpublish course
    static async togglePublish(courseId, publish = true) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('courseId', sql.Int, courseId)
                .input('isPublished', sql.Bit, publish)
                .query(`
                    UPDATE Courses
                    SET is_published = @isPublished,
                        published_date = CASE WHEN @isPublished = 1 THEN GETDATE() ELSE published_date END,
                        modified_date = GETDATE()
                    WHERE course_id = @courseId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0
                    ? (publish ? 'Course published successfully' : 'Course unpublished successfully')
                    : 'Course not found'
            };
        } catch (error) {
            throw new Error(`Error publishing course: ${error.message}`);
        }
    }

    // Get all courses with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE c.is_active = 1';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.category_id) {
                whereClause += ' AND c.category_id = @categoryId';
                request.input('categoryId', sql.Int, filters.category_id);
            }
            if (filters.instructor_id) {
                whereClause += ' AND c.instructor_id = @instructorId';
                request.input('instructorId', sql.Int, filters.instructor_id);
            }
            if (filters.course_type) {
                whereClause += ' AND c.course_type = @courseType';
                request.input('courseType', sql.NVarChar(20), filters.course_type);
            }
            if (filters.difficulty_level) {
                whereClause += ' AND c.difficulty_level = @difficultyLevel';
                request.input('difficultyLevel', sql.NVarChar(20), filters.difficulty_level);
            }
            if (filters.is_published !== undefined) {
                whereClause += ' AND c.is_published = @isPublished';
                request.input('isPublished', sql.Bit, filters.is_published);
            }
            if (filters.search) {
                whereClause += ` AND (
                    c.course_name LIKE @search OR
                    c.course_code LIKE @search OR
                    c.description LIKE @search
                )`;
                request.input('search', sql.NVarChar(200), `%${filters.search}%`);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM Courses c
                ${whereClause}
            `);

            // Get paginated data with additional info
            const result = await request.query(`
                SELECT c.*,
                       cat.category_name,
                       CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                       (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count,
                       (SELECT COUNT(*) FROM CourseLessons WHERE course_id = c.course_id) as lesson_count,
                       (SELECT AVG(CAST(final_score as FLOAT)) FROM user_courses
                        WHERE course_id = c.course_id AND final_score IS NOT NULL) as avg_score
                FROM Courses c
                LEFT JOIN CourseCategories cat ON c.category_id = cat.category_id
                LEFT JOIN Users u ON c.instructor_id = u.user_id
                ${whereClause}
                ORDER BY c.created_date DESC
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
            throw new Error(`Error fetching courses: ${error.message}`);
        }
    }

    // Get popular courses
    static async getPopular(limit = 10) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) c.*,
                           cat.category_name,
                           CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                           COUNT(e.enrollment_id) as enrolled_count,
                           AVG(CAST(e.final_score as FLOAT)) as avg_score
                    FROM Courses c
                    LEFT JOIN CourseCategories cat ON c.category_id = cat.category_id
                    LEFT JOIN Users u ON c.instructor_id = u.user_id
                    LEFT JOIN user_courses e ON c.course_id = e.course_id
                    WHERE c.is_active = 1 AND c.is_published = 1
                    GROUP BY c.course_id, c.course_code, c.course_name, c.course_name_en,
                             c.category_id, c.course_type, c.difficulty_level, c.language,
                             c.description, c.objectives, c.target_audience, c.prerequisites,
                             c.duration_hours, c.max_students, c.thumbnail_image, c.intro_video_url,
                             c.instructor_id, c.passing_score, c.max_attempts, c.show_correct_answers,
                             c.is_published, c.published_date, c.is_active, c.created_by,
                             c.created_date, c.modified_by, c.modified_date, c.version,
                             cat.category_name, u.first_name, u.last_name
                    ORDER BY COUNT(e.enrollment_id) DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching popular courses: ${error.message}`);
        }
    }

    // Get recommended courses for user
    static async getRecommended(userId, limit = 5) {
        try {
            const pool = await poolPromise;

            // Get user's position and completed courses
            const userResult = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT position_id, department_id
                    FROM Users
                    WHERE user_id = @userId
                `);

            if (userResult.recordset.length === 0) {
                return [];
            }

            const user = userResult.recordset[0];

            // Get recommended courses based on position requirements and not yet enrolled
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('positionId', sql.Int, user.position_id)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) c.*,
                           cat.category_name,
                           CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                           pcr.requirement_type
                    FROM Courses c
                    LEFT JOIN CourseCategories cat ON c.category_id = cat.category_id
                    LEFT JOIN Users u ON c.instructor_id = u.user_id
                    LEFT JOIN PositionCourseRequirements pcr ON c.course_id = pcr.course_id
                    WHERE c.is_active = 1
                    AND c.is_published = 1
                    AND (pcr.position_id = @positionId OR c.course_type = 'RECOMMENDED')
                    AND c.course_id NOT IN (
                        SELECT course_id
                        FROM user_courses
                        WHERE user_id = @userId
                    )
                    ORDER BY
                        CASE WHEN pcr.requirement_type = 'MANDATORY' THEN 1
                             WHEN pcr.requirement_type = 'RECOMMENDED' THEN 2
                             ELSE 3 END,
                        c.created_date DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching recommended courses: ${error.message}`);
        }
    }

    // Get courses by instructor
    static async getByInstructor(instructorId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('instructorId', sql.Int, instructorId)
                .query(`
                    SELECT c.*,
                           cat.category_name,
                           (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count,
                           (SELECT COUNT(*) FROM CourseLessons WHERE course_id = c.course_id) as lesson_count
                    FROM Courses c
                    LEFT JOIN CourseCategories cat ON c.category_id = cat.category_id
                    WHERE c.instructor_id = @instructorId AND c.is_active = 1
                    ORDER BY c.created_date DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching instructor courses: ${error.message}`);
        }
    }

    // Add lesson to course
    static async addLesson(courseId, lessonData) {
        try {
            const pool = await poolPromise;
            const lessonId = uuidv4();

            const result = await pool.request()
                .input('lessonId', sql.Int, lessonId)
                .input('courseId', sql.Int, courseId)
                .input('lessonOrder', sql.Int, lessonData.lesson_order)
                .input('lessonTitle', sql.NVarChar(200), lessonData.lesson_title)
                .input('lessonDescription', sql.NVarChar(sql.MAX), lessonData.lesson_description || null)
                .input('lessonType', sql.NVarChar(20), lessonData.lesson_type)
                .input('contentUrl', sql.NVarChar(500), lessonData.content_url || null)
                .input('durationMinutes', sql.Int, lessonData.duration_minutes || 0)
                .input('isMandatory', sql.Bit, lessonData.is_mandatory !== false)
                .input('minTimeMinutes', sql.Int, lessonData.min_time_minutes || 0)
                .query(`
                    INSERT INTO CourseLessons (
                        lesson_id, course_id, lesson_order, lesson_title,
                        lesson_description, lesson_type, content_url,
                        duration_minutes, is_mandatory, min_time_minutes,
                        is_active, created_date
                    ) VALUES (
                        @lessonId, @courseId, @lessonOrder, @lessonTitle,
                        @lessonDescription, @lessonType, @contentUrl,
                        @durationMinutes, @isMandatory, @minTimeMinutes,
                        1, GETDATE()
                    )
                `);

            // Update course duration
            await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    UPDATE Courses
                    SET duration_hours = (
                        SELECT SUM(duration_minutes) / 60.0
                        FROM CourseLessons
                        WHERE course_id = @courseId AND is_active = 1
                    )
                    WHERE course_id = @courseId
                `);

            return {
                success: true,
                lessonId: lessonId
            };
        } catch (error) {
            throw new Error(`Error adding lesson: ${error.message}`);
        }
    }

    // Delete course (soft delete)
    static async delete(courseId, deletedBy) {
        try {
            const pool = await poolPromise;

            // Check if there are active enrollments
            const enrollmentCheck = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM user_courses
                    WHERE course_id = @courseId
                    AND completion_status IN ('IN_PROGRESS', 'NOT_STARTED')
                `);

            if (enrollmentCheck.recordset[0].count > 0) {
                return {
                    success: false,
                    message: 'Cannot delete course with active enrollments'
                };
            }

            const result = await pool.request()
                .input('courseId', sql.Int, courseId)
                .input('deletedBy', sql.Int, deletedBy)
                .query(`
                    UPDATE Courses
                    SET is_active = 0,
                        is_published = 0,
                        modified_by = @deletedBy,
                        modified_date = GETDATE()
                    WHERE course_id = @courseId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Course deleted successfully' : 'Course not found'
            };
        } catch (error) {
            throw new Error(`Error deleting course: ${error.message}`);
        }
    }

    // Get course categories
    static async getCategories() {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .query(`
                    SELECT cc.*,
                           (SELECT COUNT(*) FROM Courses WHERE category_id = cc.category_id AND is_active = 1) as course_count
                    FROM CourseCategories cc
                    WHERE cc.is_active = 1
                    ORDER BY cc.category_order, cc.category_name
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching categories: ${error.message}`);
        }
    }
}

module.exports = Course;