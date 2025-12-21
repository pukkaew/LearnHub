const { poolPromise, sql } = require('../config/database');

class Course {
    constructor(data) {
        this.course_id = data.course_id;
        this.course_code = data.course_code;
        this.title = data.title;
        this.description = data.description;
        this.category = data.category;
        this.difficulty_level = data.difficulty_level;
        this.instructor_id = data.instructor_id;
        this.instructor_name = data.instructor_name;
        this.thumbnail = data.thumbnail;
        this.duration_hours = data.duration_hours;
        this.passing_score = data.passing_score;
        this.max_attempts = data.max_attempts;
        this.is_published = data.is_published;
        this.is_active = data.is_active;
        this.status = data.status;
    }

    // Find course by ID
    static async findById(courseId) {
        try {
            const parsedCourseId = parseInt(courseId);
            if (isNaN(parsedCourseId) || parsedCourseId <= 0) {
                throw new Error('Invalid course ID');
            }

            const pool = await poolPromise;
            const result = await pool.request()
                .input('courseId', sql.Int, parsedCourseId)
                .query(`
                    SELECT c.*,
                           CONCAT(u.first_name, ' ', u.last_name) as instructor_display_name,
                           u.profile_image as instructor_image,
                           (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count,
                           (SELECT COUNT(*) FROM course_materials WHERE course_id = c.course_id) as material_count
                    FROM courses c
                    LEFT JOIN users u ON c.instructor_id = u.user_id
                    WHERE c.course_id = @courseId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const course = result.recordset[0];
            course.instructor_name = course.instructor_name || course.instructor_display_name;

            // Get lessons/materials
            const lessonsResult = await pool.request()
                .input('courseId', sql.Int, parsedCourseId)
                .query(`
                    SELECT *
                    FROM course_materials
                    WHERE course_id = @courseId
                    ORDER BY order_index
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

            // Convert duration hours and minutes
            let durationHours = parseFloat(courseData.duration_hours) || 0;
            if (courseData.duration_minutes) {
                durationHours += parseInt(courseData.duration_minutes) / 60;
            }

            const result = await pool.request()
                .input('title', sql.NVarChar(255), courseData.title || courseData.course_name || 'Untitled Course')
                .input('description', sql.NVarChar(sql.MAX), courseData.description || '')
                .input('category', sql.NVarChar(100), courseData.category || 'General')
                .input('difficultyLevel', sql.NVarChar(50), courseData.difficulty_level || 'Beginner')
                .input('instructorId', sql.Int, courseData.instructor_id ? parseInt(courseData.instructor_id) : null)
                .input('instructorName', sql.NVarChar(255), courseData.instructor_name || null)
                .input('thumbnail', sql.NVarChar(500), courseData.thumbnail || null)
                .input('durationHours', sql.Decimal(5, 2), durationHours)
                .input('passingScore', sql.Int, courseData.passing_score || null)
                .input('maxAttempts', sql.Int, courseData.max_attempts || null)
                .input('maxStudents', sql.Int, courseData.max_students || null)
                .input('status', sql.NVarChar(50), courseData.status || 'Published')
                .input('isPublished', sql.Bit, courseData.is_published !== false)
                .query(`
                    INSERT INTO courses (
                        title, description, category, difficulty_level,
                        instructor_id, instructor_name, thumbnail, duration_hours,
                        passing_score, max_attempts, max_students, status, is_published,
                        created_at, updated_at
                    ) VALUES (
                        @title, @description, @category, @difficultyLevel,
                        @instructorId, @instructorName, @thumbnail, @durationHours,
                        @passingScore, @maxAttempts, @maxStudents, @status, @isPublished,
                        GETDATE(), GETDATE()
                    );
                    SELECT SCOPE_IDENTITY() AS course_id;
                `);

            const newCourseId = parseInt(result.recordset[0].course_id, 10);

            return {
                success: true,
                data: { course_id: newCourseId }
            };
        } catch (error) {
            console.error('Course.create error:', error);
            return {
                success: false,
                message: `Error creating course: ${error.message}`
            };
        }
    }

    // Update course
    static async update(courseId, updateData) {
        try {
            const pool = await poolPromise;

            const updateFields = [];
            const request = pool.request()
                .input('courseId', sql.Int, courseId);

            if (updateData.title !== undefined) {
                updateFields.push('title = @title');
                request.input('title', sql.NVarChar(255), updateData.title);
            }
            if (updateData.description !== undefined) {
                updateFields.push('description = @description');
                request.input('description', sql.NVarChar(sql.MAX), updateData.description);
            }
            if (updateData.category !== undefined) {
                updateFields.push('category = @category');
                request.input('category', sql.NVarChar(100), updateData.category);
            }
            if (updateData.difficulty_level !== undefined) {
                updateFields.push('difficulty_level = @difficultyLevel');
                request.input('difficultyLevel', sql.NVarChar(50), updateData.difficulty_level);
            }
            if (updateData.duration_hours !== undefined) {
                let totalHours = parseFloat(updateData.duration_hours) || 0;
                totalHours += (parseFloat(updateData.duration_minutes) || 0) / 60;
                updateFields.push('duration_hours = @durationHours');
                request.input('durationHours', sql.Decimal(5, 2), totalHours);
            }
            if (updateData.passing_score !== undefined) {
                updateFields.push('passing_score = @passingScore');
                request.input('passingScore', sql.Int, updateData.passing_score || null);
            }
            if (updateData.thumbnail !== undefined) {
                updateFields.push('thumbnail = @thumbnail');
                request.input('thumbnail', sql.NVarChar(500), updateData.thumbnail);
            }
            if (updateData.status !== undefined) {
                updateFields.push('status = @status');
                request.input('status', sql.NVarChar(50), updateData.status);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            updateFields.push('updated_at = GETDATE()');

            const result = await request.query(`
                UPDATE courses
                SET ${updateFields.join(', ')}
                WHERE course_id = @courseId
            `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Course updated successfully' : 'Course not found'
            };
        } catch (error) {
            throw new Error(`Error updating course: ${error.message}`);
        }
    }

    // Get all courses with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = "WHERE c.status IN ('Active', 'Published')";
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            if (filters.category) {
                whereClause += ' AND c.category = @category';
                request.input('category', sql.NVarChar(100), filters.category);
            }
            if (filters.instructor_id) {
                whereClause += ' AND c.instructor_id = @instructorId';
                request.input('instructorId', sql.Int, filters.instructor_id);
            }
            if (filters.difficulty_level) {
                whereClause += ' AND c.difficulty_level = @difficultyLevel';
                request.input('difficultyLevel', sql.NVarChar(50), filters.difficulty_level);
            }
            if (filters.search) {
                whereClause += ` AND (
                    c.title LIKE @search OR
                    c.description LIKE @search OR
                    c.category LIKE @search
                )`;
                request.input('search', sql.NVarChar(200), `%${filters.search}%`);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM courses c
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT c.*,
                       CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                       (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count
                FROM courses c
                LEFT JOIN users u ON c.instructor_id = u.user_id
                ${whereClause}
                ORDER BY c.created_at DESC
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
                           CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                           (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count
                    FROM courses c
                    LEFT JOIN users u ON c.instructor_id = u.user_id
                    WHERE c.status IN ('Active', 'Published')
                    ORDER BY (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching popular courses: ${error.message}`);
        }
    }

    // Delete course (soft delete)
    static async delete(courseId) {
        try {
            const pool = await poolPromise;

            // Check for enrollments
            const enrollmentCheck = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`SELECT COUNT(*) as count FROM user_courses WHERE course_id = @courseId`);

            if (enrollmentCheck.recordset[0].count > 0) {
                return {
                    success: false,
                    message: 'Cannot delete course with enrollments'
                };
            }

            const result = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    UPDATE courses
                    SET is_active = 0, is_published = 0, updated_at = GETDATE()
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
                    SELECT
                        cc.category_id,
                        cc.category_name,
                        cc.description,
                        cc.category_icon,
                        cc.category_color,
                        COUNT(c.course_id) as course_count
                    FROM CourseCategories cc
                    LEFT JOIN courses c ON cc.category_name = c.category
                                        AND c.status IN ('Active', 'Published')
                    WHERE cc.is_active = 1
                    GROUP BY cc.category_id, cc.category_name, cc.description, cc.category_icon, cc.category_color
                    ORDER BY cc.display_order, cc.category_name
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching categories: ${error.message}`);
        }
    }
}

module.exports = Course;
